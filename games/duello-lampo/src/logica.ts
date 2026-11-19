import type { Rng } from "@gdt/engine";
import { ID_MINIGIOCHI, ID_SPAREGGIO, type Lato } from "./minigiochi";

/** Errori di configurazione: la UI li traduce con la chiave `errore_<codice>`. */
export type CodiceErrore = "nessunMinigioco" | "minigiocoSconosciuto" | "roundNonValidi";

export class ErroreDuello extends Error {
  constructor(public readonly codice: CodiceErrore) {
    super(codice);
  }
}

export const ROUND_MIN = 1;
export const ROUND_MAX = 21;
export const ROUND_PREDEFINITI = 7;
/** Scelte proposte per il numero di round. */
export const ROUND_SCELTE = [3, 5, 7, 9, 11] as const;

export interface Sfida {
  /** Mini giochi scelti (almeno uno). */
  minigiochi: readonly string[];
  /** Quanti mini giochi si giocano (senza lo spareggio). */
  round: number;
}

export interface Partita {
  /** I mini giochi dei round, in ordine; con lo spareggio si allunga. */
  scaletta: readonly string[];
  /** Quanti round si giocano senza spareggio. */
  totale: number;
  /** Indice del round in corso; uguale a `scaletta.length` a partita finita. */
  round: number;
  punti: readonly [number, number];
}

/**
 * L'ordine dei mini giochi: a «sacchetti» (ognuno esce una volta prima che si ripeta) e mai lo
 * stesso due volte di fila, salvo che ce ne sia uno solo.
 */
export function creaScaletta(ids: readonly string[], round: number, rng: Rng): string[] {
  if (ids.length === 0) throw new ErroreDuello("nessunMinigioco");
  const scaletta: string[] = [];
  while (scaletta.length < round) {
    let sacchetto = rng.mescola(ids);
    // Se il sacchetto inizia come finisce il precedente, il primo passa in fondo.
    if (sacchetto.length > 1 && sacchetto[0] === scaletta[scaletta.length - 1]) {
      sacchetto = [...sacchetto.slice(1), sacchetto[0] as string];
    }
    scaletta.push(...sacchetto);
  }
  return scaletta.slice(0, round);
}

/** Controlla la scelta (può venire da un salvataggio vecchio) e prepara la partita. */
export function nuovaPartita(sfida: Sfida, rng: Rng): Partita {
  if (!Number.isInteger(sfida.round) || sfida.round < ROUND_MIN || sfida.round > ROUND_MAX) {
    throw new ErroreDuello("roundNonValidi");
  }
  if (sfida.minigiochi.length === 0) throw new ErroreDuello("nessunMinigioco");
  if (sfida.minigiochi.some((id) => !ID_MINIGIOCHI.includes(id))) throw new ErroreDuello("minigiocoSconosciuto");
  return { scaletta: creaScaletta(sfida.minigiochi, sfida.round, rng), totale: sfida.round, round: 0, punti: [0, 0] };
}

export const finita = (p: Partita): boolean => p.round >= p.scaletta.length;

/** Il mini gioco del round in corso. */
export const idCorrente = (p: Partita): string | undefined => p.scaletta[p.round];

/** Vero se il round in corso è uno spareggio. */
export const inSpareggio = (p: Partita): boolean => p.round >= p.totale;

/**
 * Chiude il round in corso: 1 punto a chi ha vinto (nessuno se è pari). Se sono finiti i round e
 * i punti sono pari si aggiunge un round di spareggio, e così finché qualcuno è in vantaggio.
 */
export function assegna(p: Partita, vincitore: Lato | null): Partita {
  if (finita(p)) return p;
  const punti: [number, number] = [p.punti[0], p.punti[1]];
  if (vincitore !== null) punti[vincitore] += 1;
  const round = p.round + 1;
  const scaletta = round >= p.scaletta.length && punti[0] === punti[1] ? [...p.scaletta, ID_SPAREGGIO] : p.scaletta;
  return { ...p, punti, round, scaletta };
}

/** Chi ha vinto la sfida; `null` se non è finita. */
export function vincitorePartita(p: Partita): Lato | null {
  if (!finita(p)) return null;
  return p.punti[0] > p.punti[1] ? 0 : 1;
}

/** Sceglie a caso un sottoinsieme non vuoto (almeno uno, al massimo tutti tranne uno se ce ne sono più di uno). */
export function sceltaACaso(ids: readonly string[], rng: Rng): string[] {
  if (ids.length <= 1) return [...ids];
  const quanti = 1 + rng.intero(ids.length - 1);
  const scelti = new Set(rng.mescola(ids).slice(0, quanti));
  return ids.filter((id) => scelti.has(id));
}
