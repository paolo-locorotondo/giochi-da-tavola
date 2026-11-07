import { randomBytes, randomInt } from "node:crypto";
import { ALFABETO, MAX_CARATTERI_NOME, limitaTesto, type RichiestaOnline } from "@gdt/engine";
import { giocoOnline, type GiocoQualsiasi } from "./giochi";

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
  tokenHost: string;
  /** token → posto scelto (null = ancora nella scelta del nome). */
  telefoni: Map<string, number | null>;
  ultimaAttivita: number;
}

/** Messaggi dal telefono al server. */
export type DaClient =
  /** `gioco` assente = Impostore (i client di prima non lo mandavano). */
  | { t: "crea"; gioco?: string; nomi: string[]; config: unknown; token?: string }
  | { t: "entra"; codice: string; token?: string }
  | { t: "azione"; azione: AzioneClient }
  | { t: "sollecita" }
  | { t: "chiudi" }
  /** Partita veloce: mi metto in coda con il mio nome. */
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
  /** Sono (o non sono più) in coda per la partita veloce. */
  | { t: "inCoda"; in: boolean }
  /** Nessun avversario è arrivato in tempo. */
  | { t: "codaScaduta" }
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
    tokenHost,
    telefoni: new Map([[tokenHost, null]]),
    ultimaAttivita: Date.now(),
  };
}

/** Nomi puliti e distinti (senza distinguere maiuscole): al doppione si aggiunge « (2)», « (3)»… */
export function nomiDistinti(nomi: string[]): string[] {
  const visti = new Set<string>();
  return nomi.map((grezzo) => {
    const base = limitaTesto(grezzo.trim(), MAX_CARATTERI_NOME - 4);
    let nome = base;
    for (let n = 2; visti.has(nome.toLocaleLowerCase("it-IT")); n++) nome = `${base} (${n})`;
    visti.add(nome.toLocaleLowerCase("it-IT"));
    return nome;
  });
}

/**
 * Stanza di una partita veloce: i telefoni in coda siedono ai posti 1..n nell'ordine, il primo
 * è l'organizzatore, e la partita parte subito.
 */
export function creaStanzaDaCoda(codice: string, gioco: string, voci: { token: string; nome: string }[]): Stanza {
  const g = giocoOnline(gioco);
  if (!g.coda || voci.length !== g.coda.giocatori) throw new Error("Questo gioco non ha la partita veloce");
  const stanza = creaStanza(codice, nomiDistinti(voci.map((v) => v.nome)), {}, voci[0]!.token, gioco);
  voci.forEach((v, i) => {
    stanza.telefoni.set(v.token, null);
    eseguiAzione(stanza, v.token, { tipo: "occupa", posto: i + 1 });
  });
  eseguiAzione(stanza, voci[0]!.token, { tipo: "avvia" });
  return stanza;
}

/** Dice se un telefono (token) ha una connessione aperta in questo momento. */
export type Connesso = (token: string) => boolean;

export function vistaDi(stanza: Stanza, token: string, connesso: Connesso = () => false): any {
  const collegati = new Set<number>();
  for (const [t, p] of stanza.telefoni) if (p !== null && connesso(t)) collegati.add(p);
  const organizzatore = stanza.telefoni.get(stanza.tokenHost) ?? null;
  return stanza.gioco.vistaPer(stanza.stato, stanza.telefoni.get(token) ?? null, token === stanza.tokenHost, { collegati, organizzatore });
}

/** Posti che il gioco sta aspettando (per «sollecita»). */
export function mancantiDi(stanza: Stanza): readonly number[] {
  return stanza.gioco.mancanti?.(stanza.stato) ?? [];
}

/**
 * Traduce la richiesta di un telefono in un'azione di gioco, controllando i permessi.
 * Lancia un errore con un messaggio da mostrare se non è permessa.
 */
export function eseguiAzione(stanza: Stanza, token: string, a: AzioneClient, connesso: Connesso = () => false): void {
  const g = stanza.gioco;
  const host = token === stanza.tokenHost;
  const mio = stanza.telefoni.get(token) ?? null;
  const momento = g.momento(stanza.stato);
  const posto = Number((a as { posto?: unknown }).posto);

  switch (a.tipo) {
    case "occupa":
      if (mio !== null) throw new Error("Hai già scelto il tuo nome");
      if (momento !== "sala") throw new Error("La partita è già iniziata: aspetta la prossima");
      stanza.stato = g.applica(stanza.stato, { tipo: "occupa", posto });
      stanza.telefoni.set(token, posto);
      break;
    case "libera": {
      if (!host && posto !== mio) throw new Error("Puoi liberare solo il tuo nome");
      const inCorso = momento === "inCorso";
      if (inCorso && !host) throw new Error("Durante la partita solo l'organizzatore può liberare un posto");
      for (const [t, p] of stanza.telefoni) if (p === posto) stanza.telefoni.set(t, null);
      // Partita in corso: il giocatore resta nella partita, cambia solo il telefono che lo rappresenta.
      if (!inCorso) stanza.stato = g.applica(stanza.stato, { tipo: "libera", posto });
      break;
    }
    case "riprendi": {
      if (mio !== null) throw new Error("Hai già un posto");
      if (momento === "sala") throw new Error("Scegli il tuo nome dalla lista");
      if (!g.inGioco(stanza.stato).includes(posto)) throw new Error("Questo giocatore non partecipa");
      const titolari = [...stanza.telefoni].filter(([, p]) => p === posto).map(([t]) => t);
      if (titolari.some(connesso)) {
        throw new Error("Quel giocatore risulta collegato da un altro telefono: se è il tuo, chiedi all'organizzatore di liberarlo");
      }
      for (const t of titolari) stanza.telefoni.set(t, null);
      stanza.telefoni.set(token, posto);
      // Se il posto era dell'organizzatore (telefono caduto e perso), chi lo riprende lo diventa.
      if (titolari.includes(stanza.tokenHost)) stanza.tokenHost = token;
      break;
    }
    default: {
      const azione = g.traduci(stanza.stato, { posto: mio, host, seme: () => randomInt(2 ** 32) }, a as RichiestaOnline);
      if (azione === null) return;
      stanza.stato = g.applica(stanza.stato, azione);
    }
  }
  stanza.ultimaAttivita = Date.now();
}
