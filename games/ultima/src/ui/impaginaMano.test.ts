import { describe, expect, it } from "vitest";
import { mazzoCompleto, type Carta, type Colore } from "../logica";
import { CARTE_PER_RIGA, impaginaMano, ordinaMano } from "./impaginaMano";

const num = (id: number, colore: Colore, valore: number): Carta => ({ id, tipo: "numero", colore, valore });
const mazzo = mazzoCompleto({ sommaPiu2: false, piuUguali: false, taglio: false, scambioRotazione: true });
const prime = (n: number) => mazzo.slice(0, n);
const tutte = (r: ReturnType<typeof impaginaMano>) => r.flatMap((x) => x.gruppi.flatMap((g) => g.carte));
const etichetta = (c: Carta) => ("colore" in c ? c.colore : "jolly") + ":" + c.tipo + ("valore" in c ? c.valore : "");

describe("ordinaMano", () => {
  it("blocchi blu, giallo, rosso, verde e poi i jolly; numeri, Salta, Inverti, +2", () => {
    const mano: Carta[] = [
      { id: 1, tipo: "rotazione" },
      { id: 2, tipo: "piu2", colore: "blu" },
      num(3, "verde", 5),
      { id: 4, tipo: "jolly" },
      { id: 5, tipo: "inverti", colore: "blu" },
      num(6, "rosso", 0),
      { id: 7, tipo: "salta", colore: "blu" },
      num(8, "blu", 9),
      { id: 9, tipo: "scambio" },
      num(10, "giallo", 3),
      { id: 11, tipo: "piu4" },
      num(12, "blu", 0),
    ];
    expect(ordinaMano(mano).map(etichetta)).toEqual([
      "blu:numero0",
      "blu:numero9",
      "blu:salta",
      "blu:inverti",
      "blu:piu2",
      "giallo:numero3",
      "rosso:numero0",
      "verde:numero5",
      "jolly:jolly",
      "jolly:piu4",
      "jolly:scambio",
      "jolly:rotazione",
    ]);
  });

  it("a parità ordina per id e non modifica l'originale", () => {
    const mano = [num(9, "blu", 4), num(2, "blu", 4), num(5, "blu", 4)];
    const copia = [...mano];
    expect(ordinaMano(mano).map((c) => c.id)).toEqual([2, 5, 9]);
    expect(mano).toEqual(copia);
  });
});

describe("impaginaMano", () => {
  it("mano vuota: nessuna riga", () => {
    expect(impaginaMano([])).toEqual([]);
  });

  it("una sola carta: una riga", () => {
    const r = impaginaMano([num(1, "rosso", 1)]);
    expect(r).toHaveLength(1);
    expect(r[0]!.n).toBe(1);
  });

  it("7 e 9 carte stanno in una riga", () => {
    expect(impaginaMano(prime(7))).toHaveLength(1);
    expect(impaginaMano(prime(9))).toHaveLength(1);
    expect(impaginaMano(prime(9))[0]!.n).toBe(9);
  });

  it("10 carte: due righe bilanciate (5 e 5)", () => {
    const r = impaginaMano(prime(10));
    expect(r.map((x) => x.n)).toEqual([5, 5]);
  });

  it.each([7, 9, 10, 18, 19, 20, 40, 110])("%i carte: righe = ceil(n/9), tutte ≤ 9, nessuna carta persa né ripetuta", (n) => {
    const mano = n <= mazzo.length ? prime(n) : [...mazzo, ...mazzo.slice(0, n - mazzo.length).map((c, i) => ({ ...c, id: 1000 + i }))];
    const r = impaginaMano(mano);
    expect(r).toHaveLength(Math.ceil(n / CARTE_PER_RIGA));
    for (const riga of r) {
      expect(riga.n).toBeLessThanOrEqual(CARTE_PER_RIGA);
      expect(riga.n).toBe(riga.gruppi.reduce((s, g) => s + g.carte.length, 0));
    }
    const ids = tutte(r).map((c) => c.id);
    expect(new Set(ids).size).toBe(n);
    expect(ids).toEqual(ordinaMano(mano).map((c) => c.id));
    // bilanciate: le righe differiscono al massimo di 2 carte
    const dim = r.map((x) => x.n);
    expect(Math.max(...dim) - Math.min(...dim)).toBeLessThanOrEqual(2);
  });

  it("il taglio di riga cade sul confine di colore quando c'è", () => {
    // 5 blu + 5 rosse: due righe, una per colore
    const mano = [...Array.from({ length: 5 }, (_, i) => num(i, "blu", i)), ...Array.from({ length: 5 }, (_, i) => num(10 + i, "rosso", i))];
    const r = impaginaMano(mano);
    expect(r.map((x) => x.gruppi.map((g) => g.chiave))).toEqual([["blu"], ["rosso"]]);
  });

  it("un blocco più grande della riga si divide in parti bilanciate", () => {
    const mano = Array.from({ length: 12 }, (_, i) => num(i, "verde", i % 10));
    const r = impaginaMano(mano);
    expect(r.map((x) => x.n)).toEqual([6, 6]);
    expect(r.every((x) => x.gruppi.length === 1 && x.gruppi[0]!.chiave === "verde")).toBe(true);
  });

  it("i jolly stanno in coda, in un gruppo a parte", () => {
    const mano: Carta[] = [{ id: 1, tipo: "jolly" }, num(2, "blu", 1), { id: 3, tipo: "piu4" }, num(4, "verde", 2)];
    const r = impaginaMano(mano);
    expect(r).toHaveLength(1);
    expect(r[0]!.gruppi.map((g) => g.chiave)).toEqual(["blu", "verde", "jolly"]);
  });

  it("deterministico: stessa mano in altro ordine, stesso risultato", () => {
    const a = prime(40);
    const b = [...a].reverse();
    expect(impaginaMano(a)).toEqual(impaginaMano(b));
    expect(impaginaMano(a)).toEqual(impaginaMano(a));
  });

  it("la capacità si può cambiare", () => {
    expect(impaginaMano(prime(12), 6).map((x) => x.n)).toEqual([6, 6]);
    expect(impaginaMano(prime(12), 12)).toHaveLength(1);
  });
});
