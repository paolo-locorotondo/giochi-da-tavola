import type { Rng } from "@gdt/engine";
import { SEMI_FRANCESI, SEMI_ITALIANI, type Carta } from "./tipi";

export interface OpzioniMazzoFrancese {
  /** Quanti mazzi da 52 carte (base 1; il Burraco ne usa 2). */
  mazzi?: number;
  /** Quanti jolly in tutto, non per mazzo (base 0; il Burraco ne usa 4). */
  jolly?: number;
}

/**
 * Mazzo francese. Ordine e id fissi: per ogni mazzo i semi in ordine cuori, quadri, fiori, picche e
 * i valori da 1 a 13 (id da 0 a 52·mazzi − 1), poi i jolly. Con 2 mazzi e 4 jolly gli id vanno da 0 a 107.
 */
export function mazzoFrancese({ mazzi = 1, jolly = 0 }: OpzioniMazzoFrancese = {}): Carta[] {
  if (!Number.isInteger(mazzi) || mazzi < 1) throw new RangeError(`mazzi: intero da 1 in su, ricevuto ${mazzi}`);
  if (!Number.isInteger(jolly) || jolly < 0) throw new RangeError(`jolly: intero da 0 in su, ricevuto ${jolly}`);
  const carte: Carta[] = [];
  for (let m = 0; m < mazzi; m++) {
    for (const seme of SEMI_FRANCESI) {
      for (let valore = 1; valore <= 13; valore++) carte.push({ id: carte.length, seme, valore });
    }
  }
  for (let j = 0; j < jolly; j++) carte.push({ id: carte.length, seme: null, valore: 0 });
  return carte;
}

/**
 * Mazzo italiano da 40 carte, id da 0 a 39: semi in ordine denari, coppe, spade, bastoni,
 * valori da 1 a 10 (8 fante, 9 cavallo, 10 re).
 */
export function mazzoItaliano(): Carta[] {
  const carte: Carta[] = [];
  for (const seme of SEMI_ITALIANI) {
    for (let valore = 1; valore <= 10; valore++) carte.push({ id: carte.length, seme, valore });
  }
  return carte;
}

/** Copia mescolata (l'originale non cambia). Il caso viene solo da `rng`: stesso seme, stesso ordine. */
export function mescola(carte: readonly Carta[], rng: Rng): Carta[] {
  return rng.mescola(carte);
}
