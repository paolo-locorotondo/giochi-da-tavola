import { confronta, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/** «Via!»: lo schermo diventa verde dopo un'attesa casuale e vince chi tocca per primo. */
export interface ConfigVia {
  /** Attesa prima del «ORA!», in millisecondi. */
  attesaMs: number;
}

/** `ms` = tempo di reazione; `anticipo` = ha toccato prima del via (il peggiore). */
export type RisultatoVia = { ms: number } | { anticipo: true };

export const ATTESA_MIN_MS = 1500;
export const ATTESA_MAX_MS = 5000;
/** Dopo il via si aspetta al massimo questo tempo, poi il round si chiude senza vincitore. */
export const MARGINE_MS = 3000;
/** Sotto questa differenza (ms) i due tocchi contano come pari. */
export const SOGLIA_PARI_MS = 1;

/** 0 = il migliore (ha reagito), 1 = non ha toccato, 2 = ha toccato prima del via. */
function grado(r: RisultatoVia | Nessuno): 0 | 1 | 2 {
  if ("anticipo" in r) return 2;
  if ("nessuno" in r) return 1;
  return 0;
}

export const via: MiniGioco<ConfigVia, RisultatoVia> = {
  id: "via",
  prepara: (rng) => ({ attesaMs: ATTESA_MIN_MS + rng.intero(ATTESA_MAX_MS - ATTESA_MIN_MS + 1) }),
  durataMassima: (c) => c.attesaMs + MARGINE_MS,
  chiudeAlPrimo: true,
  vincitore(_config, [a, b]): Lato | null {
    const ga = grado(a);
    const gb = grado(b);
    if (ga !== gb) return ga < gb ? 0 : 1;
    // Stesso grado: solo due tempi si possono confrontare; due anticipi o due assenze sono pari.
    if ("ms" in a && "ms" in b) return confronta(a.ms, b.ms, "minore", SOGLIA_PARI_MS);
    return null;
  },
};
