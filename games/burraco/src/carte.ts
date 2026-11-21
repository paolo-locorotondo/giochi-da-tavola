import { mazzoFrancese, type Carta, type Seme } from "@gdt/carte";

export type { Carta, Seme };

/** Le carte arrivano da `@gdt/carte`: due mazzi francesi e 4 jolly, id da 0 a 107. */
export const mazzoCompleto = (): Carta[] => mazzoFrancese({ mazzi: 2, jolly: 4 });

export const eJolly = (c: Carta): boolean => c.seme === null;
/** Matta: jolly o 2 (pinella). Un 2 al suo posto in una scala del suo seme è però una carta naturale. */
export const eMatta = (c: Carta): boolean => c.seme === null || c.valore === 2;

/** Punti di una carta (FIBUR art. 1): jolly 30, 2 20, asso 15, da 8 a K 10, da 3 a 7 5. */
export function valorePunti(c: Carta): number {
  if (c.seme === null) return 30;
  if (c.valore === 2) return 20;
  if (c.valore === 1) return 15;
  return c.valore >= 8 ? 10 : 5;
}
