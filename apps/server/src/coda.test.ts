import { describe, expect, it } from "vitest";
import { Code, MAX_IN_CODA } from "./coda";
import { creaStanzaDaCoda, nomiDistinti, vistaDi as vistaGenerica } from "./stanze";

const voce = (nome: string, conn: object, dal = 0) => ({ token: `t-${nome}`, nome, conn, dal });

describe("coda della partita veloce", () => {
  it("abbina a coppie nell'ordine di arrivo", () => {
    const code = new Code<object>();
    const [a, b, c, d] = [{}, {}, {}, {}];
    expect(code.aggiungi("tris", voce("A", a), 2)).toBeNull();
    expect(code.aggiungi("tris", voce("B", b), 2)?.map((v) => v.nome)).toEqual(["A", "B"]);
    expect(code.aggiungi("tris", voce("C", c), 2)).toBeNull();
    expect(code.lunghezza("tris")).toBe(1);
    expect(code.aggiungi("tris", voce("D", d), 2)?.map((v) => v.nome)).toEqual(["C", "D"]);
    expect(code.lunghezza("tris")).toBe(0);
  });

  it("chi esce o si scollega non viene abbinato; due volte la stessa connessione non vale", () => {
    const code = new Code<object>();
    const [a, b] = [{}, {}];
    code.aggiungi("tris", voce("A", a), 2);
    expect(() => code.aggiungi("tris", voce("A2", a), 2)).toThrow("giaInCoda");
    expect(code.togli(a)).toBe(true);
    expect(code.togli(a)).toBe(false);
    expect(code.aggiungi("tris", voce("B", b), 2)).toBeNull();
  });

  it("chi aspetta troppo scade; la coda ha un limite", () => {
    const code = new Code<object>();
    const vecchio = {};
    code.aggiungi("tris", voce("A", vecchio, 0), 2);
    code.aggiungi("tris", voce("B", {}, 100_000), 3);
    expect(code.scadute(130_000, 120_000).map((v) => v.nome)).toEqual(["A"]);
    expect(code.lunghezza("tris")).toBe(1);

    const piena = new Code<object>();
    for (let i = 0; i < MAX_IN_CODA; i++) piena.aggiungi("x", voce(`n${i}`, {}), MAX_IN_CODA + 1);
    expect(() => piena.aggiungi("x", voce("di troppo", {}), MAX_IN_CODA + 1)).toThrow("codaPiena");
  });
});

describe("stanza da coda", () => {
  it("i due siedono ai posti 1 e 2, il primo organizza e la partita è già avviata", () => {
    const s = creaStanzaDaCoda("ABCDE", "tris", [voce("Anna", {}), voce("Bruno", {})]);
    expect(s.tokenHost).toBe("t-Anna");
    const v = vistaGenerica(s, "t-Bruno");
    expect(v.fase).toBe("partita");
    expect(v.io).toBe(2);
    expect(vistaGenerica(s, "t-Anna").mioTurno).toBe(true);
  });

  it("due nomi uguali diventano distinti; un gioco senza coda è rifiutato", () => {
    expect(nomiDistinti([" Anna", "anna"])).toEqual(["Anna", "anna (2)"]);
    const s = creaStanzaDaCoda("ABCDE", "tris", [voce("Anna", {}), voce("ANNA", {})]);
    expect(vistaGenerica(s, "t-Anna").nomi.map((n: { nome: string }) => n.nome)).toEqual(["Anna", "ANNA (2)"]);
    expect(() => creaStanzaDaCoda("ABCDE", "impostore", [voce("A", {}), voce("B", {})])).toThrow("partita veloce");
  });
});
