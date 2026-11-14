import { describe, expect, it } from "vitest";
import {
  candidatiNotte,
  classificaVoti,
  votantiSecondoTurno,
  distribuisciRuoli,
  haRuoloVivo,
  contadiniRestanti,
  composizione,
  lupiPer,
  specialiPredefiniti,
  riduci,
  statoIniziale,
  vincitore,
  fazione,
  massoni,
  linciatoEraLupo,
  postiVincitori,
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
  it("gli speciali compaiono dal numero minimo", () => {
    expect(specialiPredefiniti(8)).toEqual([]);
    expect(specialiPredefiniti(9)).toEqual(["medium"]);
    expect(specialiPredefiniti(10)).toEqual(["medium", "indemoniato"]);
    expect(specialiPredefiniti(11)).toEqual(["medium", "indemoniato", "medico"]);
    expect(specialiPredefiniti(12)).toEqual(["medium", "indemoniato", "medico"]);
    expect(specialiPredefiniti(13)).toEqual(["medium", "indemoniato", "medico", "massone"]);
    expect(specialiPredefiniti(14)).not.toContain("criceto");
    expect(specialiPredefiniti(15)).toEqual(["medium", "indemoniato", "medico", "massone", "criceto"]);
  });

  it("i massoni sono sempre due", () => {
    expect(composizione(13).filter((r) => r === "massone")).toHaveLength(2);
    expect(composizione(24).filter((r) => r === "massone")).toHaveLength(2);
    expect(composizione(8, ["massone"]).filter((r) => r === "massone")).toHaveLength(2);
    expect(contadiniRestanti(8, ["massone"])).toBe(3);
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
        expect(conta("medium")).toBe(n >= 9 ? 1 : 0);
        expect(conta("indemoniato")).toBe(n >= 10 ? 1 : 0);
        expect(conta("massone")).toBe(n >= 13 ? 2 : 0);
        expect(conta("criceto")).toBe(n >= 15 ? 1 : 0);
        expect(conta("contadino")).toBe(
          n -
            conta("lupo") -
            conta("veggente") -
            conta("medico") -
            conta("medium") -
            conta("indemoniato") -
            conta("massone") -
            conta("criceto"),
        );
        expect(conta("lupo")).toBeLessThan(n - conta("lupo"));
      }
    });
  }

  it("usa gli speciali scelti al posto di quelli predefiniti", () => {
    expect(distribuisciRuoli(8, 1, ["medico"])).toContain("medico");
    expect(distribuisciRuoli(12, 1, [])).not.toContain("medico");
    expect(distribuisciRuoli(12, 1, [])).not.toContain("medium");
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

  it("la prima notte con i massoni si svegliano prima del veggente", () => {
    expect(fasiDellaNotte(13, 1)).toEqual(["massoni", "veggente", "lupi"]);
  });

  it("dalla seconda notte il medico (se c'è) si sveglia per primo", () => {
    expect(fasiDellaNotte(8, 2)).toEqual(["veggente", "lupi"]);
    expect(fasiDellaNotte(9, 2)).toEqual(["medium", "veggente", "lupi"]);
    expect(fasiDellaNotte(12, 2)).toEqual(["medium", "medico", "veggente", "lupi"]);
    expect(fasiDellaNotte(24, 5)).toEqual(["medium", "medico", "veggente", "lupi"]);
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

  it("dall'alba si va alla discussione, poi al primo turno di voto", () => {
    const disc = riduci(alla(avvia(8), "alba", { indiziati: [1, 2] }), { tipo: "avanti" });
    expect(disc.fase).toBe("discussione");
    const voto = riduci(disc, { tipo: "avanti" });
    expect(voto.fase).toBe("voto");
    expect(voto.indiziati).toBeNull();
  });

  it("il Benvenuto passa all'ultimo morto della notte", () => {
    const base = alla(avvia(8), "lupi", { notte: 2 });
    const vittima = candidatiNotte(base)[0]!;
    expect(scegliEAvanti(base, vittima).benvenuto).toBe(vittima);
    // Senza morti il Benvenuto resta dov'era.
    expect(riduci({ ...base, benvenuto: 5 }, { tipo: "avanti" }).benvenuto).toBe(5);
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

describe("votazione ufficiale a due turni", () => {
  const primo = (n = 8): Stato => alla(avvia(n, 3), "voto");
  /** Al secondo turno con indiziati dati. */
  const secondo = (n: number, indiziati: number[], extra: Partial<Stato> = {}): Stato =>
    alla(avvia(n, 3), "voto2", { indiziati, ...extra });

  it("primo turno: i due più votati sono gli indiziati e si passa alle arringhe", () => {
    const s = riduci(primo(), { tipo: "chiudiVoto", voti: { 2: 5, 4: 3, 6: 1 } });
    expect(s.fase).toBe("arringhe");
    expect(s.indiziati).toEqual([2, 4]);
    expect(s.vivi).toHaveLength(8);
  });

  it("primo turno: pareggio per il secondo posto, vince chi è più vicino al Benvenuto del narratore", () => {
    const s = riduci(primo(), { tipo: "chiudiVoto", voti: { 5: 3, 2: 2, 7: 2 } });
    expect(s.indiziati).toEqual([5, 2]);
  });

  it("primo turno: pareggio con il Benvenuto di un morto", () => {
    // Il Benvenuto è del posto 6: dopo di lui 7, 8, 1, 2...
    const s = riduci({ ...primo(), benvenuto: 6 }, { tipo: "chiudiVoto", voti: { 2: 3, 7: 3, 8: 3 } });
    expect(s.indiziati).toEqual([7, 8]);
  });

  it("primo turno: senza nessun voto gli indiziati sono i primi due dopo il Benvenuto", () => {
    expect(riduci(primo(), { tipo: "chiudiVoto", voti: {} }).indiziati).toEqual([1, 2]);
  });

  it("dalle arringhe si va al secondo turno", () => {
    const s = riduci(alla(avvia(8), "arringhe", { indiziati: [1, 2] }), { tipo: "avanti" });
    expect(s.fase).toBe("voto2");
  });

  it("al secondo turno votano solo i vivi non indiziati", () => {
    const s = secondo(8, [1, 2]);
    expect(votantiSecondoTurno(s)).toBe(6);
    expect(votantiSecondoTurno({ ...s, vivi: s.vivi.filter((p) => p !== 5) })).toBe(5);
  });

  it("il più votato tra gli indiziati è linciato e prende il Benvenuto", () => {
    const s = riduci(secondo(8, [1, 2]), { tipo: "chiudiVoto", voti: { 1: 2, 2: 4 } });
    expect(s.fase).toBe("esito");
    expect(s.eliminato).toBe(2);
    expect(s.vivi).not.toContain(2);
    expect(s.benvenuto).toBe(2);
  });

  it("secondo turno in pareggio: lo decide il Benvenuto", () => {
    expect(riduci(secondo(8, [1, 2]), { tipo: "chiudiVoto", voti: { 1: 3, 2: 3 } }).eliminato).toBe(1);
    expect(riduci(secondo(8, [1, 2], { benvenuto: 1 }), { tipo: "chiudiVoto", voti: { 1: 3, 2: 3 } }).eliminato).toBe(2);
  });

  it("senza voti il linciato è comunque il primo dopo il Benvenuto: si lincia sempre", () => {
    expect(riduci(secondo(8, [4, 6]), { tipo: "chiudiVoto", voti: {} }).eliminato).toBe(4);
  });

  it("linciato l'ultimo lupo vince il villaggio", () => {
    const pieno = secondo(8, [1, 2]);
    const [lupo, altroLupo] = postiCon(pieno, "lupo") as [number, number];
    const base = { ...pieno, indiziati: [lupo, 99], vivi: pieno.vivi.filter((p) => p !== altroLupo) };
    const s = riduci(base, { tipo: "chiudiVoto", voti: { [lupo]: 5 } });
    expect(s.vincitore).toBe("villaggio");
    expect(riduci(s, { tipo: "dopoVoto" }).fase).toBe("fine");
  });

  it("linciato un civile che porta alla parità vincono i lupi", () => {
    const base = primo(8);
    const lupi = postiCon(base, "lupo");
    const civili = base.vivi.filter((p) => !lupi.includes(p));
    const ridotto = { ...base, fase: "voto2" as const, indiziati: [civili[0]!, civili[1]!], vivi: [...lupi, civili[0]!, civili[1]!, civili[2]!] };
    const s = riduci(ridotto, { tipo: "chiudiVoto", voti: { [civili[0]!]: 3 } });
    expect(s.vincitore).toBe("lupi");
  });

  it("dopo il linciaggio comincia una nuova notte pulita", () => {
    const base = secondo(8, [1, 2], { vittima: 3, protetto: 4, ispezionato: 5, mortiNotte: [6] });
    const s = riduci(riduci(base, { tipo: "chiudiVoto", voti: { 2: 5 } }), { tipo: "dopoVoto" });
    expect(s.fase).toBe("veggente");
    expect(s.notte).toBe(base.notte + 1);
    expect(s.eliminato).toBeNull();
    expect(s.indiziati).toBeNull();
    expect(s.mortiNotte).toEqual([]);
    expect(s.vittima).toBeNull();
    expect(s.protetto).toBeNull();
    expect(s.ispezionato).toBeNull();
  });

  it("i morti votano al primo turno ma non sono candidati", () => {
    const base = { ...primo(8), vivi: [1, 2, 3, 4, 5, 6] };
    const s = riduci(base, { tipo: "chiudiVoto", voti: { 7: 4, 3: 2, 5: 1 } });
    // 7 è morto: i voti sono dati ai vivi, quelli ai morti non contano.
    expect(s.indiziati).toEqual([3, 5]);
  });
});

describe("classificaVoti: candidati fuori elenco", () => {
  it("ignora chi non è tra i candidati", () => {
    const s = avvia(8);
    expect(classificaVoti(s, [1, 2], { 3: 9, 1: 1 })).toEqual([1, 2]);
  });
});

describe("azioni fuori fase", () => {
  it("avanti in carte, nei voti, esito o fine non cambia lo stato", () => {
    for (const fase of ["carte", "voto", "voto2", "esito", "fine"] as const) {
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
      if (["lupi", "veggente", "medico", "medium", "massoni"].includes(s.fase)) {
        const c = candidatiNotte(s);
        s = c.length ? scegliEAvanti(s, c[passo % c.length]!) : riduci(s, { tipo: "avanti" });
      } else if (s.fase === "alba") {
        s = riduci(s, { tipo: s.vincitore ? "dopoVoto" : "avanti" });
      } else if (s.fase === "discussione" || s.fase === "arringhe") {
        s = riduci(s, { tipo: "avanti" });
      } else if (s.fase === "voto") {
        const lupo = postiCon(s, "lupo")[0] ?? s.vivi[0]!;
        s = riduci(s, { tipo: "chiudiVoto", voti: { [lupo]: s.giocatori.length } });
      } else if (s.fase === "voto2") {
        const lupo = (s.indiziati ?? []).find((p) => s.ruoli[p] === "lupo") ?? s.indiziati![0]!;
        s = riduci(s, { tipo: "chiudiVoto", voti: { [lupo]: votantiSecondoTurno(s) } });
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

describe("Indemoniato, Massoni e Medium", () => {
  /** Una partita di 13 con tutti gli speciali, portata alla notte data. */
  const piena = (notte: number, extra: Partial<Stato> = {}): Stato => ({ ...avvia(13, 5), notte, ...extra });
  const entra = (s: Stato): Stato => riduci({ ...s, fase: "esito", notte: s.notte - 1 }, { tipo: "dopoVoto" });

  it("l'Indemoniato è umano per il veggente ma sta con i lupi", () => {
    const s = piena(2);
    const [ind] = postiCon(s, "indemoniato");
    expect(s.ruoli[ind!]).toBe("indemoniato");
    expect(fazione("indemoniato")).toBe("lupi");
    expect(fazione("massone")).toBe("villaggio");
    expect(fazione("medium")).toBe("villaggio");
  });

  it("l'Indemoniato non è un lupo: non si sveglia con i lupi e conta come umano nel conteggio", () => {
    const s = piena(2);
    const lupi = postiCon(s, "lupo");
    const ind = postiCon(s, "indemoniato");
    // Se l'Indemoniato contasse come lupo, 3 contro 2 sarebbe già finita: invece i lupi sono 2 contro 3 umani.
    const umani = postiCon(s, "contadino");
    expect(vincitore(s.ruoli, [...lupi, ...ind, umani[0]!, umani[1]!])).toBeNull();
    // Due lupi contro due umani (l'Indemoniato è tra questi): vincono i lupi.
    expect(vincitore(s.ruoli, [...lupi, ...ind, umani[0]!])).toBe("lupi");
  });

  it("uccisi tutti i lupi, vincono i contadini anche se l'Indemoniato è vivo; l'Indemoniato non vince", () => {
    const s = piena(2);
    const vivi = s.vivi.filter((p) => s.ruoli[p] !== "lupo");
    expect(vincitore(s.ruoli, vivi)).toBe("villaggio");
    expect(postiVincitori({ ...s, vivi, vincitore: "villaggio" })).not.toContain(postiCon(s, "indemoniato")[0]);
  });

  it("se vincono i lupi vince anche l'Indemoniato, vivo o morto", () => {
    const s = piena(2);
    const ind = postiCon(s, "indemoniato")[0]!;
    expect(postiVincitori({ ...s, vincitore: "lupi" })).toContain(ind);
    expect(postiVincitori({ ...s, vincitore: "lupi", vivi: s.vivi.filter((p) => p !== ind) })).toContain(ind);
  });

  it("la prima notte i massoni si svegliano; dalla seconda no", () => {
    let s = distribuisci(avvia(13, 5));
    expect(s.notte).toBe(1);
    // Prima notte: massoni (nessun medium né medico) → veggente → lupi.
    expect(s.fase).toBe("massoni");
    expect(massoni(s)).toHaveLength(2);
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("veggente");
    expect(entra(piena(2)).fase).toBe("medium");
    const seconda = riduci(entra(piena(2)), { tipo: "avanti" });
    expect(seconda.fase).not.toBe("massoni");
  });

  it("i massoni si riconoscono anche se uno è morto: la fase c'è sempre, e i nomi vengono dalle carte iniziali", () => {
    const s = distribuisci(avvia(13, 5));
    const [m1] = massoni(s);
    const morto = { ...s, vivi: s.vivi.filter((p) => p !== m1) };
    expect(massoni(morto)).toHaveLength(2);
  });

  it("la fase dei massoni non ha scelte", () => {
    const s = distribuisci(avvia(13, 5));
    expect(s.fase).toBe("massoni");
    expect(candidatiNotte(s)).toEqual([]);
    expect(riduci(s, { tipo: "scegli", posto: s.vivi[0]! })).toEqual(s);
  });

  it("il Medium sente «lupo» solo per un lupo linciato", () => {
    const s = piena(3);
    const lupo = postiCon(s, "lupo")[0]!;
    const ind = postiCon(s, "indemoniato")[0]!;
    const cont = postiCon(s, "contadino")[0]!;
    expect(linciatoEraLupo({ ...s, linciato: lupo })).toBe(true);
    expect(linciatoEraLupo({ ...s, linciato: ind })).toBe(false);
    expect(linciatoEraLupo({ ...s, linciato: cont })).toBe(false);
    expect(linciatoEraLupo({ ...s, linciato: null })).toBe(false);
  });

  it("il linciato resta memorizzato per il Medium della notte dopo", () => {
    let s = alla(avvia(13, 5), "voto2", { indiziati: [1, 2] });
    s = riduci(s, { tipo: "chiudiVoto", voti: { 2: 4 } });
    expect(s.linciato).toBe(2);
    s = riduci(s, { tipo: "dopoVoto" });
    expect(s.fase).toBe("medium");
    expect(s.linciato).toBe(2);
  });

  it("il Medium si sveglia dalla seconda notte, anche se è morto, e la sua fase non cambia l'esito", () => {
    let s = entra(piena(2));
    const medium = postiCon(s, "medium")[0]!;
    s = { ...s, vivi: s.vivi.filter((p) => p !== medium) };
    expect(s.fase).toBe("medium");
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("medico");
    expect(s.mortiNotte).toEqual([]);
  });

  it("senza Medium e senza massoni le fasi non ci sono", () => {
    const s = distribuisci(avvia(8, 5));
    expect(s.fase).toBe("veggente");
    expect(entra({ ...s, notte: 2 }).fase).toBe("veggente");
  });

  it("incroci: l'Indemoniato si può sbranare e proteggere come un contadino", () => {
    const s = entra(piena(2));
    const ind = postiCon(s, "indemoniato")[0]!;
    expect(candidatiNotte({ ...s, fase: "lupi" })).toContain(ind);
    expect(candidatiNotte({ ...s, fase: "medico" })).toContain(ind);
    expect(candidatiNotte({ ...s, fase: "veggente" })).toContain(ind);
  });

  it("la partita completa con tutti gli speciali arriva a una fine", () => {
    for (let seme = 1; seme <= 20; seme++) {
      let s = distribuisci(avvia(15, seme, { primaNotteSenzaVittima: false }));
      for (let i = 0; i < 300 && s.fase !== "fine"; i++) {
        if (["medium", "massoni", "medico", "veggente", "lupi"].includes(s.fase)) {
          const c = candidatiNotte(s);
          s = riduci(s, { tipo: "scegli", posto: c[0] ?? -1 });
          s = riduci(s, { tipo: "avanti" });
        } else if (s.fase === "voto") {
          s = riduci(s, { tipo: "chiudiVoto", voti: {} });
        } else if (s.fase === "voto2") {
          s = riduci(s, { tipo: "chiudiVoto", voti: {} });
        } else if (s.fase === "alba" && s.vincitore) {
          s = riduci(s, { tipo: "dopoVoto" });
        } else if (s.fase === "esito") {
          s = riduci(s, { tipo: "dopoVoto" });
        } else {
          s = riduci(s, { tipo: "avanti" });
        }
      }
      expect(s.fase, `seme ${seme}`).toBe("fine");
    }
  });
});

describe("Criceto mannaro", () => {
  /** 15 giocatori con tutti gli speciali, portati alla notte data. */
  const piena = (notte: number): Stato => ({ ...avvia(15, 7, { primaNotteSenzaVittima: false }), notte });
  const alla = (s: Stato, fase: Stato["fase"]): Stato => ({ ...s, fase });

  it("compare da 15 giocatori e sta da solo", () => {
    expect(fazione("criceto")).toBe("criceto");
    expect(postiCon(piena(2), "criceto")).toHaveLength(1);
  });

  it("i lupi non lo possono sbranare: se lo scelgono nessuno muore", () => {
    let s = alla(piena(2), "lupi");
    const c = postiCon(s, "criceto")[0]!;
    s = riduci(s, { tipo: "scegli", posto: c });
    s = riduci(s, { tipo: "avanti" });
    expect(s.fase).toBe("alba");
    expect(s.mortiNotte).toEqual([]);
    expect(s.vivi).toContain(c);
  });

  it("il veggente che lo guarda lo fa morire insieme allo sbranato", () => {
    let s = alla(piena(2), "veggente");
    const c = postiCon(s, "criceto")[0]!;
    const civile = postiCon(s, "contadino")[0]!;
    s = riduci(s, { tipo: "scegli", posto: c });
    s = riduci(s, { tipo: "avanti" });
    // Nelle notti con medico e medium si arriva ai lupi saltando le altre fasi.
    while (s.fase !== "lupi") s = riduci(s, { tipo: "avanti" });
    s = riduci(s, { tipo: "scegli", posto: civile });
    s = riduci(s, { tipo: "avanti" });
    expect(s.mortiNotte).toEqual([civile, c]);
    expect(s.benvenuto).toBe(civile);
  });

  it("se quella notte nessuno muore (medico), il criceto guardato sopravvive", () => {
    let s = alla(piena(2), "medico");
    const c = postiCon(s, "criceto")[0]!;
    const civile = postiCon(s, "contadino")[0]!;
    s = riduci(s, { tipo: "scegli", posto: civile });
    s = riduci(s, { tipo: "avanti" });
    s = riduci(s, { tipo: "scegli", posto: c });
    s = riduci(s, { tipo: "avanti" });
    s = riduci(s, { tipo: "scegli", posto: civile });
    s = riduci(s, { tipo: "avanti" });
    expect(s.mortiNotte).toEqual([]);
  });

  it("il medico può proteggere il criceto, ma non serve: non si sbrana comunque", () => {
    const s = alla(piena(2), "medico");
    const c = postiCon(s, "criceto")[0]!;
    expect(candidatiNotte(s)).toContain(c);
  });

  it("il medium sente «non lupo» se il criceto è stato linciato", () => {
    const s = piena(3);
    const c = postiCon(s, "criceto")[0]!;
    expect(linciatoEraLupo({ ...s, linciato: c })).toBe(false);
  });

  it("per chi conta i lupi il criceto è umano; se è vivo alla fine vince lui da solo", () => {
    const s = piena(2);
    const lupi = postiCon(s, "lupo");
    const c = postiCon(s, "criceto")[0]!;
    const contadini = postiCon(s, "contadino");
    // Morti tutti i lupi: il villaggio avrebbe vinto, ma il criceto vivo vince da solo.
    expect(vincitore(s.ruoli, [c, ...contadini])).toBe("criceto");
    // Lupi in pari con gli altri vivi (criceto compreso): il criceto vince lo stesso.
    expect(vincitore(s.ruoli, [...lupi, c])).toBe("criceto");
    expect(vincitore(s.ruoli, [...lupi, c, ...contadini.slice(0, 3)])).toBeNull();
    // Se il criceto è morto, vince la fazione di sempre.
    expect(vincitore(s.ruoli, contadini)).toBe("villaggio");
    expect(vincitore(s.ruoli, [...lupi])).toBe("lupi");
  });

  it("quando vince il criceto, vince solo lui: né villaggio né lupi, né l'Indemoniato", () => {
    const s = piena(2);
    const c = postiCon(s, "criceto")[0]!;
    const contadini = postiCon(s, "contadino");
    const vivi = [c, ...contadini];
    expect(postiVincitori({ ...s, vivi, vincitore: "criceto" })).toEqual([c]);
    // Anche se morto non vince: vince solo se vivo a fine partita.
    expect(postiVincitori({ ...s, vivi: contadini, vincitore: "villaggio" })).not.toContain(c);
    expect(postiVincitori({ ...s, vivi: postiCon(s, "lupo"), vincitore: "lupi" })).not.toContain(c);
  });

  it("il criceto non vince mai se è morto, anche se muoiono tutti i lupi", () => {
    const s = piena(2);
    const c = postiCon(s, "criceto")[0]!;
    const vivi = s.vivi.filter((p) => s.ruoli[p] !== "lupo" && p !== c);
    expect(vincitore(s.ruoli, vivi)).toBe("villaggio");
  });

  it("partite complete con il criceto arrivano a una fine (20 semi)", () => {
    let criceto = 0;
    for (let seme = 1; seme <= 20; seme++) {
      let s = distribuisci(avvia(16, seme, { primaNotteSenzaVittima: false }));
      for (let i = 0; i < 400 && s.fase !== "fine"; i++) {
        if (["medium", "massoni", "medico", "veggente", "lupi"].includes(s.fase)) {
          const c = candidatiNotte(s);
          s = riduci(s, { tipo: "scegli", posto: c[0] ?? -1 });
          s = riduci(s, { tipo: "avanti" });
        } else if (s.fase === "voto" || s.fase === "voto2") {
          s = riduci(s, { tipo: "chiudiVoto", voti: {} });
        } else if (s.fase === "esito" || (s.fase === "alba" && s.vincitore)) {
          s = riduci(s, { tipo: "dopoVoto" });
        } else {
          s = riduci(s, { tipo: "avanti" });
        }
      }
      expect(s.fase, `seme ${seme}`).toBe("fine");
      if (s.vincitore === "criceto") criceto++;
    }
    expect(criceto).toBeGreaterThanOrEqual(0);
  });
});
