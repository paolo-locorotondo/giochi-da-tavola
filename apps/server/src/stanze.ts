import { randomBytes, randomInt } from "node:crypto";
import { ALFABETO } from "@gdt/engine";
import {
  applica,
  nuovoStato,
  vistaPer,
  type AzioneOnline,
  type ConfigOnline,
  type StatoOnline,
  type Vista,
} from "@gdt/impostore/online";

/**
 * Stanze di gioco in memoria. Ogni telefono è identificato da un token casuale salvato sul
 * dispositivo: con quello rientra nello stesso posto dopo refresh o caduta di rete.
 * Il server decide chi può fare cosa e manda a ognuno solo la sua vista.
 */

export interface Stanza {
  codice: string;
  stato: StatoOnline;
  tokenHost: string;
  /** token → posto scelto (null = ancora nella scelta del nome). */
  telefoni: Map<string, number | null>;
  ultimaAttivita: number;
}

/** Messaggi dal telefono al server. */
export type DaClient =
  | { t: "crea"; nomi: string[]; config: ConfigOnline; token?: string }
  | { t: "entra"; codice: string; token?: string }
  | { t: "azione"; azione: AzioneClient }
  | { t: "sollecita" }
  | { t: "chiudi" };

/** Azioni che un telefono può chiedere: il server completa chi le fa. */
export type AzioneClient =
  | { tipo: "occupa"; posto: number }
  | { tipo: "libera"; posto: number }
  /** Partita già avviata: un telefono senza posto riprende quello di un giocatore scollegato. */
  | { tipo: "riprendi"; posto: number }
  | { tipo: "avvia" }
  | { tipo: "avanti" }
  | { tipo: "visto" }
  /** Indizi scritti: il giocatore di turno invia il suo. */
  | { tipo: "indizio"; testo: string }
  | { tipo: "vota"; posto: number }
  | { tipo: "tenta"; testo: string }
  | { tipo: "nuova" };

/** Messaggi dal server al telefono. */
export type DaServer =
  | { t: "benvenuto"; codice: string; token: string }
  | { t: "vista"; vista: Vista }
  | { t: "sollecito" }
  | { t: "chiusa" }
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

export function creaStanza(
  codice: string,
  nomi: string[],
  config: ConfigOnline,
  tokenHost: string,
): Stanza {
  return {
    codice,
    stato: nuovoStato(nomi, config),
    tokenHost,
    telefoni: new Map([[tokenHost, null]]),
    ultimaAttivita: Date.now(),
  };
}

/** Dice se un telefono (token) ha una connessione aperta in questo momento. */
export type Connesso = (token: string) => boolean;

export function vistaDi(stanza: Stanza, token: string, connesso: Connesso = () => false): Vista {
  const vista = vistaPer(stanza.stato, stanza.telefoni.get(token) ?? null, token === stanza.tokenHost);
  const collegati = new Set<number>();
  for (const [t, p] of stanza.telefoni) if (p !== null && connesso(t)) collegati.add(p);
  const organizzatore = stanza.telefoni.get(stanza.tokenHost) ?? null;
  return {
    ...vista,
    nomi: vista.nomi.map((n) => ({ ...n, collegato: collegati.has(n.posto), organizzatore: n.posto === organizzatore })),
  };
}

/**
 * Traduce la richiesta di un telefono in un'azione di gioco, controllando i permessi.
 * Lancia un errore con un messaggio da mostrare se non è permessa.
 */
export function eseguiAzione(stanza: Stanza, token: string, a: AzioneClient, connesso: Connesso = () => false): void {
  const host = token === stanza.tokenHost;
  const mio = stanza.telefoni.get(token) ?? null;
  const s = stanza.stato;
  const soloHost = () => {
    if (!host) throw new Error("Solo chi ha creato la partita può farlo");
  };

  let azione: AzioneOnline;
  switch (a.tipo) {
    case "occupa":
      if (mio !== null) throw new Error("Hai già scelto il tuo nome");
      if (s.fase !== "sala") throw new Error("La partita è già iniziata: aspetta la prossima");
      azione = { tipo: "occupa", posto: a.posto };
      break;
    case "libera": {
      if (!host && a.posto !== mio) throw new Error("Puoi liberare solo il tuo nome");
      const inCorso = s.fase !== "sala" && s.fase !== "fine";
      if (inCorso && !host) throw new Error("Durante la partita solo l'organizzatore può liberare un posto");
      for (const [t, p] of stanza.telefoni) if (p === a.posto) stanza.telefoni.set(t, null);
      stanza.ultimaAttivita = Date.now();
      // Partita in corso: il giocatore resta nella partita, cambia solo il telefono che lo rappresenta.
      if (inCorso) return;
      azione = { tipo: "libera", posto: a.posto };
      break;
    }
    case "riprendi": {
      if (mio !== null) throw new Error("Hai già un posto");
      if (s.fase === "sala") throw new Error("Scegli il tuo nome dalla lista");
      if (!s.inGioco.includes(a.posto)) throw new Error("Questo giocatore non partecipa");
      const titolari = [...stanza.telefoni].filter(([, p]) => p === a.posto).map(([t]) => t);
      if (titolari.some(connesso)) {
        throw new Error("Quel giocatore risulta collegato da un altro telefono: se è il tuo, chiedi all'organizzatore di liberarlo");
      }
      for (const t of titolari) stanza.telefoni.set(t, null);
      stanza.telefoni.set(token, a.posto);
      // Se il posto era dell'organizzatore (telefono caduto e perso), chi lo riprende lo diventa.
      if (titolari.includes(stanza.tokenHost)) stanza.tokenHost = token;
      stanza.ultimaAttivita = Date.now();
      return;
    }
    case "avvia":
      soloHost();
      azione = { tipo: "avvia", seme: randomInt(2 ** 32) };
      break;
    case "avanti":
      soloHost();
      azione = { tipo: "avanti" };
      break;
    case "nuova":
      soloHost();
      azione = { tipo: "nuova" };
      break;
    case "visto":
      if (mio === null) return;
      azione = { tipo: "visto", posto: mio };
      break;
    case "indizio":
      if (mio === null) throw new Error("Scegli prima il tuo nome");
      azione = { tipo: "indizio", chi: mio, testo: String(a.testo ?? "") };
      break;
    case "vota": {
      // Si vota solo dal proprio telefono: nessuno vota per un altro.
      if (mio === null) throw new Error("Scegli prima il tuo nome");
      azione = { tipo: "vota", chi: mio, posto: a.posto };
      break;
    }
    case "tenta":
      if (mio === null || mio !== s.eliminato) throw new Error("Solo l'impostore scoperto può tentare");
      azione = { tipo: "tenta", testo: a.testo };
      break;
  }

  stanza.stato = applica(s, azione);
  if (azione.tipo === "occupa") stanza.telefoni.set(token, azione.posto);
  stanza.ultimaAttivita = Date.now();
}
