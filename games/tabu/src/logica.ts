import { creaRng } from "@gdt/engine";
import type { Carta } from "./carte";

export interface Squadra {
  nome: string;
  punti: number;
}

export interface Partita {
  squadre: [Squadra, Squadra];
  /** Quanti turni a testa prima della fine. */
  turniPerSquadra: number;
  secondiTurno: number;
  /** Turno in corso, a partire da 0: pari = squadra 0, dispari = squadra 1. */
  turno: number;
  mazzo: Carta[];
  prossima: number;
  /** Turni già chiusi, in ordine: servono al riepilogo finale con tutte le carte. */
  storico: { squadra: 0 | 1; turno: Turno }[];
}

export type Fase = "pronti" | "gioco" | "riepilogo" | "fine";

export interface Turno {
  corrette: string[];
  saltate: string[];
  /** Parole vietate pronunciate (penalità). */
  errori: string[];
}

export function nuovaPartita(
  nomi: [string, string],
  turniPerSquadra: number,
  secondiTurno: number,
  carte: readonly Carta[],
  seme: number,
): Partita {
  return {
    squadre: [
      { nome: nomi[0], punti: 0 },
      { nome: nomi[1], punti: 0 },
    ],
    turniPerSquadra,
    secondiTurno,
    turno: 0,
    mazzo: creaRng(seme).mescola(carte),
    prossima: 0,
    storico: [],
  };
}

export function squadraDiTurno(p: Partita): 0 | 1 {
  return (p.turno % 2) as 0 | 1;
}

export function cartaCorrente(p: Partita): Carta {
  const c = p.mazzo[p.prossima % p.mazzo.length];
  if (!c) throw new Error("Mazzo vuoto");
  return c;
}

export function avanzaCarta(p: Partita): Partita {
  return { ...p, prossima: p.prossima + 1 };
}

export function punteggioTurno(t: Turno): number {
  return t.corrette.length - t.errori.length;
}

/** Chiude il turno: assegna i punti alla squadra di turno e passa al successivo. */
export function chiudiTurno(p: Partita, t: Turno): Partita {
  const s = squadraDiTurno(p);
  const squadre: [Squadra, Squadra] = [{ ...p.squadre[0] }, { ...p.squadre[1] }];
  squadre[s].punti += punteggioTurno(t);
  return { ...p, squadre, turno: p.turno + 1, storico: [...p.storico, { squadra: s, turno: t }] };
}

/** Tutte le carte di tre tipi giocate finora, da tutti i turni chiusi. */
export function carteDellaPartita(p: Partita): Turno {
  return {
    corrette: p.storico.flatMap((x) => x.turno.corrette),
    saltate: p.storico.flatMap((x) => x.turno.saltate),
    errori: p.storico.flatMap((x) => x.turno.errori),
  };
}

export function eFinita(p: Partita): boolean {
  return p.turno >= p.turniPerSquadra * 2;
}

export function vincitrice(p: Partita): 0 | 1 | null {
  const [a, b] = p.squadre;
  if (a.punti === b.punti) return null;
  return a.punti > b.punti ? 0 : 1;
}
