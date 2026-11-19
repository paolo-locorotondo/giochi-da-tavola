import type { Rng } from "@gdt/engine";
import { confronta, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * Mini giochi «trova»: una griglia di figure colorate, ognuna girata in una direzione, che si
 * rimescola a ogni passo (tutte le figure cambiano, così il bersaglio non si nota per esclusione).
 * Dopo qualche passo compare la figura da trovare in una casella: vince chi la tocca per primo.
 * Chi tocca un'altra figura, o tocca prima che il bersaglio compaia, perde il round.
 *
 * Le figure sono solo nomi: la vista sceglie l'icona di ognuna (vedi `ui/minigiochi/TrovaVista`).
 * «Trova il panda» e «Trova lo smile» sono due configurazioni dello stesso modulo.
 */
export const COLONNE = 4;
export const RIGHE = 4;
export const CASELLE = COLONNE * RIGHE;
/** Quanti colori diversi (indici in una tavolozza di token) si usano. */
export const NUMERO_COLORI = 5;

/** Ogni quanto si rimescola la griglia. */
export const PASSO_MS = 700;
export const PASSI_MIN = 2;
export const PASSI_MAX = 6;
/** Dopo la comparsa del bersaglio, quanto tempo si lascia per trovarlo. */
export const MARGINE_MS = 5000;
export const SOGLIA_PARI_MS = 1;

export interface CasellaTrova {
  figura: string;
  /** Indice del colore, da 0 a `NUMERO_COLORI - 1`. */
  colore: number;
  /** Rotazione in gradi, a passi di 45. */
  gradi: number;
}

export interface ConfigTrova {
  /** Una griglia per passo; l'ultima contiene il bersaglio in `posizione`. */
  griglie: readonly (readonly CasellaTrova[])[];
  /** La casella del bersaglio nell'ultima griglia. */
  posizione: number;
}

/** `ms` dalla comparsa del bersaglio; `trovato` dice se ha toccato il bersaglio. */
export interface RisultatoTrova {
  trovato: boolean;
  ms: number;
}

/** Quando compare il bersaglio, in millisecondi dall'inizio del round. */
export const comparsa = (c: ConfigTrova): number => (c.griglie.length - 1) * PASSO_MS;

/** 0 = ha trovato, 1 = non ha toccato, 2 = ha sbagliato. */
function grado(r: RisultatoTrova | Nessuno): 0 | 1 | 2 {
  if ("nessuno" in r) return 1;
  return r.trovato ? 0 : 2;
}

function griglia(rng: Rng, distrattori: readonly string[]): CasellaTrova[] {
  return Array.from({ length: CASELLE }, () => ({
    figura: distrattori[rng.intero(distrattori.length)] as string,
    colore: rng.intero(NUMERO_COLORI),
    gradi: rng.intero(8) * 45,
  }));
}

/** Crea un mini gioco «trova»: `bersaglio` va trovato tra i `distrattori` (che non lo contengono). */
export function creaTrova(id: string, bersaglio: string, distrattori: readonly string[]): MiniGioco<ConfigTrova, RisultatoTrova> {
  if (distrattori.length === 0 || distrattori.includes(bersaglio)) throw new Error(`creaTrova: distrattori non validi per «${id}»`);
  return {
    id,
    prepara(rng) {
      const passi = PASSI_MIN + rng.intero(PASSI_MAX - PASSI_MIN + 1);
      const griglie = Array.from({ length: passi }, () => griglia(rng, distrattori));
      const posizione = rng.intero(CASELLE);
      const ultima = griglie[griglie.length - 1] as CasellaTrova[];
      ultima[posizione] = { figura: bersaglio, colore: rng.intero(NUMERO_COLORI), gradi: rng.intero(8) * 45 };
      return { griglie, posizione };
    },
    durataMassima: (c) => comparsa(c) + MARGINE_MS,
    chiudeAlPrimo: false,
    vincitore(_config, [a, b]): Lato | null {
      const ga = grado(a);
      const gb = grado(b);
      if (ga !== gb) return ga < gb ? 0 : 1;
      if (ga === 0) return confronta((a as RisultatoTrova).ms, (b as RisultatoTrova).ms, "minore", SOGLIA_PARI_MS);
      return null;
    },
  };
}

export const ANIMALI = ["gatto", "cane", "uccello", "pesce", "coniglio", "topo", "lumaca", "scoiattolo", "tartaruga"] as const;

/** «Trova il panda»: tra animali di ogni tipo. */
export const panda = creaTrova("panda", "panda", ANIMALI);

/** «Trova lo smile»: tra faccine tristi, uno solo sorride. */
export const smile = creaTrova("smile", "felice", ["triste"]);
