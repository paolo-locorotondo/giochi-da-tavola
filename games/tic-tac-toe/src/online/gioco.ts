import { MAX_CARATTERI_NOME, limitaTesto, type GiocoOnline } from "@gdt/engine";
import {
  aggiungiEsito,
  ErroreTris,
  muovi,
  nuovaPartita,
  punteggioVuoto,
  type Casella,
  type Esito,
  type Partita,
  type Punteggio,
  type Segno,
} from "../logica";

/**
 * Tris con un telefono per giocatore. Modulo puro: lo usa il server, che tiene lo stato e
 * manda a ognuno la sua vista. Posto 1 = X, posto 2 = O. Chi inizia alterna a ogni partita.
 * Nel Tris non ci sono segreti: la vista è uguale per tutti, chi non ha un posto guarda.
 */

export type FaseOnline = "sala" | "partita" | "fine";

const POSTI = [1, 2] as const;
const eUnPosto = (p: number) => p === 1 || p === 2;
const segnoDi = (posto: number): Segno => (posto === 1 ? "X" : "O");
const postoDi = (segno: Segno): number => (segno === "X" ? 1 : 2);

export interface StatoOnline {
  fase: FaseOnline;
  nomi: string[];
  /** Posti scelti da un telefono. */
  occupati: number[];
  partita: Partita | null;
  /** Il posto che ha aperto la partita in corso. */
  iniziaPosto: number;
  punteggio: Punteggio;
  /** Posti che hanno chiesto la rivincita (a partita finita). */
  rivincita: number[];
}

export type AzioneOnline =
  | { tipo: "occupa"; posto: number }
  | { tipo: "libera"; posto: number }
  | { tipo: "avvia" }
  | { tipo: "muovi"; chi: number; casella: number }
  | { tipo: "rivincita"; chi: number };

/** Nomi dei due giocatori (obbligatori e diversi). Nessuna impostazione. */
export function nuovoStato(nomi: string[]): StatoOnline {
  if (!Array.isArray(nomi) || nomi.length !== 2) throw new ErroreTris("nomiNonValidi");
  const puliti = nomi.map((n) => limitaTesto(String(n).trim(), MAX_CARATTERI_NOME));
  if (puliti.some((n) => !n) || puliti[0]!.toLocaleLowerCase("it-IT") === puliti[1]!.toLocaleLowerCase("it-IT")) {
    throw new ErroreTris("nomiNonValidi");
  }
  return { fase: "sala", nomi: puliti, occupati: [], partita: null, iniziaPosto: 1, punteggio: punteggioVuoto(), rivincita: [] };
}

/** Applica un'azione. Lancia un `ErroreTris` se non è permessa in questa fase. */
export function applica(s: StatoOnline, a: AzioneOnline): StatoOnline {
  switch (a.tipo) {
    case "occupa":
      if (!eUnPosto(a.posto)) throw new ErroreTris("nomeInesistente");
      if (s.occupati.includes(a.posto)) throw new ErroreTris("nomeOccupato");
      return { ...s, occupati: [...s.occupati, a.posto] };

    case "libera":
      // A partita avviata il posto resta del giocatore: cambia solo il telefono (lo decide il server).
      return s.fase === "sala" ? { ...s, occupati: s.occupati.filter((p) => p !== a.posto) } : s;

    case "avvia":
      if (s.fase !== "sala") throw new ErroreTris("giaIniziata");
      if (s.occupati.length < 2) throw new ErroreTris("pochiHannoScelto");
      return { ...s, fase: "partita", partita: nuovaPartita(segnoDi(1)), iniziaPosto: 1, rivincita: [] };

    case "muovi": {
      if (s.fase !== "partita" || !s.partita) throw new ErroreTris("nonInCorso");
      if (!eUnPosto(a.chi)) throw new ErroreTris("nonPartecipa");
      if (segnoDi(a.chi) !== s.partita.turno) throw new ErroreTris("nonTocca");
      const partita = muovi(s.partita, a.casella);
      if (!partita.esito) return { ...s, partita };
      return { ...s, fase: "fine", partita, punteggio: aggiungiEsito(s.punteggio, partita.esito), rivincita: [] };
    }

    case "rivincita": {
      if (s.fase !== "fine") throw new ErroreTris("nonFinita");
      if (!eUnPosto(a.chi)) throw new ErroreTris("nonPartecipa");
      const rivincita = s.rivincita.includes(a.chi) ? s.rivincita : [...s.rivincita, a.chi];
      if (rivincita.length < 2) return { ...s, rivincita };
      const iniziaPosto = s.iniziaPosto === 1 ? 2 : 1;
      return { ...s, fase: "partita", partita: nuovaPartita(segnoDi(iniziaPosto)), iniziaPosto, rivincita: [] };
    }
  }
}

/** Posti che il gioco aspetta: chi deve muovere, o chi non ha ancora chiesto la rivincita. */
export function mancanti(s: StatoOnline): number[] {
  if (s.fase === "partita" && s.partita) return [postoDi(s.partita.turno)];
  if (s.fase === "fine") return POSTI.filter((p) => !s.rivincita.includes(p));
  return [];
}

export interface Vista {
  fase: FaseOnline;
  /** Il mio posto; null se non ne ho uno (chi guarda). */
  io: number | null;
  host: boolean;
  nomi: {
    posto: number;
    nome: string;
    segno: Segno;
    occupato: boolean;
    /** Lo riempie il server, che conosce le connessioni. */
    collegato: boolean;
    organizzatore: boolean;
  }[];
  griglia: readonly Casella[];
  /** Il posto di turno; null fuori dalla partita. */
  turno: number | null;
  /** Posso muovere adesso. */
  mioTurno: boolean;
  esito: Esito | null;
  /** Il posto che ha vinto; null = pareggio o partita in corso. */
  vincitore: number | null;
  punteggio: Punteggio;
  /** Rivincita: l'ho chiesta io / l'ha chiesta l'altro. */
  rivincita: { io: boolean; altro: boolean };
}

export function vistaPer(s: StatoOnline, posto: number | null, host: boolean): Vista {
  const p = s.partita;
  const turno = s.fase === "partita" && p ? postoDi(p.turno) : null;
  const altro = posto === null ? null : posto === 1 ? 2 : 1;
  return {
    fase: s.fase,
    io: posto,
    host,
    nomi: s.nomi.map((nome, i) => ({
      posto: i + 1,
      nome,
      segno: segnoDi(i + 1),
      occupato: s.occupati.includes(i + 1),
      collegato: false,
      organizzatore: false,
    })),
    griglia: p ? p.griglia : Array<Casella>(9).fill(null),
    turno,
    mioTurno: posto !== null && turno === posto,
    esito: p?.esito ?? null,
    vincitore: p?.esito?.vincitore ? postoDi(p.esito.vincitore) : null,
    punteggio: s.punteggio,
    rivincita: { io: posto !== null && s.rivincita.includes(posto), altro: altro !== null && s.rivincita.includes(altro) },
  };
}

export const trisOnline: GiocoOnline<StatoOnline, AzioneOnline, Vista> = {
  id: "tris",
  nuovoStato: (nomi) => nuovoStato(nomi),
  applica,
  momento: (s) => (s.fase === "sala" ? "sala" : s.fase === "fine" ? "fine" : "inCorso"),
  inGioco: (s) => (s.fase === "sala" ? [] : POSTI),
  mancanti,

  traduci(_s, ctx, a) {
    const mio = ctx.posto;
    switch (a.tipo) {
      case "avvia":
        if (!ctx.host) throw new Error("Solo chi ha creato la partita può farlo");
        return { tipo: "avvia" };
      case "muovi":
        if (mio === null) throw new ErroreTris("nonPartecipa");
        return { tipo: "muovi", chi: mio, casella: Number(a.casella) };
      case "rivincita":
        if (mio === null) throw new ErroreTris("nonPartecipa");
        return { tipo: "rivincita", chi: mio };
      default:
        throw new ErroreTris("azioneNonValida");
    }
  },

  vistaPer(s, posto, host, presenze) {
    const v = vistaPer(s, posto, host);
    return {
      ...v,
      nomi: v.nomi.map((n) => ({ ...n, collegato: presenze.collegati.has(n.posto), organizzatore: n.posto === presenze.organizzatore })),
    };
  },
};
