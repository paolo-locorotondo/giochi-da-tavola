import { confronta, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Trova il panda»: una griglia di animali colorati, ognuno girato in una direzione. A un certo
 * punto compare un panda in una casella e vince chi lo tocca per primo. Chi tocca un altro
 * animale perde il round. Le due metà hanno la stessa griglia, e ognuno vede la sua.
 */
export const ANIMALI = ["gatto", "cane", "uccello", "pesce", "coniglio", "topo", "lumaca", "scoiattolo", "tartaruga"] as const;
export type Animale = (typeof ANIMALI)[number];

/** Quanti colori diversi (indici in una tavolozza di token) si usano per gli animali. */
export const NUMERO_COLORI = 5;
export const COLONNE = 4;
export const RIGHE = 4;
export const CASELLE = COLONNE * RIGHE;

export interface CasellaPanda {
  animale: Animale;
  /** Indice del colore, da 0 a `NUMERO_COLORI - 1`. */
  colore: number;
  /** Rotazione in gradi, a passi di 45. */
  gradi: number;
}

export interface ConfigPanda {
  /** Gli animali della griglia, in ordine di lettura (riga per riga). */
  caselle: readonly CasellaPanda[];
  /** La casella in cui compare il panda. */
  posizionePanda: number;
  /** Colore e rotazione del panda quando compare. */
  panda: { colore: number; gradi: number };
  /** Attesa prima che il panda compaia, in millisecondi. */
  attesaMs: number;
}

/**
 * `ms` dall'apparizione del panda; `trovato` dice se ha toccato il panda. Chi tocca un altro
 * animale, o qualsiasi casella prima che il panda compaia, ha `trovato: false`.
 */
export interface RisultatoPanda {
  trovato: boolean;
  ms: number;
}

export const ATTESA_MIN_MS = 1500;
export const ATTESA_MAX_MS = 4500;
export const MARGINE_MS = 5000;
export const SOGLIA_PARI_MS = 1;

/** 0 = ha trovato il panda, 1 = non ha toccato, 2 = ha toccato la casella sbagliata. */
function grado(r: RisultatoPanda | Nessuno): 0 | 1 | 2 {
  if ("nessuno" in r) return 1;
  return r.trovato ? 0 : 2;
}

export const panda: MiniGioco<ConfigPanda, RisultatoPanda> = {
  id: "panda",
  prepara(rng) {
    const caselle: CasellaPanda[] = Array.from({ length: CASELLE }, () => ({
      animale: ANIMALI[rng.intero(ANIMALI.length)] as Animale,
      colore: rng.intero(NUMERO_COLORI),
      gradi: rng.intero(8) * 45,
    }));
    return {
      caselle,
      posizionePanda: rng.intero(CASELLE),
      panda: { colore: rng.intero(NUMERO_COLORI), gradi: rng.intero(8) * 45 },
      attesaMs: ATTESA_MIN_MS + rng.intero(ATTESA_MAX_MS - ATTESA_MIN_MS + 1),
    };
  },
  durataMassima: (c) => c.attesaMs + MARGINE_MS,
  chiudeAlPrimo: false,
  vincitore(_config, [a, b]): Lato | null {
    const ga = grado(a);
    const gb = grado(b);
    if (ga !== gb) return ga < gb ? 0 : 1;
    if (ga === 0) return confronta((a as RisultatoPanda).ms, (b as RisultatoPanda).ms, "minore", SOGLIA_PARI_MS);
    return null;
  },
};
