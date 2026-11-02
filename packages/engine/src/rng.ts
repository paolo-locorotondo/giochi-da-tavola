/**
 * Generatore pseudocasuale deterministico (mulberry32).
 * Stesso seme → stessa sequenza, su qualsiasi telefono: serve per il livello 1
 * (ogni telefono ricalcola da solo la propria parola/ruolo).
 * Usa solo aritmetica a 32 bit intera, quindi il risultato non dipende dalla piattaforma.
 */

/** Trasforma una stringa in un intero a 32 bit (FNV-1a). */
export function hashSeme(seme: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seme.length; i++) {
    h ^= seme.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** Numero reale in [0, 1). */
  next(): number;
  /** Intero in [0, n). Richiede n intero positivo. */
  intero(n: number): number;
  /** Restituisce una copia mescolata (Fisher-Yates). L'array originale non cambia. */
  mescola<T>(valori: readonly T[]): T[];
}

export function creaRng(seme: number | string): Rng {
  let stato = typeof seme === "string" ? hashSeme(seme) : seme >>> 0;

  const next = (): number => {
    stato = (stato + 0x6d2b79f5) >>> 0;
    let t = stato;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const intero = (n: number): number => {
    if (!Number.isInteger(n) || n <= 0) {
      throw new RangeError(`intero(n): n deve essere un intero positivo, ricevuto ${n}`);
    }
    return Math.floor(next() * n);
  };

  const mescola = <T>(valori: readonly T[]): T[] => {
    const copia = [...valori];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = intero(i + 1);
      const tmp = copia[i] as T;
      copia[i] = copia[j] as T;
      copia[j] = tmp;
    }
    return copia;
  };

  return { next, intero, mescola };
}
