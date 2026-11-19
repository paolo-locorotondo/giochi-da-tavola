import type { Rng } from "@gdt/engine";
import { ID_MINIGIOCHI, ID_SPAREGGIO, miniGioco, valoriCompleti, type Lato, type ValoriImpostazioni } from "./minigiochi";

/** Errori di configurazione: la UI li traduce con la chiave `errore_<codice>`. */
export type CodiceErrore = "nessunMinigioco" | "minigiocoSconosciuto" | "roundNonValidi";

export class ErroreDuello extends Error {
  constructor(public readonly codice: CodiceErrore) {
    super(codice);
  }
}

/** Massimo di mani (round di fila) di un singolo mini gioco. */
export const MANI_MAX = 9;
/** Mani proposte all'inizio per ogni mini gioco. */
export const MANI_PREDEFINITE = 2;

/** Quante mani giocare a ogni mini gioco (per `id`); 0 o assente = il mini gioco non si usa. */
export type Mani = Readonly<Record<string, number>>;

/** Le impostazioni scelte per ogni mini gioco (per `id`, poi per chiave); quelle assenti valgono la base. */
export type ImpostazioniSfida = Readonly<Record<string, Partial<Record<string, unknown>>>>;

export interface Sfida {
  mani: Mani;
  impostazioni?: ImpostazioniSfida;
}

export interface Partita {
  /** I mini giochi dei round, in ordine; con lo spareggio si allunga. */
  scaletta: readonly string[];
  /** Quanti round si giocano senza spareggio. */
  totale: number;
  /** Indice del round in corso; uguale a `scaletta.length` a partita finita. */
  round: number;
  punti: readonly [number, number];
  /** Le impostazioni di ogni mini gioco, già complete e corrette. */
  impostazioni: Readonly<Record<string, ValoriImpostazioni>>;
}

/** Il totale dei round della sfida. */
export const totaleRound = (mani: Mani): number => ID_MINIGIOCHI.reduce((s, id) => s + (mani[id] ?? 0), 0);

/**
 * L'ordine dei round: i mini giochi nell'ordine del registro, ognuno per le sue mani **di fila**
 * (es. Via! due volte, poi Stop al centro tre volte).
 */
export function creaScaletta(mani: Mani): string[] {
  return ID_MINIGIOCHI.flatMap((id) => Array<string>(mani[id] ?? 0).fill(id));
}

/** Controlla la scelta (può venire da un salvataggio vecchio) e prepara la partita. */
export function nuovaPartita(sfida: Sfida): Partita {
  const voci = Object.entries(sfida.mani);
  if (voci.some(([id]) => !ID_MINIGIOCHI.includes(id))) throw new ErroreDuello("minigiocoSconosciuto");
  if (voci.some(([, n]) => !Number.isInteger(n) || n < 0 || n > MANI_MAX)) throw new ErroreDuello("roundNonValidi");
  const scaletta = creaScaletta(sfida.mani);
  if (scaletta.length === 0) throw new ErroreDuello("nessunMinigioco");
  const impostazioni = Object.fromEntries(
    ID_MINIGIOCHI.map((id) => [id, valoriCompleti(miniGioco(id).impostazioni, sfida.impostazioni?.[id])]),
  );
  return { scaletta, totale: scaletta.length, round: 0, punti: [0, 0], impostazioni };
}

export const finita = (p: Partita): boolean => p.round >= p.scaletta.length;

/** Il mini gioco del round in corso. */
export const idCorrente = (p: Partita): string | undefined => p.scaletta[p.round];

/** Le impostazioni di un mini gioco in questa partita (la base, se il mini gioco non ne ha). */
export const impostazioniDi = (p: Partita, id: string): ValoriImpostazioni => p.impostazioni[id] ?? {};

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

/** Una scelta a caso: almeno un mini gioco in meno di quelli disponibili (se più di uno), ognuno con 1–3 mani. */
export function maniACaso(rng: Rng): Record<string, number> {
  const ids = ID_MINIGIOCHI;
  const usati = ids.length <= 1 ? new Set(ids) : new Set(rng.mescola(ids).slice(0, 1 + rng.intero(ids.length - 1)));
  return Object.fromEntries(ids.map((id) => [id, usati.has(id) ? 1 + rng.intero(3) : 0]));
}
