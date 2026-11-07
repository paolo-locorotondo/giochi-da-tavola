import type { Lingua } from "@gdt/i18n";
import it from "../data/it/carte.json";
import en from "../data/en/carte.json";

/**
 * Carte originali (non sono quelle del gioco commerciale): parola da far indovinare
 * e cinque parole vietate. Si modificano in `data/<lingua>/carte.json`, vedi il README del gioco.
 */
export interface Carta {
  parola: string;
  vietate: string[];
}

const MAZZI: Record<Lingua, Carta[]> = { it, en };

/** Il mazzo della lingua: ogni lingua ha carte proprie, non tradotte (un gioco di parole non si traduce). */
export function carteDi(lingua: Lingua): Carta[] {
  return MAZZI[lingua];
}

/** Mazzo italiano (lingua di riferimento). */
export const CARTE: Carta[] = MAZZI.it;
