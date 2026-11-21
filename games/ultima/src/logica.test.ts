import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import {
  ErroreUltima,
  accetta,
  avanza,
  beccato,
  gioca,
  giocabili,
  carteTagliabili,
  identica,
  taglia,
  TAGLIO_MS,
  TAGLIO_TOLLERANZA_MS,
  gruppiPossibili,
  pescaCumulo,
  VARIANTI_BASE,
  mazzoCompleto,
  nuovoRound,
  passa,
  pesca,
  puoGiocare,
  scegliColore,
  sfida,
  ultima,
  valorePunti,
  type Carta,
  type Colore,
  type Partita,
} from "./logica";

const rng = () => creaRng(7);
const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreUltima ? e.codice : "altro";
  }
  return null;
};

let prossimoId = 1000;
const num = (colore: Colore, valore: number): Carta => ({ id: prossimoId++, tipo: "numero", colore, valore });
const sim = (tipo: "salta" | "inverti" | "piu2", colore: Colore): Carta => ({ id: prossimoId++, tipo, colore });
const jolly = (): Carta => ({ id: prossimoId++, tipo: "jolly" });
const piu4 = (): Carta => ({ id: prossimoId++, tipo: "piu4" });

/** Una partita costruita a mano: `mani[0]` è il posto 1, ecc. La cima del mazzo è l'ultimo elemento. */
function partita(mani: Carta[][], opz: Partial<Partita> = {}): Partita {
  const riempimento = Array.from({ length: 30 }, () => num("blu", 1));
  return {
    mazzo: riempimento,
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
    apertaTaglio: null,
    sfida: null,
    fine: null,
    eventi: [],
    ...opz,
  };
}

describe("mazzo", () => {
  it("ha 108 carte con id distinti e la composizione ufficiale", () => {
    const m = mazzoCompleto();
    expect(m).toHaveLength(108);
    expect(new Set(m.map((c) => c.id)).size).toBe(108);
    expect(m.filter((c) => c.tipo === "numero" && c.valore === 0)).toHaveLength(4);
    expect(m.filter((c) => c.tipo === "numero" && c.valore === 7)).toHaveLength(8);
    expect(m.filter((c) => c.tipo === "salta")).toHaveLength(8);
    expect(m.filter((c) => c.tipo === "inverti")).toHaveLength(8);
    expect(m.filter((c) => c.tipo === "piu2")).toHaveLength(8);
    expect(m.filter((c) => c.tipo === "jolly")).toHaveLength(4);
    expect(m.filter((c) => c.tipo === "piu4")).toHaveLength(4);
  });
  it("vale 0 per lo zero, il numero per le cifre, 20 per i simboli e 50 per i jolly", () => {
    expect(valorePunti(num("blu", 0))).toBe(0);
    expect(valorePunti(num("blu", 9))).toBe(9);
    expect(valorePunti(sim("salta", "blu"))).toBe(20);
    expect(valorePunti(sim("inverti", "blu"))).toBe(20);
    expect(valorePunti(sim("piu2", "blu"))).toBe(20);
    expect(valorePunti(jolly())).toBe(50);
    expect(valorePunti(piu4())).toBe(50);
  });
});

describe("giocabilità", () => {
  const sopra = num("rosso", 5);
  it("stesso colore, stesso numero o stesso simbolo; il jolly sempre", () => {
    expect(puoGiocare(num("rosso", 1), "rosso", sopra)).toBe(true);
    expect(puoGiocare(num("blu", 5), "rosso", sopra)).toBe(true);
    expect(puoGiocare(num("blu", 6), "rosso", sopra)).toBe(false);
    expect(puoGiocare(sim("salta", "blu"), "rosso", sim("salta", "verde"))).toBe(true);
    expect(puoGiocare(sim("salta", "blu"), "rosso", sopra)).toBe(false);
    expect(puoGiocare(jolly(), "rosso", sopra)).toBe(true);
    expect(puoGiocare(piu4(), "rosso", sopra)).toBe(true);
  });
  it("sopra un jolly conta solo il colore scelto", () => {
    expect(puoGiocare(num("verde", 3), "verde", jolly())).toBe(true);
    expect(puoGiocare(num("blu", 3), "verde", jolly())).toBe(false);
  });
  it("si cala il numero anche se il colore in corso è un altro", () => {
    // La scoperta è un 5 rosso, ma il colore in corso è giallo (dopo un jolly): il 5 blu si può.
    expect(puoGiocare(num("blu", 5), "giallo", sopra)).toBe(true);
  });
});

describe("avanza", () => {
  it("gira nei due versi e salta i posti", () => {
    expect(avanza(1, 1, 4)).toBe(2);
    expect(avanza(4, 1, 4)).toBe(1);
    expect(avanza(1, -1, 4)).toBe(4);
    expect(avanza(2, 1, 4, 2)).toBe(4);
    expect(avanza(3, -1, 4, 2)).toBe(1);
  });
});

describe("nuovoRound", () => {
  it("dà 7 carte a testa e scopre la prima, con il mazzo che resta", () => {
    const p = nuovoRound(4, rng());
    expect(p.mani.every((m) => m.length === 7)).toBe(true);
    expect(p.scarto).toHaveLength(1);
    expect(p.mazzo.length + p.scarto.length + 28).toBe(108);
    expect(p.fine).toBeNull();
  });
  it("con lo stesso seme la partita si ripete identica", () => {
    expect(nuovoRound(3, creaRng(99))).toEqual(nuovoRound(3, creaRng(99)));
  });
  it("non scopre mai un jolly +4, e conserva tutte le 108 carte", () => {
    for (let seme = 0; seme < 300; seme++) {
      const p = nuovoRound(3, creaRng(seme));
      expect(p.scarto[0]!.tipo).not.toBe("piu4");
      const tutte = [...p.mazzo, ...p.scarto, ...p.mani.flat()];
      expect(new Set(tutte.map((c) => c.id)).size).toBe(108);
    }
  });
  it("accetta solo da 2 a 10 giocatori", () => {
    expect(codice(() => nuovoRound(1, rng()))).toBe("numeroGiocatori");
    expect(codice(() => nuovoRound(11, rng()))).toBe("numeroGiocatori");
    expect(codice(() => nuovoRound(10, rng()))).toBeNull();
  });
  it("la prima carta speciale colpisce il primo giocatore", () => {
    // Cerco un seme per ogni tipo di prima carta e controllo l'effetto.
    const visti = new Set<string>();
    for (let seme = 0; seme < 2000 && visti.size < 5; seme++) {
      const p = nuovoRound(4, creaRng(seme));
      const prima = p.scarto[0]!;
      if (visti.has(prima.tipo)) continue;
      visti.add(prima.tipo);
      if (prima.tipo === "numero") expect(p.turno).toBe(1);
      if (prima.tipo === "salta") expect(p.turno).toBe(2);
      if (prima.tipo === "inverti") {
        expect(p.verso).toBe(-1);
        expect(p.turno).toBe(4);
      }
      if (prima.tipo === "piu2") {
        expect(p.mani[0]).toHaveLength(9);
        expect(p.turno).toBe(2);
      }
      if (prima.tipo === "jolly") {
        expect(p.colore).toBeNull();
        expect(p.turno).toBe(1);
      }
    }
    expect(visti.size).toBe(5);
  });
  it("il primo di mano è chi inizia, salvo l'effetto della prima carta", () => {
    for (let seme = 0; seme < 500; seme++) {
      const p = nuovoRound(4, creaRng(seme), [], 3);
      const prima = p.scarto[0]!.tipo;
      if (prima === "numero" || prima === "jolly") expect(p.turno).toBe(3);
      if (prima === "salta" || prima === "piu2") expect(p.turno).toBe(4);
      if (prima === "inverti") {
        expect(p.verso).toBe(-1);
        expect(p.turno).toBe(2);
      }
    }
  });
  it("in due giocatori un Inverti iniziale vale come Salta", () => {
    for (let seme = 0; seme < 2000; seme++) {
      const p = nuovoRound(2, creaRng(seme));
      if (p.scarto[0]!.tipo !== "inverti") continue;
      expect(p.verso).toBe(1);
      expect(p.turno).toBe(2);
      return;
    }
    throw new Error("nessun seme con Inverti iniziale");
  });
});

describe("gioca", () => {
  it("cala una carta e passa il turno", () => {
    const c = num("rosso", 9);
    const p = gioca(partita([[c, num("blu", 1)], [num("verde", 2)]]), 2, 1, c.id, undefined, rng());
    expect(p.turno).toBe(2);
    expect(p.mani[0]).toHaveLength(1);
    expect(p.scarto.at(-1)).toBe(c);
    expect(p.colore).toBe("rosso");
  });
  it("rifiuta carta non giocabile, non in mano, fuori turno", () => {
    const c = num("blu", 9);
    const base = partita([[c, num("blu", 1)], [num("verde", 2), num("verde", 3)]]);
    expect(codice(() => gioca(base, 2, 1, c.id, undefined, rng()))).toBe("nonGiocabile");
    expect(codice(() => gioca(base, 2, 1, 99999, undefined, rng()))).toBe("cartaNonInMano");
    expect(codice(() => gioca(base, 2, 2, base.mani[1]![0]!.id, undefined, rng()))).toBe("nonTocca");
  });
  it("un jolly vuole il colore e lo imposta", () => {
    const j = jolly();
    const base = partita([[j, num("blu", 1)], [num("verde", 2)]]);
    expect(codice(() => gioca(base, 2, 1, j.id, undefined, rng()))).toBe("coloreMancante");
    expect(codice(() => gioca(base, 2, 1, j.id, "viola", rng()))).toBe("coloreMancante");
    expect(gioca(base, 2, 1, j.id, "verde", rng()).colore).toBe("verde");
  });
  it("Salta fa saltare il prossimo", () => {
    const c = sim("salta", "rosso");
    const p = gioca(partita([[c, num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, c.id, undefined, rng());
    expect(p.turno).toBe(3);
  });
  it("Inverti cambia verso; in due vale come Salta", () => {
    const c = sim("inverti", "rosso");
    const tre = gioca(partita([[c, num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, c.id, undefined, rng());
    expect(tre.verso).toBe(-1);
    expect(tre.turno).toBe(3);
    const c2 = sim("inverti", "rosso");
    const due = gioca(partita([[c2, num("blu", 1)], [num("verde", 2)]]), 2, 1, c2.id, undefined, rng());
    expect(due.verso).toBe(1);
    expect(due.turno).toBe(1);
  });
  it("+2 fa pescare due carte al prossimo, che salta il turno", () => {
    const c = sim("piu2", "rosso");
    const p = gioca(partita([[c, num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, c.id, undefined, rng());
    expect(p.mani[1]).toHaveLength(3);
    expect(p.turno).toBe(3);
  });
  it("chi cala l'ultima carta vince e prende i punti delle carte degli altri", () => {
    const c = num("rosso", 4);
    const base = partita([[c], [num("verde", 2), jolly()], [sim("salta", "blu")]]);
    const p = gioca(base, 3, 1, c.id, undefined, rng());
    expect(p.fine).toEqual({ vincitore: 1, punti: 2 + 50 + 20 });
    expect(p.ultime).toEqual([]);
  });
  it("niente più mosse a round finito", () => {
    const c = num("rosso", 4);
    const finito = gioca(partita([[c], [num("verde", 2)]]), 2, 1, c.id, undefined, rng());
    expect(codice(() => pesca(finito, 1, rng()))).toBe("roundFinito");
    expect(codice(() => pesca(finito, 2, rng()))).toBe("roundFinito");
  });
  it("con una carta in mano si apre la finestra di «Ultima!»", () => {
    const c = num("rosso", 4);
    const p = gioca(partita([[c, num("blu", 1)], [num("verde", 2)]]), 2, 1, c.id, undefined, rng());
    expect(p.ultime).toEqual([{ posto: 1, dichiarata: false }]);
  });
  it("il bot dichiara «Ultima!» subito", () => {
    const c = num("rosso", 4);
    const p = gioca(partita([[c, num("blu", 1)], [num("verde", 2)]]), 2, 1, c.id, undefined, rng(), true);
    expect(p.ultime).toEqual([{ posto: 1, dichiarata: true }]);
    expect(p.eventi.some((e) => e.tipo === "ultima" && e.posto === 1)).toBe(true);
  });
});

describe("pesca e passa", () => {
  it("si pesca una volta sola; poi si gioca la pescata o si passa", () => {
    const base = partita([[num("blu", 9)], [num("verde", 2)]]);
    const dopo = pesca(base, 1, rng());
    expect(dopo.mani[0]).toHaveLength(2);
    expect(dopo.turno).toBe(1);
    expect(codice(() => pesca(dopo, 1, rng()))).toBe("giaPescato");
    expect(passa(dopo, 2, 1).turno).toBe(2);
  });
  it("non si passa senza aver pescato", () => {
    expect(codice(() => passa(partita([[num("blu", 9)], [num("verde", 2)]]), 2, 1))).toBe("devePescare");
  });
  it("dopo aver pescato si può calare solo la carta pescata", () => {
    const pescabile = num("rosso", 8);
    const base = partita([[num("rosso", 1), num("blu", 9)], [num("verde", 2)]], { mazzo: [pescabile] });
    const dopo = pesca(base, 1, rng());
    expect(dopo.pescata).toBe(pescabile.id);
    expect(codice(() => gioca(dopo, 2, 1, dopo.mani[0]![0]!.id, undefined, rng()))).toBe("soloLaPescata");
    expect(gioca(dopo, 2, 1, pescabile.id, undefined, rng()).turno).toBe(2);
  });
  it("con mazzo e scarto esauriti si pesca a vuoto e si passa", () => {
    const base = partita([[num("blu", 9)], [num("verde", 2)]], { mazzo: [], scarto: [num("rosso", 5)] });
    const dopo = pesca(base, 1, rng());
    expect(dopo.mani[0]).toHaveLength(1);
    expect(dopo.pescata).toBeNull();
    expect(passa(dopo, 2, 1).turno).toBe(2);
  });
  it("pescare cancella la finestra di «Ultima!» di chi ha una carta", () => {
    const p = partita([[num("blu", 9)], [num("verde", 2)]], { turno: 2, ultime: [{ posto: 1, dichiarata: false }] });
    expect(pesca(p, 2, rng()).ultime).toEqual([]);
  });
});

describe("mazzo esaurito", () => {
  it("si rimescola lo scarto tranne la carta in cima", () => {
    const sopra = num("rosso", 5);
    const scarto = [num("blu", 1), num("blu", 2), num("blu", 3), sopra];
    const p = pesca(partita([[num("verde", 9)], [num("verde", 2)]], { mazzo: [], scarto }), 1, rng());
    expect(p.mani[0]).toHaveLength(2);
    expect(p.scarto).toEqual([sopra]);
    expect(p.mazzo).toHaveLength(2);
    expect(p.eventi.some((e) => e.tipo === "mazzoRimescolato")).toBe(true);
  });
  it("una pesca di +2 attraversa il rimescolo senza perdere carte", () => {
    const c = sim("piu2", "rosso");
    const scarto = [num("blu", 1), num("blu", 2), num("rosso", 5)];
    const base = partita([[c, num("blu", 1)], [num("verde", 2)]], { mazzo: [num("giallo", 1)], scarto });
    const p = gioca(base, 2, 1, c.id, undefined, rng());
    expect(p.mani[1]).toHaveLength(3);
    const tutte = [...p.mazzo, ...p.scarto, ...p.mani.flat()];
    expect(new Set(tutte.map((x) => x.id)).size).toBe(tutte.length);
  });
});

describe("scegliColore", () => {
  const conJolly = () => partita([[num("blu", 1), num("blu", 4)], [num("verde", 2)]], { scarto: [jolly()], colore: null });
  it("il primo giocatore sceglie il colore dopo un jolly scoperto", () => {
    const p = conJolly();
    expect(codice(() => gioca(p, 2, 1, p.mani[0]![0]!.id, undefined, rng()))).toBe("sceglieColore");
    expect(codice(() => scegliColore(p, 2, "blu"))).toBe("nonTocca");
    expect(codice(() => scegliColore(p, 1, "viola"))).toBe("coloreMancante");
    const dopo = scegliColore(p, 1, "blu");
    expect(dopo.colore).toBe("blu");
    expect(gioca(dopo, 2, 1, dopo.mani[0]![0]!.id, undefined, rng()).turno).toBe(2);
  });
  it("non si può scegliere se il colore c'è già", () => {
    expect(codice(() => scegliColore(partita([[num("blu", 1)], [num("verde", 2)]]), 1, "blu"))).toBe("nonSceltaColore");
  });
});

describe("Jolly +4 e sfida", () => {
  it("il prossimo risponde: nel frattempo nessuno gioca né pesca", () => {
    const j = piu4();
    const base = partita([[j, num("blu", 1), num("blu", 2)], [num("verde", 2)], [num("verde", 3)]]);
    const p = gioca(base, 3, 1, j.id, "blu", rng());
    expect(p.sfida).not.toBeNull();
    expect(p.turno).toBe(2);
    expect(p.colore).toBe("blu");
    expect(codice(() => pesca(p, 2, rng()))).toBe("rispondiSfida");
    expect(codice(() => gioca(p, 3, 2, p.mani[1]![0]!.id, undefined, rng()))).toBe("rispondiSfida");
    expect(codice(() => passa(p, 3, 2))).toBe("rispondiSfida");
  });
  it("accettare: pesca 4 e salta il turno", () => {
    const j = piu4();
    const p0 = gioca(partita([[j, num("blu", 1), num("blu", 2)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, j.id, "blu", rng());
    const p = accetta(p0, 3, 2, rng());
    expect(p.mani[1]).toHaveLength(5);
    expect(p.turno).toBe(3);
    expect(p.sfida).toBeNull();
  });
  it("sfida vinta (+4 illegale): chi l'ha giocato pesca 4 e il turno resta allo sfidante", () => {
    const j = piu4();
    // Il giocatore 1 ha un rosso (colore in corso): il +4 è illegale.
    const p0 = gioca(partita([[j, num("rosso", 1), num("blu", 2)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, j.id, "blu", rng());
    expect(p0.sfida?.illegale).toBe(true);
    const p = sfida(p0, 3, 2, rng());
    expect(p.mani[0]).toHaveLength(2 + 4);
    expect(p.mani[1]).toHaveLength(1);
    expect(p.turno).toBe(2);
  });
  it("sfida persa (+4 legale): lo sfidante pesca 6 e salta il turno", () => {
    const j = piu4();
    const p0 = gioca(partita([[j, num("blu", 1), num("blu", 2)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, j.id, "blu", rng());
    expect(p0.sfida?.illegale).toBe(false);
    const p = sfida(p0, 3, 2, rng());
    expect(p.mani[1]).toHaveLength(1 + 6);
    expect(p.mani[0]).toHaveLength(2);
    expect(p.turno).toBe(3);
  });
  it("«sospetto» è vero se chi l'ha giocato aveva appena pescato", () => {
    const j = piu4();
    const base = partita([[num("blu", 1)], [num("verde", 2)]], { mazzo: [j] });
    const dopo = pesca(base, 1, rng());
    const p = gioca(dopo, 2, 1, j.id, "blu", rng());
    expect(p.sfida?.sospetto).toBe(true);
  });
  it("solo chi lo subisce può rispondere", () => {
    const j = piu4();
    const p0 = gioca(partita([[j, num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, j.id, "blu", rng());
    expect(codice(() => sfida(p0, 3, 3, rng()))).toBe("nonTocca");
    expect(codice(() => accetta(p0, 3, 1, rng()))).toBe("nonTocca");
    expect(codice(() => sfida(partita([[num("blu", 1)], [num("verde", 2)]]), 2, 1, rng()))).toBe("nonInSfida");
  });
  it("giocare come ultima carta un +4 chiude il round senza sfida", () => {
    const j = piu4();
    const p = gioca(partita([[j], [num("verde", 2)]]), 2, 1, j.id, "blu", rng());
    expect(p.fine?.vincitore).toBe(1);
    expect(p.sfida).toBeNull();
  });
});

describe("Ultima! e Beccato!", () => {
  const penultima = () => {
    const c = num("rosso", 4);
    return gioca(partita([[c, num("blu", 1)], [num("rosso", 2), num("verde", 3), num("verde", 5)], [num("verde", 4)]]), 3, 1, c.id, undefined, rng());
  };
  it("chi ha una carta può dichiarare «Ultima!», una volta", () => {
    const p = ultima(penultima(), 1);
    expect(p.ultime).toEqual([{ posto: 1, dichiarata: true }]);
    expect(codice(() => ultima(p, 1))).toBe("giaDichiarata");
    expect(codice(() => ultima(penultima(), 2))).toBe("nonDichiarabile");
  });
  it("chi ha dimenticato viene beccato e pesca 2", () => {
    const p = beccato(penultima(), 3, 1, rng());
    expect(p.mani[0]).toHaveLength(3);
    expect(p.ultime).toEqual([]);
  });
  it("non si becca chi ha dichiarato, né se stessi, né a finestra chiusa", () => {
    expect(codice(() => beccato(ultima(penultima(), 1), 2, 1, rng()))).toBe("nonBeccabile");
    expect(codice(() => beccato(penultima(), 1, 1, rng()))).toBe("nonBeccabile");
    const chiusa = pesca(penultima(), 2, rng());
    expect(codice(() => beccato(chiusa, 3, 1, rng()))).toBe("nonBeccabile");
  });
  it("la finestra si chiude quando il successivo gioca o passa", () => {
    const base = penultima();
    const c = base.mani[1]![0]!;
    const dopo = gioca(base, 3, 2, c.id, undefined, rng());
    expect(dopo.ultime).toEqual([]);
  });
});

describe("varianti: base spenta", () => {
  it("con le varianti spente il +2 si paga subito e il mazzo ha 108 carte", () => {
    expect(mazzoCompleto()).toHaveLength(108);
    expect(nuovoRound(3, rng()).varianti).toEqual(VARIANTI_BASE);
    const c = sim("piu2", "rosso");
    const p = gioca(partita([[c, num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, c.id, undefined, rng());
    expect(p.cumulo).toBeNull();
    expect(p.mani[1]).toHaveLength(3);
  });
});

describe("Somma dei +2", () => {
  const V = { ...VARIANTI_BASE, sommaPiu2: true };
  const conCumulo = (mani: Carta[][], opz: Partial<Partita> = {}) => partita(mani, { varianti: V, ...opz });

  it("un +2 non fa pescare subito: apre un cumulo di 2 per chi lo riceve", () => {
    const c = sim("piu2", "rosso");
    const p = gioca(conCumulo([[c, num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, c.id, undefined, rng());
    expect(p.cumulo).toEqual({ posto: 2, quante: 2, da: 1 });
    expect(p.turno).toBe(2);
    expect(p.mani[1]).toHaveLength(1);
    expect(p.eventi.some((e) => e.tipo === "cumulo" && e.posto === 2 && e.quante === 2)).toBe(true);
  });
  it("si risponde con un +2 di qualunque colore e il cumulo cresce di 2", () => {
    const a = sim("piu2", "rosso");
    const b = sim("piu2", "blu");
    const c = sim("piu2", "verde");
    let p = conCumulo([[a, num("blu", 1)], [b, num("verde", 2)], [c, num("verde", 3)]]);
    p = gioca(p, 3, 1, a.id, undefined, rng());
    p = gioca(p, 3, 2, b.id, undefined, rng());
    expect(p.cumulo).toEqual({ posto: 3, quante: 4, da: 2 });
    p = gioca(p, 3, 3, c.id, undefined, rng());
    expect(p.cumulo).toEqual({ posto: 1, quante: 6, da: 3 });
    expect(p.turno).toBe(1);
  });
  it("con un cumulo aperto le altre carte e la pesca singola sono vietate", () => {
    const a = sim("piu2", "rosso");
    const altra = num("rosso", 9);
    const p = gioca(conCumulo([[a, num("blu", 1)], [altra, sim("piu2", "blu")], [num("verde", 3)]]), 3, 1, a.id, undefined, rng());
    expect(codice(() => gioca(p, 3, 2, altra.id, undefined, rng()))).toBe("rispondiCumulo");
    expect(codice(() => pesca(p, 2, rng()))).toBe("rispondiCumulo");
    expect(codice(() => passa(p, 3, 2))).toBe("rispondiCumulo");
    expect(giocabili(p, 2).map((c) => c.tipo)).toEqual(["piu2"]);
  });
  it("pescaCumulo paga tutto, azzera il cumulo e fa saltare il turno", () => {
    const a = sim("piu2", "rosso");
    const b = sim("piu2", "blu");
    let p = conCumulo([[a, num("blu", 1)], [b, num("verde", 2)], [num("verde", 3)]]);
    p = gioca(p, 3, 1, a.id, undefined, rng());
    p = gioca(p, 3, 2, b.id, undefined, rng());
    p = pescaCumulo(p, 3, 3, rng());
    expect(p.cumulo).toBeNull();
    expect(p.mani[2]).toHaveLength(5);
    expect(p.turno).toBe(1);
    expect(p.eventi.some((e) => e.tipo === "pescaCumulo" && e.posto === 3 && e.quante === 4)).toBe(true);
  });
  it("pescaCumulo solo a chi ha il cumulo, e solo se c'è", () => {
    const a = sim("piu2", "rosso");
    const p = gioca(conCumulo([[a, num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, a.id, undefined, rng());
    expect(codice(() => pescaCumulo(p, 3, 3, rng()))).toBe("nonTocca");
    expect(codice(() => pescaCumulo(conCumulo([[num("blu", 1)], [num("verde", 2)]]), 2, 1, rng()))).toBe("nessunCumulo");
  });
  it("un +4 non risponde a un +2 e un +2 non risponde a un +4", () => {
    const a = sim("piu2", "rosso");
    const j = piu4();
    const p = gioca(conCumulo([[a, num("blu", 1)], [j, num("verde", 2)], [num("verde", 3)]]), 3, 1, a.id, undefined, rng());
    expect(codice(() => gioca(p, 3, 2, j.id, "blu", rng()))).toBe("rispondiCumulo");
    // Sopra un +4 si risponde con la sfida: un +2 non è ammesso.
    const q = piu4();
    const due = sim("piu2", "blu");
    const sotto = gioca(conCumulo([[q, num("verde", 1)], [due, num("verde", 2)], [num("verde", 3)]]), 3, 1, q.id, "blu", rng());
    expect(sotto.sfida).not.toBeNull();
    expect(codice(() => gioca(sotto, 3, 2, due.id, undefined, rng()))).toBe("rispondiSfida");
  });
  it("un +2 che svuota la mano chiude il round senza cumulo", () => {
    const a = sim("piu2", "rosso");
    const p = gioca(conCumulo([[a], [num("verde", 2)]]), 2, 1, a.id, undefined, rng());
    expect(p.fine?.vincitore).toBe(1);
    expect(p.cumulo).toBeNull();
  });
  it("la prima carta +2 dà al primo giocatore la scelta: rispondere o pescare 2", () => {
    for (let seme = 0; seme < 3000; seme++) {
      const p = nuovoRound(3, creaRng(seme), [], 1, V);
      if (p.scarto[0]!.tipo !== "piu2") continue;
      expect(p.cumulo).toEqual({ posto: 1, quante: 2, da: null });
      expect(p.turno).toBe(1);
      expect(p.mani[0]).toHaveLength(7);
      return;
    }
    throw new Error("nessun seme con +2 iniziale");
  });
  it("con 2 giocatori il cumulo torna a chi ha giocato", () => {
    const a = sim("piu2", "rosso");
    const b = sim("piu2", "blu");
    let p = conCumulo([[a, sim("piu2", "verde"), num("blu", 1)], [b, num("verde", 2)]]);
    p = gioca(p, 2, 1, a.id, undefined, rng());
    p = gioca(p, 2, 2, b.id, undefined, rng());
    expect(p.cumulo).toEqual({ posto: 1, quante: 4, da: 2 });
  });
});

describe("Ultima! con più finestre", () => {
  it("dichiarare e beccare riguardano solo il posto indicato", () => {
    const p = partita([[num("blu", 1)], [num("verde", 1)], [num("verde", 2), num("verde", 3)]], {
      turno: 3,
      ultime: [
        { posto: 1, dichiarata: false },
        { posto: 2, dichiarata: false },
      ],
    });
    const detto = ultima(p, 1);
    expect(detto.ultime).toEqual([
      { posto: 1, dichiarata: true },
      { posto: 2, dichiarata: false },
    ]);
    expect(codice(() => beccato(detto, 3, 1, rng()))).toBe("nonBeccabile");
    const becc = beccato(detto, 3, 2, rng());
    expect(becc.mani[1]).toHaveLength(3);
    expect(becc.ultime).toEqual([{ posto: 1, dichiarata: true }]);
  });
});

describe("Scambio e Rotazione", () => {
  const V = { ...VARIANTI_BASE, scambioRotazione: true };
  const scambio = (): Carta => ({ id: prossimoId++, tipo: "scambio" });
  const rotazione = (): Carta => ({ id: prossimoId++, tipo: "rotazione" });
  const conCarte = (mani: Carta[][], opz: Partial<Partita> = {}) => partita(mani, { varianti: V, ...opz });

  it("il mazzo con la variante ha 112 carte: due Scambio e due Rotazione, id 108-111", () => {
    const m = mazzoCompleto(V);
    expect(m).toHaveLength(112);
    expect(new Set(m.map((c) => c.id)).size).toBe(112);
    expect(m.filter((c) => c.tipo === "scambio").map((c) => c.id)).toEqual([108, 109]);
    expect(m.filter((c) => c.tipo === "rotazione").map((c) => c.id)).toEqual([110, 111]);
    expect(valorePunti(scambio())).toBe(50);
    expect(valorePunti(rotazione())).toBe(50);
  });
  it("non è mai la prima carta scoperta e il round conserva 112 carte", () => {
    for (let seme = 0; seme < 300; seme++) {
      const p = nuovoRound(3, creaRng(seme), [], 1, V);
      expect(["piu4", "scambio", "rotazione"]).not.toContain(p.scarto[0]!.tipo);
      expect(new Set([...p.mazzo, ...p.scarto, ...p.mani.flat()].map((c) => c.id)).size).toBe(112);
    }
  });
  it("si gioca sempre, vuole il colore e non si gioca sopra un cumulo né una sfida", () => {
    const s = scambio();
    expect(puoGiocare(s, "rosso", num("blu", 3))).toBe(true);
    const base = conCarte([[s, num("blu", 1)], [num("verde", 2)]]);
    expect(codice(() => gioca(base, 2, 1, s.id, undefined, rng(), false, { scambiaCon: 2 }))).toBe("coloreMancante");
    const cum = conCarte([[s, num("blu", 1)], [num("verde", 2)]], { varianti: { ...V, sommaPiu2: true }, cumulo: { posto: 1, quante: 2, da: 2 } });
    expect(codice(() => gioca(cum, 2, 1, s.id, "blu", rng(), false, { scambiaCon: 2 }))).toBe("rispondiCumulo");
    const sf = conCarte([[s, num("blu", 1)], [num("verde", 2)]], { sfida: { contro: 2, sospetto: false, illegale: false } });
    expect(codice(() => gioca(sf, 2, 1, s.id, "blu", rng(), false, { scambiaCon: 2 }))).toBe("rispondiSfida");
  });
  it("Scambio: le due mani si scambiano esatte, il colore è scelto e il turno passa", () => {
    const s = scambio();
    const mia = [s, num("blu", 1), num("blu", 2), num("blu", 3)];
    const sua = [num("verde", 9)];
    const terza = [num("giallo", 4), num("giallo", 5)];
    const p = gioca(conCarte([mia, terza, sua]), 3, 1, s.id, "verde", rng(), false, { scambiaCon: 3 });
    expect(p.mani[0]!.map((c) => c.id)).toEqual(sua.map((c) => c.id));
    expect(p.mani[2]!.map((c) => c.id)).toEqual(mia.slice(1).map((c) => c.id));
    expect(p.mani[1]).toEqual(terza);
    expect(p.colore).toBe("verde");
    expect(p.turno).toBe(2);
    expect(p.eventi.some((e) => e.tipo === "scambio" && e.posto === 1 && e.con === 3)).toBe(true);
    // Chi ha ricevuto una mano di una carta ha la finestra di «Ultima!».
    expect(p.ultime).toEqual([{ posto: 1, dichiarata: false }]);
  });
  it("Scambio con sé stesso, con un posto inesistente o senza bersaglio è rifiutato", () => {
    const s = scambio();
    const base = conCarte([[s, num("blu", 1)], [num("verde", 2)]]);
    for (const con of [1, 0, 3, "2", undefined, 1.5]) {
      expect(codice(() => gioca(base, 2, 1, s.id, "blu", rng(), false, { scambiaCon: con }))).toBe("scambioNonValido");
    }
  });
  it("come ultima carta Scambio e Rotazione chiudono il round senza effetto", () => {
    for (const c of [scambio(), rotazione()]) {
      const altra = [num("verde", 2), num("verde", 3)];
      const p = gioca(conCarte([[c], altra]), 2, 1, c.id, "blu", rng(), false, { scambiaCon: 2 });
      expect(p.fine?.vincitore).toBe(1);
      expect(p.mani[1]).toEqual(altra);
      expect(p.eventi.some((e) => e.tipo === "scambio" || e.tipo === "rotazione")).toBe(false);
    }
  });
  it("Rotazione: ogni mano va al posto successivo nel verso, senza perdere carte", () => {
    const r = rotazione();
    const m1 = [r, num("blu", 1), num("blu", 2)];
    const m2 = [num("verde", 1)];
    const m3 = [num("giallo", 1), num("giallo", 2), num("giallo", 3)];
    const p = gioca(conCarte([m1, m2, m3]), 3, 1, r.id, "giallo", rng());
    // In verso orario la mano del posto 1 va al 2, quella del 2 al 3, quella del 3 all'1.
    expect(p.mani[1]!.map((c) => c.id)).toEqual(m1.slice(1).map((c) => c.id));
    expect(p.mani[2]).toEqual(m2);
    expect(p.mani[0]).toEqual(m3);
    expect(p.turno).toBe(2);
    expect(p.eventi.at(-1)).toEqual({ tipo: "rotazione" });
    expect(p.ultime).toEqual([{ posto: 3, dichiarata: false }]);
  });
  it("Rotazione in verso antiorario: le mani vanno al posto precedente", () => {
    const r = rotazione();
    const m1 = [r, num("blu", 1)];
    const m2 = [num("verde", 1), num("verde", 2)];
    const m3 = [num("giallo", 1), num("giallo", 2), num("giallo", 3)];
    const p = gioca(conCarte([m1, m2, m3], { verso: -1 }), 3, 1, r.id, "giallo", rng());
    expect(p.mani[2]!.map((c) => c.id)).toEqual(m1.slice(1).map((c) => c.id));
    expect(p.mani[0]).toEqual(m2);
    expect(p.mani[1]).toEqual(m3);
    expect(p.turno).toBe(3);
  });
  it("dopo una Rotazione più giocatori possono avere la finestra di «Ultima!»", () => {
    const r = rotazione();
    const p = gioca(conCarte([[r, num("blu", 1)], [num("verde", 1)], [num("giallo", 1), num("giallo", 2)]]), 3, 1, r.id, "giallo", rng());
    // 1 → 2 riceve [blu 1]; 2 → 3 riceve [verde 1]; 3 → 1 riceve due carte.
    expect(p.ultime).toEqual([
      { posto: 2, dichiarata: false },
      { posto: 3, dichiarata: false },
    ]);
    const detto = ultima(p, 3);
    const becc = beccato(detto, 1, 2, rng());
    expect(becc.mani[1]).toHaveLength(3);
    expect(codice(() => beccato(becc, 1, 3, rng()))).toBe("nonBeccabile");
    // Il giocatore successivo che agisce chiude tutte le finestre.
    expect(pesca(p, 2, rng()).ultime).toEqual([]);
  });
  it("chi la cala dichiarando subito (il bot) non resta beccabile", () => {
    const r = rotazione();
    // Il posto 3 ha una carta: dopo la rotazione l'1 la riceve e, se dichiara subito, è dichiarata.
    const p = gioca(conCarte([[r, num("blu", 1), num("blu", 2)], [num("verde", 1), num("verde", 2)], [num("giallo", 1)]]), 3, 1, r.id, "giallo", rng(), true);
    expect(p.ultime).toEqual([{ posto: 1, dichiarata: true }]);
  });
});

describe("Più carte uguali", () => {
  const V = { ...VARIANTI_BASE, piuUguali: true };
  const conV = (mani: Carta[][], opz: Partial<Partita> = {}) => partita(mani, { varianti: V, ...opz });
  const gioc = (p: Partita, n: number, chi: number, cima: Carta, insieme: Carta[], colore?: Colore) =>
    gioca(p, n, chi, cima.id, colore, rng(), false, { insieme: insieme.map((c) => c.id) });

  it("numeri uguali di colori diversi: la cima decide il colore, le altre vanno sotto", () => {
    const r5 = num("rosso", 5);
    const v5 = num("verde", 5);
    const b5 = num("blu", 5);
    const p = gioc(conV([[r5, v5, b5, num("giallo", 1)], [num("verde", 2)]]), 2, 1, v5, [r5, b5]);
    expect(p.mani[0]).toHaveLength(1);
    expect(p.scarto.slice(-3).map((c) => c.id)).toEqual([r5.id, b5.id, v5.id]);
    expect(p.colore).toBe("verde");
    expect(p.eventi.find((e) => e.tipo === "gioca")).toMatchObject({ quante: 3, carta: { id: v5.id } });
    expect(p.ultime).toEqual([{ posto: 1, dichiarata: false }]);
  });
  it("la cima deve essere giocabile; le altre possono non esserlo", () => {
    const b7 = num("blu", 7);
    const g7 = num("giallo", 7);
    const base = conV([[b7, g7, num("rosso", 1)], [num("verde", 2)]]);
    expect(codice(() => gioc(base, 2, 1, b7, [g7]))).toBe("nonGiocabile");
    const r7 = num("rosso", 7);
    expect(gioc(conV([[b7, r7, num("rosso", 1)], [num("verde", 2)]]), 2, 1, r7, [b7]).colore).toBe("rosso");
  });
  it("gruppi misti, di Inverti o di jolly, doppioni e carte non in mano sono rifiutati", () => {
    const r5 = num("rosso", 5);
    const r6 = num("rosso", 6);
    const i1 = sim("inverti", "rosso");
    const i2 = sim("inverti", "blu");
    const j1 = jolly();
    const j2 = jolly();
    const base = conV([[r5, r6, i1, i2, j1, j2, num("giallo", 1)], [num("verde", 2)]]);
    expect(codice(() => gioc(base, 2, 1, r5, [r6]))).toBe("gruppoNonValido");
    expect(codice(() => gioc(base, 2, 1, i1, [i2]))).toBe("gruppoNonValido");
    expect(codice(() => gioc(base, 2, 1, j1, [j2], "blu"))).toBe("gruppoNonValido");
    expect(codice(() => gioca(base, 2, 1, r5.id, undefined, rng(), false, { insieme: [r5.id] }))).toBe("gruppoNonValido");
    expect(codice(() => gioca(base, 2, 1, r5.id, undefined, rng(), false, { insieme: [424242] }))).toBe("gruppoNonValido");
    expect(codice(() => gioca(base, 2, 1, r5.id, undefined, rng(), false, { insieme: "x" }))).toBe("gruppoNonValido");
  });
  it("con la variante spenta un gruppo è rifiutato; una lista vuota vale come carta singola", () => {
    const r5 = num("rosso", 5);
    const b5 = num("blu", 5);
    const spenta = partita([[r5, b5, num("giallo", 1)], [num("verde", 2)]]);
    expect(codice(() => gioc(spenta, 2, 1, r5, [b5]))).toBe("variantaSpenta");
    expect(gioca(spenta, 2, 1, r5.id, undefined, rng(), false, { insieme: [] }).mani[0]).toHaveLength(2);
  });
  it("Salta in gruppo salta un giocatore per carta", () => {
    const s1 = sim("salta", "rosso");
    const s2 = sim("salta", "blu");
    const p = gioc(conV([[s1, s2, num("giallo", 1)], [num("verde", 2)], [num("verde", 3)], [num("verde", 4)]]), 4, 1, s1, [s2]);
    expect(p.turno).toBe(4);
    expect(p.eventi.filter((e) => e.tipo === "salta").map((e) => (e as { posto: number }).posto)).toEqual([2, 3]);
  });
  it("in due giocatori più Salta tornano comunque a chi li cala", () => {
    const s1 = sim("salta", "rosso");
    const s2 = sim("salta", "blu");
    const s3 = sim("salta", "verde");
    const p = gioc(conV([[s1, s2, s3, num("giallo", 1)], [num("verde", 2)]]), 2, 1, s1, [s2, s3]);
    expect(p.turno).toBe(1);
  });
  it("+2 in gruppo: senza somma fa pescare 2 per carta; con la somma il cumulo cresce di 2 per carta", () => {
    const a = sim("piu2", "rosso");
    const b = sim("piu2", "blu");
    const p = gioc(conV([[a, b, num("giallo", 1)], [num("verde", 2)], [num("verde", 3)]]), 3, 1, a, [b]);
    expect(p.mani[1]).toHaveLength(5);
    expect(p.turno).toBe(3);
    const c = sim("piu2", "rosso");
    const d = sim("piu2", "blu");
    const conSomma = gioca(conV([[c, d, num("giallo", 1)], [num("verde", 2)], [num("verde", 3)]], { varianti: { ...V, sommaPiu2: true } }), 3, 1, c.id, undefined, rng(), false, { insieme: [d.id] });
    expect(conSomma.cumulo).toEqual({ posto: 2, quante: 4, da: 1 });
  });
  it("un gruppo che svuota la mano chiude il round", () => {
    const r5 = num("rosso", 5);
    const b5 = num("blu", 5);
    const p = gioc(conV([[r5, b5], [num("verde", 2)]]), 2, 1, r5, [b5]);
    expect(p.fine).toEqual({ vincitore: 1, punti: 2 });
  });
  it("dopo una pesca non si calano gruppi", () => {
    const r5 = num("rosso", 5);
    const b5 = num("blu", 5);
    const p = conV([[r5, b5, num("giallo", 1)], [num("verde", 2)]], { haPescato: true, pescata: r5.id });
    expect(codice(() => gioc(p, 2, 1, r5, [b5]))).toBe("soloLaPescata");
    expect(gruppiPossibili(p, 1)).toEqual([]);
  });
  it("gruppiPossibili: almeno due carte dello stesso valore, con almeno una giocabile in cima", () => {
    const r5 = num("rosso", 5);
    const b5 = num("blu", 5);
    const b9 = num("blu", 9);
    const g9 = num("giallo", 9);
    const p = conV([[r5, b5, b9, g9, sim("inverti", "rosso"), sim("inverti", "blu")], [num("verde", 2)]]);
    expect(gruppiPossibili(p, 1).map((g) => g.map((c) => c.id))).toEqual([[r5.id, b5.id]]);
    expect(gruppiPossibili(partita(p.mani), 1)).toEqual([]);
  });
});

describe("Taglio", () => {
  const V = { ...VARIANTI_BASE, taglio: true };
  const conV = (mani: Carta[][], opz: Partial<Partita> = {}) => partita(mani, { varianti: V, ...opz });
  const ORA = 10_000;
  /** Il posto 1 cala un 5 rosso alle ORA: la finestra di taglio si apre. */
  const aperta = (mani: Carta[][], opz: Partial<Partita> = {}) => {
    const r5 = num("rosso", 5);
    const p = gioca(conV([[r5, ...mani[0]!], ...mani.slice(1)], opz), mani.length, 1, r5.id, undefined, rng(), false, { ora: ORA });
    return { p, r5 };
  };

  it("una giocata apre la finestra di 3 s; con la variante spenta o senza ora no", () => {
    const { p, r5 } = aperta([[num("blu", 1)], [num("verde", 2)], [num("verde", 3)]]);
    expect(p.apertaTaglio).toEqual({ posto: 1, carta: r5, fino: ORA + TAGLIO_MS });
    const r = num("rosso", 5);
    expect(gioca(partita([[r, num("blu", 1)], [num("verde", 2)]]), 2, 1, r.id, undefined, rng(), false, { ora: ORA }).apertaTaglio).toBeNull();
    const r2 = num("rosso", 5);
    expect(gioca(conV([[r2, num("blu", 1)], [num("verde", 2)]]), 2, 1, r2.id, undefined, rng()).apertaTaglio).toBeNull();
  });
  it("chi ha la carta identica taglia: il turno passa a lui e poi prosegue dal suo posto", () => {
    const mia = num("rosso", 5);
    const { p } = aperta([[num("blu", 1)], [num("verde", 2)], [mia, num("verde", 3), num("verde", 4)], [num("verde", 6)]]);
    expect(p.turno).toBe(2);
    expect(carteTagliabili(p, 3)).toEqual([mia]);
    expect(carteTagliabili(p, 2)).toEqual([]); // di turno
    const t = taglia(p, 4, 3, mia.id, ORA + 1000, rng());
    expect(t.mani[2]).toHaveLength(2);
    expect(t.turno).toBe(4);
    expect(t.apertaTaglio).toBeNull();
    expect(t.eventi.some((e) => e.tipo === "taglio" && e.posto === 3)).toBe(true);
    // Il giocatore che era di turno resta con la sua mano.
    expect(t.mani[1]).toEqual(p.mani[1]);
  });
  it("la carta deve essere identica: stesso colore e stesso valore o simbolo", () => {
    const b5 = num("blu", 5);
    const r6 = num("rosso", 6);
    const { p } = aperta([[num("blu", 1)], [num("verde", 2)], [b5, r6, num("verde", 3)]]);
    expect(codice(() => taglia(p, 3, 3, b5.id, ORA, rng()))).toBe("nonTagliabile");
    expect(codice(() => taglia(p, 3, 3, r6.id, ORA, rng()))).toBe("nonTagliabile");
    expect(identica(sim("salta", "rosso"), sim("salta", "rosso"))).toBe(true);
    expect(identica(sim("salta", "rosso"), sim("salta", "blu"))).toBe(false);
    expect(identica(jolly(), jolly())).toBe(false);
  });
  it("dopo la scadenza (più la tolleranza) è tardi; il secondo taglio è tardi", () => {
    const a = num("rosso", 5);
    const b = num("rosso", 5);
    const { p } = aperta([[num("blu", 1)], [num("verde", 2)], [a, num("verde", 3)], [b, num("verde", 4)]]);
    expect(codice(() => taglia(p, 4, 3, a.id, ORA + TAGLIO_MS + TAGLIO_TOLLERANZA_MS + 1, rng()))).toBe("tagliTardi");
    expect(codice(() => taglia(p, 4, 3, a.id, ORA + TAGLIO_MS + TAGLIO_TOLLERANZA_MS, rng()))).toBeNull();
    const primo = taglia(p, 4, 3, a.id, ORA + 500, rng());
    expect(codice(() => taglia(primo, 4, 4, b.id, ORA + 600, rng()))).toBe("tagliTardi");
  });
  it("chi ha calato e chi è di turno non tagliano; non si taglia con la variante spenta", () => {
    const a = num("rosso", 5);
    const b = num("rosso", 5);
    const { p } = aperta([[a, num("blu", 1)], [b, num("verde", 2)], [num("verde", 3)]]);
    expect(codice(() => taglia(p, 3, 1, a.id, ORA, rng()))).toBe("nonTagliabile");
    expect(codice(() => taglia(p, 3, 2, b.id, ORA, rng()))).toBe("nonTagliabile");
    expect(codice(() => taglia({ ...p, varianti: VARIANTI_BASE }, 3, 3, a.id, ORA, rng()))).toBe("variantaSpenta");
  });
  it("una qualsiasi azione del turno chiude la finestra", () => {
    const { p } = aperta([[num("blu", 1)], [num("rosso", 2), num("verde", 2)], [num("verde", 3)]]);
    expect(pesca(p, 2, rng()).apertaTaglio).toBeNull();
    const rossa = p.mani[1]![0]!;
    expect(gioca(p, 3, 2, rossa.id, undefined, rng()).apertaTaglio?.posto).toBeUndefined();
  });
  it("il taglio ha l'effetto della carta: Salta salta il successivo del tagliatore", () => {
    const s1 = sim("salta", "rosso");
    const s2 = sim("salta", "rosso");
    const p = gioca(conV([[s1, num("blu", 1)], [num("verde", 2)], [s2, num("verde", 3)], [num("verde", 4)]]), 4, 1, s1.id, undefined, rng(), false, { ora: ORA });
    expect(p.turno).toBe(3);
    // Il 3 è di turno: non può tagliare. Con 5 giocatori taglia il 4.
    const s3 = sim("salta", "rosso");
    const q = gioca(conV([[s3, num("blu", 1)], [num("verde", 2)], [num("verde", 3)], [s2, num("verde", 4)], [num("verde", 5)]]), 5, 1, s3.id, undefined, rng(), false, { ora: ORA });
    const t = taglia(q, 5, 4, s2.id, ORA, rng());
    expect(t.turno).toBe(1);
  });
  it("non si taglia sopra un cumulo, un +4 o un jolly", () => {
    const due = sim("piu2", "rosso");
    const p = gioca(conV([[due, num("blu", 1)], [num("verde", 2)], [sim("piu2", "rosso"), num("verde", 3)]], { varianti: { ...V, sommaPiu2: true } }), 3, 1, due.id, undefined, rng(), false, { ora: ORA });
    expect(p.apertaTaglio).toBeNull();
    const j = jolly();
    expect(gioca(conV([[j, num("blu", 1)], [jolly(), num("verde", 2)], [num("verde", 3)]]), 3, 1, j.id, "blu", rng(), false, { ora: ORA }).apertaTaglio).toBeNull();
  });
  it("un taglio che svuota la mano vince il round", () => {
    const mia = num("rosso", 5);
    const { p } = aperta([[num("blu", 1)], [num("verde", 2)], [mia]]);
    const t = taglia(p, 3, 3, mia.id, ORA, rng());
    expect(t.fine?.vincitore).toBe(3);
  });
  it("un taglio altrui non chiude la finestra «Ultima!» di chi ha una carta sola", () => {
    const mia = num("rosso", 5);
    // Il posto 1 cala la penultima carta senza dire «Ultima!».
    const { p } = aperta([[num("blu", 1)], [num("verde", 2), num("verde", 7)], [mia, num("verde", 3)]]);
    expect(p.ultime).toEqual([{ posto: 1, dichiarata: false }]);
    const t = taglia(p, 3, 3, mia.id, ORA, rng());
    // Anche il tagliatore resta con una carta: entrambe le finestre aperte.
    expect(t.ultime).toEqual([
      { posto: 1, dichiarata: false },
      { posto: 3, dichiarata: false },
    ]);
    expect(beccato(t, 2, 1, rng()).mani[0]).toHaveLength(3);
  });
});
