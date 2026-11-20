import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import {
  ErroreDuello,
  assegna,
  MANI_MAX,
  creaScaletta,
  finita,
  idCorrente,
  inSpareggio,
  maniACaso,
  nuovaPartita,
  totaleRound,
  vincitorePartita,
  erroriRound,
  ordineCompleto,
} from "./logica";
import { ID_MINIGIOCHI, MINIGIOCHI, NESSUNO, miniGioco, sceltePermesse, tuttiBase, valoriBase, valoriCompleti } from "./minigiochi";
import { ATTESA_MIN_MS, ATTESE_MAX_S, via } from "./minigiochi/via";
import { raffica } from "./minigiochi/raffica";
import { CICLI_MASSIMI, distanzaDalCentro, posizione, stop } from "./minigiochi/stop";
import { ATTESA_MAX_MS as ATTESA_MAX_COLORE, ATTESA_MIN_MS as ATTESA_MIN_COLORE, COLORI, NUMERI_COLORI, coloriDa, colore } from "./minigiochi/colore";
import { ANIMALI, IMPOSTAZIONI_TROVA, LATI, MARGINE_MS, NUMERO_COLORI, PARAMETRI_BASE, PASSI_MAX, PASSI_MIN, PASSI_S, comparsa, creaTrova, grigliaAlPasso, panda, parametriDa, passiDopo, smile } from "./minigiochi/trova";
import { GIUSTE_BASE, PAROLE_BASE, PAROLE_MAX, PAROLE_MIN, PASSI_S as PASSI_NOMI_S, comparsaGiusta, nomi } from "./minigiochi/nomi";
import { CASELLE as CASELLE_MEM_BASE, CASELLE_SCELTE, LUNGHEZZE, LUNGHEZZA as LUNGHEZZA_MEMORIA, colonne, fineDimostrazione, memoria } from "./minigiochi/memoria";
import { DURATE_S } from "./minigiochi/raffica";
import { PERIODI, VELOCITA } from "./minigiochi/stop";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreDuello ? e.codice : "altro";
  }
  return null;
};

/** I valori di base delle impostazioni di un mini gioco. */
const base = (mg: { impostazioni?: Parameters<typeof valoriCompleti>[0] }) => valoriCompleti(mg.impostazioni);

describe("creaScaletta", () => {
  it("gioca ogni mini gioco per le sue mani di fila, nell'ordine del registro", () => {
    expect(creaScaletta({ via: 2, stop: 3 })).toEqual(["via", "via", "stop", "stop", "stop"]);
    expect(creaScaletta({ stop: 1, raffica: 2, via: 1 })).toEqual(["via", "raffica", "raffica", "stop"]);
  });

  it("zero o assente vuol dire che il mini gioco non si usa", () => {
    expect(creaScaletta({ via: 0, raffica: 1 })).toEqual(["raffica"]);
    expect(creaScaletta({})).toEqual([]);
  });

  it("totaleRound somma le mani", () => {
    expect(totaleRound({ via: 2, raffica: 3, stop: 1 })).toBe(6);
    expect(totaleRound({})).toBe(0);
  });
});

describe("nuovaPartita", () => {
  it("controlla mani e mini giochi", () => {
    expect(codice(() => nuovaPartita({ mani: {} }))).toBe("nessunMinigioco");
    expect(codice(() => nuovaPartita({ mani: { via: 0, stop: 0 } }))).toBe("nessunMinigioco");
    expect(codice(() => nuovaPartita({ mani: { via: -1 } }))).toBe("roundNonValidi");
    expect(codice(() => nuovaPartita({ mani: { via: 2.5 } }))).toBe("roundNonValidi");
    expect(codice(() => nuovaPartita({ mani: { via: MANI_MAX + 1 } }))).toBe("roundNonValidi");
    expect(codice(() => nuovaPartita({ mani: { inesistente: 3 } }))).toBe("minigiocoSconosciuto");
  });

  it("parte da zero punti al primo round", () => {
    const p = nuovaPartita({ mani: { via: 2, raffica: 1, stop: 2 } });
    expect(p.punti).toEqual([0, 0]);
    expect(p.round).toBe(0);
    expect(p.totale).toBe(5);
    expect(p.scaletta).toEqual(["via", "via", "raffica", "stop", "stop"]);
    expect(idCorrente(p)).toBe("via");
    expect(finita(p)).toBe(false);
  });
});

describe("assegna", () => {
  const nuova = (round: number) => nuovaPartita({ mani: { via: round } });
  const rng = () => creaRng(1);

  it("dà un punto al vincitore e passa al round dopo", () => {
    const p = assegna(nuova(3), 1, rng());
    expect(p.punti).toEqual([0, 1]);
    expect(p.round).toBe(1);
  });

  it("con un pari nessuno prende punti", () => {
    const p = assegna(nuova(3), null, rng());
    expect(p.punti).toEqual([0, 0]);
    expect(p.round).toBe(1);
  });

  it("la partita finisce al round finale se qualcuno è avanti", () => {
    let p = nuova(3);
    for (const v of [0, 1, 0] as const) p = assegna(p, v, rng());
    expect(finita(p)).toBe(true);
    expect(p.punti).toEqual([2, 1]);
    expect(vincitorePartita(p)).toBe(0);
    expect(idCorrente(p)).toBeUndefined();
  });

  it("con parità a fine round si aggiunge lo spareggio, finché qualcuno è avanti", () => {
    let p = nuova(2);
    p = assegna(p, 0, rng());
    p = assegna(p, 1, rng());
    expect(finita(p)).toBe(false);
    expect(inSpareggio(p)).toBe(true);
    expect(idCorrente(p)).toBe("via");
    p = assegna(p, null, rng()); // pari anche lo spareggio: se ne gioca un altro
    expect(finita(p)).toBe(false);
    p = assegna(p, 1, rng());
    expect(finita(p)).toBe(true);
    expect(vincitorePartita(p)).toBe(1);
  });

  it("a partita finita non cambia più niente", () => {
    let p = nuova(1);
    p = assegna(p, 0, rng());
    expect(assegna(p, 1, rng())).toBe(p);
  });

  it("senza round finiti non c'è vincitore", () => {
    expect(vincitorePartita(nuova(3))).toBeNull();
  });

  it("lo spareggio è un mini gioco a caso tra quelli scelti nella sfida", () => {
    const visti = new Set<string>();
    for (let seme = 0; seme < 200; seme++) {
      const r = creaRng(seme);
      let p = nuovaPartita({ mani: { raffica: 1, stop: 1, panda: 0 } });
      expect(p.scelti).toEqual(["raffica", "stop"]);
      p = assegna(p, 0, r);
      p = assegna(p, 1, r);
      const id = idCorrente(p)!;
      expect(inSpareggio(p)).toBe(true);
      expect(["raffica", "stop"]).toContain(id);
      visti.add(id);
    }
    // Con molti semi escono entrambi: non è sempre lo stesso.
    expect([...visti].sort()).toEqual(["raffica", "stop"]);
  });

  it("con un solo mini gioco scelto lo spareggio è quello", () => {
    let p = nuovaPartita({ mani: { memoria: 2 } });
    p = assegna(p, 0, rng());
    p = assegna(p, 1, rng());
    expect(idCorrente(p)).toBe("memoria");
  });

  it("chi sbaglia perde un punto, anche sotto zero; l'altro prende il suo", () => {
    let p = nuova(3);
    p = assegna(p, 1, rng(), [true, false]);
    expect(p.punti).toEqual([-1, 1]);
    p = assegna(p, null, rng(), [true, true]);
    expect(p.punti).toEqual([-2, 0]);
  });

  it("errori che riportano in parità danno lo spareggio", () => {
    let p = nuova(1);
    // Vince chi sta in basso ma sbaglia anche... no: un errore toglie un punto a chi lo fa.
    p = assegna(p, 0, rng(), [false, false]);
    expect(finita(p)).toBe(true);
    let q = nuova(1);
    q = assegna(q, 1, rng(), [false, true]); // in alto vince e sbaglia: 0 a 0
    expect(q.punti).toEqual([0, 0]);
    expect(finita(q)).toBe(false);
    expect(inSpareggio(q)).toBe(true);
  });
});

describe("erroriRound", () => {
  const conErrori = (id: string, attivo: boolean) =>
    nuovaPartita({ mani: { [id]: 1 }, impostazioni: { [id]: { errori: attivo } } });

  it("di base gli errori non contano", () => {
    const p = nuovaPartita({ mani: { via: 1 } });
    expect(erroriRound(p, "via", {}, [{ anticipo: true }, { ms: 300 }])).toEqual([false, false]);
  });

  it("Via!: con l'impostazione attiva, toccare prima del via è un errore; essere lenti no", () => {
    const p = conErrori("via", true);
    expect(erroriRound(p, "via", {}, [{ anticipo: true }, { ms: 900 }])).toEqual([true, false]);
    expect(erroriRound(p, "via", {}, [{ ms: 200 }, NESSUNO])).toEqual([false, false]);
  });

  it("Colore giusto, Colori e nomi, Trova, Memoria: le risposte sbagliate sono errori", () => {
    expect(erroriRound(conErrori("colore", true), "colore", {}, [{ giusto: false, ms: 1 }, { giusto: true, ms: 1 }])).toEqual([true, false]);
    expect(erroriRound(conErrori("nomi", true), "nomi", {}, [{ ms: 500 }, { sbagliato: true }])).toEqual([false, true]);
    expect(erroriRound(conErrori("panda", true), "panda", {}, [{ trovato: false, ms: 0 }, NESSUNO])).toEqual([true, false]);
    expect(erroriRound(conErrori("smile", true), "smile", {}, [NESSUNO, { trovato: false, ms: 0 }])).toEqual([false, true]);
    expect(erroriRound(conErrori("memoria", true), "memoria", {}, [{ giusta: false, ms: 1 }, { giusta: true, ms: 2 }])).toEqual([true, false]);
  });

  it("Raffica e Stop al centro non hanno errori (e nemmeno l'impostazione)", () => {
    for (const id of ["raffica", "stop"]) {
      expect(miniGioco(id).impostazioni?.some((i) => i.chiave === "errori")).toBe(false);
      expect(miniGioco(id).errore).toBeUndefined();
    }
    for (const id of ["via", "colore", "nomi", "panda", "smile", "memoria"]) {
      expect(miniGioco(id).impostazioni?.find((i) => i.chiave === "errori")).toMatchObject({ tipo: "interruttore", base: false });
    }
  });
});

describe("maniACaso", () => {
  it("usa almeno un mini gioco, mai tutti se ce n'è più di uno, con 1-3 mani ciascuno", () => {
    for (let seme = 0; seme < 100; seme++) {
      const m = maniACaso(creaRng(seme));
      expect(Object.keys(m).sort()).toEqual([...ID_MINIGIOCHI].sort());
      const usati = ID_MINIGIOCHI.filter((id) => (m[id] ?? 0) > 0);
      expect(usati.length).toBeGreaterThanOrEqual(1);
      expect(usati.length).toBeLessThan(ID_MINIGIOCHI.length);
      for (const id of usati) {
        expect(m[id]).toBeGreaterThanOrEqual(1);
        expect(m[id]).toBeLessThanOrEqual(3);
      }
      expect(() => nuovaPartita({ mani: m })).not.toThrow();
    }
  });
});

describe("registro", () => {
  it("gli id sono unici e miniGioco li ritrova", () => {
    expect(new Set(ID_MINIGIOCHI).size).toBe(ID_MINIGIOCHI.length);
    for (const m of MINIGIOCHI) expect(miniGioco(m.id)).toBe(m);
    expect(() => miniGioco("no")).toThrow();
  });

  it("ogni mini gioco prepara lo stesso round con lo stesso seme e ha una durata positiva", () => {
    for (const m of MINIGIOCHI) {
      const a = m.prepara(creaRng(3), base(m));
      expect(m.prepara(creaRng(3), base(m))).toEqual(a);
      expect(m.durataMassima(a)).toBeGreaterThan(0);
    }
  });
});

describe("Via!", () => {
  const c = { attesaMs: 2000 };
  it("l'attesa sta nei limiti, per ogni valore dell'impostazione", () => {
    for (const max of ATTESE_MAX_S) {
      for (let seme = 0; seme < 100; seme++) {
        const { attesaMs } = via.prepara(creaRng(seme), valoriCompleti(via.impostazioni, { attesaMax: max }));
        expect(attesaMs).toBeGreaterThanOrEqual(ATTESA_MIN_MS);
        expect(attesaMs).toBeLessThanOrEqual(max * 1000);
      }
    }
  });
  it("vince chi reagisce prima", () => {
    expect(via.vincitore(c, [{ ms: 210 }, { ms: 300 }])).toBe(0);
    expect(via.vincitore(c, [{ ms: 400 }, { ms: 250 }])).toBe(1);
  });
  it("chi parte prima del via perde, anche contro chi non ha toccato", () => {
    expect(via.vincitore(c, [{ anticipo: true }, { ms: 500 }])).toBe(1);
    expect(via.vincitore(c, [{ ms: 500 }, { anticipo: true }])).toBe(0);
    expect(via.vincitore(c, [{ anticipo: true }, NESSUNO])).toBe(1);
    expect(via.vincitore(c, [NESSUNO, { anticipo: true }])).toBe(0);
  });
  it("chi reagisce batte chi non tocca", () => {
    expect(via.vincitore(c, [{ ms: 900 }, NESSUNO])).toBe(0);
    expect(via.vincitore(c, [NESSUNO, { ms: 900 }])).toBe(1);
  });
  it("tempi uguali, due anticipi o due assenze sono pari", () => {
    expect(via.vincitore(c, [{ ms: 300 }, { ms: 300 }])).toBeNull();
    expect(via.vincitore(c, [{ anticipo: true }, { anticipo: true }])).toBeNull();
    expect(via.vincitore(c, [NESSUNO, NESSUNO])).toBeNull();
  });
  it("chiude al primo tocco e dopo l'attesa più un margine", () => {
    expect(via.chiudeAlPrimo).toBe(true);
    expect(via.durataMassima(c)).toBeGreaterThan(c.attesaMs);
  });
});

describe("Raffica", () => {
  const c = raffica.prepara(creaRng(1), base(raffica));
  it("vince chi tocca di più", () => {
    expect(raffica.vincitore(c, [{ tocchi: 31 }, { tocchi: 28 }])).toBe(0);
    expect(raffica.vincitore(c, [{ tocchi: 10 }, { tocchi: 12 }])).toBe(1);
  });
  it("stesso numero è pari; chi non risponde vale zero", () => {
    expect(raffica.vincitore(c, [{ tocchi: 20 }, { tocchi: 20 }])).toBeNull();
    expect(raffica.vincitore(c, [NESSUNO, NESSUNO])).toBeNull();
    expect(raffica.vincitore(c, [{ tocchi: 3 }, NESSUNO])).toBe(0);
  });
});

describe("Stop al centro", () => {
  const c = { periodoMs: 2000, faseMs: 0 };
  it("la posizione è un'onda triangolare tra 0 e 1", () => {
    expect(posizione(c, 0)).toBe(0);
    expect(posizione(c, 500)).toBeCloseTo(0.5);
    expect(posizione(c, 1000)).toBeCloseTo(1);
    expect(posizione(c, 1500)).toBeCloseTo(0.5);
    expect(posizione(c, 2000)).toBeCloseTo(0);
    for (let t = 0; t < 8000; t += 37) {
      const p = posizione(c, t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
  it("la fase sposta il punto di partenza", () => {
    expect(posizione({ periodoMs: 2000, faseMs: 500 }, 0)).toBeCloseTo(0.5);
  });
  it("la distanza dal centro va da 0 a 0,5", () => {
    expect(distanzaDalCentro(0.5)).toBe(0);
    expect(distanzaDalCentro(0)).toBe(0.5);
    expect(distanzaDalCentro(1)).toBe(0.5);
  });
  it("vince chi si ferma più vicino al centro", () => {
    expect(stop.vincitore(c, [{ distanza: 0.02 }, { distanza: 0.1 }])).toBe(0);
    expect(stop.vincitore(c, [{ distanza: 0.3 }, { distanza: 0.05 }])).toBe(1);
  });
  it("chi non tocca perde; se nessuno tocca, pari", () => {
    expect(stop.vincitore(c, [{ distanza: 0.4 }, NESSUNO])).toBe(0);
    expect(stop.vincitore(c, [NESSUNO, { distanza: 0.4 }])).toBe(1);
    expect(stop.vincitore(c, [NESSUNO, NESSUNO])).toBeNull();
  });
  it("differenze minime sono pari", () => {
    expect(stop.vincitore(c, [{ distanza: 0.05 }, { distanza: 0.051 }])).toBeNull();
  });
  it("il round dura al massimo qualche ciclo e parametri restano nei limiti", () => {
    for (let seme = 0; seme < 100; seme++) {
      const cfg = stop.prepara(creaRng(seme), base(stop));
      expect(cfg.faseMs).toBeGreaterThanOrEqual(0);
      expect(cfg.faseMs).toBeLessThan(cfg.periodoMs);
      expect(stop.durataMassima(cfg)).toBe(cfg.periodoMs * CICLI_MASSIMI);
    }
  });
});

describe("Colore giusto", () => {
  it("la parola e il colore dell'inchiostro sono sempre diversi, e tra i colori previsti", () => {
    for (let seme = 0; seme < 300; seme++) {
      const c = colore.prepara(creaRng(seme), base(colore));
      expect(c.parola).not.toBe(c.inchiostro);
      expect(COLORI).toContain(c.parola);
      expect(COLORI).toContain(c.inchiostro);
      expect(c.attesaMs).toBeGreaterThanOrEqual(ATTESA_MIN_COLORE);
      expect(c.attesaMs).toBeLessThanOrEqual(ATTESA_MAX_COLORE);
    }
  });
  const c = colore.prepara(creaRng(1), base(colore));
  it("vince chi risponde giusto, e tra due risposte giuste il più veloce", () => {
    expect(colore.vincitore(c, [{ giusto: true, ms: 600 }, { giusto: true, ms: 700 }])).toBe(0);
    expect(colore.vincitore(c, [{ giusto: true, ms: 900 }, { giusto: false, ms: 300 }])).toBe(0);
    expect(colore.vincitore(c, [{ giusto: false, ms: 300 }, { giusto: true, ms: 900 }])).toBe(1);
  });
  it("chi sbaglia perde anche contro chi non risponde", () => {
    expect(colore.vincitore(c, [{ giusto: false, ms: 300 }, NESSUNO])).toBe(1);
    expect(colore.vincitore(c, [NESSUNO, { giusto: true, ms: 300 }])).toBe(1);
  });
  it("due errori, due assenze o due tempi uguali sono pari", () => {
    expect(colore.vincitore(c, [{ giusto: false, ms: 1 }, { giusto: false, ms: 2 }])).toBeNull();
    expect(colore.vincitore(c, [NESSUNO, NESSUNO])).toBeNull();
    expect(colore.vincitore(c, [{ giusto: true, ms: 500 }, { giusto: true, ms: 500 }])).toBeNull();
  });
});

describe("Trova il panda e Trova lo smile", () => {
  const caselle = PARAMETRI_BASE.lato ** 2;
  const uguali = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

  for (const [mg, bersaglio, distrattori] of [
    [panda, "panda", ANIMALI as readonly string[]],
    [smile, "felice", ["triste"]],
  ] as const) {
    it(`${mg.id}: cambiano poche caselle a ogni passo, il bersaglio compare una volta e la griglia non si ferma dopo`, () => {
      for (let seme = 0; seme < 200; seme++) {
        const c = mg.prepara(creaRng(seme), base(mg));
        expect(c.iniziale).toHaveLength(caselle);
        expect(c.indiceComparsa).toBeGreaterThanOrEqual(PASSI_MIN + 1);
        expect(c.indiceComparsa).toBeLessThanOrEqual(PASSI_MAX + 1);
        // I cambi continuano per tutto il margine dopo la comparsa.
        expect(c.passi.length).toBe(c.indiceComparsa + passiDopo(c.passoMs));
        expect(c.passi.length * c.passoMs).toBeGreaterThan(comparsa(c) + MARGINE_MS);

        for (let n = 0; n <= c.passi.length; n++) {
          const g = grigliaAlPasso(c, n);
          expect(g).toHaveLength(caselle);
          // Prima della comparsa nessun bersaglio; dopo, sempre uno solo, sempre nella stessa casella.
          const bersagli = g.map((k, i) => (k.figura === bersaglio ? i : -1)).filter((i) => i >= 0);
          expect(bersagli).toEqual(n >= c.indiceComparsa ? [c.posizione] : []);
          for (const k of g) {
            if (k.figura !== bersaglio) expect(distrattori).toContain(k.figura);
            expect(k.gradi % 45).toBe(0);
            expect(k.colore).toBeGreaterThanOrEqual(0);
            expect(k.colore).toBeLessThan(NUMERO_COLORI);
          }
          if (n > 0) {
            // Cambiano esattamente le caselle del passo, e ognuna cambia davvero.
            const prima = grigliaAlPasso(c, n - 1);
            const passo = c.passi[n - 1]!;
            expect(passo).toHaveLength(PARAMETRI_BASE.cambi);
            expect(g.filter((k, i) => !uguali(k, prima[i])).length).toBe(PARAMETRI_BASE.cambi);
            // Dopo la comparsa la casella del bersaglio non è mai tra quelle che cambiano.
            if (n > c.indiceComparsa) expect(passo.map((x) => x.posizione)).not.toContain(c.posizione);
          }
        }
        const alComparire = c.passi[c.indiceComparsa - 1]!;
        expect(alComparire.map((x) => x.posizione)).toContain(c.posizione);
        expect(comparsa(c)).toBe(c.indiceComparsa * PARAMETRI_BASE.passoMs);
        expect(mg.durataMassima(c)).toBeGreaterThan(comparsa(c));
      }
    });
  }

  it("con figure dritte nessuna è ruotata", () => {
    const dritto = creaTrova("x", "panda", ANIMALI);
    for (let seme = 0; seme < 50; seme++) {
      const c = dritto.prepara(creaRng(seme), valoriCompleti(IMPOSTAZIONI_TROVA, { dritte: true }));
      for (let n = 0; n <= c.passi.length; n++) for (const k of grigliaAlPasso(c, n)) expect(k.gradi).toBe(0);
    }
  });

  it("senza rotazione le figure che cambiano tengono la direzione di prima", () => {
    const fermo = creaTrova("y", "panda", ANIMALI);
    for (let seme = 0; seme < 50; seme++) {
      const c = fermo.prepara(creaRng(seme), valoriCompleti(IMPOSTAZIONI_TROVA, { ruotano: false }));
      for (let n = 1; n <= c.passi.length; n++) {
        const prima = grigliaAlPasso(c, n - 1);
        for (const { posizione, casella } of c.passi[n - 1]!) {
          // Il bersaglio prende una direzione sua quando compare; tutte le altre figure tengono quella di prima.
          if (n === c.indiceComparsa && posizione === c.posizione) continue;
          expect(casella.gradi).toBe(prima[posizione]!.gradi);
        }
      }
    }
  });

  it("griglia 3×3 con tutte le caselle che cambiano", () => {
    const g3 = creaTrova("z", "panda", ANIMALI);
    const c = g3.prepara(creaRng(7), valoriCompleti(IMPOSTAZIONI_TROVA, { lato: 3, cambi: 9 }));
    expect(c.iniziale).toHaveLength(9);
    // Fino alla comparsa cambiano tutte; dopo, tutte tranne quella del bersaglio.
    c.passi.forEach((p, k) => expect(p).toHaveLength(k + 1 <= c.indiceComparsa ? 9 : 8));
  });

  it("creaTrova rifiuta distrattori vuoti o che contengono il bersaglio", () => {
    expect(() => creaTrova("x", "a", [])).toThrow();
    expect(() => creaTrova("x", "a", ["a", "b"])).toThrow();
  });

  const c = panda.prepara(creaRng(2), base(panda));
  it("vince chi trova per primo; chi tocca un'altra figura perde", () => {
    expect(panda.vincitore(c, [{ trovato: true, ms: 800 }, { trovato: true, ms: 650 }])).toBe(1);
    expect(panda.vincitore(c, [{ trovato: false, ms: 100 }, { trovato: true, ms: 2000 }])).toBe(1);
    expect(panda.vincitore(c, [{ trovato: true, ms: 2000 }, NESSUNO])).toBe(0);
    expect(panda.vincitore(c, [{ trovato: false, ms: 100 }, NESSUNO])).toBe(1);
    expect(panda.vincitore(c, [NESSUNO, NESSUNO])).toBeNull();
  });
});

describe("Colori e nomi", () => {
  const conImp = (v: Record<string, unknown>) => valoriCompleti(nomi.impostazioni, v);
  const controlla = (c: ReturnType<typeof nomi.prepara>, totale: number, quante: number) => {
    expect(c.parole).toHaveLength(totale);
    expect(c.giuste).toHaveLength(quante);
    expect([...c.giuste]).toEqual([...c.giuste].sort((x, y) => x - y));
    expect(new Set(c.giuste).size).toBe(quante);
    c.parole.forEach((p, i) => {
      expect(p.parola === p.inchiostro).toBe(c.giuste.includes(i));
      if (i > 0) expect(p.parola).not.toBe(c.parole[i - 1]?.parola);
    });
    // Il round dura fino all'ultima parola: lo scorrimento non si ferma su quella giusta.
    expect(nomi.durataMassima(c)).toBeGreaterThanOrEqual(c.parole.length * c.passoMs);
  };

  it("di base: 6 parole, una che combacia", () => {
    for (let seme = 0; seme < 100; seme++) controlla(nomi.prepara(creaRng(seme), base(nomi)), PAROLE_BASE, GIUSTE_BASE);
  });

  it("per ogni numero di parole e di parole giuste ammesso, il round è coerente", () => {
    for (let totale = PAROLE_MIN; totale <= PAROLE_MAX; totale++) {
      for (let quante = 1; quante < totale; quante++) {
        for (let seme = 0; seme < 10; seme++) controlla(nomi.prepara(creaRng(seme * 97 + totale), conImp({ parole: totale, giuste: quante })), totale, quante);
      }
    }
  });

  it("la posizione della parola giusta è casuale, dalla prima all'ultima, e non sempre seguita dallo stesso numero di parole", () => {
    const posizioni = new Set<number>();
    for (let seme = 0; seme < 500; seme++) posizioni.add(nomi.prepara(creaRng(seme), conImp({ parole: 10, giuste: 1 })).giuste[0]!);
    expect([...posizioni].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("le parole giuste non possono essere tutte: al massimo il totale meno una", () => {
    expect(conImp({ parole: 10, giuste: 9 }).giuste).toBe(9);
    expect(conImp({ parole: 4, giuste: 9 }).giuste).toBe(3);
    expect(conImp({ parole: 2, giuste: 5 }).giuste).toBe(1);
    const imp = nomi.impostazioni!.find((i) => i.chiave === "giuste")!;
    if (imp.tipo !== "scelta") throw new Error("giuste dovrebbe essere una scelta");
    expect(Math.max(...sceltePermesse(imp, conImp({ parole: 7 })))).toBe(6);
  });

  it("la prima comparsa giusta è alla prima posizione giusta", () => {
    const c = nomi.prepara(creaRng(3), conImp({ parole: 8, giuste: 3 }));
    expect(comparsaGiusta(c)).toBe(c.giuste[0]! * c.passoMs);
  });

  const c = nomi.prepara(creaRng(5), base(nomi));
  it("vince chi tocca prima su una parola giusta; chi tocca quando non combacia perde", () => {
    expect(nomi.chiudeAlPrimo).toBe(true);
    expect(nomi.vincitore(c, [{ ms: 300 }, { ms: 400 }])).toBe(0);
    expect(nomi.vincitore(c, [{ sbagliato: true }, { ms: 900 }])).toBe(1);
    expect(nomi.vincitore(c, [{ sbagliato: true }, NESSUNO])).toBe(1);
    expect(nomi.vincitore(c, [NESSUNO, { ms: 900 }])).toBe(1);
    expect(nomi.vincitore(c, [{ sbagliato: true }, { sbagliato: true }])).toBeNull();
  });
});

describe("Memoria lampo", () => {
  it("sequenza della lunghezza prevista, caselle valide, mai la stessa due volte di fila", () => {
    for (let seme = 0; seme < 300; seme++) {
      const { sequenza } = memoria.prepara(creaRng(seme), base(memoria));
      expect(sequenza).toHaveLength(LUNGHEZZA_MEMORIA);
      for (let i = 0; i < sequenza.length; i++) {
        expect(sequenza[i]).toBeGreaterThanOrEqual(0);
        expect(sequenza[i]).toBeLessThan(CASELLE_MEM_BASE);
        if (i > 0) expect(sequenza[i]).not.toBe(sequenza[i - 1]);
      }
    }
  });
  const c = memoria.prepara(creaRng(3), base(memoria));
  it("il round dura almeno quanto la dimostrazione", () => {
    expect(memoria.durataMassima(c)).toBeGreaterThan(fineDimostrazione(c));
  });
  it("vince chi ripete giusto per primo; chi sbaglia perde", () => {
    expect(memoria.vincitore(c, [{ giusta: true, ms: 1800 }, { giusta: true, ms: 2100 }])).toBe(0);
    expect(memoria.vincitore(c, [{ giusta: false, ms: 300 }, { giusta: true, ms: 3000 }])).toBe(1);
    expect(memoria.vincitore(c, [{ giusta: false, ms: 300 }, NESSUNO])).toBe(1);
    expect(memoria.vincitore(c, [{ giusta: true, ms: 3000 }, NESSUNO])).toBe(0);
    expect(memoria.vincitore(c, [{ giusta: false, ms: 1 }, { giusta: false, ms: 9 }])).toBeNull();
  });
});

describe("impostazioni dei mini giochi", () => {
  it("valoriCompleti: base se mancano, scarta valori non ammessi o di tipo sbagliato", () => {
    expect(valoriCompleti(via.impostazioni)).toEqual({ attesaMax: 5, errori: false });
    expect(valoriCompleti(via.impostazioni, { attesaMax: 8 })).toEqual({ attesaMax: 8, errori: false });
    expect(valoriCompleti(via.impostazioni, { attesaMax: 7 })).toEqual({ attesaMax: 5, errori: false });
    expect(valoriCompleti(via.impostazioni, { attesaMax: "8", errori: "sì" })).toEqual({ attesaMax: 5, errori: false });
    expect(valoriCompleti(via.impostazioni, { sconosciuta: 1 })).toEqual({ attesaMax: 5, errori: false });
    expect(valoriCompleti(undefined)).toEqual({});
  });

  it("valoriBase e tuttiBase", () => {
    expect(valoriBase(memoria.impostazioni)).toEqual({ caselle: 4, lunghezza: 4, errori: false });
    expect(tuttiBase(memoria.impostazioni, { caselle: 4, lunghezza: 4, errori: false })).toBe(true);
    expect(tuttiBase(memoria.impostazioni, { caselle: 6, lunghezza: 4, errori: false })).toBe(false);
  });

  it("i valori di base sono quelli di prima (le partite non cambiano)", () => {
    expect(valoriBase(via.impostazioni)).toEqual({ attesaMax: 5, errori: false });
    expect(valoriBase(raffica.impostazioni)).toEqual({ durata: 5 });
    expect(valoriBase(stop.impostazioni)).toEqual({ velocita: 2 });
    expect(valoriBase(colore.impostazioni)).toEqual({ colori: 4, errori: false });
    expect(valoriBase(nomi.impostazioni)).toEqual({ passo: 1.3, parole: 6, giuste: 1, errori: false });
    expect(valoriBase(panda.impostazioni)).toEqual({ lato: 4, cambi: 3, passo: 1, ruotano: true, dritte: false, errori: false });
    expect(valoriBase(memoria.impostazioni)).toEqual({ caselle: 4, lunghezza: 4, errori: false });
  });

  it("ogni valore base è tra i valori ammessi", () => {
    for (const m of MINIGIOCHI) {
      for (const i of m.impostazioni ?? []) {
        if (i.tipo === "scelta") expect(i.valori).toContain(i.base);
      }
    }
  });

  it("Raffica: la durata scelta arriva nel round", () => {
    for (const d of DURATE_S) expect(raffica.prepara(creaRng(1), valoriCompleti(raffica.impostazioni, { durata: d })).durataMs).toBe(d * 1000);
  });

  it("Stop al centro: più veloce = periodo più corto", () => {
    const medio = (v: number) => {
      let somma = 0;
      for (let seme = 0; seme < 100; seme++) {
        const c = stop.prepara(creaRng(seme), valoriCompleti(stop.impostazioni, { velocita: v }));
        const [min, max] = PERIODI[v]!;
        expect(c.periodoMs).toBeGreaterThanOrEqual(min);
        expect(c.periodoMs).toBeLessThanOrEqual(max);
        somma += c.periodoMs;
      }
      return somma / 100;
    };
    expect(VELOCITA.map(medio)).toEqual([...VELOCITA.map(medio)].sort((a, b) => b - a));
  });

  it("Colore giusto: usa i primi n colori, e parola e inchiostro restano diversi", () => {
    expect(coloriDa(4)).toEqual(COLORI);
    for (const n of NUMERI_COLORI) {
      for (let seme = 0; seme < 100; seme++) {
        const c = colore.prepara(creaRng(seme), valoriCompleti(colore.impostazioni, { colori: n }));
        expect(c.colori).toHaveLength(n);
        expect(c.colori).toContain(c.parola);
        expect(c.colori).toContain(c.inchiostro);
        expect(c.parola).not.toBe(c.inchiostro);
      }
    }
  });

  it("Colori e nomi: il tempo per parola arriva nel round e sposta la parola giusta", () => {
    for (const secondi of PASSI_NOMI_S) {
      const c = nomi.prepara(creaRng(2), valoriCompleti(nomi.impostazioni, { passo: secondi }));
      expect(c.passoMs).toBe(Math.round(secondi * 1000));
      expect(comparsaGiusta(c)).toBe(c.giuste[0]! * c.passoMs);
    }
  });

  it("Memoria lampo: caselle e lunghezza scelte, sequenza dentro i limiti, colonne coerenti", () => {
    for (const caselle of CASELLE_SCELTE) {
      for (const lunghezza of LUNGHEZZE) {
        for (let seme = 0; seme < 20; seme++) {
          const c = memoria.prepara(creaRng(seme), valoriCompleti(memoria.impostazioni, { caselle, lunghezza }));
          expect(c.caselle).toBe(caselle);
          expect(c.sequenza).toHaveLength(lunghezza);
          for (let i = 0; i < c.sequenza.length; i++) {
            expect(c.sequenza[i]).toBeGreaterThanOrEqual(0);
            expect(c.sequenza[i]).toBeLessThan(caselle);
            if (i > 0) expect(c.sequenza[i]).not.toBe(c.sequenza[i - 1]);
          }
        }
      }
      expect(caselle % colonne(caselle)).toBe(0);
    }
  });

  it("Trova: ogni lato, ogni tempo e ogni numero di cambi ammesso danno round coerenti", () => {
    for (const lato of LATI) {
      const grezzi = { lato };
      const v0 = valoriCompleti(IMPOSTAZIONI_TROVA, grezzi);
      const cambiImp = IMPOSTAZIONI_TROVA.find((i) => i.chiave === "cambi")!;
      if (cambiImp.tipo !== "scelta") throw new Error("cambi dovrebbe essere una scelta");
      const permessi = sceltePermesse(cambiImp, v0);
      expect(Math.max(...permessi)).toBe(lato * lato);
      for (const cambi of [1, Math.ceil((lato * lato) / 2), lato * lato]) {
        for (const passo of PASSI_S) {
          const v = valoriCompleti(IMPOSTAZIONI_TROVA, { lato, cambi, passo });
          const c = panda.prepara(creaRng(lato + cambi), v);
          expect(c.lato).toBe(lato);
          expect(c.iniziale).toHaveLength(lato * lato);
          expect(c.passoMs).toBe(Math.round(passo * 1000));
          c.passi.forEach((passoCambi, k) =>
            expect(passoCambi).toHaveLength(k + 1 <= c.indiceComparsa ? cambi : Math.min(cambi, lato * lato - 1)),
          );
          expect(grigliaAlPasso(c, c.indiceComparsa)[c.posizione]?.figura).toBe("panda");
          expect(grigliaAlPasso(c, c.passi.length)[c.posizione]?.figura).toBe("panda");
        }
      }
    }
  });

  it("Trova: restringendo la griglia i cambi scendono al massimo possibile", () => {
    const v = valoriCompleti(IMPOSTAZIONI_TROVA, { lato: 3, cambi: 16 });
    expect(v.lato).toBe(3);
    expect(v.cambi).toBe(9);
    expect(valoriCompleti(IMPOSTAZIONI_TROVA, { lato: 6, cambi: 36 }).cambi).toBe(36);
  });

  it("Trova: con «tutte dritte» l'interruttore «ruotano» vale falso", () => {
    const v = valoriCompleti(IMPOSTAZIONI_TROVA, { dritte: true, ruotano: true });
    expect(v.dritte).toBe(true);
    expect(v.ruotano).toBe(false);
    expect(parametriDa(v)).toMatchObject({ dritte: true, ruotano: false });
    expect(valoriCompleti(IMPOSTAZIONI_TROVA, { dritte: false, ruotano: true }).ruotano).toBe(true);
  });

  it("nuovaPartita completa le impostazioni mancanti e corregge quelle fuori limite", () => {
    const p = nuovaPartita({ mani: { via: 1 }, impostazioni: { via: { attesaMax: 99 }, panda: { lato: 3, cambi: 30, passo: 0.5 }, inesistente: { x: 1 } } });
    expect(p.impostazioni.via).toEqual({ attesaMax: 5, errori: false });
    expect(p.impostazioni.panda).toMatchObject({ lato: 3, cambi: 9, passo: 0.5 });
    expect(p.impostazioni.memoria).toEqual({ caselle: 4, lunghezza: 4, errori: false });
    expect(Object.keys(p.impostazioni).sort()).toEqual([...ID_MINIGIOCHI].sort());
    expect(nuovaPartita({ mani: { via: 1 } }).impostazioni.raffica).toEqual({ durata: 5 });
  });
});

describe("ordine dei mini giochi", () => {
  const mani = { via: 2, raffica: 1, stop: 3 };
  /** I mini giochi nell'ordine in cui escono (un nome per blocco di mani). */
  const blocchi = (scaletta: readonly string[]) => scaletta.filter((id, i) => id !== scaletta[i - 1]);

  it("ordineCompleto tiene l'ordine dato, scarta voci sconosciute e doppie, mette in fondo le mancanti", () => {
    expect(ordineCompleto(["stop", "via"])).toEqual(["stop", "via", ...ID_MINIGIOCHI.filter((id) => id !== "stop" && id !== "via")]);
    expect(ordineCompleto(["stop", "boh", "stop", 3])).toEqual(["stop", ...ID_MINIGIOCHI.filter((id) => id !== "stop")]);
    expect(ordineCompleto(undefined)).toEqual([...ID_MINIGIOCHI]);
    expect(ordineCompleto("x")).toEqual([...ID_MINIGIOCHI]);
  });

  it("«il mio ordine» rispetta l'elenco, con le mani di fila", () => {
    const p = nuovaPartita({ mani, ordine: "mio", elenco: ["stop", "via", "raffica"] });
    expect(p.scaletta).toEqual(["stop", "stop", "stop", "via", "via", "raffica"]);
  });

  it("senza ordine né elenco resta quello del registro (compatibile con le sfide di prima)", () => {
    expect(nuovaPartita({ mani }).scaletta).toEqual(["via", "via", "raffica", "stop", "stop", "stop"]);
  });

  it("«a caso»: le mani restano di fila, ci sono tutti i mini giochi scelti, e l'ordine cambia con il seme", () => {
    const ordini = new Set<string>();
    for (let seme = 0; seme < 200; seme++) {
      const p = nuovaPartita({ mani, ordine: "caso" }, creaRng(seme));
      expect(p.scaletta).toHaveLength(6);
      const b = blocchi(p.scaletta);
      // Ogni mini gioco forma un solo blocco di fila.
      expect([...b].sort()).toEqual(["raffica", "stop", "via"]);
      for (const id of b) expect(p.scaletta.filter((x) => x === id)).toHaveLength(mani[id as keyof typeof mani]);
      ordini.add(b.join(","));
    }
    // Tre mini giochi: con molti semi escono tutti e sei gli ordini possibili.
    expect(ordini.size).toBe(6);
  });

  it("«a caso» è riproducibile con lo stesso seme (la rivincita ne usa uno nuovo)", () => {
    const a = nuovaPartita({ mani, ordine: "caso" }, creaRng(42)).scaletta;
    expect(nuovaPartita({ mani, ordine: "caso" }, creaRng(42)).scaletta).toEqual(a);
    const r = creaRng(7);
    const prima = nuovaPartita({ mani, ordine: "caso" }, r).scaletta;
    const rivincite = Array.from({ length: 20 }, () => nuovaPartita({ mani, ordine: "caso" }, r).scaletta.join());
    expect(rivincite.some((x) => x !== prima.join())).toBe(true);
  });

  it("«a caso» senza generatore dà errore", () => {
    expect(() => nuovaPartita({ mani, ordine: "caso" })).toThrow();
  });
});
