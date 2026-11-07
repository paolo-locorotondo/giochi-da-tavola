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

describe("rng: valori noti e proprietà", () => {
  it("hashSeme dà i valori FNV-1a di riferimento (formato stabile tra versioni)", () => {
    expect(hashSeme("")).toBe(0x811c9dc5);
    expect(hashSeme("a")).toBe(0xe40c292c);
    expect(hashSeme("foobar")).toBe(0xbf9cf968);
  });

  it("un seme numerico e uno testuale sono due sequenze indipendenti", () => {
    expect(creaRng(5).next()).not.toBe(creaRng("5").next());
  });

  it("il seme numerico viene ridotto a 32 bit senza segno", () => {
    expect(creaRng(2 ** 32 + 9).next()).toBe(creaRng(9).next());
    expect(creaRng(-1).next()).toBe(creaRng(0xffffffff).next());
  });

  it("intero(1) vale sempre 0", () => {
    const rng = creaRng(3);
    for (let i = 0; i < 50; i++) expect(rng.intero(1)).toBe(0);
  });

  it("mescola gestisce vuoto e un solo elemento", () => {
    expect(creaRng(1).mescola([])).toEqual([]);
    expect(creaRng(1).mescola(["x"])).toEqual(["x"]);
  });

  it("mescola produce ogni permutazione di 3 elementi (nessun ordine escluso)", () => {
    const viste = new Set<string>();
    for (let seme = 0; seme < 300; seme++) viste.add(creaRng(seme).mescola([1, 2, 3]).join(""));
    expect(viste.size).toBe(6);
  });

  it("intero(n) è circa uniforme", () => {
    const rng = creaRng(2024);
    const conteggi = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) conteggi[rng.intero(4)]!++;
    for (const c of conteggi) expect(c).toBeGreaterThan(1700);
  });
});
