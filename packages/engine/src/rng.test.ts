import { describe, expect, it } from "vitest";
import { creaRng, hashSeme } from "./rng";

describe("creaRng", () => {
  it("con lo stesso seme produce la stessa sequenza", () => {
    const a = creaRng("K7F2");
    const b = creaRng("K7F2");
    const sequenzaA = Array.from({ length: 20 }, () => a.next());
    const sequenzaB = Array.from({ length: 20 }, () => b.next());
    expect(sequenzaA).toEqual(sequenzaB);
  });

  it("semi diversi producono sequenze diverse", () => {
    const a = creaRng("K7F2");
    const b = creaRng("K7F3");
    expect(a.next()).not.toBe(b.next());
  });

  it("next() resta nell'intervallo [0, 1)", () => {
    const rng = creaRng(42);
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("intero(n) resta nell'intervallo [0, n)", () => {
    const rng = creaRng(7);
    for (let i = 0; i < 1_000; i++) {
      const x = rng.intero(5);
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(5);
    }
  });

  it("intero(n) rifiuta valori non validi", () => {
    const rng = creaRng(1);
    expect(() => rng.intero(0)).toThrow(RangeError);
    expect(() => rng.intero(-3)).toThrow(RangeError);
    expect(() => rng.intero(2.5)).toThrow(RangeError);
  });

  it("mescola restituisce una permutazione deterministica senza toccare l'originale", () => {
    const originale = ["a", "b", "c", "d", "e", "f"];
    const risultato1 = creaRng("partita").mescola(originale);
    const risultato2 = creaRng("partita").mescola(originale);
    expect(risultato1).toEqual(risultato2);
    expect([...risultato1].sort()).toEqual([...originale].sort());
    expect(originale).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});

describe("hashSeme", () => {
  it("è stabile e produce un intero a 32 bit senza segno", () => {
    expect(hashSeme("K7F2")).toBe(hashSeme("K7F2"));
    const h = hashSeme("K7F2");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});
