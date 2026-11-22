import { describe, expect, it } from "vitest";
import { CARTE_PER_RIGA, impaginaMano } from "./impagina";
import { mazzoFrancese } from "./mazzi";
import { chiaveSeme, confrontaPerSeme, confrontaPerValore } from "./ordine";
import type { Carta } from "./tipi";

// Carte finte: un gruppo (lettera) e un numero.
interface C {
  id: number;
  g: string;
  n: number;
}
const c = (id: number, g: string, n = id): C => ({ id, g, n });
const opz = { chiave: (x: C) => x.g, ordine: (a: C, b: C) => a.g.localeCompare(b.g) || a.n - b.n || a.id - b.id };
const gruppoDi = (i: number) => "abcd"[i % 4]!;
const mano = (n: number): C[] => Array.from({ length: n }, (_, i) => c(i, gruppoDi(i * 7)));
const tutte = (r: ReturnType<typeof impaginaMano<C, string>>) => r.flatMap((x) => x.gruppi.flatMap((g) => g.carte));

describe("impaginaMano", () => {
  it("mano vuota: nessuna riga", () => {
    expect(impaginaMano([], opz)).toEqual([]);
  });

  it("una sola carta: una riga", () => {
    const r = impaginaMano([c(1, "a")], opz);
    expect(r).toHaveLength(1);
    expect(r[0]!.n).toBe(1);
  });

  it("7 e 9 carte stanno in una riga, 10 in due righe bilanciate (5 e 5)", () => {
    expect(impaginaMano(mano(7), opz)).toHaveLength(1);
    expect(impaginaMano(mano(9), opz)[0]!.n).toBe(9);
    expect(impaginaMano(mano(10), opz).map((x) => x.n)).toEqual([5, 5]);
  });

  it.each([7, 9, 10, 11, 18, 19, 20, 40, 110])("%i carte: righe = ceil(n/9), tutte ≤ 9, nessuna carta persa né ripetuta", (n) => {
    const m = mano(n);
    const r = impaginaMano(m, opz);
    expect(r).toHaveLength(Math.ceil(n / CARTE_PER_RIGA));
    for (const riga of r) {
      expect(riga.n).toBeLessThanOrEqual(CARTE_PER_RIGA);
      expect(riga.n).toBe(riga.gruppi.reduce((s, g) => s + g.carte.length, 0));
    }
    expect(new Set(tutte(r).map((x) => x.id)).size).toBe(n);
    expect(tutte(r)).toEqual([...m].sort(opz.ordine));
    const dim = r.map((x) => x.n);
    expect(Math.max(...dim) - Math.min(...dim)).toBeLessThanOrEqual(2);
  });

  it("il taglio di riga cade sul confine di gruppo quando c'è", () => {
    const m = [...Array.from({ length: 5 }, (_, i) => c(i, "a")), ...Array.from({ length: 5 }, (_, i) => c(10 + i, "b"))];
    expect(impaginaMano(m, opz).map((x) => x.gruppi.map((g) => g.chiave))).toEqual([["a"], ["b"]]);
  });

  it("un gruppo più grande della riga si divide in parti bilanciate", () => {
    const r = impaginaMano(Array.from({ length: 12 }, (_, i) => c(i, "z")), opz);
    expect(r.map((x) => x.n)).toEqual([6, 6]);
    expect(r.every((x) => x.gruppi.length === 1 && x.gruppi[0]!.chiave === "z")).toBe(true);
  });

  it("deterministico: stessa mano in altro ordine, stesso risultato", () => {
    const a = mano(40);
    expect(impaginaMano(a, opz)).toEqual(impaginaMano([...a].reverse(), opz));
  });

  it("senza `ordine` le carte restano come arrivano, e l'originale non cambia", () => {
    const m = [c(3, "b"), c(1, "a"), c(2, "b")];
    const copia = [...m];
    const r = impaginaMano(m, { chiave: (x) => x.g });
    expect(tutte(r).map((x) => x.id)).toEqual([3, 1, 2]);
    expect(r[0]!.gruppi.map((g) => g.chiave)).toEqual(["b", "a", "b"]);
    expect(m).toEqual(copia);
  });

  it("la capacità si può cambiare", () => {
    expect(impaginaMano(mano(12), { ...opz, capacita: 6 }).map((x) => x.n)).toEqual([6, 6]);
    expect(impaginaMano(mano(12), { ...opz, capacita: 12 })).toHaveLength(1);
    expect(impaginaMano(mano(3), { ...opz, capacita: 0 })).toHaveLength(3);
  });
});

describe("impaginaMano con le carte francesi", () => {
  const mazzo = mazzoFrancese({ mazzi: 2, jolly: 4 });
  const prese = (n: number): Carta[] => Array.from({ length: n }, (_, i) => mazzo[(i * 37) % mazzo.length]!);

  it.each([11, 20, 40])("%i carte per seme: ordine seme→valore, gruppi = semi, jolly in fondo", (n) => {
    const m = prese(n);
    const r = impaginaMano(m, { chiave: chiaveSeme, ordine: confrontaPerSeme });
    expect(r).toHaveLength(Math.ceil(n / 9));
    expect(tutte2(r)).toEqual([...m].sort(confrontaPerSeme));
    const chiavi = r.flatMap((x) => x.gruppi.map((g) => g.chiave));
    const iJolly = chiavi.indexOf("jolly");
    if (iJolly >= 0) expect(chiavi.slice(iJolly).every((k) => k === "jolly")).toBe(true);
  });

  it("per valore l'ordine è per valore e i jolly in fondo", () => {
    const m = prese(20);
    const r = impaginaMano(m, { chiave: () => "v", ordine: confrontaPerValore });
    const v = tutte2(r).map((x) => (x.seme === null ? 99 : x.valore));
    expect(v).toEqual([...v].sort((a, b) => a - b));
  });
});

function tutte2(r: ReturnType<typeof impaginaMano<Carta, string>>): Carta[] {
  return r.flatMap((x) => x.gruppi.flatMap((g) => g.carte));
}
