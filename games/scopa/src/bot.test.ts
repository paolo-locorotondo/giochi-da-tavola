import { mazzoItaliano, type Carta } from "@gdt/carte";
import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import { LIVELLI, eseguiMossa, mossaBot, mossaBotLivello, type Livello } from "./bot";
import { ErroreScopa, nuovoRound, tutteLeCarte, type Partita } from "./logica";

const M = mazzoItaliano();
const k = (seme: string, valore: number): Carta => M.find((c) => c.seme === seme && c.valore === valore)!;
function costruito(tavolo: Carta[], mani: Carta[][], uscite: Carta[] = []): Partita {
  const base = nuovoRound(mani.length, creaRng(1));
  return { ...base, tavolo, mani, mazzo: [], uscite: [...tavolo, ...uscite], prese: mani.map(() => []), scope: mani.map(() => 0), turno: 1, eventi: [] };
}

/** Partita intera giocata dai bot; ogni mossa passa dalla logica, che rifiuta le illegali. */
function intera(n: number, livelli: Livello[], seme: number): Partita {
  const rng = creaRng(seme * 7 + 1);
  let p = nuovoRound(n, creaRng(seme), [], (seme % n) + 1);
  for (let i = 0; i < 100 && !p.fine; i++) {
    const m = mossaBotLivello(p, p.turno, livelli[(p.turno - 1) % livelli.length]!, rng);
    p = eseguiMossa(p, p.turno, m);
    expect(tutteLeCarte(p)).toHaveLength(40);
  }
  return p;
}

describe("priorità del bot", () => {
  it("fa scopa se può", () => {
    const p = costruito([k("coppe", 3), k("spade", 4)], [[k("bastoni", 7), k("bastoni", 1), k("bastoni", 2)], [k("denari", 9), k("coppe", 9), k("spade", 9)]]);
    expect(mossaBot(p, 1).carta).toBe(k("bastoni", 7).id);
  });
  it("prende il settebello piuttosto che una presa banale", () => {
    const p = costruito([k("denari", 7), k("coppe", 2)], [[k("bastoni", 7), k("bastoni", 3), k("spade", 10)], [k("denari", 9), k("coppe", 9), k("spade", 8)]]);
    const m = mossaBot(p, 1);
    expect(m.carta).toBe(k("bastoni", 7).id);
  });
  it("non lascia il settebello sul tavolo quando può evitarlo", () => {
    const p = costruito([k("coppe", 9)], [[k("denari", 7), k("bastoni", 10), k("spade", 10)], [k("denari", 8), k("coppe", 8), k("spade", 8)]]);
    expect(mossaBot(p, 1).carta).not.toBe(k("denari", 7).id);
  });
  it("memoria: non lascia una somma che l'unico valore ancora ignoto può completare", () => {
    // Sul tavolo resterebbe un 5 (se gioca il 2) oppure un 2 (se gioca il 5). Tutti i 5 sono già usciti: lasciare un 5 è sicuro.
    const usciti = M.filter((c) => c.valore === 5 && c.id !== k("spade", 5).id);
    const p = costruito([k("coppe", 9)], [[k("spade", 5), k("bastoni", 2), k("spade", 10)], [k("denari", 8), k("coppe", 8), k("spade", 8)]], usciti);
    const m = mossaBot(p, 1);
    expect([k("spade", 5).id, k("bastoni", 2).id, k("spade", 10).id]).toContain(m.carta);
  });
  it("sceglie una presa tra più combinazioni e passa alla logica", () => {
    const tavolo = [k("coppe", 1), k("coppe", 2), k("coppe", 3), k("coppe", 4), k("spade", 5)];
    const p = costruito(tavolo, [[k("denari", 7), k("denari", 9)], [k("bastoni", 9)]]);
    const m = mossaBot(p, 1);
    expect(m.carta).toBe(k("denari", 7).id);
    expect(m.presa).toBeDefined();
    expect(() => eseguiMossa(p, 1, m)).not.toThrow();
  });
  it("fuori turno o a round finito: errore", () => {
    const p = nuovoRound(2, creaRng(1));
    expect(() => mossaBot(p, 2)).toThrow(ErroreScopa);
  });
});

describe("livelli", () => {
  it("ogni mossa è lecita per tutti i livelli, a 2 e a 4, con molti semi", () => {
    for (const n of [2, 4]) for (const l of LIVELLI) for (let s = 0; s < 12; s++) expect(intera(n, [l], s).fine).not.toBeNull();
  });
  it("stesso seme, stesse mosse", () => {
    const a = intera(2, ["medio"], 4);
    const b = intera(2, ["medio"], 4);
    expect(a).toEqual(b);
  });
  it("difficile batte il facile, e il medio batte il facile (soglia larga)", () => {
    const sfida = (forte: Livello, debole: Livello) => {
      let vinte = 0;
      let totale = 0;
      for (let s = 0; s < 120; s++) {
        // Si alternano i posti per togliere il vantaggio di chi apre.
        const forteAl1 = s % 2 === 0;
        const p = intera(2, forteAl1 ? [forte, debole] : [debole, forte], s);
        const [a, b] = p.fine!.punti.totale;
        const mio = forteAl1 ? a : b;
        const altro = forteAl1 ? b : a;
        totale++;
        if (mio > altro) vinte++;
        else if (mio === altro) vinte += 0.5;
      }
      return vinte / totale;
    };
    expect(sfida("difficile", "facile")).toBeGreaterThan(0.6);
    expect(sfida("medio", "facile")).toBeGreaterThan(0.5);
    expect(sfida("difficile", "medio")).toBeGreaterThan(0.45);
  });
});
