import type { Rng } from "@gdt/engine";

/**
 * Generatore basato su `crypto.getRandomValues`.
 * Per evitare il bias del modulo (se n non divide 2^32 alcuni esiti uscirebbero un po' più spesso)
 * si scartano i valori nella coda che non forma un blocco completo di n.
 */
export function generaCasuale(): Rng {
  const buf = new Uint32Array(1);
  const next = (): number => {
    crypto.getRandomValues(buf);
    return (buf[0] ?? 0) / 4294967296;
  };
  const intero = (n: number): number => {
    if (!Number.isInteger(n) || n <= 0) {
      throw new RangeError(`intero(n): n deve essere un intero positivo, ricevuto ${n}`);
    }
    const limite = 4294967296 - (4294967296 % n);
    for (;;) {
      crypto.getRandomValues(buf);
      const v = buf[0] ?? 0;
      if (v < limite) return v % n;
    }
  };
  const mescola = <T,>(valori: readonly T[]): T[] => {
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
