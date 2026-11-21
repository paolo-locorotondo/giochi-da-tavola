import { describe, expect, it } from "vitest";
import { creaRng } from "@gdt/engine";
import type { SemeFrancese } from "@gdt/carte";
import type { Carta } from "./carte";
import { leggi } from "./combinazioni";
import { cala, nuovaMano, pesca, prendiPila, puoPrendere, punteggioMano, scarta, squadra, type Partita } from "./logica";

let seq = 500;
const c = (valore: number, seme: SemeFrancese): Carta => ({ id: seq++, seme, valore });
const j = (): Carta => ({ id: seq++, seme: null, valore: 0 });
const scala = (seme: SemeFrancese, da: number, a: number): Carta[] => Array.from({ length: a - da + 1 }, (_, i) => c(da + i, seme));
const ids = (carte: readonly Carta[]) => carte.map((x) => x.id);

/** Una mano a 2 su misura: mani, tallone e monte scelti dal test. */
function su(mani: Carta[][], opz: Partial<Partita> = {}): Partita {
  const base = nuovaMano(2, creaRng(1), 1, "libera");
  return {
    ...base,
    mani,
    mazzo: Array.from({ length: 30 }, () => c(9, "picche")),
    scarti: [c(13, "fiori")],
    pozzetti: [Array.from({ length: 11 }, () => c(4, "cuori")), Array.from({ length: 11 }, () => c(4, "quadri"))],
    ...opz,
  };
}

describe("distribuzione", () => {
  it("108 carte conservate, id unici, 11 a testa e due pozzetti da 11", () => {
    for (const n of [2, 4]) {
      const p = nuovaMano(n, creaRng(n), 1, "libera");
      const tutte = [...p.mazzo, ...p.scarti, ...p.mani.flat(), ...p.pozzetti.flat()];
      expect(tutte).toHaveLength(108);
      expect(new Set(tutte.map((x) => x.id)).size).toBe(108);
      p.mani.forEach((m) => expect(m).toHaveLength(11));
      p.pozzetti.forEach((m) => expect(m).toHaveLength(11));
      expect(p.mazzo).toHaveLength(n === 4 ? 41 : 63);
    }
    expect(() => nuovaMano(3, creaRng(1), 1, "libera")).toThrow("numeroGiocatori");
  });
  it("squadre: a 4 compagni di fronte (1+3 contro 2+4)", () => {
    expect([1, 2, 3, 4].map(squadra)).toEqual([1, 2, 1, 2]);
  });
});

describe("turno", () => {
  it("prima si pesca, poi si cala e si scarta; non fuori turno", () => {
    const p = su([scala("cuori", 3, 8), scala("fiori", 3, 8)]);
    expect(() => pesca(p, 2)).toThrow("nonTocca");
    expect(() => scarta(p, 1, p.mani[0]![0]!.id)).toThrow("devePescare");
    const q = pesca(p, 1);
    expect(q.mani[0]).toHaveLength(7);
    expect(() => pesca(q, 1)).toThrow("giaPescato");
    const r = scarta(q, 1, q.mani[0]![0]!.id);
    expect(r.turno).toBe(2);
    expect(r.fase).toBe("pescare");
  });
  it("nessun minimo di apertura: si cala anche un tris di 3", () => {
    const mano = [c(3, "cuori"), c(3, "fiori"), c(3, "quadri"), c(9, "cuori")];
    const p = pesca(su([mano, scala("fiori", 3, 8)]), 1);
    const q = cala(p, 1, [{ carte: ids(mano.slice(0, 3)) }]);
    expect(q.combinazioni).toHaveLength(1);
  });
  it("si attacca solo alle combinazioni della propria squadra, anche quelle del compagno", () => {
    const p0 = nuovaMano(4, creaRng(2), 1, "libera");
    const s1 = scala("cuori", 3, 6);
    const p = { ...p0, mani: [[c(7, "cuori"), c(9, "picche")], [c(7, "cuori"), c(9, "fiori")], [c(8, "cuori"), c(10, "fiori")], [c(9, "quadri")]], combinazioni: [{ ...leggi(s1)!, id: 1, squadra: 1 }], prossimoId: 2 };
    const a = cala(pesca(p, 1), 1, [{ carte: [p.mani[0]![0]!.id], su: 1 }]);
    expect(a.combinazioni[0]!.posate).toHaveLength(5);
    const b = pesca({ ...a, turno: 2, fase: "pescare" }, 2);
    expect(() => cala(b, 2, [{ carte: [b.mani[1]![0]!.id], su: 1 }])).toThrow("combinazioneAltrui");
    const d = pesca({ ...a, turno: 3, fase: "pescare" }, 3);
    expect(cala(d, 3, [{ carte: [d.mani[2]![0]!.id], su: 1 }]).combinazioni[0]!.posate).toHaveLength(6);
  });
  it("carte non in mano, doppie o combinazione non valida: rifiutate", () => {
    const mano = [c(3, "cuori"), c(3, "fiori"), c(3, "quadri"), c(9, "cuori")];
    const p = pesca(su([mano, scala("fiori", 3, 8)]), 1);
    expect(() => cala(p, 1, [{ carte: [mano[0]!.id, mano[0]!.id, mano[1]!.id] }])).toThrow("cartaNonInMano");
    expect(() => cala(p, 1, [{ carte: [9999] }])).toThrow("cartaNonInMano");
    expect(() => cala(p, 1, [{ carte: [mano[0]!.id, mano[1]!.id, mano[3]!.id] }])).toThrow("combinazioneNonValida");
  });
  it("due tris dello stesso valore nella stessa squadra: no", () => {
    const mano = [c(5, "cuori"), c(5, "fiori"), c(5, "quadri"), c(5, "picche"), c(5, "cuori"), c(5, "fiori"), c(9, "cuori")];
    const p = pesca(su([mano, scala("fiori", 3, 8)]), 1);
    expect(() => cala(p, 1, [{ carte: ids(mano.slice(0, 3)) }, { carte: ids(mano.slice(3, 6)) }])).toThrow("trisGiaPresente");
  });
});

describe("monte degli scarti", () => {
  it("libero (base): si prende tutto, senza obbligo di usarlo", () => {
    const p = su([[c(5, "cuori")], [c(6, "cuori")]], { scarti: [c(2, "fiori"), c(7, "cuori"), c(8, "quadri")] });
    const q = prendiPila(p, 1);
    expect(q.mani[0]).toHaveLength(4);
    expect(q.scarti).toEqual([]);
    expect(q.fase).toBe("giocare");
  });
  it("monte di una carta sola: quella carta non si riscarta subito", () => {
    const k = c(13, "cuori");
    const p = prendiPila(su([[c(5, "cuori"), c(6, "fiori")], [c(6, "cuori")]], { scarti: [k] }), 1);
    expect(() => scarta(p, 1, k.id)).toThrow("nonRiscartare");
    expect(scarta(p, 1, p.mani[0]![0]!.id).scarti.at(-1)!.id).toBe(p.mani[0]![0]!.id);
  });
  it("monte vuoto: non si prende", () => {
    expect(() => prendiPila(su([[c(5, "cuori")], [c(6, "cuori")]], { scarti: [] }), 1)).toThrow("pilaVuota");
  });
  it("variante bloccata: con una matta nel monte servono due naturali uguali alla cima", () => {
    const cima = c(9, "cuori");
    const mano = [c(9, "fiori"), c(9, "quadri"), c(4, "picche")];
    const p = su([mano, [c(6, "cuori")]], { pila: "bloccata", scarti: [j(), c(5, "fiori"), cima] });
    expect(puoPrendere(p, 1)).toBe(true);
    expect(() => prendiPila(p, 1)).toThrow("pilaBloccata");
    const q = prendiPila(p, 1, [mano[0]!.id, mano[1]!.id]);
    expect(q.combinazioni[0]!.tipo).toBe("tris");
    expect(q.mani[0]).toHaveLength(3); // 4♠, jolly e 5♣ del monte
    const senza = su([[c(9, "fiori"), c(4, "picche")], [c(6, "cuori")]], { pila: "bloccata", scarti: [j(), cima] });
    expect(puoPrendere(senza, 1)).toBe(false);
    // Senza matte nel monte la variante non blocca.
    expect(puoPrendere(su([[c(1, "fiori")], [c(6, "cuori")]], { pila: "bloccata", scarti: [cima] }), 1)).toBe(true);
  });
});

describe("pozzetto", () => {
  it("in diretta: chi cala tutte le carte lo prende subito e continua il turno", () => {
    const p = pesca(su([[c(3, "cuori"), c(4, "cuori")], scala("fiori", 3, 8)], { mazzo: [...Array.from({ length: 20 }, () => c(9, "picche")), c(5, "cuori")] }), 1);
    const q = cala(p, 1, [{ carte: ids(p.mani[0]!) }]);
    expect(q.presi[0]).toBe(true);
    expect(q.mani[0]).toHaveLength(11);
    expect(q.pozzetti[0]).toEqual([]);
    expect(q.turno).toBe(1);
    expect(q.fase).toBe("giocare");
    expect(q.eventi.at(-1)).toMatchObject({ tipo: "pozzetto", diretta: true });
  });
  it("con lo scarto: arriva in mano al turno successivo, anche scartando una matta", () => {
    const tre = [c(3, "cuori"), c(4, "cuori")];
    const p = pesca(su([[...tre, j()], scala("fiori", 3, 8)], { mazzo: [...Array.from({ length: 20 }, () => c(9, "picche")), c(5, "cuori")] }), 1);
    const q = cala(p, 1, [{ carte: ids([...tre, p.mani[0]!.find((x) => x.valore === 5)!]) }]);
    expect(q.mani[0]).toHaveLength(1);
    const r = scarta(q, 1, q.mani[0]![0]!.id); // lo scarto è il jolly
    expect(r.presi[0]).toBe(true);
    expect(r.inAttesa).toEqual([1]);
    expect(r.mani[0]).toHaveLength(0);
    const s = scarta(pesca(r, 2), 2, r.mani[1]![0]!.id);
    expect(s.turno).toBe(1);
    expect(s.mani[0]).toHaveLength(11);
    expect(s.inAttesa).toEqual([]);
    expect(s.eventi.at(-1)).toMatchObject({ tipo: "pozzetto", posto: 1, diretta: false });
  });
  it("una volta sola per squadra: svuotare di nuovo la mano non dà un altro pozzetto", () => {
    const tris = [c(5, "cuori"), c(5, "fiori"), c(5, "quadri")];
    const p = pesca(su([tris, scala("fiori", 3, 8)], { presi: [true, false] }), 1);
    // Squadra che ha già il pozzetto: calare tutto non lo ripete, la mano non può restare vuota.
    expect(() => cala({ ...p, mani: [tris, p.mani[1]!] }, 1, [{ carte: ids(tris) }])).toThrow("serveScarto");
  });
  it("in 4 giocatori il pozzetto è della coppia: lo prende il primo che resta senza carte", () => {
    const p0 = nuovaMano(4, creaRng(3), 1, "libera");
    const mani = [[c(3, "cuori"), c(4, "cuori")], [c(8, "fiori")], [c(9, "fiori"), c(9, "quadri")], [c(8, "quadri")]];
    const p = pesca({ ...p0, mani, mazzo: [...p0.mazzo.slice(0, 20), c(5, "cuori")] }, 1);
    const q = cala(p, 1, [{ carte: ids(p.mani[0]!) }]);
    expect(q.presi).toEqual([true, false]);
    expect(q.mani[0]).toHaveLength(11);
    expect(q.mani[2]).toHaveLength(2); // il compagno continua con la sua mano
  });
});

describe("chiusura", () => {
  const scalaBurraco = { ...leggi(scala("cuori", 3, 9))!, id: 1, squadra: 1 };
  const preso = (mano: Carta[], pescata: Carta, combs = [scalaBurraco]) =>
    pesca(su([mano, scala("fiori", 3, 8)], { presi: [true, false], combinazioni: combs, prossimoId: 2, mazzo: [...Array.from({ length: 20 }, () => c(9, "picche")), pescata] }), 1);

  it("con pozzetto e burraco si chiude scartando l'ultima carta", () => {
    const p = preso([c(10, "cuori")], c(12, "fiori"));
    const q = cala(p, 1, [{ carte: [p.mani[0]![0]!.id], su: 1 }]);
    const r = scarta(q, 1, q.mani[0]![0]!.id);
    expect(r.fine).toEqual({ motivo: "chiusura", chi: 1 });
    expect(punteggioMano(r)[0].chiusura).toBe(100);
  });
  it("senza burraco la chiusura è rifiutata", () => {
    const tris = { ...leggi([c(5, "cuori"), c(5, "fiori"), c(5, "quadri")])!, id: 1, squadra: 1 };
    const p = preso([c(5, "picche")], c(12, "fiori"), [tris]);
    expect(() => cala(p, 1, [{ carte: [p.mani[0]![0]!.id], su: 1 }])).toThrow("serveBurraco");
    const q = preso([c(10, "cuori")], c(12, "fiori"), [tris]);
    expect(() => scarta({ ...q, mani: [[q.mani[0]![0]!], q.mani[1]!] }, 1, q.mani[0]![0]!.id)).toThrow("serveBurraco");
  });
  it("non si chiude scartando una matta (FIBUR art. 34)", () => {
    const p = preso([c(10, "cuori")], j());
    expect(() => cala(p, 1, [{ carte: [p.mani[0]!.find((x) => x.valore === 10)!.id], su: 1 }])).toThrow("nonChiudereConMatta");
    expect(() => scarta({ ...p, mani: [[p.mani[0]!.find((x) => x.seme === null)!], p.mani[1]!] }, 1, p.mani[0]!.find((x) => x.seme === null)!.id)).toThrow("nonChiudereConMatta");
  });
  it("non si chiude calando tutte le carte: serve lo scarto (FIBUR art. 35)", () => {
    const p = preso([c(10, "cuori")], c(11, "cuori"));
    // 10 e J attaccate alla scala 3-9 fanno 3-J: restano 0 carte, quindi rifiutato.
    expect(() => cala(p, 1, [{ carte: ids(p.mani[0]!), su: 1 }])).toThrow("serveScarto");
  });
});

describe("fine mano e punteggio", () => {
  it("finito il tallone (restano 2 carte) la mano finisce senza bonus di chiusura", () => {
    const p = pesca(su([[c(5, "cuori")], [c(6, "cuori")]], { mazzo: [c(9, "picche"), c(9, "picche"), c(9, "picche")] }), 1);
    const q = scarta(p, 1, p.mani[0]![0]!.id);
    expect(q.fine).toEqual({ motivo: "tallone", chi: null });
    expect(() => pesca({ ...q, fine: null, turno: 2, fase: "pescare" }, 2)).toThrow("talloneFinito");
    expect(punteggioMano(q)[0].chiusura + punteggioMano(q)[1].chiusura).toBe(0);
  });
  it("stallo: due giri senza pescare né calare finiscono la mano", () => {
    let p = su([[c(5, "cuori")], [c(6, "cuori")]], { scarti: [c(7, "fiori")] });
    for (let k = 0; k < 4 && !p.fine; k++) {
      const posto = p.turno;
      const q = prendiPila(p, posto);
      p = scarta(q, posto, q.mani[posto - 1]!.find((x) => x.id !== q.vietata)!.id);
    }
    expect(p.fine?.motivo).toBe("stallo");
  });
  it("punteggio: calate, burraco pulito, chiusura, carte in mano, pozzetto non preso", () => {
    const burr = { ...leggi(scala("cuori", 3, 9))!, id: 1, squadra: 1 };
    const p: Partita = { ...su([[], [c(1, "fiori"), j()]]), combinazioni: [burr], presi: [true, false], fine: { motivo: "chiusura", chi: 1 } };
    const [a, b] = punteggioMano(p);
    expect(a).toMatchObject({ calate: 45, burraco: 200, chiusura: 100, inMano: 0, pozzetto: 0, totale: 345 });
    expect(b).toMatchObject({ calate: 0, burraco: 0, chiusura: 0, inMano: -45, pozzetto: -100, totale: -145 });
  });
  it("se nessuno ha preso il pozzetto non si conta il -100", () => {
    const p: Partita = { ...su([[], []]), presi: [false, false], fine: { motivo: "tallone", chi: null } };
    expect(punteggioMano(p).map((x) => x.pozzetto)).toEqual([0, 0]);
  });
  it("valori delle carte: jolly 30, 2 20, asso 15, figure e 8-10 a 10, 3-7 a 5", () => {
    const p: Partita = { ...su([[j(), c(2, "cuori"), c(1, "cuori"), c(13, "cuori"), c(8, "cuori"), c(7, "cuori"), c(3, "cuori")], []]), presi: [true, true] };
    expect(punteggioMano(p)[0].inMano).toBe(-(30 + 20 + 15 + 10 + 10 + 5 + 5));
  });
  it("semipulito (jolly in coda a sette) vale 150, sporco 100", () => {
    const semi = { ...leggi([...scala("cuori", 3, 9), j()])!, id: 1, squadra: 1 };
    const sporco = { ...leggi([...scala("fiori", 3, 5), j(), ...scala("fiori", 7, 9)])!, id: 2, squadra: 2 };
    const p: Partita = { ...su([[], []]), combinazioni: [semi, sporco], presi: [true, true] };
    const [a, b] = punteggioMano(p);
    expect(a.burraco).toBe(150);
    expect(b.burraco).toBe(100);
  });
});
