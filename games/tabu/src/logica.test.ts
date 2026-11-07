import { describe, expect, it } from "vitest";
import { CARTE, type Carta } from "./carte";
import {
  avanzaCarta,
  cartaCorrente,
  carteDellaPartita,
  chiudiTurno,
  eFinita,
  nuovaPartita,
  punteggioTurno,
  squadraDiTurno,
  vincitrice,
  type Turno,
} from "./logica";

describe("carte", () => {
  it("hanno 5 parole vietate e nessun duplicato", () => {
    for (const c of CARTE) expect(c.vietate).toHaveLength(5);
    const parole = CARTE.map((c) => c.parola.toLowerCase());
    expect(new Set(parole).size).toBe(parole.length);
  });
});

describe("partita", () => {
  it("alterna le squadre, somma i punti e finisce", () => {
    let p = nuovaPartita(["A", "B"], 1, 60, CARTE, 1);
    expect(squadraDiTurno(p)).toBe(0);
    p = chiudiTurno(p, { corrette: ["x", "y", "z"], saltate: [], errori: ["q"] });
    expect(p.squadre[0].punti).toBe(2);
    expect(squadraDiTurno(p)).toBe(1);
    expect(eFinita(p)).toBe(false);
    p = chiudiTurno(p, { corrette: ["x"], saltate: [], errori: [] });
    expect(eFinita(p)).toBe(true);
    expect(vincitrice(p)).toBe(0);
  });
  it("conserva le carte di tutti i turni", () => {
    let p = nuovaPartita(["A", "B"], 1, 60, CARTE, 1);
    p = chiudiTurno(p, { corrette: ["x"], saltate: ["s"], errori: ["q"] });
    p = chiudiTurno(p, { corrette: ["y"], saltate: [], errori: [] });
    expect(p.storico).toHaveLength(2);
    expect(carteDellaPartita(p)).toEqual({ corrette: ["x", "y"], saltate: ["s"], errori: ["q"] });
  });
});

const turno = (corrette: number, errori = 0, saltate = 0): Turno => ({
  corrette: Array.from({ length: corrette }, (_, i) => `c${i}`),
  errori: Array.from({ length: errori }, (_, i) => `e${i}`),
  saltate: Array.from({ length: saltate }, (_, i) => `s${i}`),
});
const mazzo: Carta[] = [
  { parola: "uno", vietate: ["a", "b", "c", "d", "e"] },
  { parola: "due", vietate: ["f", "g", "h", "i", "l"] },
  { parola: "tre", vietate: ["m", "n", "o", "p", "q"] },
];

describe("nuovaPartita", () => {
  it("parte da zero con i parametri scelti", () => {
    const p = nuovaPartita(["Rossi", "Blu"], 5, 45, CARTE, 7);
    expect(p.squadre).toEqual([
      { nome: "Rossi", punti: 0 },
      { nome: "Blu", punti: 0 },
    ]);
    expect(p.turniPerSquadra).toBe(5);
    expect(p.secondiTurno).toBe(45);
    expect(p.turno).toBe(0);
    expect(p.prossima).toBe(0);
    expect(p.storico).toEqual([]);
  });

  it("mescola tutte le carte, senza perderne né aggiungerne", () => {
    const p = nuovaPartita(["A", "B"], 5, 60, CARTE, 7);
    expect(p.mazzo).toHaveLength(CARTE.length);
    expect(new Set(p.mazzo)).toEqual(new Set(CARTE));
  });

  it("stesso seme, stesso mazzo; semi diversi, ordine diverso", () => {
    const a = nuovaPartita(["A", "B"], 5, 60, CARTE, 7).mazzo;
    expect(nuovaPartita(["A", "B"], 5, 60, CARTE, 7).mazzo).toEqual(a);
    expect(nuovaPartita(["A", "B"], 5, 60, CARTE, 8).mazzo).not.toEqual(a);
  });

  it("non modifica l'elenco di carte ricevuto", () => {
    const copia = [...CARTE];
    nuovaPartita(["A", "B"], 5, 60, CARTE, 7);
    expect(CARTE).toEqual(copia);
  });
});

describe("carte in gioco", () => {
  it("avanzaCarta passa alla carta dopo senza toccare la partita di prima", () => {
    const p = nuovaPartita(["A", "B"], 1, 60, mazzo, 1);
    const dopo = avanzaCarta(p);
    expect(dopo.prossima).toBe(1);
    expect(p.prossima).toBe(0);
    expect(cartaCorrente(dopo)).toBe(p.mazzo[1]);
  });

  it("finito il mazzo ricomincia dall'inizio", () => {
    let p = nuovaPartita(["A", "B"], 1, 60, mazzo, 1);
    const prima = cartaCorrente(p);
    for (let i = 0; i < mazzo.length; i++) p = avanzaCarta(p);
    expect(cartaCorrente(p)).toBe(prima);
  });

  it("le carte restano in ordine anche tra un turno e l'altro", () => {
    let p = avanzaCarta(avanzaCarta(nuovaPartita(["A", "B"], 2, 60, mazzo, 1)));
    p = chiudiTurno(p, turno(2));
    expect(cartaCorrente(p)).toBe(p.mazzo[2]);
  });

  it("con il mazzo vuoto segnala l'errore", () => {
    expect(() => cartaCorrente(nuovaPartita(["A", "B"], 1, 60, [], 1))).toThrow("Mazzo vuoto");
  });
});

describe("punteggioTurno", () => {
  it.each([
    [turno(0), 0],
    [turno(3), 3],
    [turno(3, 1), 2],
    [turno(1, 3), -2],
    [turno(2, 0, 10), 2],
  ])("%j → %i", (t, atteso) => {
    expect(punteggioTurno(t)).toBe(atteso);
  });
});

describe("chiudiTurno", () => {
  it("assegna i punti alla squadra giusta, alternando", () => {
    let p = nuovaPartita(["A", "B"], 3, 60, mazzo, 1);
    p = chiudiTurno(p, turno(3));
    p = chiudiTurno(p, turno(1));
    p = chiudiTurno(p, turno(2, 1));
    expect(p.squadre[0].punti).toBe(4);
    expect(p.squadre[1].punti).toBe(1);
    expect(p.storico.map((x) => x.squadra)).toEqual([0, 1, 0]);
    expect(squadraDiTurno(p)).toBe(1);
  });

  it("i punti possono andare sotto zero", () => {
    const p = chiudiTurno(nuovaPartita(["A", "B"], 1, 60, mazzo, 1), turno(0, 2));
    expect(p.squadre[0].punti).toBe(-2);
  });

  it("non modifica la partita ricevuta", () => {
    const p = nuovaPartita(["A", "B"], 1, 60, mazzo, 1);
    const copia = structuredClone(p);
    chiudiTurno(p, turno(3));
    expect(p).toEqual(copia);
  });
});

describe("fine e vincitrice", () => {
  it("la partita finisce dopo turniPerSquadra turni a testa", () => {
    let p = nuovaPartita(["A", "B"], 3, 60, mazzo, 1);
    for (let i = 0; i < 6; i++) {
      expect(eFinita(p)).toBe(false);
      p = chiudiTurno(p, turno(1));
    }
    expect(eFinita(p)).toBe(true);
  });

  it("vince la seconda squadra se ha più punti", () => {
    let p = nuovaPartita(["A", "B"], 1, 60, mazzo, 1);
    p = chiudiTurno(chiudiTurno(p, turno(1)), turno(4));
    expect(vincitrice(p)).toBe(1);
  });

  it("a parità di punti è pareggio", () => {
    let p = nuovaPartita(["A", "B"], 1, 60, mazzo, 1);
    expect(vincitrice(p)).toBeNull();
    p = chiudiTurno(chiudiTurno(p, turno(2)), turno(3, 1));
    expect(vincitrice(p)).toBeNull();
  });

  it("carteDellaPartita è vuota prima di ogni turno", () => {
    expect(carteDellaPartita(nuovaPartita(["A", "B"], 1, 60, mazzo, 1))).toEqual({ corrette: [], saltate: [], errori: [] });
  });
});
