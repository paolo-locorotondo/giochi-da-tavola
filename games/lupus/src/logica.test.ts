import { describe, expect, it } from "vitest";
import { contaVoti, distribuisciRuoli, riduci, statoIniziale, vincitore, type Stato } from "./logica";

const nomi = ["A", "B", "C", "D", "E", "F", "G"];
const avvia = (): Stato => riduci(statoIniziale(), { tipo: "avvia", nomi, seme: 7 });

describe("ruoli", () => {
  it("assegna lupi, veggente e medico secondo i giocatori", () => {
    expect(distribuisciRuoli(4, 1).sort()).toEqual(["contadino", "contadino", "contadino", "lupo"]);
    const r = distribuisciRuoli(7, 1);
    expect(r.filter((x) => x === "lupo")).toHaveLength(2);
    expect(r).toContain("veggente");
    expect(r).toContain("medico");
  });
  it("è deterministica", () => {
    expect(distribuisciRuoli(9, 5)).toEqual(distribuisciRuoli(9, 5));
  });
});

describe("voti", () => {
  it("trova il più votato o i pari merito", () => {
    expect(contaVoti({ 1: 3, 2: 1 })).toEqual({ eliminato: 1, pari: [] });
    expect(contaVoti({ 1: 2, 2: 2, 3: 0 })).toEqual({ eliminato: null, pari: [1, 2] });
  });
});

describe("vittoria", () => {
  it("villaggio senza lupi, lupi quando pareggiano i vivi", () => {
    expect(vincitore({ 1: "lupo", 2: "contadino", 3: "contadino" }, [2, 3])).toBe("villaggio");
    expect(vincitore({ 1: "lupo", 2: "contadino", 3: "contadino" }, [1, 2])).toBe("lupi");
    expect(vincitore({ 1: "lupo", 2: "contadino", 3: "contadino" }, [1, 2, 3])).toBeNull();
  });
});

describe("partita", () => {
  it("una notte: la vittima muore se non è protetta", () => {
    let s = avvia();
    for (let i = 0; i < nomi.length; i++) {
      s = riduci(s, { tipo: "mostraCarta" });
      s = riduci(s, { tipo: "prossimaCarta" });
    }
    expect(s.fase).toBe("lupi");
    const civile = s.vivi.find((p) => s.ruoli[p] !== "lupo") as number;
    s = riduci(s, { tipo: "scegli", posto: civile });
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("veggente");
    s = riduci(s, { tipo: "scegli", posto: 1 });
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("medico");
    const altro = s.vivi.find((p) => p !== civile) as number;
    s = riduci(s, { tipo: "scegli", posto: altro });
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("alba");
    expect(s.mortiNotte).toEqual([civile]);
    expect(s.vivi).not.toContain(civile);
  });
  it("il medico salva la vittima", () => {
    let s = avvia();
    s = { ...s, fase: "medico", vittima: 2, protetto: 2 };
    s = riduci(s, { tipo: "avanti" });
    expect(s.mortiNotte).toEqual([]);
    expect(s.vivi).toContain(2);
  });
  it("pareggio: ballottaggio, poi nessuno eliminato", () => {
    let s: Stato = { ...avvia(), fase: "voto" };
    s = riduci(s, { tipo: "chiudiVoto", voti: { 1: 2, 2: 2 } });
    expect(s.fase).toBe("voto");
    expect(s.ballottaggio).toEqual([1, 2]);
    s = riduci(s, { tipo: "chiudiVoto", voti: { 1: 1, 2: 1 } });
    expect(s.fase).toBe("esito");
    expect(s.eliminato).toBeNull();
    s = riduci(s, { tipo: "dopoVoto" });
    expect(s.fase).toBe("lupi");
  });
});
