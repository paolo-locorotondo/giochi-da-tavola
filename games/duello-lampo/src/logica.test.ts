import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import {
  ErroreDuello,
  assegna,
  creaScaletta,
  finita,
  idCorrente,
  inSpareggio,
  nuovaPartita,
  sceltaACaso,
  vincitorePartita,
} from "./logica";
import { ID_MINIGIOCHI, MINIGIOCHI, NESSUNO, miniGioco } from "./minigiochi";
import { ATTESA_MAX_MS, ATTESA_MIN_MS, via } from "./minigiochi/via";
import { raffica } from "./minigiochi/raffica";
import { CICLI_MASSIMI, distanzaDalCentro, posizione, stop } from "./minigiochi/stop";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreDuello ? e.codice : "altro";
  }
  return null;
};

describe("creaScaletta", () => {
  it("ha la lunghezza chiesta e usa solo i mini giochi scelti", () => {
    const s = creaScaletta(["via", "raffica"], 7, creaRng("a"));
    expect(s).toHaveLength(7);
    expect(s.every((id) => id === "via" || id === "raffica")).toBe(true);
  });

  it("non ripete mai lo stesso mini gioco di fila se ce n'è più di uno", () => {
    for (let seme = 0; seme < 200; seme++) {
      for (const ids of [["a", "b"], ["a", "b", "c"], ["a", "b", "c", "d"]]) {
        const s = creaScaletta(ids, 21, creaRng(seme));
        for (let i = 1; i < s.length; i++) expect(s[i]).not.toBe(s[i - 1]);
      }
    }
  });

  it("con tutti i mini giochi, nei primi n round compaiono tutti (sacchetto)", () => {
    const ids = ["a", "b", "c"];
    const s = creaScaletta(ids, 3, creaRng("x"));
    expect([...s].sort()).toEqual(ids);
  });

  it("con un solo mini gioco lo ripete", () => {
    expect(creaScaletta(["via"], 3, creaRng(1))).toEqual(["via", "via", "via"]);
  });

  it("è riproducibile con lo stesso seme", () => {
    const ids = ["a", "b", "c"];
    expect(creaScaletta(ids, 9, creaRng(5))).toEqual(creaScaletta(ids, 9, creaRng(5)));
  });

  it("senza mini giochi dà errore", () => {
    expect(codice(() => creaScaletta([], 3, creaRng(1)))).toBe("nessunMinigioco");
  });
});

describe("nuovaPartita", () => {
  const rng = () => creaRng("p");
  it("controlla round e mini giochi", () => {
    expect(codice(() => nuovaPartita({ minigiochi: [], round: 5 }, rng()))).toBe("nessunMinigioco");
    expect(codice(() => nuovaPartita({ minigiochi: ["via"], round: 0 }, rng()))).toBe("roundNonValidi");
    expect(codice(() => nuovaPartita({ minigiochi: ["via"], round: 2.5 }, rng()))).toBe("roundNonValidi");
    expect(codice(() => nuovaPartita({ minigiochi: ["via"], round: 99 }, rng()))).toBe("roundNonValidi");
    expect(codice(() => nuovaPartita({ minigiochi: ["inesistente"], round: 3 }, rng()))).toBe("minigiocoSconosciuto");
  });

  it("parte da zero punti al primo round", () => {
    const p = nuovaPartita({ minigiochi: [...ID_MINIGIOCHI], round: 5 }, rng());
    expect(p.punti).toEqual([0, 0]);
    expect(p.round).toBe(0);
    expect(p.scaletta).toHaveLength(5);
    expect(idCorrente(p)).toBe(p.scaletta[0]);
    expect(finita(p)).toBe(false);
  });
});

describe("assegna", () => {
  const nuova = (round: number) => nuovaPartita({ minigiochi: ["via"], round }, creaRng(1));

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

describe("sceltaACaso", () => {
  it("dà un sottoinsieme non vuoto nell'ordine del registro", () => {
    for (let seme = 0; seme < 100; seme++) {
      const s = sceltaACaso(ID_MINIGIOCHI, creaRng(seme));
      expect(s.length).toBeGreaterThanOrEqual(1);
      expect(s.length).toBeLessThan(ID_MINIGIOCHI.length);
      expect(s).toEqual(ID_MINIGIOCHI.filter((id) => s.includes(id)));
    }
    expect(sceltaACaso(["solo"], creaRng(1))).toEqual(["solo"]);
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
