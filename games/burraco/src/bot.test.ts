import { describe, expect, it } from "vitest";
import { creaRng } from "@gdt/engine";
import { LIVELLI, eseguiMossa, mossaBot, mossaBotLivello, type Livello } from "./bot";
import { nuovaMano, punteggioMano, squadra, type Partita } from "./logica";
import type { Pila } from "./regole";

/** Gioca una mano intera; ogni squadra ha il suo livello. Un tetto di mosse evita cicli infiniti. */
function giocaMano(n: number, seme: number, livelli: [Livello, Livello], pila: Pila = "libera"): { p: Partita; mosse: number } {
  const rng = creaRng(seme);
  let p = nuovaMano(n, creaRng(seme + 1), 1, pila);
  let mosse = 0;
  while (!p.fine) {
    if (++mosse > 4000) throw new Error(`mano infinita (seme ${seme}, n ${n})`);
    const livello = livelli[squadra(p.turno) - 1]!;
    const m = mossaBotLivello(p, p.turno, livello, rng);
    p = eseguiMossa(p, p.turno, m);
  }
  return { p, mosse };
}

describe("bot: partite complete", () => {
  it("200 mani a 2 e a 4 giocatori finiscono sempre, a tutti i livelli e con entrambe le pile", () => {
    let chiusure = 0;
    for (let seme = 1; seme <= 100; seme++) {
      for (const n of [2, 4]) {
        const livello = LIVELLI[seme % 3]!;
        const { p } = giocaMano(n, seme, [livello, "difficile"], seme % 5 === 0 ? "bloccata" : "libera");
        expect(p.fine).not.toBeNull();
        const [a, b] = punteggioMano(p);
        expect(Number.isFinite(a.totale + b.totale)).toBe(true);
        // Nessuna carta perduta o duplicata.
        const tutte = [...p.mazzo, ...p.scarti, ...p.mani.flat(), ...p.pozzetti.flat(), ...p.combinazioni.flatMap((c) => c.posate.map((x) => x.carta))];
        expect(new Set(tutte.map((x) => x.id)).size).toBe(108);
        expect(tutte).toHaveLength(108);
        if (p.fine?.motivo === "chiusura") chiusure++;
      }
    }
    expect(chiusure).toBeGreaterThan(20);
  }, 120_000);

  it("stesso seme, stessa mano", () => {
    const a = giocaMano(4, 9, ["medio", "difficile"]).p;
    const b = giocaMano(4, 9, ["medio", "difficile"]).p;
    expect(a.eventi).toEqual(b.eventi);
    expect(punteggioMano(a)).toEqual(punteggioMano(b));
  });

  it("il difficile batte il facile nella maggioranza delle mani", () => {
    let vinte = 0;
    let giocate = 0;
    for (let seme = 200; seme < 240; seme++) {
      for (const n of [2, 4]) {
        // Si scambiano i posti per non favorire chi parte.
        const d = giocaMano(n, seme, ["difficile", "facile"]).p;
        const [a, b] = punteggioMano(d);
        giocate++;
        if (a.totale > b.totale) vinte++;
      }
    }
    expect(vinte / giocate).toBeGreaterThan(0.6);
  }, 120_000);
});

describe("bot: mosse lecite e solo dati pubblici", () => {
  it("ogni passo proposto è accettato dalla logica", () => {
    const rng = creaRng(5);
    let p = nuovaMano(4, creaRng(77), 1, "libera");
    for (let i = 0; i < 400 && !p.fine; i++) {
      const m = mossaBotLivello(p, p.turno, LIVELLI[i % 3]!, rng);
      expect(() => eseguiMossa(p, p.turno, m)).not.toThrow();
      p = eseguiMossa(p, p.turno, m);
    }
  });

  it("la mossa del difficile non cambia se si mescolano le mani avversarie, il tallone e i pozzetti", () => {
    const rng = creaRng(3);
    let p = nuovaMano(4, creaRng(21), 1, "libera");
    for (let i = 0; i < 120 && !p.fine; i++) {
      const mio = p.turno;
      const rimescolata: Partita = {
        ...p,
        mani: p.mani.map((m, k) => (k === mio - 1 ? m : creaRng(i + k).mescola([...m]).reverse())),
        mazzo: creaRng(i).mescola(p.mazzo),
        pozzetti: p.pozzetti.map((x) => creaRng(i + 9).mescola(x)),
      };
      expect(mossaBot(rimescolata, mio)).toEqual(mossaBot(p, mio));
      p = eseguiMossa(p, mio, mossaBotLivello(p, mio, "difficile", rng));
    }
  });

  it("fuori turno o a mano finita il bot non muove", () => {
    const p = nuovaMano(2, creaRng(1), 1, "libera");
    expect(() => mossaBot(p, 2)).toThrow("nonTocca");
    expect(() => mossaBot({ ...p, fine: { motivo: "tallone", chi: null } }, 1)).toThrow("manoFinita");
  });
});
