import { describe, expect, it } from "vitest";
import { CARTE } from "./carte";
import { chiudiTurno, eFinita, nuovaPartita, squadraDiTurno, vincitrice } from "./logica";

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
});
