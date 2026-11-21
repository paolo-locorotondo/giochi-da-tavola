import { randomBytes, randomInt } from "node:crypto";
import { ALFABETO, type AnteprimaVeloce, type AperturaVeloce, type ComandoSala, type RichiestaOnline, type VistaSalaVeloce } from "@gdt/engine";
import { giocoOnline, type GiocoQualsiasi } from "./giochi";
import { aggancia, anteprima, apriSala, leggiApertura, pianoAvvio, salaAperta, vistaSala, type Effetto, type SalaVeloce } from "./veloce";

/**
 * Stanze di gioco in memoria, uguali per tutti i giochi. Ogni telefono è identificato da un
 * token casuale salvato sul dispositivo: con quello rientra nello stesso posto dopo refresh o
 * caduta di rete. Il server decide chi può fare cosa (posti qui, regole nel modulo del gioco)
 * e manda a ognuno solo la sua vista.
 */

export interface Stanza {
  codice: string;
  gioco: GiocoQualsiasi;
  stato: any;
  /** Sala d'attesa della partita veloce: finché c'è, `stato` è null e la stanza non accetta azioni. */
  sala: SalaVeloce | null;
  tokenHost: string;
  /** token → posto scelto (null = ancora nella scelta del nome). */
  telefoni: Map<string, number | null>;
  ultimaAttivita: number;
}

/** Messaggi dal telefono al server. */
export type DaClient =
  /** `gioco` assente = Impostore (i client di prima non lo mandavano). */
  | { t: "crea"; gioco?: string; nomi: string[]; config: unknown; token?: string }
  /** `riprendi`: rientro con il token salvato (partita veloce); senza un token valido è un errore, non un nuovo posto. */
  | { t: "entra"; codice: string; token?: string; riprendi?: boolean }
  | { t: "azione"; azione: AzioneClient }
  | { t: "sollecita" }
  | { t: "chiudi" }
  /** Partita veloce: com'è la stanza aperta di questo gioco (se c'è). */
  | { t: "anteprimaVeloce"; gioco: string }
  /** Partita veloce: con `codice` entro nella stanza che ho visto; con `apri` ne apro una; senza nulla entro nella prima o ne apro una di base. */
  | { t: "veloce"; gioco: string; nome: string; codice?: string; apri?: AperturaVeloce }
  | { t: "esciDaSala" }
  | ({ t: "sala" } & ComandoSala)
  /** Compatibilità con i client di prima (PWA in cache): come `veloce` senza codice né apertura. */
  | { t: "coda"; gioco?: string; nome: string }
  | { t: "esciDaCoda" };

/**
 * Azioni che un telefono può chiedere: il server completa chi le fa. Quelle di posto le
 * gestisce il server; tutte le altre le traduce il modulo del gioco (`traduci`).
 */
export type AzioneClient =
  | { tipo: "occupa"; posto: number }
  | { tipo: "libera"; posto: number }
  /** Partita già avviata: un telefono senza posto riprende quello di un giocatore scollegato. */
  | { tipo: "riprendi"; posto: number }
  | RichiestaOnline;

/** Messaggi dal server al telefono. */
export type DaServer =
  | { t: "benvenuto"; codice: string; token: string }
  | { t: "vista"; vista: unknown }
  | { t: "sollecito" }
  | { t: "chiusa" }
  /** Com'è la stanza veloce aperta di un gioco (null = nessuna). */
  | { t: "anteprima"; gioco: string; sala: AnteprimaVeloce | null }
  /** Sala d'attesa della partita veloce, al posto di `vista` finché non si parte. */
  | { t: "salaVeloce"; sala: VistaSalaVeloce }
  /** Non sono più nella sala (sono uscito, è scaduta o l'organizzatore l'ha chiusa). */
  | { t: "fuoriSala"; motivo: "uscito" | "scaduta" | "chiusa" }
  | { t: "errore"; messaggio: string };

const LUNGHEZZA_CODICE = 5;

export function nuovoToken(): string {
  return randomBytes(16).toString("hex");
}

export function nuovoCodice(esistenti: { has(c: string): boolean }): string {
  for (;;) {
    let c = "";
    for (let i = 0; i < LUNGHEZZA_CODICE; i++) c += ALFABETO[randomInt(ALFABETO.length)];
    if (!esistenti.has(c)) return c;
  }
}

export function creaStanza(codice: string, nomi: string[], config: unknown, tokenHost: string, gioco: unknown = "impostore"): Stanza {
  const g = giocoOnline(gioco);
  return {
    codice,
    gioco: g,
    stato: g.nuovoStato(nomi, config),
    sala: null,
    tokenHost,
    telefoni: new Map([[tokenHost, null]]),
    ultimaAttivita: Date.now(),
  };
}

/** Stanza in sala d'attesa veloce: chi apre ne è l'organizzatore; lo stato del gioco nasce all'avvio. */
export function creaStanzaVeloce(codice: string, gioco: string, apertura: AperturaVeloce, token: string, nome: unknown, ora = Date.now()): Stanza {
  const g = giocoOnline(gioco);
  if (!g.veloce) throw new Error("noPartitaVeloce");
  return {
    codice,
    gioco: g,
    stato: null,
    sala: apriSala(gioco, g.veloce, apertura, token, nome, ora),
    tokenHost: token,
    telefoni: new Map([[token, null]]),
    ultimaAttivita: ora,
  };
}

/**
 * Avvio di una stanza veloce: crea lo stato con tutti i nomi, siede i telefoni ai posti 1..n
 * (secondo le squadre) e manda `avvia` per conto dell'organizzatore. Poi è una stanza normale.
 */
export function avviaSala(stanza: Stanza, casuale: (n: number) => number = randomInt): void {
  const sala = stanza.sala;
  const veloce = stanza.gioco.veloce;
  if (!sala || !veloce) throw new Error("nonInSala");
  const piano = pianoAvvio(sala, veloce, casuale);
  stanza.stato = stanza.gioco.nuovoStato(piano.nomi, piano.config);
  stanza.sala = null;
  stanza.tokenHost = piano.organizzatore;
  piano.ordine.forEach((a, i) => {
    stanza.telefoni.set(a.token, null);
    eseguiAzione(stanza, a.token, { tipo: "occupa", posto: i + 1 });
  });
  eseguiAzione(stanza, piano.organizzatore, { tipo: "avvia" });
}

/** Come si apre il telefono in una partita veloce (arriva dalla rete). */
export interface OpzioniVeloce {
  codice?: unknown;
  apri?: unknown;
}

/**
 * Un telefono tocca «Partita veloce»: entra nella stanza che ha visto (`codice`), apre la sua
 * (`apri`) o, senza nessuno dei due, entra nella prima aperta o ne apre una con le impostazioni
 * di base. Lancia `salaCambiata` / `salaApertaNelFrattempo` se nel frattempo la situazione è cambiata.
 */
export function entraVeloce(
  stanze: Map<string, Stanza>,
  gioco: string,
  token: string,
  nome: unknown,
  opz: OpzioniVeloce,
  ora: number,
  maxStanze: number,
): { stanza: Stanza; effetto: Effetto } {
  const g = giocoOnline(gioco);
  const v = g.veloce;
  if (!v) throw new Error("noPartitaVeloce");
  if (String(nome ?? "").trim() === "") throw new Error("nomiNonValidi");
  const aperta = salaAperta(stanze.values(), gioco);
  let stanza: Stanza | null = null;
  if (typeof opz.codice === "string") {
    const s = stanze.get(opz.codice.toUpperCase());
    if (!s?.sala || s.sala.gioco !== gioco || s.sala.arrivati.length >= s.sala.apertura.posti) throw new Error("salaCambiata");
    stanza = s;
  } else if (opz.apri !== undefined) {
    if (aperta) throw new Error("salaApertaNelFrattempo");
  } else {
    stanza = aperta;
  }
  if (stanza?.sala) {
    const effetto = aggancia(stanza.sala, v, token, nome, ora);
    stanza.telefoni.set(token, null);
    stanza.ultimaAttivita = ora;
    return { stanza, effetto };
  }
  if (stanze.size >= maxStanze) throw new Error("serverPieno");
  const apertura = leggiApertura(v, opz.apri ?? {});
  const nuova = creaStanzaVeloce(nuovoCodice(stanze), gioco, apertura, token, nome, ora);
  stanze.set(nuova.codice, nuova);
  return { stanza: nuova, effetto: { t: "aggiorna" } };
}

/** L'anteprima della stanza veloce aperta di un gioco (null = nessuna). */
export function anteprimaDi(stanze: Map<string, Stanza>, gioco: string) {
  if (!giocoOnline(gioco).veloce) throw new Error("noPartitaVeloce");
  const s = salaAperta(stanze.values(), gioco);
  return s?.sala ? anteprima(s.sala, s.codice) : null;
}

/** La sala d'attesa vista da un telefono. */
export function vistaSalaDi(stanza: Stanza, token: string, ora: number, connesso: Connesso = () => false): VistaSalaVeloce {
  if (!stanza.sala || !stanza.gioco.veloce) throw new Error("nonInSala");
  return vistaSala(stanza.sala, stanza.gioco.veloce, stanza.codice, token, ora, connesso);
}

/** Dice se un telefono (token) ha una connessione aperta in questo momento. */
export type Connesso = (token: string) => boolean;

export function vistaDi(stanza: Stanza, token: string, connesso: Connesso = () => false): any {
  if (stanza.sala) throw new Error("stanzaInSala");
  const collegati = new Set<number>();
  for (const [t, p] of stanza.telefoni) if (p !== null && connesso(t)) collegati.add(p);
  const organizzatore = stanza.telefoni.get(stanza.tokenHost) ?? null;
  return stanza.gioco.vistaPer(stanza.stato, stanza.telefoni.get(token) ?? null, token === stanza.tokenHost, { collegati, organizzatore });
}

/** Posti che il gioco sta aspettando (per «sollecita»). */
export function mancantiDi(stanza: Stanza): readonly number[] {
  return stanza.sala ? [] : (stanza.gioco.mancanti?.(stanza.stato) ?? []);
}

/**
 * Traduce la richiesta di un telefono in un'azione di gioco, controllando i permessi.
 * Lancia un errore con un messaggio da mostrare se non è permessa.
 */
export function eseguiAzione(stanza: Stanza, token: string, a: AzioneClient, connesso: Connesso = () => false): void {
  if (stanza.sala) throw new Error("stanzaInSala");
  const g = stanza.gioco;
  const host = token === stanza.tokenHost;
  const mio = stanza.telefoni.get(token) ?? null;
  const momento = g.momento(stanza.stato);
  const posto = Number((a as { posto?: unknown }).posto);

  switch (a.tipo) {
    case "occupa":
      if (mio !== null) throw new Error("giaScelto");
      if (momento !== "sala") throw new Error("giaIniziataAspetta");
      stanza.stato = g.applica(stanza.stato, { tipo: "occupa", posto });
      stanza.telefoni.set(token, posto);
      break;
    case "libera": {
      if (!host && posto !== mio) throw new Error("liberaSoloTuo");
      const inCorso = momento === "inCorso";
      if (inCorso && !host) throw new Error("liberaSoloHost");
      for (const [t, p] of stanza.telefoni) if (p === posto) stanza.telefoni.set(t, null);
      // Partita in corso: il giocatore resta nella partita, cambia solo il telefono che lo rappresenta.
      if (!inCorso) stanza.stato = g.applica(stanza.stato, { tipo: "libera", posto });
      break;
    }
    case "riprendi": {
      if (mio !== null) throw new Error("giaHaiPosto");
      if (momento === "sala") throw new Error("scegliDallaLista");
      if (!g.inGioco(stanza.stato).includes(posto)) throw new Error("nonPartecipa");
      const titolari = [...stanza.telefoni].filter(([, p]) => p === posto).map(([t]) => t);
      if (titolari.some(connesso)) {
        throw new Error("altroTelefono");
      }
      for (const t of titolari) stanza.telefoni.set(t, null);
      stanza.telefoni.set(token, posto);
      // Se il posto era dell'organizzatore (telefono caduto e perso), chi lo riprende lo diventa.
      if (titolari.includes(stanza.tokenHost)) stanza.tokenHost = token;
      break;
    }
    default: {
      const azione = g.traduci(stanza.stato, { posto: mio, host, seme: () => randomInt(2 ** 32), ora: () => Date.now() }, a as RichiestaOnline);
      if (azione === null) return;
      stanza.stato = g.applica(stanza.stato, azione);
    }
  }
  stanza.ultimaAttivita = Date.now();
}
