import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import {
  DIFFICOLTA,
  ErroreTris,
  LINEE,
  aggiungiEsito,
  caselleLibere,
  mosseOttime,
  mossaTelefono,
  muovi,
  nuovaPartita,
  punteggioVuoto,
  trovaLinea,
  type Casella,
  type Partita,
  type Segno,
} from "./logica";

const gioca = (mosse: number[], inizia: Segno = "X"): Partita => mosse.reduce(muovi, nuovaPartita(inizia));
const codiceErrore = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreTris ? e.codice : "altro";
  }
  return null;
};

describe("muovi", () => {
  it("parte vuota, tocca a chi inizia, e alterna", () => {
    const p = nuovaPartita("O");
    expect(p.griglia).toEqual(Array(9).fill(null));
    expect(p.turno).toBe("O");
    const q = muovi(p, 4);
    expect(q.griglia[4]).toBe("O");
    expect(q.turno).toBe("X");
    expect(p.griglia[4]).toBeNull(); // la partita di partenza non cambia
  });

  it("rifiuta casella occupata, fuori griglia e partita finita", () => {
    expect(codiceErrore(() => muovi(gioca([0]), 0))).toBe("casellaOccupata");
    for (const c of [-1, 9, 1.5, NaN]) expect(codiceErrore(() => muovi(nuovaPartita(), c))).toBe("casellaNonValida");
    expect(codiceErrore(() => muovi(gioca([0, 3, 1, 4, 2]), 8))).toBe("partitaFinita");
  });

  it("ognuna delle otto linee dà la vittoria, con la linea giusta", () => {
    for (const linea of LINEE) {
      const altre = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !linea.includes(i));
      const p = gioca([linea[0], altre[0]!, linea[1], altre[1]!, linea[2]]);
      expect(p.esito).toEqual({ vincitore: "X", linea });
    }
  });

  it("vince anche O", () => {
    expect(gioca([0, 3, 1, 4, 8, 5]).esito?.vincitore).toBe("O");
  });

  it("griglia piena senza tris = pareggio", () => {
    expect(gioca([0, 1, 2, 4, 3, 5, 7, 6, 8]).esito).toEqual({ vincitore: null, linea: null });
  });

  it("l'ultima mossa che riempie la griglia e fa tris è una vittoria, non un pareggio", () => {
    // X: 0,5,6,7,8 — il tris 6-7-8 si chiude con l'ultima casella libera
    const p = gioca([0, 1, 5, 2, 6, 3, 7, 4, 8]);
    expect(p.griglia.every((c) => c !== null)).toBe(true);
    expect(p.esito?.vincitore).toBe("X");
  });
});

describe("trovaLinea e caselleLibere", () => {
  it("non vede tris con caselle vuote o miste", () => {
    expect(trovaLinea(Array<Casella>(9).fill(null))).toBeNull();
    expect(trovaLinea(["X", "O", "X", null, null, null, null, null, null])).toBeNull();
  });
  it("elenca le caselle libere", () => {
    expect(caselleLibere(gioca([0, 4]).griglia)).toEqual([1, 2, 3, 5, 6, 7, 8]);
  });
});

describe("punteggio", () => {
  it("conta vittorie e pareggi senza modificare l'originale", () => {
    const a = punteggioVuoto();
    const b = aggiungiEsito(aggiungiEsito(a, { vincitore: "X", linea: [0, 1, 2] }), { vincitore: null, linea: null });
    expect(b).toEqual({ X: 1, O: 0, pareggi: 1 });
    expect(a).toEqual({ X: 0, O: 0, pareggi: 0 });
  });
});

describe("telefono", () => {
  it("vince subito se può e para il tris dell'avversario", () => {
    expect(mosseOttime(gioca([0, 3, 1, 4, 8]))).toEqual([5]); // O: 3,4 → vince in 5
    expect(mosseOttime(gioca([0, 4, 1]))).toEqual([2]); // X: 0,1 → O para in 2
  });

  it("le mosse sono sempre in caselle libere, a ogni livello", () => {
    for (const d of DIFFICOLTA) {
      for (let seme = 0; seme < 30; seme++) {
        const rng = creaRng(seme);
        let p = nuovaPartita();
        while (!p.esito) {
          const m = mossaTelefono(p, d, rng);
          expect(p.griglia[m]).toBeNull();
          p = muovi(p, m);
        }
      }
    }
  });

  it("è riproducibile con lo stesso seme", () => {
    const partita = (seme: number) => {
      const rng = creaRng(seme);
      let p = nuovaPartita();
      const mosse: number[] = [];
      while (!p.esito) {
        const m = mossaTelefono(p, "medio", rng);
        mosse.push(m);
        p = muovi(p, m);
      }
      return mosse;
    };
    expect(partita(7)).toEqual(partita(7));
  });

  it("«difficile» non perde mai, né come primo né come secondo, contro mosse a caso", () => {
    for (const telefono of ["X", "O"] as const) {
      for (let seme = 0; seme < 40; seme++) {
        const rng = creaRng(seme);
        let p = nuovaPartita("X");
        while (!p.esito) p = muovi(p, mossaTelefono(p, p.turno === telefono ? "difficile" : "facile", rng));
        expect(p.esito.vincitore === null || p.esito.vincitore === telefono).toBe(true);
      }
    }
  });

  it("due «difficile» tra loro pareggiano sempre", () => {
    for (let seme = 0; seme < 10; seme++) {
      const rng = creaRng(seme);
      let p = nuovaPartita();
      while (!p.esito) p = muovi(p, mossaTelefono(p, "difficile", rng));
      expect(p.esito.vincitore).toBeNull();
    }
  });

  it("il livello «facile» non gioca sempre la mossa ottima", () => {
    const p = gioca([0, 4, 1]); // tocca a O: l'unica mossa ottima è 2
    const viste = new Set<number>();
    for (let seme = 0; seme < 80; seme++) viste.add(mossaTelefono(p, "facile", creaRng(seme)));
    expect(viste.size).toBeGreaterThan(mosseOttime(p).length);
  });

  it("non muove a partita finita", () => {
    expect(codiceErrore(() => mossaTelefono(gioca([0, 3, 1, 4, 2]), "facile", creaRng(1)))).toBe("partitaFinita");
  });
});
