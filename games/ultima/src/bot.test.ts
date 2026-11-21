import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import { LIVELLI, PROB_ULTIMA, carteGiocabili, coloreMigliore, eseguiMossa, mossaBot, mossaBotLivello } from "./bot";
import { VARIANTI_BASE, nuovoRound, pesca, type Carta, type Colore, type Partita, type Varianti } from "./logica";

let prossimoId = 5000;
const num = (colore: Colore, valore: number): Carta => ({ id: prossimoId++, tipo: "numero", colore, valore });
const sim = (tipo: "salta" | "inverti" | "piu2", colore: Colore): Carta => ({ id: prossimoId++, tipo, colore });
const jolly = (): Carta => ({ id: prossimoId++, tipo: "jolly" });
const piu4 = (): Carta => ({ id: prossimoId++, tipo: "piu4" });

function partita(mani: Carta[][], opz: Partial<Partita> = {}): Partita {
  return {
    mazzo: Array.from({ length: 30 }, () => num("blu", 1)),
    scarto: [num("rosso", 5)],
    mani,
    verso: 1,
    turno: 1,
    colore: "rosso",
    haPescato: false,
    pescata: null,
    ultime: [],
    varianti: VARIANTI_BASE,
    cumulo: null,
    sfida: null,
    fine: null,
    eventi: [],
    ...opz,
  };
}
const altri = (k: number) => Array.from({ length: k }, () => num("verde", 2));

describe("coloreMigliore", () => {
  it("il colore di cui si hanno più carte, ignorando i jolly", () => {
    expect(coloreMigliore([num("blu", 1), num("blu", 2), num("verde", 3), jolly()])).toBe("blu");
  });
  it("senza carte colorate vale rosso", () => {
    expect(coloreMigliore([jolly(), piu4()])).toBe("rosso");
  });
});

describe("carte giocabili", () => {
  it("il +4 solo se non si hanno carte del colore in corso", () => {
    const j = piu4();
    expect(carteGiocabili(partita([[j, num("rosso", 1)], altri(5)]), 1).some((c) => c.id === j.id)).toBe(false);
    expect(carteGiocabili(partita([[j, num("blu", 1)], altri(5)]), 1).some((c) => c.id === j.id)).toBe(true);
  });
  it("dopo aver pescato solo la carta pescata", () => {
    const a = num("rosso", 1);
    const b = num("rosso", 2);
    expect(carteGiocabili(partita([[a, b], altri(5)], { haPescato: true, pescata: b.id }), 1)).toEqual([b]);
  });
});

describe("mossaBot: gioca o pesca", () => {
  it("scarica prima le carte che valgono di più", () => {
    const basso = num("rosso", 1);
    const alto = num("rosso", 9);
    const m = mossaBot(partita([[basso, alto, num("blu", 4)], altri(6)]), 2, 1);
    expect(m).toEqual({ tipo: "gioca", carta: alto.id });
  });
  it("tiene i jolly per ultimi e il +4 dopo il jolly semplice", () => {
    const n = num("rosso", 0);
    expect(mossaBot(partita([[jolly(), piu4(), n], altri(6)]), 2, 1)).toEqual({ tipo: "gioca", carta: n.id });
    const j = jolly();
    const m = mossaBot(partita([[j, piu4()], altri(6)]), 2, 1);
    // Con solo jolly: prima il +4 (se lecito) vale 1, il jolly 0 → il +4.
    expect(m.tipo).toBe("gioca");
  });
  it("se il prossimo ha poche carte colpisce con +2, Salta o Inverti prima del numero più alto", () => {
    const piu2 = sim("piu2", "rosso");
    const alto = num("rosso", 9);
    const m = mossaBot(partita([[alto, piu2, num("blu", 1)], altri(2), altri(6)]), 3, 1);
    expect(m).toEqual({ tipo: "gioca", carta: piu2.id });
  });
  it("se il prossimo ha molte carte scarica il numero alto prima di un Salta di valore minore", () => {
    const alto = num("rosso", 9);
    const salta = sim("salta", "rosso");
    // Salta vale 20: con il prossimo al sicuro (7 carte) conta il valore, quindi il Salta (20) batte il 9.
    const m = mossaBot(partita([[alto, salta, num("blu", 1)], altri(7), altri(6)]), 3, 1);
    expect(m).toEqual({ tipo: "gioca", carta: salta.id });
  });
  it("se non ha carte giocabili pesca; dopo aver pescato, se non può giocare, passa", () => {
    const p = partita([[num("blu", 1), num("verde", 2)], altri(6)]);
    expect(mossaBot(p, 2, 1)).toEqual({ tipo: "pesca" });
    const dopo = pesca(partita([[num("blu", 1)], altri(6)], { mazzo: [num("verde", 7)] }), 1, creaRng(1));
    expect(mossaBot(dopo, 2, 1)).toEqual({ tipo: "passa" });
  });
  it("se la carta pescata è giocabile, la gioca", () => {
    const buona = num("rosso", 6);
    const dopo = pesca(partita([[num("blu", 1)], altri(6)], { mazzo: [buona] }), 1, creaRng(1));
    expect(mossaBot(dopo, 2, 1)).toEqual({ tipo: "gioca", carta: buona.id });
  });
  it("quando cala un jolly sceglie il colore di cui ha più carte", () => {
    const j = jolly();
    const m = mossaBot(partita([[j, num("blu", 1), num("blu", 2), num("verde", 3)], altri(6)], { colore: "giallo", scarto: [num("giallo", 7)] }), 2, 1);
    expect(m).toEqual({ tipo: "gioca", carta: j.id, colore: "blu" });
  });
  it("sceglie il colore per un jolly iniziale", () => {
    const p = partita([[num("verde", 1), num("verde", 2), num("blu", 3)], altri(6)], { scarto: [jolly()], colore: null });
    expect(mossaBot(p, 2, 1)).toEqual({ tipo: "scegliColore", colore: "verde" });
  });
});

describe("mossaBot: sfida del +4", () => {
  const subisce = (sospetto: boolean) => partita([[num("blu", 1)], altri(4)], { turno: 1, sfida: { contro: 2, sospetto, illegale: false } });
  it("sfida solo se chi l'ha giocato aveva appena pescato", () => {
    expect(mossaBot(subisce(true), 2, 1)).toEqual({ tipo: "sfida" });
    expect(mossaBot(subisce(false), 2, 1)).toEqual({ tipo: "accetta" });
  });
  it("non guarda se il +4 era davvero illegale (è un segreto)", () => {
    const illegale = partita([[num("blu", 1)], altri(4)], { turno: 1, sfida: { contro: 2, sospetto: false, illegale: true } });
    expect(mossaBot(illegale, 2, 1)).toEqual({ tipo: "accetta" });
  });
});

describe("mossaBot: Ultima!", () => {
  it("chi resta con una carta la dichiara, anche fuori turno", () => {
    const p = partita([[num("blu", 1)], altri(4)], { turno: 2, ultime: [{ posto: 1, dichiarata: false }] });
    expect(mossaBot(p, 2, 1)).toEqual({ tipo: "ultima" });
  });
  it("non la dichiara due volte e fuori turno non fa altro", () => {
    const p = partita([[num("blu", 1)], altri(4)], { turno: 2, ultime: [{ posto: 1, dichiarata: true }] });
    expect(() => mossaBot(p, 2, 1)).toThrow("nonTocca");
  });
  it("dichiara subito se cala la penultima carta", () => {
    const c = num("rosso", 4);
    const p = partita([[c, num("blu", 1)], altri(4)]);
    const dopo = eseguiMossa(p, 2, 1, mossaBot(p, 2, 1), creaRng(1));
    expect(dopo.ultime).toEqual([{ posto: 1, dichiarata: true }]);
  });
});

describe("mossaBot: Beccato!", () => {
  const dimentico = () => partita([[num("blu", 1)], altri(4)], { turno: 2, ultime: [{ posto: 1, dichiarata: false }] });
  it("becca chi ha una carta sola e non ha detto «Ultima!»", () => {
    expect(mossaBot(dimentico(), 2, 2)).toEqual({ tipo: "beccato", bersaglio: 1 });
    const dopo = eseguiMossa(dimentico(), 2, 2, { tipo: "beccato", bersaglio: 1 }, creaRng(1));
    expect(dopo.mani[0]).toHaveLength(3);
    expect(dopo.ultime).toEqual([]);
  });
  it("non becca chi ha già dichiarato", () => {
    const detto = partita([[num("blu", 1)], altri(4)], { turno: 2, ultime: [{ posto: 1, dichiarata: true }] });
    expect(mossaBot(detto, 2, 2).tipo).not.toBe("beccato");
  });
});

describe("mossaBot: errori", () => {
  it("non c'è mossa a round finito né fuori turno", () => {
    expect(() => mossaBot(partita([[num("blu", 1)], altri(4)], { fine: { vincitore: 2, punti: 3 } }), 2, 1)).toThrow();
    expect(() => mossaBot(partita([[num("blu", 1)], altri(4)], { turno: 2 }), 2, 1)).toThrow("nonTocca");
  });
});

describe("partite giocate solo dai bot", () => {
  /** Gioca finché c'è un vincitore; ogni mossa è quella del bot per chi deve agire. */
  function giocaFinoInFondo(n: number, seme: number): { p: Partita; mosse: number } {
    const rng = creaRng(seme);
    let p = nuovoRound(n, rng);
    let mosse = 0;
    while (!p.fine) {
      if (++mosse > 5000) throw new Error(`partita infinita (n=${n}, seme=${seme})`);
      // Prima chi deve dichiarare «Ultima!» (ma solo se non è già di turno); poi chi di turno.
      const dichiara = p.ultime.find((u) => !u.dichiarata)?.posto ?? null;
      const chi = dichiara ?? p.turno;
      p = eseguiMossa(p, n, chi, mossaBot(p, n, chi), rng);
    }
    return { p, mosse };
  }

  it("finiscono sempre, con ogni numero di giocatori e molti semi", () => {
    for (const n of [2, 3, 4, 7, 10]) {
      for (let seme = 0; seme < 40; seme++) {
        const { p } = giocaFinoInFondo(n, seme);
        expect(p.fine).not.toBeNull();
        expect(p.mani[p.fine!.vincitore - 1]).toHaveLength(0);
      }
    }
  });
  it("non perdono né duplicano carte", () => {
    for (let seme = 0; seme < 40; seme++) {
      const { p } = giocaFinoInFondo(4, seme);
      const tutte = [...p.mazzo, ...p.scarto, ...p.mani.flat()];
      expect(tutte).toHaveLength(108);
      expect(new Set(tutte.map((c) => c.id)).size).toBe(108);
    }
  });
  it("sono riproducibili con lo stesso seme", () => {
    expect(giocaFinoInFondo(4, 12).p).toEqual(giocaFinoInFondo(4, 12).p);
  });
});

describe("bot con la somma dei +2", () => {
  const V = { ...VARIANTI_BASE, sommaPiu2: true };
  it("con un +2 in mano rilancia, senza paga il cumulo", () => {
    const due = sim("piu2", "verde");
    const col = partita([[num("rosso", 1)], [due, num("blu", 2)], [num("verde", 1)]], {
      varianti: V,
      turno: 2,
      cumulo: { posto: 2, quante: 2, da: 1 },
    });
    expect(mossaBot(col, 3, 2)).toEqual({ tipo: "gioca", carta: due.id });
    const senza = partita([[num("rosso", 1)], [num("blu", 2), num("blu", 3)], [num("verde", 1)]], {
      varianti: V,
      turno: 2,
      cumulo: { posto: 2, quante: 2, da: 1 },
    });
    expect(mossaBot(senza, 3, 2)).toEqual({ tipo: "pescaCumulo" });
    const dopo = eseguiMossa(senza, 3, 2, { tipo: "pescaCumulo" }, creaRng(1));
    expect(dopo.mani[1]).toHaveLength(4);
  });
  it("a ogni livello le mosse con un cumulo sono lecite", () => {
    const due = sim("piu2", "verde");
    for (const livello of LIVELLI) {
      for (let s = 0; s < 30; s++) {
        const p = partita([[num("rosso", 1)], [due, num("blu", 2)], [num("verde", 1)]], { varianti: V, turno: 2, cumulo: { posto: 2, quante: 2, da: 1 } });
        const m = mossaBotLivello(p, 3, 2, livello, creaRng(s));
        expect(["pescaCumulo", "gioca"]).toContain(m.tipo);
        expect(() => eseguiMossa(p, 3, 2, m, creaRng(s))).not.toThrow();
      }
    }
  });
});

/** Gioca partite intere di bot a ogni livello con una combinazione di varianti. */
function partiteConVarianti(varianti: Varianti, tot: number) {
  for (const livello of LIVELLI) {
    for (const n of [2, 3, 4, 7]) {
      for (let seme = 0; seme < tot; seme++) {
        const rng = creaRng(seme + 100);
        let p = nuovoRound(n, rng, [], 1, varianti);
        let mosse = 0;
        while (!p.fine) {
          if (++mosse > 8000) throw new Error(`partita infinita (n=${n}, seme=${seme}, ${livello})`);
          const dichiara = p.ultime.find((u) => !u.dichiarata)?.posto ?? null;
          const chi = dichiara ?? p.turno;
          p = eseguiMossa(p, n, chi, mossaBotLivello(p, n, chi, livello, rng), rng, rng.next() < PROB_ULTIMA[livello]);
        }
        const tutte = [...p.mazzo, ...p.scarto, ...p.mani.flat()];
        expect(tutte).toHaveLength(varianti.scambioRotazione ? 112 : 108);
        expect(new Set(tutte.map((c) => c.id)).size).toBe(tutte.length);
      }
    }
  }
}

describe("partite di bot con le varianti", () => {
  it("somma dei +2: finiscono sempre e non perdono carte", () => {
    partiteConVarianti({ ...VARIANTI_BASE, sommaPiu2: true }, 15);
  });
});
