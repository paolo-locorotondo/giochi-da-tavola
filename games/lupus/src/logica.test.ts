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
  it("senza veggente né medico (4 giocatori) la vittima dei lupi muore comunque", () => {
    let s = riduci(statoIniziale(), { tipo: "avvia", nomi: ["A", "B", "C", "D"], seme: 3 });
    s = { ...s, fase: "lupi" };
    const civile = s.vivi.find((p) => s.ruoli[p] !== "lupo") as number;
    s = riduci(s, { tipo: "scegli", posto: civile });
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("alba");
    expect(s.mortiNotte).toEqual([civile]);
    expect(s.vivi).not.toContain(civile);
  });
  it("senza medico (5 giocatori) la vittima muore dopo il veggente", () => {
    let s = riduci(statoIniziale(), { tipo: "avvia", nomi: ["A", "B", "C", "D", "E"], seme: 3 });
    s = { ...s, fase: "lupi" };
    const civile = s.vivi.find((p) => s.ruoli[p] !== "lupo") as number;
    s = riduci(s, { tipo: "scegli", posto: civile });
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("veggente");
    s = riduci(s, { tipo: "scegli", posto: 1 });
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("alba");
    expect(s.mortiNotte).toEqual([civile]);
  });
  it("il veggente ispeziona una sola persona a notte", () => {
    let s = avvia();
    s = { ...s, fase: "veggente" };
    s = riduci(s, { tipo: "scegli", posto: 1 });
    s = riduci(s, { tipo: "scegli", posto: 2 });
    expect(s.ispezionato).toBe(1);
  });
  it("svelaRuoli è attivo di default e si può spegnere", () => {
    expect(avvia().svelaRuoli).toBe(true);
    const s = riduci(statoIniziale(), { tipo: "avvia", nomi: ["A", "B", "C", "D"], seme: 1, svelaRuoli: false });
    expect(s.svelaRuoli).toBe(false);
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

describe("notti: simulazione esaustiva", () => {
  const nottePiena = (s: Stato, vittima: number, protetto: number | null): Stato => {
    let x = riduci(s, { tipo: "scegli", posto: vittima });
    x = riduci(x, { tipo: "avanti" });
    if (x.fase === "veggente") {
      x = riduci(x, { tipo: "scegli", posto: x.vivi[0] as number });
      x = riduci(x, { tipo: "avanti" });
    }
    if (x.fase === "medico") {
      x = riduci(x, { tipo: "scegli", posto: protetto ?? (x.vivi[0] as number) });
      x = riduci(x, { tipo: "avanti" });
    }
    return x;
  };

  for (let n = 4; n <= 12; n++) {
    it(`${n} giocatori: senza protezione valida la vittima muore sempre`, () => {
      for (let seme = 1; seme <= 30; seme++) {
        let s = riduci(statoIniziale(), { tipo: "avvia", nomi: Array.from({ length: n }, (_, i) => `G${i}`), seme });
        s = { ...s, fase: "lupi", notte: 1 };
        const civile = s.vivi.find((p) => s.ruoli[p] !== "lupo") as number;
        // protegge qualcun altro (se c'è il medico) o nessuno
        const altro = s.vivi.find((p) => p !== civile) as number;
        const dopo = nottePiena(s, civile, altro);
        expect(dopo.mortiNotte, `n=${n} seme=${seme}`).toEqual([civile]);
        expect(dopo.vivi).not.toContain(civile);
      }
    });
  }

  it("se il medico è morto, la sua scelta (finta) non salva nessuno", () => {
    let s = riduci(statoIniziale(), { tipo: "avvia", nomi: Array.from({ length: 7 }, (_, i) => `G${i}`), seme: 4 });
    const medico = s.vivi.find((p) => s.ruoli[p] === "medico") as number;
    s = { ...s, fase: "lupi", notte: 2, vivi: s.vivi.filter((p) => p !== medico) };
    const civile = s.vivi.find((p) => s.ruoli[p] !== "lupo") as number;
    const dopo = nottePiena(s, civile, civile);
    expect(dopo.mortiNotte).toEqual([civile]);
  });

  it("la protezione del medico vivo salva davvero", () => {
    let s = riduci(statoIniziale(), { tipo: "avvia", nomi: Array.from({ length: 7 }, (_, i) => `G${i}`), seme: 4 });
    s = { ...s, fase: "lupi", notte: 1 };
    const civile = s.vivi.find((p) => s.ruoli[p] !== "lupo") as number;
    const dopo = nottePiena(s, civile, civile);
    expect(dopo.mortiNotte).toEqual([]);
  });

  it("più notti di fila: lo stato della notte non si trascina", () => {
    let s = riduci(statoIniziale(), { tipo: "avvia", nomi: Array.from({ length: 8 }, (_, i) => `G${i}`), seme: 9 });
    s = { ...s, fase: "lupi", notte: 1 };
    const prima = s.vivi.find((p) => s.ruoli[p] !== "lupo") as number;
    s = nottePiena(s, prima, prima); // salvato
    expect(s.mortiNotte).toEqual([]);
    s = riduci({ ...s, fase: "voto" }, { tipo: "chiudiVoto", voti: {} });
    s = riduci(s, { tipo: "dopoVoto" });
    expect(s.fase).toBe("lupi");
    expect(s.vittima).toBeNull();
    const seconda = s.vivi.find((p) => s.ruoli[p] !== "lupo" && p !== prima) as number;
    const dopo = nottePiena(s, seconda, null);
    expect(dopo.mortiNotte).toEqual([seconda]);
  });
});
