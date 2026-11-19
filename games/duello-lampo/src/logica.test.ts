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
} from "./logica";
import { ID_MINIGIOCHI, MINIGIOCHI, NESSUNO, miniGioco } from "./minigiochi";
import { ATTESA_MAX_MS, ATTESA_MIN_MS, via } from "./minigiochi/via";
import { raffica } from "./minigiochi/raffica";
import { CICLI_MASSIMI, distanzaDalCentro, posizione, stop } from "./minigiochi/stop";
import { ATTESA_MAX_MS as ATTESA_MAX_COLORE, ATTESA_MIN_MS as ATTESA_MIN_COLORE, COLORI, colore } from "./minigiochi/colore";
import { ANIMALI, CASELLE as CASELLE_PANDA, NUMERO_COLORI, panda } from "./minigiochi/panda";
import { CASELLE as CASELLE_MEMORIA, LUNGHEZZA as LUNGHEZZA_MEMORIA, fineDimostrazione, memoria } from "./minigiochi/memoria";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreDuello ? e.codice : "altro";
  }
  return null;
};

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

  it("dà un punto al vincitore e passa al round dopo", () => {
    const p = assegna(nuova(3), 1);
    expect(p.punti).toEqual([0, 1]);
    expect(p.round).toBe(1);
  });

  it("con un pari nessuno prende punti", () => {
    const p = assegna(nuova(3), null);
    expect(p.punti).toEqual([0, 0]);
    expect(p.round).toBe(1);
  });

  it("la partita finisce al round finale se qualcuno è avanti", () => {
    let p = nuova(3);
    for (const v of [0, 1, 0] as const) p = assegna(p, v);
    expect(finita(p)).toBe(true);
    expect(p.punti).toEqual([2, 1]);
    expect(vincitorePartita(p)).toBe(0);
    expect(idCorrente(p)).toBeUndefined();
  });

  it("con parità a fine round si aggiunge lo spareggio, finché qualcuno è avanti", () => {
    let p = nuova(2);
    p = assegna(p, 0);
    p = assegna(p, 1);
    expect(finita(p)).toBe(false);
    expect(inSpareggio(p)).toBe(true);
    expect(idCorrente(p)).toBe("via");
    p = assegna(p, null); // pari anche lo spareggio: se ne gioca un altro
    expect(finita(p)).toBe(false);
    p = assegna(p, 1);
    expect(finita(p)).toBe(true);
    expect(vincitorePartita(p)).toBe(1);
  });

  it("a partita finita non cambia più niente", () => {
    let p = nuova(1);
    p = assegna(p, 0);
    expect(assegna(p, 1)).toBe(p);
  });

  it("senza round finiti non c'è vincitore", () => {
    expect(vincitorePartita(nuova(3))).toBeNull();
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
      const a = m.prepara(creaRng(3));
      expect(m.prepara(creaRng(3))).toEqual(a);
      expect(m.durataMassima(a)).toBeGreaterThan(0);
    }
  });
});

describe("Via!", () => {
  const c = { attesaMs: 2000 };
  it("l'attesa sta nei limiti", () => {
    for (let seme = 0; seme < 200; seme++) {
      const { attesaMs } = via.prepara(creaRng(seme));
      expect(attesaMs).toBeGreaterThanOrEqual(ATTESA_MIN_MS);
      expect(attesaMs).toBeLessThanOrEqual(ATTESA_MAX_MS);
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
  const c = raffica.prepara(creaRng(1));
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
      const cfg = stop.prepara(creaRng(seme));
      expect(cfg.faseMs).toBeGreaterThanOrEqual(0);
      expect(cfg.faseMs).toBeLessThan(cfg.periodoMs);
      expect(stop.durataMassima(cfg)).toBe(cfg.periodoMs * CICLI_MASSIMI);
    }
  });
});

describe("Colore giusto", () => {
  it("la parola e il colore dell'inchiostro sono sempre diversi, e tra i colori previsti", () => {
    for (let seme = 0; seme < 300; seme++) {
      const c = colore.prepara(creaRng(seme));
      expect(c.parola).not.toBe(c.inchiostro);
      expect(COLORI).toContain(c.parola);
      expect(COLORI).toContain(c.inchiostro);
      expect(c.attesaMs).toBeGreaterThanOrEqual(ATTESA_MIN_COLORE);
      expect(c.attesaMs).toBeLessThanOrEqual(ATTESA_MAX_COLORE);
    }
  });
  const c = colore.prepara(creaRng(1));
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

describe("Trova il panda", () => {
  it("griglia piena di animali (nessun panda finto), panda in una casella valida", () => {
    for (let seme = 0; seme < 200; seme++) {
      const c = panda.prepara(creaRng(seme));
      expect(c.caselle).toHaveLength(CASELLE_PANDA);
      for (const k of c.caselle) {
        expect(ANIMALI).toContain(k.animale);
        expect(k.gradi % 45).toBe(0);
        expect(k.colore).toBeGreaterThanOrEqual(0);
        expect(k.colore).toBeLessThan(NUMERO_COLORI);
      }
      expect(c.posizionePanda).toBeGreaterThanOrEqual(0);
      expect(c.posizionePanda).toBeLessThan(CASELLE_PANDA);
    }
  });
  const c = panda.prepara(creaRng(2));
  it("vince chi trova il panda per primo; chi tocca un altro animale perde", () => {
    expect(panda.vincitore(c, [{ trovato: true, ms: 800 }, { trovato: true, ms: 650 }])).toBe(1);
    expect(panda.vincitore(c, [{ trovato: false, ms: 100 }, { trovato: true, ms: 2000 }])).toBe(1);
    expect(panda.vincitore(c, [{ trovato: true, ms: 2000 }, NESSUNO])).toBe(0);
    expect(panda.vincitore(c, [{ trovato: false, ms: 100 }, NESSUNO])).toBe(1);
    expect(panda.vincitore(c, [NESSUNO, NESSUNO])).toBeNull();
  });
});

describe("Memoria lampo", () => {
  it("sequenza della lunghezza prevista, caselle valide, mai la stessa due volte di fila", () => {
    for (let seme = 0; seme < 300; seme++) {
      const { sequenza } = memoria.prepara(creaRng(seme));
      expect(sequenza).toHaveLength(LUNGHEZZA_MEMORIA);
      for (let i = 0; i < sequenza.length; i++) {
        expect(sequenza[i]).toBeGreaterThanOrEqual(0);
        expect(sequenza[i]).toBeLessThan(CASELLE_MEMORIA);
        if (i > 0) expect(sequenza[i]).not.toBe(sequenza[i - 1]);
      }
    }
  });
  const c = memoria.prepara(creaRng(3));
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
