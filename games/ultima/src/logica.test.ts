import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import {
  ErroreUltima,
  accetta,
  avanza,
  beccato,
  gioca,
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
    ultima: null,
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
    expect(p.ultima).toBeNull();
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
    expect(p.ultima).toEqual({ posto: 1, dichiarata: false });
  });
  it("il bot dichiara «Ultima!» subito", () => {
    const c = num("rosso", 4);
    const p = gioca(partita([[c, num("blu", 1)], [num("verde", 2)]]), 2, 1, c.id, undefined, rng(), true);
    expect(p.ultima).toEqual({ posto: 1, dichiarata: true });
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
    const p = partita([[num("blu", 9)], [num("verde", 2)]], { turno: 2, ultima: { posto: 1, dichiarata: false } });
    expect(pesca(p, 2, rng()).ultima).toBeNull();
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
    expect(p.ultima).toEqual({ posto: 1, dichiarata: true });
    expect(codice(() => ultima(p, 1))).toBe("giaDichiarata");
    expect(codice(() => ultima(penultima(), 2))).toBe("nonDichiarabile");
  });
  it("chi ha dimenticato viene beccato e pesca 2", () => {
    const p = beccato(penultima(), 3, 1, rng());
    expect(p.mani[0]).toHaveLength(3);
    expect(p.ultima).toBeNull();
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
    expect(dopo.ultima).toBeNull();
  });
});
