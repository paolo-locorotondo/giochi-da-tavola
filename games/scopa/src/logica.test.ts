import { mazzoItaliano, type Carta } from "@gdt/carte";
import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import { ErroreScopa, distribuzioni, gioca, mazzoCompleto, nuovoRound, presePossibili, tutteLeCarte, type Partita } from "./logica";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreScopa ? e.codice : "altro";
  }
  return null;
};
const M = mazzoItaliano();
const k = (seme: string, valore: number): Carta => M.find((c) => c.seme === seme && c.valore === valore)!;

/** Round costruito a mano: tavolo, mani e mazzo dati (il resto vuoto). */
function costruito(tavolo: Carta[], mani: Carta[][], mazzo: Carta[] = []): Partita {
  const base = nuovoRound(mani.length, creaRng(1));
  return { ...base, tavolo, mani, mazzo, uscite: [...tavolo], prese: mani.map(() => []), scope: mani.map(() => 0), turno: 1, eventi: [] };
}

/** Gioca per tutti la prima carta, con la prima presa possibile, fino alla fine del round. */
function finoInFondo(p0: Partita, scegli = (p: Partita) => p.mani[p.turno - 1]![0]!): Partita {
  let p = p0;
  for (let i = 0; i < 100 && !p.fine; i++) {
    const c = scegli(p);
    const prese = presePossibili(p, c);
    p = gioca(p, p.turno, c.id, prese.length > 1 ? prese[0]!.map((x) => x.id) : undefined);
    expect(tutteLeCarte(p)).toHaveLength(40);
  }
  return p;
}

describe("mazzo e distribuzione", () => {
  it("40 carte, id 0..39, 4 semi × 10 valori", () => {
    const m = mazzoCompleto();
    expect(m.map((c) => c.id)).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(new Set(m.map((c) => `${c.seme}${c.valore}`)).size).toBe(40);
  });
  it("4 carte sul tavolo e 3 a testa; 6 distribuzioni a 2, 3 a 4", () => {
    for (const n of [2, 4]) {
      const p = nuovoRound(n, creaRng(9));
      expect(p.tavolo).toHaveLength(4);
      p.mani.forEach((m) => expect(m).toHaveLength(3));
      expect(p.mazzo).toHaveLength(36 - 3 * n);
      expect(tutteLeCarte(p)).toHaveLength(40);
    }
    expect(distribuzioni(2)).toBe(6);
    expect(distribuzioni(4)).toBe(3);
  });
  it("3 giocatori non ancora (e 5 mai)", () => {
    expect(codice(() => nuovoRound(3, creaRng(1)))).toBe("numeroGiocatori");
    expect(codice(() => nuovoRound(5, creaRng(1)))).toBe("numeroGiocatori");
  });
  it("stesso seme, stessa distribuzione", () => {
    expect(nuovoRound(2, creaRng(42))).toEqual(nuovoRound(2, creaRng(42)));
  });
  it("le mani si ridistribuiscono finché il mazzo finisce, poi il round chiude", () => {
    for (const n of [2, 4]) {
      let p = nuovoRound(n, creaRng(3));
      let distrib = 1;
      for (let i = 0; i < 100 && !p.fine; i++) {
        const prima = p.mano;
        const c = p.mani[p.turno - 1]![0]!;
        const prese = presePossibili(p, c);
        p = gioca(p, p.turno, c.id, prese.length > 1 ? prese[0]!.map((x) => x.id) : undefined);
        if (p.mano !== prima) distrib++;
      }
      expect(p.fine).not.toBeNull();
      expect(distrib).toBe(distribuzioni(n));
      expect(p.mazzo).toHaveLength(0);
      expect(p.tavolo).toHaveLength(0);
      expect(p.prese.flat()).toHaveLength(40);
    }
  });
});

describe("presa", () => {
  it("presa singola obbligatoria: il 5 prende il 5 anche se c'è 2+3", () => {
    const p = costruito([k("coppe", 5), k("spade", 2), k("bastoni", 3)], [[k("denari", 5), k("denari", 9)], [k("coppe", 9)]]);
    const d = gioca(p, 1, k("denari", 5).id);
    expect(d.tavolo.map((c) => c.id).sort()).toEqual([k("spade", 2).id, k("bastoni", 3).id].sort());
    expect(d.prese[0]!.map((c) => c.id)).toEqual([k("denari", 5).id, k("coppe", 5).id]);
  });

  it("più combinazioni: senza scelta → sceltaPresaMancante; scelta valida → applicata; altra → presaNonValida", () => {
    const tavolo = [k("coppe", 1), k("coppe", 2), k("coppe", 3), k("coppe", 4), k("spade", 5)];
    const p = costruito(tavolo, [[k("denari", 7), k("denari", 9)], [k("bastoni", 9)]]);
    expect(codice(() => gioca(p, 1, k("denari", 7).id))).toBe("sceltaPresaMancante");
    expect(codice(() => gioca(p, 1, k("denari", 7).id, [k("coppe", 1).id, k("coppe", 2).id]))).toBe("presaNonValida");
    const d = gioca(p, 1, k("denari", 7).id, [k("coppe", 4).id, k("coppe", 3).id]);
    expect(d.tavolo.map((c) => c.valore).sort()).toEqual([1, 2, 5]);
    expect(d.eventi.at(-1)).toEqual({ tipo: "gioca", posto: 1, carta: k("denari", 7), prese: 2 });
  });

  it("una sola presa: si applica da sé (e una presa sbagliata è rifiutata)", () => {
    const p = costruito([k("coppe", 2), k("coppe", 4), k("spade", 9)], [[k("denari", 6), k("denari", 9)], [k("bastoni", 9)]]);
    expect(codice(() => gioca(p, 1, k("denari", 6).id, [k("spade", 9).id]))).toBe("presaNonValida");
    const d = gioca(p, 1, k("denari", 6).id);
    expect(d.tavolo).toEqual([k("spade", 9)]);
  });

  it("nessuna presa: la carta resta sul tavolo (e una presa indicata è rifiutata)", () => {
    const p = costruito([k("coppe", 8)], [[k("denari", 3), k("denari", 9)], [k("bastoni", 9)]]);
    expect(codice(() => gioca(p, 1, k("denari", 3).id, [k("coppe", 8).id]))).toBe("presaNonValida");
    const d = gioca(p, 1, k("denari", 3).id);
    expect(d.tavolo.map((c) => c.id)).toEqual([k("coppe", 8).id, k("denari", 3).id]);
    expect(d.prese[0]).toEqual([]);
    expect(d.ultimaPresa).toBeNull();
  });

  it("turno e mano: fuori turno → nonTocca; carta non in mano → cartaNonInMano", () => {
    const p = costruito([k("coppe", 8)], [[k("denari", 3), k("denari", 9)], [k("bastoni", 9)]]);
    expect(codice(() => gioca(p, 2, k("bastoni", 9).id))).toBe("nonTocca");
    expect(codice(() => gioca(p, 1, k("bastoni", 9).id))).toBe("cartaNonInMano");
    expect(codice(() => gioca(p, 7, k("bastoni", 9).id))).toBe("nonPartecipa");
    const d = gioca(p, 1, k("denari", 3).id);
    expect(d.turno).toBe(2);
  });
});

describe("scopa", () => {
  it("svuotare il tavolo vale una scopa", () => {
    const p = costruito([k("coppe", 3), k("spade", 4)], [[k("denari", 7), k("denari", 9)], [k("bastoni", 9)]]);
    const d = gioca(p, 1, k("denari", 7).id);
    expect(d.scope).toEqual([1, 0]);
    expect(d.eventi.at(-1)).toEqual({ tipo: "scopa", posto: 1 });
  });

  it("niente scopa se la carta resta sul tavolo vuoto", () => {
    const p = costruito([], [[k("denari", 7), k("denari", 9)], [k("bastoni", 9)]]);
    const d = gioca(p, 1, k("denari", 7).id);
    expect(d.scope).toEqual([0, 0]);
    expect(d.tavolo).toEqual([k("denari", 7)]);
  });

  it("la scopa all'ultima giocata del round non vale; le carte rimaste vanno all'ultima presa", () => {
    // Ultima giocata: il posto 2 prende tutto il tavolo con l'ultima carta.
    const p = { ...costruito([k("coppe", 3), k("spade", 4)], [[], [k("bastoni", 7)]]), turno: 2 };
    const d = gioca(p, 2, k("bastoni", 7).id);
    expect(d.scope).toEqual([0, 0]);
    expect(d.fine).not.toBeNull();
    expect(d.fine!.ultimaPresa).toBe(2);
  });

  it("a fine round chi ha preso per ultimo porta via il tavolo (senza scopa)", () => {
    const p = costruito([k("coppe", 3), k("spade", 8)], [[k("denari", 3)], [k("bastoni", 1)]]);
    let d = gioca(p, 1, k("denari", 3).id); // prende il 3
    expect(d.ultimaPresa).toBe(1);
    d = gioca(d, 2, k("bastoni", 1).id); // l'asso resta: fine round
    expect(d.fine!.ultimaPresa).toBe(1);
    expect(d.prese[0]!.map((c) => c.id).sort((a, b) => a - b)).toEqual([k("denari", 3), k("coppe", 3), k("spade", 8), k("bastoni", 1)].map((c) => c.id).sort((a, b) => a - b));
    expect(d.scope).toEqual([0, 0]);
    expect(d.eventi.slice(-2)).toEqual([{ tipo: "ultimaPresa", posto: 1, carte: 2 }, { tipo: "fineRound" }]);
  });
});

describe("partite intere", () => {
  it("con molti semi, a 2 e a 4: 40 carte sempre, punti coerenti", () => {
    for (const n of [2, 4]) {
      for (let s = 0; s < 30; s++) {
        const p = finoInFondo(nuovoRound(n, creaRng(s), [], (s % n) + 1));
        const f = p.fine!;
        expect(f).not.toBeNull();
        const scope = p.scope.reduce((a, b) => a + b, 0);
        expect(f.punti.totale[0] + f.punti.totale[1]).toBeLessThanOrEqual(4 + scope);
        expect(f.punti.conteggi[0].carte + f.punti.conteggi[1].carte).toBe(40);
      }
    }
  });
  it("apre chi è indicato come primo, e il turno gira in senso orario", () => {
    const p = nuovoRound(4, creaRng(1), [], 3);
    expect(p.turno).toBe(3);
    const c = p.mani[2]![0]!;
    const prese = presePossibili(p, c);
    const d = gioca(p, 3, c.id, prese.length > 1 ? prese[0]!.map((x) => x.id) : undefined);
    expect(d.turno).toBe(4);
  });
  it("il round finito non accetta altre giocate", () => {
    const p = finoInFondo(nuovoRound(2, creaRng(5)));
    expect(codice(() => gioca(p, p.turno, 0))).toBe("roundFinito");
  });
  it("il round ricevuto non cambia", () => {
    const p = nuovoRound(2, creaRng(8));
    const copia = JSON.parse(JSON.stringify(p));
    const c = p.mani[0]![0]!;
    const prese = presePossibili(p, c);
    gioca(p, 1, c.id, prese.length > 1 ? prese[0]!.map((x) => x.id) : undefined);
    expect(p).toEqual(copia);
  });
});
