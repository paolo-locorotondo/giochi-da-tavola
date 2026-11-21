import { mazzoItaliano, mescola, type Carta } from "@gdt/carte/logica";
import type { Rng } from "@gdt/engine";
import { combinazioniPresa, stessaPresa } from "./prese";
import { puntiRound, type PuntiRound, type Squadra } from "./punti";
import { CARTE_MANO, CARTE_TAVOLO, MAX_EVENTI, POSTI_AMMESSI, SCOPA_ALL_ULTIMA_GIOCATA } from "./regole";

/**
 * Scopa: logica pura di un round. Non scrive frasi: gli errori sono codici (`ErroreScopa`) che la UI
 * traduce. Il caso (la mescolata) arriva da fuori (`Rng`). Nel mazzo la cima è l'ultimo elemento.
 * I posti vanno da 1 a n (2 o 4); a 4 giocano a coppie: posti 1 e 3 contro 2 e 4.
 */

export type { Carta };
export type { Squadra };

export class ErroreScopa extends Error {
  readonly codice: string;
  constructor(codice: string) {
    super(codice);
    this.name = "ErroreScopa";
    this.codice = codice;
  }
}

/**
 * Cosa è successo, visibile a tutti. Le carte prese restano coperte: l'evento dice solo quante
 * (D8: l'elenco si vede nel riepilogo di fine round).
 */
export type Evento =
  | { tipo: "nuovoRound" }
  | { tipo: "gioca"; posto: number; carta: Carta; prese: number }
  | { tipo: "scopa"; posto: number }
  | { tipo: "distribuzione"; mano: number }
  | { tipo: "ultimaPresa"; posto: number; carte: number }
  | { tipo: "fineRound" }
  | { tipo: "bot"; posto: number };

export interface FineRound {
  /** Chi ha preso le carte rimaste sul tavolo. */
  ultimaPresa: number;
  /** Il conteggio dei punti. */
  punti: PuntiRound;
}

export interface Partita {
  mazzo: Carta[];
  /** Carte scoperte sul tavolo, in ordine di arrivo. */
  tavolo: Carta[];
  /** `mani[posto - 1]`: segreto, solo il server. */
  mani: Carta[][];
  /** `prese[posto - 1]`: il mazzetto, coperto fino a fine round. */
  prese: Carta[][];
  /** `scope[posto - 1]`: scope fatte nel round. */
  scope: number[];
  /** Tutte le carte mai scoperte sul tavolo (pubblico): serve alla memoria del bot. */
  uscite: Carta[];
  /** La squadra di ogni posto. */
  squadre: Squadra[];
  turno: number;
  /** Quale distribuzione è in corso (1 in su). */
  mano: number;
  /** Quante distribuzioni ha il round. */
  totaleMani: number;
  /** Chi ha aperto il round. */
  primo: number;
  ultimaPresa: number | null;
  fine: FineRound | null;
  eventi: Evento[];
}

/** Squadre di base: a 2 ognuno la sua, a 4 posti 1+3 contro 2+4. */
export const squadreDiBase = (n: number): Squadra[] => Array.from({ length: n }, (_, i) => (i % 2) as Squadra);

/** Il posto dopo `posto` (senso orario). */
export const avanza = (posto: number, n: number): number => (posto % n) + 1;

/** Quante distribuzioni ha un round: (40 − 4 sul tavolo) / (3 a testa × n). */
export const distribuzioni = (n: number): number => (40 - CARTE_TAVOLO) / (CARTE_MANO * n);

const aggiungi = (eventi: readonly Evento[], ...nuovi: Evento[]): Evento[] => [...eventi, ...nuovi].slice(-MAX_EVENTI);

/** Il mazzo da 40 carte in ordine fisso (id 0..39). */
export const mazzoCompleto = (): Carta[] => mazzoItaliano();

/**
 * Inizia un round: mescola, scopre 4 carte (senza ridistribuire se escono tre re: D9) e dà 3 carte a testa.
 * Apre `primo`.
 */
export function nuovoRound(n: number, rng: Rng, eventi: readonly Evento[] = [], primo = 1, squadre: Squadra[] = squadreDiBase(n)): Partita {
  if (!(POSTI_AMMESSI as readonly number[]).includes(n)) throw new ErroreScopa("numeroGiocatori");
  const mazzo = mescola(mazzoCompleto(), rng);
  const tavolo = mazzo.splice(mazzo.length - CARTE_TAVOLO, CARTE_TAVOLO);
  const mani: Carta[][] = Array.from({ length: n }, () => []);
  for (let k = 0; k < CARTE_MANO; k++) for (let i = 0; i < n; i++) mani[i]!.push(mazzo.pop()!);
  return {
    mazzo,
    tavolo,
    mani,
    prese: Array.from({ length: n }, () => []),
    scope: Array.from({ length: n }, () => 0),
    uscite: [...tavolo],
    squadre,
    turno: primo,
    mano: 1,
    totaleMani: distribuzioni(n),
    primo,
    ultimaPresa: null,
    fine: null,
    eventi: aggiungi(eventi, { tipo: "nuovoRound" }),
  };
}

/** Le prese possibili per una carta della mano di `posto` (vuoto = la carta resta sul tavolo). */
export function presePossibili(p: Partita, carta: Carta): Carta[][] {
  return combinazioniPresa(p.tavolo, carta);
}

/**
 * Chi è di turno cala `idCarta`. `presa` (id delle carte del tavolo) serve solo quando le prese
 * possibili sono più d'una: senza, lancia `sceltaPresaMancante`; con una presa che non è tra
 * quelle possibili, `presaNonValida`. Con una sola presa possibile, o nessuna, si applica da sé.
 * Restituisce un round nuovo: quello ricevuto non cambia.
 */
export function gioca(p: Partita, chi: number, idCarta: number, presa?: readonly number[]): Partita {
  if (p.fine) throw new ErroreScopa("roundFinito");
  const n = p.mani.length;
  if (!Number.isInteger(chi) || chi < 1 || chi > n) throw new ErroreScopa("nonPartecipa");
  if (p.turno !== chi) throw new ErroreScopa("nonTocca");
  const mano = p.mani[chi - 1]!;
  const carta = mano.find((c) => c.id === idCarta);
  if (!carta) throw new ErroreScopa("cartaNonInMano");

  const possibili = presePossibili(p, carta);
  let scelta: Carta[] = [];
  if (possibili.length === 1) {
    if (presa !== undefined && !stessaPresa(possibili[0]!, presa)) throw new ErroreScopa("presaNonValida");
    scelta = possibili[0]!;
  } else if (possibili.length > 1) {
    if (presa === undefined) throw new ErroreScopa("sceltaPresaMancante");
    const trovata = possibili.find((c) => stessaPresa(c, presa));
    if (!trovata) throw new ErroreScopa("presaNonValida");
    scelta = trovata;
  } else if (presa !== undefined && presa.length > 0) {
    throw new ErroreScopa("presaNonValida");
  }

  const presi = new Set(scelta.map((c) => c.id));
  const nuovaMano = mano.filter((c) => c.id !== idCarta);
  const mani = p.mani.map((m, i) => (i === chi - 1 ? nuovaMano : m));
  const ultimaGiocata = mani.every((m) => m.length === 0) && p.mazzo.length === 0;

  let tavolo = p.tavolo.filter((c) => !presi.has(c.id));
  const prese = p.prese.map((m) => [...m]);
  const scope = [...p.scope];
  let ultimaPresa = p.ultimaPresa;
  const eventi: Evento[] = [{ tipo: "gioca", posto: chi, carta, prese: scelta.length }];
  if (scelta.length > 0) {
    prese[chi - 1]!.push(carta, ...scelta);
    ultimaPresa = chi;
    if (tavolo.length === 0 && (SCOPA_ALL_ULTIMA_GIOCATA || !ultimaGiocata)) {
      scope[chi - 1]!++;
      eventi.push({ tipo: "scopa", posto: chi });
    }
  } else {
    tavolo = [...tavolo, carta];
  }

  let nuova: Partita = {
    ...p,
    tavolo,
    mani,
    prese,
    scope,
    uscite: [...p.uscite, carta],
    ultimaPresa,
    turno: avanza(chi, n),
    eventi: aggiungi(p.eventi, ...eventi),
  };

  if (mani.every((m) => m.length === 0)) {
    if (p.mazzo.length > 0) {
      // Nuova distribuzione: 3 carte a testa, il turno continua.
      const mazzo = [...p.mazzo];
      const date: Carta[][] = nuova.mani.map((m) => [...m]);
      for (let k = 0; k < CARTE_MANO; k++) for (let i = 0; i < n; i++) date[i]!.push(mazzo.pop()!);
      nuova = { ...nuova, mazzo, mani: date, mano: p.mano + 1, eventi: aggiungi(nuova.eventi, { tipo: "distribuzione", mano: p.mano + 1 }) };
    } else {
      nuova = chiudiRound(nuova, chi);
    }
  }
  return nuova;
}

/** Fine del round: le carte rimaste sul tavolo vanno a chi ha preso per ultimo; poi il conteggio. */
function chiudiRound(p: Partita, ultimoACalare: number): Partita {
  const ultimo = p.ultimaPresa ?? ultimoACalare;
  const prese = p.prese.map((m, i) => (i === ultimo - 1 ? [...m, ...p.tavolo] : m));
  const resto = p.tavolo.length;
  return {
    ...p,
    tavolo: [],
    prese,
    ultimaPresa: ultimo,
    fine: { ultimaPresa: ultimo, punti: puntiRound(prese, p.scope, p.squadre) },
    eventi: aggiungi(p.eventi, { tipo: "ultimaPresa", posto: ultimo, carte: resto }, { tipo: "fineRound" }),
  };
}

/** Quante carte restano da giocare in tutto (mani + mazzo): 0 = il round è finito. */
export const carteRimaste = (p: Partita): number => p.mazzo.length + p.mani.reduce((s, m) => s + m.length, 0);

/** Tutte le carte della partita, per controllare che siano sempre 40. */
export function tutteLeCarte(p: Partita): Carta[] {
  return [...p.mazzo, ...p.tavolo, ...p.mani.flat(), ...p.prese.flat()];
}
