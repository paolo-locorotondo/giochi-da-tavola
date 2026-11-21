import type { Carta } from "@gdt/carte/logica";
import type { Rng } from "@gdt/engine";
import { ErroreScopa, gioca, mazzoCompleto, presePossibili, type Partita } from "./logica";
import { valorePrimiera } from "./punti";
import { SEME_DENARI, SETTEBELLO } from "./regole";

/**
 * Il bot della Scopa: sceglie *una* giocata (carta e, se serve, presa) per un giocatore. Puro e
 * deterministico. Usa solo ciò che quel giocatore vedrebbe: la sua mano, il tavolo, le carte già
 * uscite (pubbliche) e i conteggi. Non guarda le mani altrui.
 */

export type Livello = "facile" | "medio" | "difficile";
export const LIVELLI: readonly Livello[] = ["facile", "medio", "difficile"];

/** A «medio» il bot gioca la mossa migliore 55 volte su 100 (come in Ultima! e in Tris). */
export const PERCENTUALE_MEDIO = 0.55;

export interface MossaBot {
  carta: number;
  /** Id delle carte da prendere; assente se la presa è unica o non c'è. */
  presa?: number[];
}

/** Pesi della valutazione, in «punti equivalenti». Più alto = meglio. */
const PESO = {
  scopa: 10,
  settebello: 9,
  denaro: 1.5,
  carta: 0.5,
  sette: 1.2,
  primieraPerPunto: 0.06,
  /** Lasciare sul tavolo una somma che l'avversario può svuotare con una scopa. */
  rischioScopa: 8,
  /** Lasciare il settebello a portata (presa) dell'avversario. */
  rischioSettebello: 7,
};

interface Opzione {
  carta: Carta;
  /** Id da prendere (per `gioca`), o undefined se la presa è unica o assente. */
  presa: number[] | undefined;
  prese: Carta[];
}

/** Tutte le giocate lecite per `posto`: ogni carta in mano con ogni sua presa possibile. */
export function opzioni(p: Partita, posto: number): Opzione[] {
  const mano = p.mani[posto - 1]!;
  const ris: Opzione[] = [];
  for (const carta of mano) {
    const possibili = presePossibili(p, carta);
    if (possibili.length === 0) ris.push({ carta, presa: undefined, prese: [] });
    else if (possibili.length === 1) ris.push({ carta, presa: undefined, prese: possibili[0]! });
    else for (const pr of possibili) ris.push({ carta, presa: pr.map((c) => c.id), prese: pr });
  }
  return ris;
}

const eSettebello = (c: Carta) => c.seme === SETTEBELLO.seme && c.valore === SETTEBELLO.valore;

/** Carte che chi decide non ha visto: né nella sua mano né uscite sul tavolo (stanno nel mazzo o nelle mani altrui). */
function nonViste(p: Partita, posto: number): Carta[] {
  const viste = new Set([...p.uscite, ...p.mani[posto - 1]!].map((c) => c.id));
  return mazzoCompleto().filter((c) => !viste.has(c.id));
}

/** Valore di una giocata: guadagno immediato meno il rischio che lascia all'avversario. */
function valuta(p: Partita, posto: number, o: Opzione, memoria: boolean): number {
  const dopo = gioca(p, posto, o.carta.id, o.presa);
  let v = 0;
  if (o.prese.length > 0) {
    const tutte = [o.carta, ...o.prese];
    for (const c of tutte) {
      if (eSettebello(c)) v += PESO.settebello;
      if (c.seme === SEME_DENARI) v += PESO.denaro;
      if (c.valore === 7) v += PESO.sette;
      v += PESO.carta + valorePrimiera(c) * PESO.primieraPerPunto;
    }
    if (dopo.scope[posto - 1]! > p.scope[posto - 1]!) v += PESO.scopa;
  } else {
    // La carta resta sul tavolo: costa quanto vale per chi la prende.
    const c = o.carta;
    if (eSettebello(c)) v -= PESO.settebello;
    if (c.seme === SEME_DENARI) v -= PESO.denaro;
    if (c.valore === 7) v -= PESO.sette;
    v -= valorePrimiera(c) * PESO.primieraPerPunto + PESO.carta * 0.5;
  }
  if (dopo.fine) return v;

  // Rischio sul tavolo che resta (dato pubblico). Medio: stima fissa. Difficile: usa le carte non viste.
  const somma = dopo.tavolo.reduce((s, c) => s + c.valore, 0);
  const ignote = memoria ? nonViste(p, posto) : [];
  if (dopo.tavolo.length > 0 && somma <= 10) {
    // Un avversario può fare scopa con una carta di valore uguale alla somma (presa singola) o a una presa che svuota.
    const prob = memoria ? ignote.filter((c) => c.valore === somma).length / Math.max(1, ignote.length) : 0.3;
    v -= PESO.rischioScopa * Math.min(1, memoria ? prob * 3 : prob);
  }
  const sette = dopo.tavolo.find(eSettebello);
  if (sette) {
    const prob = memoria ? Math.min(1, ignote.filter((c) => c.valore === 7).length / Math.max(1, ignote.length) * 3) : 0.35;
    v -= PESO.rischioSettebello * prob;
  }
  return v;
}

/** Sceglie la migliore; a parità la carta di valore più basso, poi l'id (deterministico). */
function migliore(p: Partita, posto: number, ops: Opzione[], memoria: boolean): Opzione {
  const punteggi = ops.map((o) => ({ o, v: valuta(p, posto, o, memoria) }));
  punteggi.sort((a, b) => b.v - a.v || a.o.carta.valore - b.o.carta.valore || a.o.carta.id - b.o.carta.id);
  return punteggi[0]!.o;
}

const comeMossa = (o: Opzione): MossaBot => (o.presa ? { carta: o.carta.id, presa: o.presa } : { carta: o.carta.id });

/** «Difficile»: la mossa migliore, con la memoria delle carte uscite. Lancia se `posto` non ha niente da fare. */
export function mossaBot(p: Partita, posto: number): MossaBot {
  if (p.fine) throw new ErroreScopa("roundFinito");
  if (p.turno !== posto) throw new ErroreScopa("nonTocca");
  const ops = opzioni(p, posto);
  if (ops.length === 0) throw new ErroreScopa("nonTocca");
  return comeMossa(migliore(p, posto, ops, true));
}

/**
 * La mossa di un bot di un certo livello. Facile: a caso tra le giocate lecite. Medio: la migliore
 * (senza memoria) 55 volte su 100, altrimenti a caso. Difficile: sempre la migliore, con memoria.
 * Il caso arriva da `rng`: stesso seme, stesse mosse.
 */
export function mossaBotLivello(p: Partita, posto: number, livello: Livello, rng: Rng): MossaBot {
  if (livello === "difficile") return mossaBot(p, posto);
  if (p.fine) throw new ErroreScopa("roundFinito");
  if (p.turno !== posto) throw new ErroreScopa("nonTocca");
  const ops = opzioni(p, posto);
  if (ops.length === 0) throw new ErroreScopa("nonTocca");
  const bravo = livello === "medio" && rng.next() < PERCENTUALE_MEDIO;
  return comeMossa(bravo ? migliore(p, posto, ops, false) : ops[rng.intero(ops.length)]!);
}

/** Esegue sulla logica la mossa scelta per `posto`. */
export function eseguiMossa(p: Partita, posto: number, m: MossaBot): Partita {
  return gioca(p, posto, m.carta, m.presa);
}
