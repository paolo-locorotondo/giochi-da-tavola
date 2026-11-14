import { describe, expect, it } from "vitest";
import {
  candidatiNotte,
  contaVoti,
  distribuisciRuoli,
  haRuoloVivo,
  contadiniRestanti,
  composizione,
  lupiPer,
  specialiPredefiniti,
  riduci,
  statoIniziale,
  vincitore,
  type Azione,
  type Fase,
  type Ruolo,
  type Stato,
} from "./logica";

const nomiDi = (n: number) => Array.from({ length: n }, (_, i) => `G${i + 1}`);
const avvia = (n: number, seme = 1, extra: Partial<Extract<Azione, { tipo: "avvia" }>> = {}): Stato =>
  riduci(statoIniziale(), { tipo: "avvia", nomi: nomiDi(n), seme, ...extra });
const postiCon = (s: Stato, ruolo: Ruolo) => s.vivi.filter((p) => s.ruoli[p] === ruolo);
/** Porta lo stato in una fase (come se la notte 1 fosse già cominciata). */
const alla = (s: Stato, fase: Fase, extra: Partial<Stato> = {}): Stato => ({ ...s, fase, notte: Math.max(2, s.notte), ...extra });
const scegliEAvanti = (s: Stato, posto: number) => riduci(riduci(s, { tipo: "scegli", posto }), { tipo: "avanti" });

function distribuisci(s: Stato): Stato {
  for (let i = 0; i < s.giocatori.length; i++) {
    s = riduci(riduci(s, { tipo: "mostraCarta" }), { tipo: "prossimaCarta" });
  }
  return s;
}

describe("lupiPer", () => {
  it.each([
    [8, 2],
    [12, 2],
    [15, 2],
    [16, 3],
    [24, 3],
  ])("%i giocatori → %i lupi", (n, atteso) => {
    expect(lupiPer(n)).toBe(atteso);
  });
});

describe("composizione: speciali per numero di giocatori", () => {
  it("il medico compare da 11 giocatori", () => {
    expect(specialiPredefiniti(10)).toEqual([]);
    expect(specialiPredefiniti(11)).toEqual(["medico"]);
    expect(specialiPredefiniti(24)).toEqual(["medico"]);
  });

  it("si può togliere o aggiungere un personaggio speciale", () => {
    expect(composizione(11, [])).not.toContain("medico");
    expect(composizione(8, ["medico"])).toContain("medico");
    expect(contadiniRestanti(8, ["medico"])).toBe(4);
    expect(contadiniRestanti(8, [])).toBe(5);
  });
});

describe("distribuisciRuoli: composizione per numero di giocatori", () => {
  for (let n = 8; n <= 24; n++) {
    it(`${n} giocatori`, () => {
      for (let seme = 0; seme < 25; seme++) {
        const r = distribuisciRuoli(n, seme);
        const conta = (x: Ruolo) => r.filter((y) => y === x).length;
        expect(r).toHaveLength(n);
        expect(conta("lupo")).toBe(lupiPer(n));
        expect(conta("veggente")).toBe(1);
        expect(conta("medico")).toBe(n >= 11 ? 1 : 0);
        expect(conta("contadino")).toBe(n - conta("lupo") - conta("veggente") - conta("medico"));
        expect(conta("lupo")).toBeLessThan(n - conta("lupo"));
      }
    });
  }

  it("usa gli speciali scelti al posto di quelli predefiniti", () => {
    expect(distribuisciRuoli(8, 1, ["medico"])).toContain("medico");
    expect(distribuisciRuoli(12, 1, [])).not.toContain("medico");
  });

  it("semi diversi cambiano la disposizione", () => {
    const viste = new Set(Array.from({ length: 30 }, (_, seme) => distribuisciRuoli(8, seme).join()));
    expect(viste.size).toBeGreaterThan(5);
  });
});

describe("avvia", () => {
  it("assegna un ruolo a ogni posto e li mette tutti vivi", () => {
    const s = avvia(8);
    expect(s.giocatori).toHaveLength(8);
    expect(s.vivi).toEqual(s.giocatori.map((g) => g.posto));
    expect(Object.keys(s.ruoli)).toHaveLength(8);
    expect(s.fase).toBe("carte");
    expect(s.notte).toBe(0);
  });

  it("è deterministica per seme", () => {
    expect(avvia(9, 5)).toEqual(avvia(9, 5));
    expect(avvia(9, 5).ruoli).not.toEqual(avvia(9, 6).ruoli);
  });

  it("opzioni di default: ruoli non svelati, narratore fuori dal gioco, prima notte senza vittima", () => {
    const s = avvia(8);
    expect(s.svelaRuoli).toBe(false);
    expect(s.narratoreGioca).toBe(false);
    expect(s.primaNotteSenzaVittima).toBe(true);
  });

  it("riporta le opzioni scelte", () => {
    const s = avvia(8, 1, { svelaRuoli: true, narratoreGioca: true, primaNotteSenzaVittima: false });
    expect(s.svelaRuoli).toBe(true);
    expect(s.narratoreGioca).toBe(true);
    expect(s.primaNotteSenzaVittima).toBe(false);
  });

  it("rifiuta nomi vuoti e duplicati", () => {
    expect(() => riduci(statoIniziale(), { tipo: "avvia", nomi: ["A", " ", "C", "D"], seme: 1 })).toThrow();
    expect(() => riduci(statoIniziale(), { tipo: "avvia", nomi: ["A", "a", "C", "D"], seme: 1 })).toThrow();
  });

  it("riparte pulita anche da una partita in corso", () => {
    const vecchia = alla(avvia(8), "voto", { notte: 3, vittima: 2 });
    const nuova = riduci(vecchia, { tipo: "avvia", nomi: nomiDi(9), seme: 2 });
    expect(nuova.notte).toBe(0);
    expect(nuova.vittima).toBeNull();
    expect(nuova.giocatori).toHaveLength(9);
  });
});

describe("azzera", () => {
  it("torna allo stato iniziale da qualsiasi fase", () => {
    for (const fase of ["carte", "lupi", "alba", "voto", "esito", "fine"] as const) {
      expect(riduci(alla(avvia(8), fase), { tipo: "azzera" })).toEqual(statoIniziale());
    }
  });
});

describe("distribuzione delle carte", () => {
  it("la carta si mostra e poi si passa al giocatore dopo, nascosta", () => {
    let s = avvia(8);
    s = riduci(s, { tipo: "mostraCarta" });
    expect(s.cartaMostrata).toBe(true);
    s = riduci(s, { tipo: "prossimaCarta" });
    expect(s.indiceCarta).toBe(1);
    expect(s.cartaMostrata).toBe(false);
    expect(s.fase).toBe("carte");
  });

  it("dopo l'ultima carta comincia la prima notte, dal veggente (il medico dorme)", () => {
    const s = distribuisci(avvia(12));
    expect(s.fase).toBe("veggente");
    expect(s.notte).toBe(1);
    expect(s.cartaMostrata).toBe(false);
  });

  it("finché ci sono carte da dare si resta in distribuzione", () => {
    let s = avvia(8);
    for (let i = 0; i < 3; i++) s = riduci(riduci(s, { tipo: "mostraCarta" }), { tipo: "prossimaCarta" });
    expect(s.indiceCarta).toBe(3);
    expect(s.fase).toBe("carte");
  });
});

describe("scelte notturne: chi si può scegliere", () => {
  it("i lupi non possono sbranare un lupo", () => {
    const s = alla(avvia(8, 3), "lupi");
    const lupo = postiCon(s, "lupo")[0]!;
    expect(candidatiNotte(s)).not.toContain(lupo);
    expect(riduci(s, { tipo: "scegli", posto: lupo }).vittima).toBeNull();
  });

  it("i lupi possono scegliere ogni non lupo vivo", () => {
    const s = alla(avvia(8, 3), "lupi");
    expect([...candidatiNotte(s)].sort()).toEqual(s.vivi.filter((p) => s.ruoli[p] !== "lupo").sort());
  });

  it("i lupi possono cambiare idea prima di confermare", () => {
    const s = alla(avvia(8, 3), "lupi");
    const [a, b] = candidatiNotte(s);
    const dopo = riduci(riduci(s, { tipo: "scegli", posto: a! }), { tipo: "scegli", posto: b! });
    expect(dopo.vittima).toBe(b);
  });

  it("il veggente non indaga su sé stesso", () => {
    const s = alla(avvia(8, 3), "veggente");
    const veggente = postiCon(s, "veggente")[0]!;
    expect(candidatiNotte(s)).not.toContain(veggente);
    expect(riduci(s, { tipo: "scegli", posto: veggente }).ispezionato).toBeNull();
  });

  it("il veggente guarda una sola persona a notte", () => {
    const s = alla(avvia(8, 3), "veggente");
    const [a, b] = candidatiNotte(s);
    const dopo = riduci(riduci(s, { tipo: "scegli", posto: a! }), { tipo: "scegli", posto: b! });
    expect(dopo.ispezionato).toBe(a);
  });

  it("il medico non può proteggere sé stesso", () => {
    const s = alla(avvia(12, 3), "medico");
    const medico = postiCon(s, "medico")[0]!;
    expect(candidatiNotte(s)).not.toContain(medico);
    expect(riduci(s, { tipo: "scegli", posto: medico }).protetto).toBeNull();
  });

  it("il medico può proteggere la stessa persona più notti di fila", () => {
    const s = alla(avvia(12, 3), "medico");
    const altro = candidatiNotte(s)[0]!;
    const notte2 = riduci(s, { tipo: "scegli", posto: altro });
    const notte3 = riduci({ ...notte2, notte: 3, protetto: null }, { tipo: "scegli", posto: altro });
    expect(notte3.protetto).toBe(altro);
  });

  it("non si può scegliere un giocatore morto", () => {
    const base = alla(avvia(8, 3), "lupi");
    const morto = candidatiNotte(base)[0]!;
    const s = { ...base, vivi: base.vivi.filter((p) => p !== morto) };
    expect(riduci(s, { tipo: "scegli", posto: morto }).vittima).toBeNull();
  });

  it("non si può scegliere un posto inesistente", () => {
    expect(riduci(alla(avvia(8, 3), "lupi"), { tipo: "scegli", posto: 99 }).vittima).toBeNull();
  });

  it("fuori dalle fasi notturne scegliere non fa nulla", () => {
    for (const fase of ["carte", "alba", "voto", "esito", "fine"] as const) {
      const s = alla(avvia(8, 3), fase);
      expect(riduci(s, { tipo: "scegli", posto: 1 })).toEqual(s);
    }
  });

  it("candidatiNotte fuori dalla notte è vuoto", () => {
    expect(candidatiNotte(alla(avvia(8), "voto"))).toEqual([]);
  });
});

describe("ordine delle fasi della notte", () => {
  /** Fasi attraversate dalla notte `notte` finché non arriva l'alba. */
  function fasiDellaNotte(n: number, notte: number): Fase[] {
    const fasi: Fase[] = [];
    let s = riduci({ ...avvia(n), fase: "voto", notte: notte - 1 }, { tipo: "dopoVoto" });
    while (s.fase !== "alba" && fasi.length < 6) {
      fasi.push(s.fase);
      const c = candidatiNotte(s);
      s = c.length ? scegliEAvanti(s, c[0]!) : riduci(s, { tipo: "avanti" });
    }
    return fasi;
  }

  it("prima notte: veggente e lupi (che si riconoscono soltanto), anche con il medico", () => {
    expect(fasiDellaNotte(8, 1)).toEqual(["veggente", "lupi"]);
    expect(fasiDellaNotte(12, 1)).toEqual(["veggente", "lupi"]);
  });

  it("dalla seconda notte il medico (se c'è) si sveglia per primo", () => {
    expect(fasiDellaNotte(8, 2)).toEqual(["veggente", "lupi"]);
    expect(fasiDellaNotte(12, 2)).toEqual(["medico", "veggente", "lupi"]);
    expect(fasiDellaNotte(24, 5)).toEqual(["medico", "veggente", "lupi"]);
  });

  it("anche se il veggente è morto la sua fase si fa (per non svelare nulla)", () => {
    const base = alla(avvia(9, 2), "veggente");
    const veggente = postiCon(base, "veggente")[0]!;
    const s: Stato = { ...base, vivi: base.vivi.filter((p) => p !== veggente) };
    expect(riduci(s, { tipo: "avanti" }).fase).toBe("lupi");
  });

  it("la prima notte con l'opzione i lupi non scelgono nessuno", () => {
    const s = alla(avvia(9, 2), "lupi", { notte: 1 });
    expect(candidatiNotte(s)).toEqual([]);
    expect(riduci(s, { tipo: "scegli", posto: 1 }).vittima).toBeNull();
    expect(riduci(s, { tipo: "avanti" }).mortiNotte).toEqual([]);
  });

  it("la prima notte senza l'opzione i lupi sbranano", () => {
    const s = alla(avvia(9, 2, { primaNotteSenzaVittima: false }), "lupi", { notte: 1 });
    expect(candidatiNotte(s).length).toBeGreaterThan(0);
  });
});

describe("risoluzione della notte", () => {
  it("nessuna vittima scelta: non muore nessuno", () => {
    const s = riduci(alla(avvia(8), "lupi"), { tipo: "avanti" });
    expect(s.fase).toBe("alba");
    expect(s.mortiNotte).toEqual([]);
    expect(s.vivi).toHaveLength(8);
  });

  it("la vittima muore se nessuno la protegge", () => {
    const base = alla(avvia(8), "lupi");
    const vittima = candidatiNotte(base)[0]!;
    const s = scegliEAvanti(base, vittima);
    expect(s.mortiNotte).toEqual([vittima]);
    expect(s.vivi).not.toContain(vittima);
  });

  it("la protezione salva solo se coincide con la vittima", () => {
    const base = alla(avvia(12, 2), "lupi");
    const [a, b] = candidatiNotte(base);
    const salva = riduci({ ...base, vittima: a!, protetto: a! }, { tipo: "avanti" });
    const nonSalva = riduci({ ...base, vittima: a!, protetto: b! }, { tipo: "avanti" });
    expect(salva.mortiNotte).toEqual([]);
    expect(salva.vivi).toContain(a);
    expect(nonSalva.mortiNotte).toEqual([a]);
  });

  it("con il medico morto la protezione finta non salva", () => {
    const base = alla(avvia(12, 2), "lupi");
    const vittima = candidatiNotte(base)[0]!;
    const medico = postiCon(base, "medico")[0]!;
    const s = { ...base, vittima, protetto: vittima, vivi: base.vivi.filter((p) => p !== medico) };
    expect(riduci(s, { tipo: "avanti" }).mortiNotte).toEqual([vittima]);
  });

  it("se la vittima fa vincere i lupi, l'alba porta già il vincitore", () => {
    const base = avvia(8, 1);
    const lupi = postiCon(base, "lupo");
    const civili = base.vivi.filter((p) => !lupi.includes(p));
    const s: Stato = { ...base, fase: "lupi", notte: 2, vivi: [...lupi, civili[0]!, civili[1]!, civili[2]!] };
    const dopo = scegliEAvanti(s, civili[0]!);
    expect(dopo.fase).toBe("alba");
    expect(dopo.vincitore).toBe("lupi");
    expect(riduci(dopo, { tipo: "dopoVoto" }).fase).toBe("fine");
  });

  it("dall'alba si va al voto, senza ballottaggio", () => {
    const voto = riduci(alla(avvia(8), "alba", { ballottaggio: [1, 2], esitoVoto: "ballottaggio" }), { tipo: "avanti" });
    expect(voto.fase).toBe("voto");
    expect(voto.ballottaggio).toBeNull();
    expect(voto.esitoVoto).toBeNull();
  });
});

describe("contaVoti", () => {
  it.each([
    [{}, { eliminato: null, pari: [] }],
    [{ 1: 0, 2: 0 }, { eliminato: null, pari: [] }],
    [{ 3: 4 }, { eliminato: 3, pari: [] }],
    [{ 1: 2, 2: 3, 3: 1 }, { eliminato: 2, pari: [] }],
    [{ 1: 2, 2: 2, 3: 1 }, { eliminato: null, pari: [1, 2] }],
    [{ 1: 1, 2: 1, 3: 1 }, { eliminato: null, pari: [1, 2, 3] }],
  ])("%j", (voti, atteso) => {
    expect(contaVoti(voti as Record<number, number>)).toEqual(atteso);
  });
});

describe("vincitore", () => {
  const ruoli: Record<number, Ruolo> = { 1: "lupo", 2: "lupo", 3: "contadino", 4: "contadino", 5: "veggente", 6: "medico" };

  it("nessun lupo vivo: vince il villaggio", () => {
    expect(vincitore(ruoli, [3, 4, 5, 6])).toBe("villaggio");
    expect(vincitore(ruoli, [])).toBe("villaggio");
  });

  it("lupi ≥ non lupi: vincono i lupi", () => {
    expect(vincitore(ruoli, [1, 3])).toBe("lupi");
    expect(vincitore(ruoli, [1, 2, 3])).toBe("lupi");
    expect(vincitore(ruoli, [1])).toBe("lupi");
  });

  it("lupi < non lupi: si continua", () => {
    expect(vincitore(ruoli, [1, 3, 4])).toBeNull();
    expect(vincitore(ruoli, [1, 2, 3, 4, 5])).toBeNull();
  });
});

describe("haRuoloVivo", () => {
  it("vede se il ruolo è tra i vivi", () => {
    const s = avvia(12, 3);
    const medico = postiCon(s, "medico")[0]!;
    expect(haRuoloVivo(s, "medico")).toBe(true);
    expect(haRuoloVivo({ ...s, vivi: s.vivi.filter((p) => p !== medico) }, "medico")).toBe(false);
  });
});

describe("votazione", () => {
  const voto = (n = 8): Stato => alla(avvia(n, 3), "voto");

  it("il più votato è eliminato e la fase passa all'esito", () => {
    const s = riduci(voto(), { tipo: "chiudiVoto", voti: { 2: 5, 3: 2 } });
    expect(s.fase).toBe("esito");
    expect(s.eliminato).toBe(2);
    expect(s.vivi).not.toContain(2);
    expect(s.esitoVoto).toBeNull();
  });

  it("eliminato l'ultimo lupo vince il villaggio", () => {
    const pieno = voto(8);
    const [lupo, altroLupo] = postiCon(pieno, "lupo") as [number, number];
    const base = { ...pieno, vivi: pieno.vivi.filter((p) => p !== altroLupo) };
    const s = riduci(base, { tipo: "chiudiVoto", voti: { [lupo]: 5 } });
    expect(s.vincitore).toBe("villaggio");
    expect(riduci(s, { tipo: "dopoVoto" }).fase).toBe("fine");
  });

  it("eliminato un civile che porta alla parità vincono i lupi", () => {
    const base = voto(8);
    const lupi = postiCon(base, "lupo");
    const civili = base.vivi.filter((p) => !lupi.includes(p));
    const ridotto = { ...base, vivi: [...lupi, civili[0]!, civili[1]!, civili[2]!] };
    const s = riduci(ridotto, { tipo: "chiudiVoto", voti: { [civili[0]!]: 3 } });
    expect(s.vincitore).toBe("lupi");
  });

  it("senza vincitore dopo il voto comincia una nuova notte pulita", () => {
    const base = { ...voto(), vittima: 3, protetto: 4, ispezionato: 5, mortiNotte: [6] };
    const s = riduci(riduci(base, { tipo: "chiudiVoto", voti: { 2: 5 } }), { tipo: "dopoVoto" });
    expect(s.fase).toBe("veggente");
    expect(s.notte).toBe(base.notte + 1);
    expect(s.eliminato).toBeNull();
    expect(s.mortiNotte).toEqual([]);
    expect(s.vittima).toBeNull();
    expect(s.protetto).toBeNull();
    expect(s.ispezionato).toBeNull();
  });

  it("primo pareggio: ballottaggio tra i pari merito, si resta in voto", () => {
    const s = riduci(voto(), { tipo: "chiudiVoto", voti: { 1: 2, 2: 2, 3: 1 } });
    expect(s.fase).toBe("voto");
    expect(s.ballottaggio).toEqual([1, 2]);
    expect(s.esitoVoto).toBe("ballottaggio");
    expect(s.vivi).toHaveLength(8);
  });

  it("ballottaggio risolto: chi ha più voti esce", () => {
    let s = riduci(voto(), { tipo: "chiudiVoto", voti: { 1: 2, 2: 2 } });
    s = riduci(s, { tipo: "chiudiVoto", voti: { 1: 1, 2: 4 } });
    expect(s.fase).toBe("esito");
    expect(s.eliminato).toBe(2);
    expect(s.ballottaggio).toBeNull();
  });

  it("secondo pareggio: nessuno eliminato", () => {
    let s = riduci(voto(), { tipo: "chiudiVoto", voti: { 1: 2, 2: 2 } });
    s = riduci(s, { tipo: "chiudiVoto", voti: { 1: 3, 2: 3 } });
    expect(s.fase).toBe("esito");
    expect(s.eliminato).toBeNull();
    expect(s.vivi).toHaveLength(8);
    expect(s.esitoVoto).toBe("ancora-pari");
    expect(s.vincitore).toBeNull();
  });

  it("nessun voto: nessuno eliminato", () => {
    const s = riduci(voto(), { tipo: "chiudiVoto", voti: {} });
    expect(s.fase).toBe("esito");
    expect(s.eliminato).toBeNull();
  });

  it("dopo un voto senza eliminati la notte riparte senza ballottaggio", () => {
    let s = riduci(voto(), { tipo: "chiudiVoto", voti: { 1: 2, 2: 2 } });
    s = riduci(riduci(s, { tipo: "chiudiVoto", voti: { 1: 3, 2: 3 } }), { tipo: "dopoVoto" });
    expect(s.ballottaggio).toBeNull();
    expect(s.fase).toBe("veggente");
  });
});

describe("azioni fuori fase", () => {
  it("avanti in carte, voto, esito o fine non cambia lo stato", () => {
    for (const fase of ["carte", "voto", "esito", "fine"] as const) {
      const s = alla(avvia(8), fase);
      expect(riduci(s, { tipo: "avanti" })).toEqual(s);
    }
  });

  it("il riduttore non modifica lo stato ricevuto", () => {
    const s = alla(avvia(8, 2), "lupi");
    const copia = structuredClone(s);
    scegliEAvanti(s, candidatiNotte(s)[0]!);
    expect(s).toEqual(copia);
  });
});

describe("partite complete", () => {
  /** Gioca una partita intera con scelte deterministiche; il villaggio vota sempre un lupo. */
  function gioca(n: number, seme: number): Stato {
    let s = distribuisci(avvia(n, seme));
    for (let passo = 0; passo < 600 && s.fase !== "fine"; passo++) {
      if (s.fase === "lupi" || s.fase === "veggente" || s.fase === "medico") {
        const c = candidatiNotte(s);
        s = c.length ? scegliEAvanti(s, c[passo % c.length]!) : riduci(s, { tipo: "avanti" });
      } else if (s.fase === "alba") {
        s = riduci(s, { tipo: s.vincitore ? "dopoVoto" : "avanti" });
      } else if (s.fase === "voto") {
        const lupo = postiCon(s, "lupo")[0] ?? s.vivi[0]!;
        s = riduci(s, { tipo: "chiudiVoto", voti: { [lupo]: s.vivi.length } });
      } else if (s.fase === "esito") {
        s = riduci(s, { tipo: "dopoVoto" });
      }
    }
    return s;
  }

  for (let n = 8; n <= 24; n++) {
    it(`${n} giocatori: ogni partita arriva a un vincitore coerente`, () => {
      for (let seme = 1; seme <= 20; seme++) {
        const s = gioca(n, seme);
        expect(s.fase, `n=${n} seme=${seme}`).toBe("fine");
        expect(s.vincitore).not.toBeNull();
        expect(s.vincitore).toBe(vincitore(s.ruoli, s.vivi));
      }
    });
  }
});
