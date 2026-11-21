import type { Rng } from "@gdt/engine";
import {
  COLORI,
  accetta,
  avanza,
  beccato,
  eColorata,
  eJolly,
  giocabili,
  gioca,
  passa,
  pesca,
  pescaCumulo,
  scegliColore,
  sfida,
  ultima,
  valorePunti,
  type Carta,
  type Colore,
  type Partita,
} from "./logica";

/**
 * Il bot di «Simula mossa col bot»: sceglie *una* mossa per un giocatore, la migliore nel
 * contesto. Puro e deterministico. Usa solo ciò che quel giocatore vedrebbe: la sua mano e lo
 * stato pubblico (scoperta, colore, quante carte hanno gli altri, se chi ha giocato il +4 aveva
 * appena pescato). Non guarda le mani altrui e non bluffa.
 */

export type MossaBot =
  | { tipo: "gioca"; carta: number; colore?: Colore }
  | { tipo: "pesca" }
  | { tipo: "passa" }
  | { tipo: "scegliColore"; colore: Colore }
  | { tipo: "sfida" }
  | { tipo: "accetta" }
  /** Con un cumulo di +2 davanti e nessun +2 da rispondere: si paga tutto. */
  | { tipo: "pescaCumulo" }
  | { tipo: "ultima" }
  /** Un altro ha una carta sola e non ha detto «Ultima!»: lo si becca. */
  | { tipo: "beccato"; bersaglio: number };

/** Sotto questa soglia di carte il prossimo giocatore è «in pericolo» e si cerca di colpirlo. */
export const POCHE_CARTE = 3;

/** Il colore di cui si hanno più carte; a parità il primo nell'ordine dei colori. Senza carte colorate, rosso. */
export function coloreMigliore(mano: readonly Carta[]): Colore {
  let migliore: Colore = COLORI[0];
  let max = 0;
  for (const colore of COLORI) {
    const quante = mano.filter((c) => eColorata(c) && c.colore === colore).length;
    if (quante > max) {
      max = quante;
      migliore = colore;
    }
  }
  return migliore;
}

/** Il +4 è lecito solo senza carte del colore in corso (il bot non bluffa). */
function piu4Lecito(mano: readonly Carta[], colore: Colore | null): boolean {
  return !mano.some((c) => eColorata(c) && c.colore === colore);
}

/** Più alto = da giocare prima. Spiegabile: colpire, poi scaricare i punti, jolly per ultimi. */
function punteggioMossa(c: Carta, mano: readonly Carta[], prossimoInPericolo: boolean): number {
  if (c.tipo === "jolly") return 0;
  if (c.tipo === "piu4") return 1;
  const stessoColore = mano.filter((x) => eColorata(x) && x.colore === (c as { colore: Colore }).colore).length;
  const colpisce = c.tipo === "piu2" || c.tipo === "salta" || c.tipo === "inverti";
  const base = 10 + valorePunti(c) * 2 + stessoColore;
  return prossimoInPericolo && colpisce ? base + 100 : base;
}

/** Le carte della mano che si possono calare adesso (rispettando «solo la pescata» dopo una pesca). */
export function carteGiocabili(p: Partita, posto: number): Carta[] {
  const mano = p.mani[posto - 1]!;
  // Il bot non bluffa: scarta il +4 se ha carte del colore in corso.
  return giocabili(p, posto).filter((c) => c.tipo !== "piu4" || piu4Lecito(mano, p.colore));
}

/**
 * La mossa del bot per `posto`, nella situazione `p`. Lancia se per `posto` non c'è nulla da fare.
 * `n` è il numero di giocatori.
 */
export function mossaBot(p: Partita, n: number, posto: number): MossaBot {
  const mano = p.mani[posto - 1]!;
  if (p.fine) throw new Error("roundFinito");

  // «Ultima!»: chi resta con una carta la dichiara sempre (anche se il turno è di un altro).
  if (p.ultime.some((u) => u.posto === posto && !u.dichiarata)) return { tipo: "ultima" };

  // «Beccato!»: dato pubblico (una carta sola, finestra aperta, nessuna dichiarazione).
  const aperta = p.ultime.find((u) => !u.dichiarata && u.posto !== posto && p.mani[u.posto - 1]!.length === 1);
  if (aperta) return { tipo: "beccato", bersaglio: aperta.posto };

  if (p.turno !== posto) throw new Error("nonTocca");

  if (p.sfida) {
    // Si sfida solo se lo stato pubblico lo rende probabile: chi l'ha giocato aveva appena pescato
    // invece di giocare il colore in corso. Altrimenti si accetta.
    return p.sfida.sospetto ? { tipo: "sfida" } : { tipo: "accetta" };
  }

  if (p.colore === null) return { tipo: "scegliColore", colore: coloreMigliore(mano) };

  // Cumulo di +2: se ho un +2 lo rilancio (il colore non conta), altrimenti pago tutto.
  if (p.cumulo && carteGiocabili(p, posto).length === 0) return { tipo: "pescaCumulo" };

  // Del giocatore successivo si usa solo quante carte ha (dato pubblico).
  const prossimoInPericolo = p.mani[avanza(posto, p.verso, n) - 1]!.length <= POCHE_CARTE;

  const giocabili = carteGiocabili(p, posto);
  if (giocabili.length > 0) {
    const migliore = [...giocabili].sort(
      (a, b) => punteggioMossa(b, mano, prossimoInPericolo) - punteggioMossa(a, mano, prossimoInPericolo) || a.id - b.id,
    )[0]!;
    if (eJolly(migliore)) {
      // Il colore da scegliere si calcola sulla mano senza il jolly che si sta calando.
      return { tipo: "gioca", carta: migliore.id, colore: coloreMigliore(mano.filter((c) => c.id !== migliore.id)) };
    }
    return { tipo: "gioca", carta: migliore.id };
  }

  return p.haPescato ? { tipo: "passa" } : { tipo: "pesca" };
}

/** Esegue sulla logica la mossa scelta dal bot per `posto`. `dichiara`: se cala la penultima carta dice «Ultima!» subito. */
export function eseguiMossa(p: Partita, n: number, posto: number, m: MossaBot, rng: Rng, dichiara = true): Partita {
  switch (m.tipo) {
    case "gioca":
      return gioca(p, n, posto, m.carta, m.colore, rng, dichiara);
    case "pesca":
      return pesca(p, posto, rng);
    case "passa":
      return passa(p, n, posto);
    case "scegliColore":
      return scegliColore(p, posto, m.colore);
    case "sfida":
      return sfida(p, n, posto, rng);
    case "accetta":
      return accetta(p, n, posto, rng);
    case "pescaCumulo":
      return pescaCumulo(p, n, posto, rng);
    case "ultima":
      return ultima(p, posto);
    case "beccato":
      return beccato(p, posto, m.bersaglio, rng);
  }
}

/** Come gioca un bot: come in Tris, facile a caso, medio sbaglia spesso, difficile gioca sempre la mossa migliore. */
export type Livello = "facile" | "medio" | "difficile";
export const LIVELLI: readonly Livello[] = ["facile", "medio", "difficile"];

/** A «medio» il bot gioca la mossa migliore 55 volte su 100 (come in Tris). */
export const PERCENTUALE_MEDIO = 0.55;

/** Probabilità che il bot dichiari «Ultima!» quando cala la penultima carta. */
export const PROB_ULTIMA: Record<Livello, number> = { facile: 0.5, medio: 0.85, difficile: 1 };

/** Probabilità che il bot becchi chi ha dimenticato «Ultima!». */
export const PROB_BECCA: Record<Livello, number> = { facile: 0.6, medio: 0.9, difficile: 1 };

/**
 * La mossa di un bot di un certo livello. «Difficile» è `mossaBot`; gli altri partono da quella
 * e a volte ripiegano su una mossa lecita a caso. Il caso arriva da `rng`: stesso seme, stesse mosse.
 */
export function mossaBotLivello(p: Partita, n: number, posto: number, livello: Livello, rng: Rng): MossaBot {
  const base = mossaBot(p, n, posto);
  if (livello === "difficile") return base;

  if (base.tipo === "beccato") {
    // Chi non becca gioca semplicemente il proprio turno (e la finestra si chiude).
    return rng.next() < PROB_BECCA[livello] ? base : mossaBot({ ...p, ultime: [] }, n, posto);
  }
  const casuale = livello === "facile" || rng.next() >= PERCENTUALE_MEDIO;
  if (!casuale) return base;

  switch (base.tipo) {
    case "gioca": {
      // Con un cumulo di +2 a volte il bot sceglie di pagare invece di rilanciare.
      if (p.cumulo && rng.next() < 0.5) return { tipo: "pescaCumulo" };
      const lecite = carteGiocabili(p, posto);
      const carta = lecite[rng.intero(lecite.length)]!;
      return eJolly(carta) ? { tipo: "gioca", carta: carta.id, colore: COLORI[rng.intero(COLORI.length)]! } : { tipo: "gioca", carta: carta.id };
    }
    case "scegliColore":
      return { tipo: "scegliColore", colore: COLORI[rng.intero(COLORI.length)]! };
    case "sfida":
    case "accetta":
      return rng.next() < 0.5 ? { tipo: "sfida" } : { tipo: "accetta" };
    default:
      return base;
  }
}
