import { colore } from "./colore";
import { memoria } from "./memoria";
import { panda } from "./panda";
import { raffica } from "./raffica";
import { stop } from "./stop";
import type { MiniGioco } from "./tipi";
import { via } from "./via";

/** Ogni mini gioco ha i suoi tipi: la partita non li guarda. */
export type MiniGiocoQualsiasi = MiniGioco<any, any>;

/**
 * Registro dei mini giochi, nell'ordine in cui compaiono nella scelta.
 * Per aggiungerne uno: il suo file in questa cartella e una riga qui (vedi README del gioco).
 */
export const MINIGIOCHI: readonly MiniGiocoQualsiasi[] = [via, raffica, stop, colore, panda, memoria];

export const ID_MINIGIOCHI: readonly string[] = MINIGIOCHI.map((m) => m.id);

/** Il mini gioco con questo id; lancia un errore se non esiste (la scelta salvata può essere vecchia). */
export function miniGioco(id: string): MiniGiocoQualsiasi {
  const m = MINIGIOCHI.find((g) => g.id === id);
  if (!m) throw new Error(`miniGioco: id sconosciuto «${id}»`);
  return m;
}

/** Quello dello spareggio: serve solo il tempo di reazione, che non lascia pari. */
export const ID_SPAREGGIO = via.id;

export { NESSUNO, confronta } from "./tipi";
export type { Lato, MiniGioco, Nessuno } from "./tipi";
