/** Semi del mazzo francese (Burraco e simili). */
export const SEMI_FRANCESI = ["cuori", "quadri", "fiori", "picche"] as const;
/** Semi del mazzo italiano (Scopa e simili). */
export const SEMI_ITALIANI = ["denari", "coppe", "spade", "bastoni"] as const;

export type SemeFrancese = (typeof SEMI_FRANCESI)[number];
export type SemeItaliano = (typeof SEMI_ITALIANI)[number];
export type Seme = SemeFrancese | SemeItaliano;
export type Mazzo = "francese" | "italiano";

/**
 * Una carta: dati semplici e serializzabili (passano in JSON così come sono).
 * - Mazzo francese: `valore` da 1 (asso) a 13 (11 = fante, 12 = regina, 13 = re).
 * - Mazzo italiano: `valore` da 1 (asso) a 10 (8 = fante, 9 = cavallo, 10 = re).
 * - Jolly: `seme` è `null` e `valore` è 0.
 * `id` è stabile e unico nel mazzo che l'ha generata (vedi `mazzoFrancese` e `mazzoItaliano`).
 */
export interface Carta {
  id: number;
  seme: Seme | null;
  valore: number;
}

export const eJolly = (carta: Carta): boolean => carta.seme === null;

/** A quale mazzo appartiene la carta (il jolly è del francese). */
export function mazzoDi(carta: Carta): Mazzo {
  return carta.seme !== null && (SEMI_ITALIANI as readonly string[]).includes(carta.seme) ? "italiano" : "francese";
}
