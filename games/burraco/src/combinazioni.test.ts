import { describe, expect, it } from "vitest";
import { creaRng } from "@gdt/engine";
import { SEMI_FRANCESI, type SemeFrancese } from "@gdt/carte";
import { mazzoCompleto, type Carta } from "./carte";
import { attacca, burraco, interpreta, leggi, matteIn, scegli } from "./combinazioni";

let seq = 1000;
const c = (valore: number, seme: SemeFrancese): Carta => ({ id: seq++, seme, valore });
const j = (): Carta => ({ id: seq++, seme: null, valore: 0 });
const scala = (seme: SemeFrancese, da: number, a: number): Carta[] => Array.from({ length: a - da + 1 }, (_, i) => c(da + i, seme));

describe("interpreta: tris", () => {
  it("tris con semi uguali e con una matta", () => {
    expect(leggi([c(7, "cuori"), c(7, "cuori"), c(7, "fiori")])?.tipo).toBe("tris");
    expect(leggi([c(7, "cuori"), c(7, "quadri"), j()])?.tipo).toBe("tris");
    expect(leggi([c(7, "cuori"), c(7, "quadri"), c(2, "fiori")])?.tipo).toBe("tris");
  });
  it("niente tris di 2, di sole matte, con due matte o con valori diversi", () => {
    expect(interpreta([c(2, "cuori"), c(2, "quadri"), c(2, "fiori")])).toEqual([]);
    expect(interpreta([j(), j(), c(2, "fiori")])).toEqual([]);
    expect(interpreta([c(7, "cuori"), j(), j()])).toEqual([]);
    expect(interpreta([c(7, "cuori"), c(8, "quadri"), c(7, "fiori")])).toEqual([]);
    expect(interpreta([c(7, "cuori"), c(7, "quadri")])).toEqual([]);
  });
  it("fino a 9 carte (8 più una matta)", () => {
    expect(leggi(Array.from({ length: 8 }, () => c(9, "cuori")).concat(j()))?.posate).toHaveLength(9);
    expect(interpreta(Array.from({ length: 9 }, () => c(9, "cuori")).concat(j()))).toEqual([]);
  });
});

describe("interpreta: scale", () => {
  it("scala semplice, asso basso e alto, niente angolo", () => {
    expect(leggi([c(1, "cuori"), c(2, "cuori"), c(3, "cuori")])?.tipo).toBe("scala");
    expect(leggi([c(12, "cuori"), c(13, "cuori"), c(1, "cuori")])?.posate.map((p) => p.come)).toEqual([12, 13, 14]);
    // K-A-3 non gira l'angolo; K-A-2 sì è valido, ma solo con il 2 come matta al posto della Q.
    expect(interpreta([c(13, "cuori"), c(1, "cuori"), c(3, "cuori")])).toEqual([]);
    expect(leggi([c(13, "cuori"), c(1, "cuori"), c(2, "cuori")])?.posate.map((p) => p.come)).toEqual([12, 13, 14]);
  });
  it("il 2 del seme al suo posto è naturale, un altro 2 è matta", () => {
    const l = leggi([c(2, "picche"), c(3, "picche"), c(4, "picche")])!;
    expect(matteIn(l.posate)).toBe(0);
    const m = leggi([c(3, "picche"), c(4, "picche"), c(2, "cuori")])!;
    expect(matteIn(m.posate)).toBe(1);
    const due = leggi([c(2, "picche"), c(3, "picche"), c(4, "picche"), c(2, "cuori"), c(6, "picche")])!;
    expect(due.posate.map((p) => p.come)).toEqual([2, 3, 4, 5, 6]);
    expect(matteIn(due.posate)).toBe(1);
  });
  it("una sola matta, mai due", () => {
    expect(interpreta([c(3, "fiori"), j(), j(), c(6, "fiori")])).toEqual([]);
    expect(interpreta([c(3, "fiori"), j(), c(5, "fiori"), c(6, "fiori")]).length).toBeGreaterThan(0);
  });
  it("semi misti e buchi non validi", () => {
    expect(interpreta([c(3, "fiori"), c(4, "cuori"), c(5, "fiori")])).toEqual([]);
    expect(interpreta([c(3, "fiori"), c(4, "fiori"), c(6, "fiori")])).toEqual([]);
  });
  it("la scala più lunga è A-2-…-K-A con 14 carte", () => {
    const tutte = [...scala("cuori", 1, 13), c(1, "cuori")];
    expect(leggi(tutte)?.posate).toHaveLength(14);
    expect(interpreta([...scala("cuori", 1, 13), c(1, "cuori"), c(1, "cuori")])).toEqual([]);
  });
  it("matta ambigua: 5-6-matta può essere 4 o 7, si sceglie la più bassa", () => {
    const l = interpreta([c(5, "quadri"), c(6, "quadri"), j()]);
    expect(l.length).toBeGreaterThanOrEqual(2);
    expect(scegli(l)!.posate.find((p) => p.matta)!.come).toBe(4);
  });
});

describe("burraco", () => {
  it("pulito, semipulito e sporco (FIBUR art. 13)", () => {
    expect(burraco(leggi(scala("cuori", 3, 9))!)).toBe("pulito");
    expect(burraco(leggi(scala("cuori", 2, 8))!)).toBe("pulito");
    expect(burraco(leggi([...scala("cuori", 3, 9), j()])!)).toBe("semipulito");
    expect(burraco(leggi([...scala("cuori", 3, 5), j(), ...scala("cuori", 7, 9)])!)).toBe("sporco");
    expect(burraco(leggi(scala("cuori", 3, 8))!)).toBeNull();
  });
  it("il tris di 7 carte non è un burraco (scelta dell'utente)", () => {
    expect(burraco(leggi(Array.from({ length: 7 }, () => c(9, "cuori")))!)).toBeNull();
  });
});

describe("attacca", () => {
  it("allunga la scala e tiene ferma la matta già calata", () => {
    const base = leggi([c(4, "fiori"), c(5, "fiori"), j(), c(7, "fiori")])!;
    const n = attacca(base, [c(8, "fiori")])!;
    expect(n.posate.map((p) => p.come)).toEqual([4, 5, 6, 7, 8]);
    expect(n.posate.find((p) => p.matta)!.come).toBe(6);
    // Una matta libera sta in basso (FIBUR art. 10): 4-5-6-matta si legge 3-4-5-6 e resta lì quando si attacca il 7.
    const fondo = leggi([c(4, "fiori"), c(5, "fiori"), c(6, "fiori"), j()])!;
    expect(fondo.posate.find((p) => p.matta)!.come).toBe(3);
    expect(attacca(fondo, [c(7, "fiori")])!.posate.find((p) => p.matta)!.come).toBe(3);
    // La matta calata scorre: con 3-4-5-6-matta-8 arriva il 7 e la matta va in fondo (come 2).
    const alto = leggi([c(3, "fiori"), c(4, "fiori"), c(5, "fiori"), c(6, "fiori"), j(), c(8, "fiori")])!;
    expect(alto.posate.find((p) => p.matta)!.come).toBe(7);
    const con7 = attacca(alto, [c(7, "fiori")])!;
    expect(con7.posate.map((p) => p.come)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(con7.posate[0]!.matta).toBe(true);
  });
  it("la matta scorre in basso o in alto e torna naturale quando arriva la sua carta", () => {
    // 2♥ 3♥ + un altro 2♥ (matta come 4): arriva il 4♥ → la matta scorre in alto e fa il 5 (l'asso in basso è l'ultima scelta).
    const base = leggi([c(2, "cuori"), c(3, "cuori"), c(2, "cuori")])!;
    const con4 = attacca(base, [c(4, "cuori")])!;
    expect(con4.posate.map((p) => p.come)).toEqual([2, 3, 4, 5]);
    expect(con4.posate[3]!.matta).toBe(true);
    // Se arriva il 5♥ la matta resta come 4: 2 3 matta 5.
    const con5 = attacca(base, [c(5, "cuori")])!;
    expect(con5.posate.map((p) => p.come)).toEqual([2, 3, 4, 5]);
    expect(con5.posate[2]!.matta).toBe(true);
    // 3, 2, 5, 6 di quadri: arriva il 4♦, il 2♦ torna al suo posto e la scala è pulita.
    const q = leggi([c(3, "quadri"), c(2, "quadri"), c(5, "quadri"), c(6, "quadri")])!;
    const conQ = attacca(q, [c(4, "quadri")])!;
    expect(conQ.posate.map((p) => p.come)).toEqual([2, 3, 4, 5, 6]);
    expect(matteIn(conQ.posate)).toBe(0);
    // Scala di quadri 8,9,2♣,J,Q + 10♦: la matta (il 2♣) scorre in fondo e la scala è 7-Q.
    const m = leggi([c(8, "quadri"), c(9, "quadri"), c(2, "fiori"), c(11, "quadri"), c(12, "quadri")])!;
    expect(attacca(m, [c(10, "quadri")])).not.toBeNull();
  });
  it("una scala completa non accetta altre carte", () => {
    const tutta = leggi([...scala("fiori", 1, 13), j()])!;
    expect(tutta.posate).toHaveLength(14);
    expect(attacca(tutta, [c(7, "fiori")])).toBeNull();
  });
  it("non attacca carte di altro seme o altro valore", () => {
    expect(attacca(leggi(scala("fiori", 4, 6))!, [c(7, "cuori")])).toBeNull();
    expect(attacca(leggi([c(9, "fiori"), c(9, "cuori"), c(9, "quadri")])!, [c(8, "fiori")])).toBeNull();
  });
});

/** Ricerca esaustiva indipendente: prova ogni seme, ogni inizio e ogni permutazione. */
function esaustivaScala(carte: readonly Carta[]): boolean {
  const n = carte.length;
  const perm = (resto: Carta[], scelte: Carta[]): Carta[][] =>
    resto.length === 0 ? [scelte] : resto.flatMap((x, i) => perm([...resto.slice(0, i), ...resto.slice(i + 1)], [...scelte, x]));
  const ordini = perm([...carte], []);
  for (const seme of SEMI_FRANCESI) {
    for (let s = 1; s + n - 1 <= 14; s++) {
      for (const ordine of ordini) {
        let matte = 0;
        let naturali = 0;
        let ok = true;
        ordine.forEach((x, i) => {
          const pos = s + i;
          const nat = x.seme === seme && (x.valore === 1 ? pos === 1 || pos === 14 : x.valore === pos);
          if (nat) naturali++;
          else if (x.seme === null || x.valore === 2) matte++;
          else ok = false;
        });
        if (ok && matte <= 1 && naturali > 0) return true;
      }
    }
  }
  return false;
}
function esaustivaTris(carte: readonly Carta[]): boolean {
  if (carte.length < 3) return false;
  const nat = carte.filter((x) => x.seme !== null && x.valore !== 2);
  const matte = carte.length - nat.length;
  return nat.length > 0 && matte <= 1 && nat.every((x) => x.valore === nat[0]!.valore) && carte.length <= 9;
}

describe("interpreta contro la ricerca esaustiva", () => {
  it("insiemi casuali di 3-6 carte: stesso verdetto", () => {
    const rng = creaRng(7);
    const mazzo = mazzoCompleto();
    let validi = 0;
    for (let k = 0; k < 1200; k++) {
      const n = 3 + rng.intero(4);
      const seme = SEMI_FRANCESI[rng.intero(4)]!;
      const base = rng.intero(10) + 1;
      const vicine = mazzo.filter((m) => m.seme === seme && m.valore >= base && m.valore <= base + 6);
      const matte = mazzo.filter((m) => m.seme === null || m.valore === 2);
      const stessoValore = mazzo.filter((m) => m.valore === base);
      const carte: Carta[] = [];
      const usati = new Set<number>();
      while (carte.length < n) {
        const r = rng.next();
        const gruppo = r < 0.6 ? vicine : r < 0.75 ? matte : r < 0.9 ? stessoValore : mazzo;
        const x = gruppo[rng.intero(gruppo.length)]!;
        if (usati.has(x.id)) continue;
        usati.add(x.id);
        carte.push(x);
      }
      const atteso = esaustivaScala(carte) || esaustivaTris(carte);
      const letture = interpreta(carte);
      expect(letture.length > 0, JSON.stringify(carte)).toBe(atteso);
      if (atteso) validi++;
      for (const l of letture) {
        expect(l.posate).toHaveLength(carte.length);
        expect(matteIn(l.posate)).toBeLessThanOrEqual(1);
      }
    }
    expect(validi).toBeGreaterThan(40);
  });
});
