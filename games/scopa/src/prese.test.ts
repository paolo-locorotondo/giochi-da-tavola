import { describe, expect, it } from "vitest";
import { combinazioniPresa, stessaPresa } from "./prese";

let id = 0;
const c = (valore: number, i = id++) => ({ id: i, valore });
const valori = (comb: { valore: number }[][]) => comb.map((x) => x.map((y) => y.valore));

describe("combinazioniPresa", () => {
  it("7 sul tavolo {1, 2, 3, 4, 5}: 3+4, 2+5, 1+2+4", () => {
    const tavolo = [c(1, 1), c(2, 2), c(3, 3), c(4, 4), c(5, 5)];
    const comb = valori(combinazioniPresa(tavolo, c(7, 99)));
    expect(comb).toHaveLength(3);
    expect(comb).toEqual(expect.arrayContaining([[3, 4], [2, 5], [1, 2, 4]]));
  });

  it("la presa singola prevale sulla somma", () => {
    const tavolo = [c(7, 1), c(3, 2), c(4, 3)];
    expect(valori(combinazioniPresa(tavolo, c(7, 99)))).toEqual([[7]]);
  });

  it("due carte di pari valore: due prese singole", () => {
    const tavolo = [c(5, 10), c(5, 3), c(2, 4), c(3, 5)];
    const comb = combinazioniPresa(tavolo, c(5, 99));
    expect(comb.map((x) => x.map((y) => y.id))).toEqual([[3], [10]]);
  });

  it("nessuna presa: elenco vuoto", () => {
    expect(combinazioniPresa([c(8, 1), c(9, 2)], c(3, 99))).toEqual([]);
    expect(combinazioniPresa([], c(3, 99))).toEqual([]);
  });

  it("tabella di esempi: numero di combinazioni", () => {
    const casi: [number[], number, number][] = [
      [[1, 2, 3], 3, 1], // c'è il 3: solo quello
      [[1, 2], 3, 1],
      [[1, 1, 2], 4, 1],
      [[1, 2, 3, 4], 5, 2], // 1+4, 2+3
      [[1, 2, 3, 4], 6, 2], // 2+4, 1+2+3
      [[1, 2, 3, 4], 10, 1],
      [[2, 2, 2], 4, 3],
      [[5, 5], 10, 1],
    ];
    for (const [tav, val, n] of casi) {
      const tavolo = tav.map((v, i) => c(v, i));
      expect(combinazioniPresa(tavolo, c(val, 99)), `${tav} con ${val}`).toHaveLength(n);
    }
  });

  it("ordine stabile e nessuna combinazione ripetuta", () => {
    const tavolo = [c(4, 7), c(1, 2), c(3, 5), c(2, 1), c(5, 9)];
    const a = combinazioniPresa(tavolo, c(7, 99));
    const b = combinazioniPresa([...tavolo].reverse(), c(7, 99));
    expect(a).toEqual(b);
    const chiavi = a.map((x) => x.map((y) => y.id).join(","));
    expect(new Set(chiavi).size).toBe(chiavi.length);
    for (const comb of a) {
      const ids = comb.map((y) => y.id);
      expect(ids).toEqual([...ids].sort((x, y) => x - y));
      expect(comb.reduce((s, y) => s + y.valore, 0)).toBe(7);
    }
  });

  it("tavolo grande (15 carte piccole): risultati giusti e in poco tempo", () => {
    const tavolo = Array.from({ length: 15 }, (_, i) => c((i % 4) + 1, i));
    const inizio = performance.now();
    const comb = combinazioniPresa(tavolo, c(10, 99));
    expect(performance.now() - inizio).toBeLessThan(200);
    expect(comb.length).toBeGreaterThan(10);
    for (const x of comb) expect(x.reduce((s, y) => s + y.valore, 0)).toBe(10);
  });
});

describe("stessaPresa", () => {
  it("confronta gli id in qualsiasi ordine", () => {
    expect(stessaPresa([c(1, 1), c(2, 2)], [2, 1])).toBe(true);
    expect(stessaPresa([c(1, 1), c(2, 2)], [2])).toBe(false);
    expect(stessaPresa([c(1, 1), c(2, 2)], [2, 2])).toBe(false);
  });
});
