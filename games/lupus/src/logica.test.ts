import { describe, expect, it } from "vitest";
import { classificaVoti, distribuisciRuoli, riduci, statoIniziale, vincitore, type Stato } from "./logica";

const nomiDi = (n: number) => Array.from({ length: n }, (_, i) => `G${i + 1}`);
const avvia = (n = 9, seme = 7, extra: Partial<Extract<Parameters<typeof riduci>[1], { tipo: "avvia" }>> = {}): Stato =>
  riduci(statoIniziale(), { tipo: "avvia", nomi: nomiDi(n), seme, ...extra });
const distribuisci = (s: Stato): Stato => {
  for (let i = 0; i < s.giocatori.length; i++) s = riduci(riduci(s, { tipo: "mostraCarta" }), { tipo: "prossimaCarta" });
  return s;
};
const scegliEAvanti = (s: Stato, posto: number) => riduci(riduci(s, { tipo: "scegli", posto }), { tipo: "avanti" });
const civileNonVeggente = (s: Stato) => s.vivi.find((p) => s.ruoli[p] === "contadino") as number;

describe("ruoli", () => {
  it("2 lupi e 1 veggente fino a 15 giocatori, medico da 11, medium da 9", () => {
    const r = distribuisciRuoli(8, 1);
    expect(r.filter((x) => x === "lupo")).toHaveLength(2);
    expect(r).toContain("veggente");
    expect(r).not.toContain("medico");
    expect(distribuisciRuoli(11, 1)).toContain("medico");
    expect(distribuisciRuoli(16, 1).filter((x) => x === "lupo")).toHaveLength(3);
  });
  it("è deterministica", () => {
    expect(distribuisciRuoli(9, 5)).toEqual(distribuisciRuoli(9, 5));
  });
});

describe("voti", () => {
  const giocatori = [1, 2, 3, 4].map((posto) => ({ posto, nome: `G${posto}` }));

  it("ordina i candidati dal più votato", () => {
    expect(classificaVoti({ giocatori, benvenuto: null }, [1, 2, 3], { 1: 1, 2: 3, 3: 2 })).toEqual([2, 3, 1]);
  });

  it("a parità vince chi è primo nell'elenco se il Benvenuto è del narratore", () => {
    expect(classificaVoti({ giocatori, benvenuto: null }, [3, 2, 4], { 2: 2, 3: 2, 4: 2 })).toEqual([2, 3, 4]);
  });

  it("a parità vince chi è più vicino, in senso orario, a chi ha il Benvenuto", () => {
    // Il Benvenuto è del posto 3: dopo di lui vengono 4, poi 1, poi 2.
    expect(classificaVoti({ giocatori, benvenuto: 3 }, [1, 2, 4], { 1: 1, 2: 1, 4: 1 })).toEqual([4, 1, 2]);
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
  it("la prima notte, con l'opzione attiva, non muore nessuno", () => {
    let s = distribuisci(avvia(9));
    expect(s.notte).toBe(1);
    expect(s.fase).toBe("veggente");
    s = scegliEAvanti(s, civileNonVeggente(s));
    expect(s.fase).toBe("lupi");
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("alba");
    expect(s.mortiNotte).toEqual([]);
  });

  it("la prima notte con l'opzione spenta i lupi sbranano", () => {
    let s = distribuisci(avvia(9, 7, { primaNotteSenzaVittima: false }));
    s = scegliEAvanti(s, civileNonVeggente(s));
    const civile = civileNonVeggente(s);
    s = scegliEAvanti(s, civile);
    expect(s.mortiNotte).toEqual([civile]);
  });

  it("l'ordine della notte 2 con tutti: medium, medico, veggente, lupi", () => {
    let s = { ...distribuisci(avvia(12)), notte: 1 };
    s = riduci({ ...s, fase: "esito" }, { tipo: "dopoVoto" });
    expect(s.notte).toBe(2);
    expect(s.fase).toBe("medium");
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("gufo");
    s = scegliEAvanti(s, s.vivi.find((p) => s.ruoli[p] === "contadino") as number);
    expect(s.fase).toBe("medico");
    const bersaglio = s.vivi.find((p) => s.ruoli[p] === "contadino") as number;
    s = scegliEAvanti(s, bersaglio);
    expect(s.fase).toBe("veggente");
    s = scegliEAvanti(s, bersaglio);
    expect(s.fase).toBe("lupi");
    s = scegliEAvanti(s, bersaglio);
    expect(s.fase).toBe("alba");
    expect(s.mortiNotte).toEqual([]);
    expect(s.vivi).toContain(bersaglio);
  });

  it("il veggente ispeziona una sola persona a notte", () => {
    let s: Stato = { ...avvia(), fase: "veggente", notte: 1 };
    const [a, b] = s.vivi.filter((p) => s.ruoli[p] !== "veggente");
    s = riduci(s, { tipo: "scegli", posto: a! });
    s = riduci(s, { tipo: "scegli", posto: b! });
    expect(s.ispezionato).toBe(a);
  });

  it("svelaRuoli è spento di default e si può accendere", () => {
    expect(avvia().svelaRuoli).toBe(false);
    expect(avvia(8, 1, { svelaRuoli: true }).svelaRuoli).toBe(true);
  });

  it("il medico non può proteggere sé stesso, ma la stessa persona due notti sì", () => {
    const s: Stato = { ...avvia(12), fase: "medico", notte: 3 };
    const medico = s.vivi.find((p) => s.ruoli[p] === "medico") as number;
    expect(riduci(s, { tipo: "scegli", posto: medico }).protetto).toBeNull();
    const altro = s.vivi.find((p) => p !== medico) as number;
    const due = riduci({ ...riduci(s, { tipo: "scegli", posto: altro }), notte: 4, fase: "medico" }, { tipo: "scegli", posto: altro });
    expect(due.protetto).toBe(altro);
  });
});

describe("notti: simulazione esaustiva", () => {
  /** Una notte intera: ogni fase che compare sceglie qualcuno. */
  const nottePiena = (s: Stato, vittima: number, protetto: number): Stato => {
    let x = s;
    for (let i = 0; i < 8 && ["medium", "massoni", "gufo", "medico", "veggente", "lupi"].includes(x.fase); i++) {
      const posto = x.fase === "lupi" ? vittima : x.fase === "medico" ? protetto : x.fase === "gufo" ? (x.vivi.find((p) => x.ruoli[p] === "lupo") as number) : (x.vivi.find((p) => x.ruoli[p] !== "veggente" && x.ruoli[p] !== "criceto") as number);
      x = scegliEAvanti(x, posto);
    }
    return x;
  };
  const dallaNotte = (n: number, seme: number, notte: number): Stato => {
    const s = riduci(statoIniziale(), { tipo: "avvia", nomi: nomiDi(n), seme, primaNotteSenzaVittima: false });
    return riduci({ ...s, fase: "voto", notte: notte - 1 }, { tipo: "dopoVoto" });
  };

  for (let n = 8; n <= 24; n += 4) {
    it(`${n} giocatori: senza protezione valida la vittima muore sempre`, () => {
      for (let seme = 1; seme <= 30; seme++) {
        const s = dallaNotte(n, seme, 2);
        const civile = s.vivi.find((p) => s.ruoli[p] === "contadino") as number;
        const altro = s.vivi.find((p) => p !== civile && s.ruoli[p] !== "medico") as number;
        const dopo = nottePiena(s, civile, altro);
        expect(dopo.mortiNotte, `n=${n} seme=${seme}`).toEqual([civile]);
      }
    });
  }

  it("se il medico è morto, la sua scelta (finta) non salva nessuno", () => {
    let s = dallaNotte(12, 4, 2);
    const medico = s.vivi.find((p) => s.ruoli[p] === "medico") as number;
    s = { ...s, vivi: s.vivi.filter((p) => p !== medico) };
    const civile = s.vivi.find((p) => s.ruoli[p] === "contadino") as number;
    expect(nottePiena(s, civile, civile).mortiNotte).toEqual([civile]);
  });

  it("la protezione del medico vivo salva davvero", () => {
    const s = dallaNotte(12, 4, 2);
    const civile = s.vivi.find((p) => s.ruoli[p] === "contadino") as number;
    expect(nottePiena(s, civile, civile).mortiNotte).toEqual([]);
  });
});
