import { mazzoItaliano, type Carta } from "@gdt/carte";
import { describe, expect, it } from "vitest";
import { primiera, puntiRound, valorePrimiera, type Squadra } from "./punti";

const mazzo = mazzoItaliano();
const carta = (seme: string, valore: number): Carta => mazzo.find((c) => c.seme === seme && c.valore === valore)!;
const SQ2: Squadra[] = [0, 1];

describe("valori della primiera", () => {
  it("7=21, 6=18, asso=16, 5=15, 4=14, 3=13, 2=12, figure=10", () => {
    const att: Record<number, number> = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 };
    for (const [v, p] of Object.entries(att)) expect(valorePrimiera(carta("coppe", Number(v)))).toBe(p);
  });
});

describe("primiera", () => {
  it("somma la migliore di ogni seme", () => {
    const m = [carta("denari", 7), carta("denari", 1), carta("coppe", 6), carta("spade", 5), carta("bastoni", 2)];
    expect(primiera(m)).toBe(21 + 18 + 15 + 12);
  });
  it("senza un seme è nulla", () => {
    expect(primiera([carta("denari", 7), carta("coppe", 7), carta("spade", 7)])).toBeNull();
    expect(primiera([])).toBeNull();
  });
  it("il massimo è 84, con i quattro sette", () => {
    expect(primiera(mazzo.filter((c) => c.valore === 7))).toBe(84);
  });
});

/** Mazzetti per posto da una divisione di tutto il mazzo. */
const divisione = (a: Carta[]): Carta[][] => [a, mazzo.filter((c) => !a.includes(c))];

describe("puntiRound", () => {
  it("assegna carte, denari, settebello, primiera e scope", () => {
    const mio = mazzo.filter((c) => c.seme === "denari" || c.valore === 7 || c.valore === 6);
    const r = puntiRound(divisione(mio), [2, 0], SQ2);
    expect(r.settebello).toBe(0);
    expect(r.denari).toBe(0); // tutti i denari
    expect(r.carte).toBe(mio.length > 20 ? 0 : 1);
    expect(r.totale[0]).toBeGreaterThanOrEqual(2 + 2);
  });

  it("carte pari 20 a 20: nessuno", () => {
    const mio = mazzo.filter((c) => c.id % 2 === 0);
    const r = puntiRound(divisione(mio), [0, 0], SQ2);
    expect(r.conteggi[0].carte).toBe(20);
    expect(r.carte).toBeNull();
  });

  it("denari pari 5 a 5: nessuno", () => {
    const denari = mazzo.filter((c) => c.seme === "denari");
    const mio = [...denari.slice(0, 5), ...mazzo.filter((c) => c.seme !== "denari").slice(0, 15)];
    const r = puntiRound(divisione(mio), [0, 0], SQ2);
    expect(r.conteggi[0].denari).toBe(5);
    expect(r.denari).toBeNull();
  });

  it("primiera: chi non ha tutti i semi perde; nulla da tutte e due = nessuno", () => {
    const senzaBastoni = mazzo.filter((c) => c.seme !== "bastoni");
    const a = puntiRound([senzaBastoni, mazzo.filter((c) => c.seme === "bastoni")], [0, 0], SQ2);
    expect(a.conteggi[0].primiera).toBeNull();
    expect(a.primiera).toBeNull(); // anche il secondo è nullo
    const b = puntiRound([mazzo.filter((c) => c.id < 36), mazzo.filter((c) => c.id >= 36)], [0, 0], SQ2);
    expect(b.conteggi[1].primiera).toBeNull();
    expect(b.primiera).toBe(0);
  });

  it("a coppie: si sommano i mazzetti dei compagni (posti 1+3 contro 2+4)", () => {
    const quarti = [0, 1, 2, 3].map((k) => mazzo.filter((c) => c.id % 4 === k));
    const r = puntiRound(quarti, [1, 0, 2, 1], [0, 1, 0, 1]);
    expect(r.conteggi[0].carte).toBe(20);
    expect(r.conteggi[0].scope).toBe(3);
    expect(r.conteggi[1].scope).toBe(1);
  });

  it("invariante: il totale è 4 + scope se non ci sono pari, mai di più", () => {
    for (let k = 1; k < 40; k += 3) {
      const mio = mazzo.filter((c) => (c.id * 7 + k) % 5 < 3);
      const r = puntiRound(divisione(mio), [k % 3, 1], SQ2);
      const scope = (k % 3) + 1;
      const tot = r.totale[0] + r.totale[1];
      expect(tot).toBeLessThanOrEqual(4 + scope);
      const pari = [r.carte, r.denari, r.primiera].filter((x) => x === null).length;
      expect(tot).toBe(4 + scope - pari);
    }
  });
});
