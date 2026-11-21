import { mescola } from "@gdt/carte/logica";
import type { Rng } from "@gdt/engine";
import { eMatta, mazzoCompleto, valorePunti, type Carta } from "./carte";
import { attacca, bonusBurraco, burraco, leggi, puntiCarte, type Combinazione } from "./combinazioni";
import { REGOLE, type Pila } from "./regole";

/**
 * Burraco: logica pura di una mano. Non scrive frasi: gli errori sono codici (`ErroreBurraco`) che la UI
 * traduce. Il caso arriva solo dalla mescolata (`Rng`): dopo la distribuzione tutto è deterministico.
 * Nel tallone e nel monte degli scarti la cima è l'ultimo elemento. Posti da 1 a n (2 o 4), squadre 1 e 2:
 * a 4 giocatori 1 e 3 contro 2 e 4 (i compagni siedono di fronte), a 2 ognuno è una squadra.
 */

export const MAX_EVENTI = 14;

export class ErroreBurraco extends Error {
  readonly codice: string;
  constructor(codice: string) {
    super(codice);
    this.name = "ErroreBurraco";
    this.codice = codice;
  }
}

/** Squadra di un posto: 1 o 2. */
export const squadra = (posto: number): number => ((posto - 1) % 2) + 1;
export const avanza = (posto: number, n: number): number => (posto % n) + 1;

/** Un gruppo di carte da calare: nuovo (senza `su`) o da attaccare alla combinazione `su` della propria squadra. */
export interface Gruppo {
  carte: number[];
  su?: number;
}

export type MotivoFine = "chiusura" | "tallone" | "stallo";

export type Evento =
  | { tipo: "nuovaMano"; mano: number }
  | { tipo: "pesca"; posto: number }
  | { tipo: "pila"; posto: number; carte: number }
  | { tipo: "cala"; posto: number; nuove: number; attaccate: number }
  | { tipo: "scarta"; posto: number; carta: Carta }
  | { tipo: "pozzetto"; posto: number; diretta: boolean }
  | { tipo: "burraco"; posto: number; tipoBurraco: string }
  | { tipo: "chiusura"; posto: number }
  | { tipo: "fineTallone" }
  | { tipo: "stallo" }
  | { tipo: "bot"; posto: number };

export interface Partita {
  n: number;
  pila: Pila;
  mazzo: Carta[];
  scarti: Carta[];
  /** `mani[posto - 1]`. Solo il server le conosce. */
  mani: Carta[][];
  /** Contenuto dei pozzetti per squadra (`pozzetti[squadra - 1]`): si svuota quando arriva in mano. */
  pozzetti: Carta[][];
  /** La squadra ha già preso (o sta per ricevere) il suo pozzetto. */
  presi: boolean[];
  /** Chi ha finito le carte scartando: riceve il pozzetto all'inizio del suo prossimo turno (anche due, uno per squadra). */
  inAttesa: number[];
  combinazioni: Combinazione[];
  prossimoId: number;
  turno: number;
  fase: "pescare" | "giocare";
  /** Carta che non si può riscartare subito (presa da un monte di una sola carta). */
  vietata: number | null;
  /** Turni di fila senza pescare dal tallone e senza calare (stallo). */
  senzaProgressi: number;
  /** In questo turno si è pescato dal tallone o calato. */
  progresso: boolean;
  fine: { motivo: MotivoFine; chi: number | null } | null;
  eventi: Evento[];
}

const conEvento = (p: Partita, ...e: Evento[]): Evento[] => [...p.eventi, ...e].slice(-MAX_EVENTI);

/** Distribuisce una mano nuova: 11 carte a testa, due pozzetti da 11, una carta scoperta. */
export function nuovaMano(n: number, rng: Rng, primo: number, pila: Pila, mano = 1, eventi: Evento[] = []): Partita {
  if (n !== 2 && n !== 4) throw new ErroreBurraco("numeroGiocatori");
  const mazzo = mescola(mazzoCompleto(), rng);
  const mani: Carta[][] = [];
  for (let i = 0; i < n; i++) mani.push(mazzo.splice(mazzo.length - REGOLE.carteInMano, REGOLE.carteInMano));
  const pozzetti = [mazzo.splice(0, REGOLE.cartePozzetto), mazzo.splice(0, REGOLE.cartePozzetto)];
  const scoperta = mazzo.pop()!;
  const p: Partita = {
    n,
    pila,
    mazzo,
    scarti: [scoperta],
    mani,
    pozzetti,
    presi: [false, false],
    inAttesa: [],
    combinazioni: [],
    prossimoId: 1,
    turno: primo,
    fase: "pescare",
    vietata: null,
    senzaProgressi: 0,
    progresso: false,
    fine: null,
    eventi: [],
  };
  return { ...p, eventi: [...eventi, { tipo: "nuovaMano" as const, mano }].slice(-MAX_EVENTI) };
}

function controllaTurno(p: Partita, posto: number, fase: Partita["fase"]): void {
  if (p.fine) throw new ErroreBurraco("manoFinita");
  if (p.turno !== posto) throw new ErroreBurraco("nonTocca");
  if (p.fase !== fase) throw new ErroreBurraco(fase === "pescare" ? "giaPescato" : "devePescare");
}

const haBurraco = (combinazioni: readonly Combinazione[], sq: number): boolean =>
  combinazioni.some((c) => c.squadra === sq && burraco(c) !== null);

/** Il monte contiene una matta: con la pila «bloccata» non si prende liberamente. */
export const pilaBloccata = (p: Partita): boolean => p.pila === "bloccata" && p.scarti.some(eMatta);

export function pesca(p: Partita, posto: number): Partita {
  controllaTurno(p, posto, "pescare");
  if (p.mazzo.length <= REGOLE.carteResiduoTallone) throw new ErroreBurraco("talloneFinito");
  const mazzo = p.mazzo.slice(0, -1);
  const carta = p.mazzo[p.mazzo.length - 1]!;
  const mani = p.mani.map((m, i) => (i === posto - 1 ? [...m, carta] : m));
  return { ...p, mazzo, mani, fase: "giocare", progresso: true, eventi: conEvento(p, { tipo: "pesca", posto }) };
}

/**
 * Raccoglie tutto il monte degli scarti. Con la pila bloccata da una matta serve `gruppo`: la cima più
 * due carte naturali dello stesso valore prese dalla mano, calate subito come tris nuovo.
 */
export function prendiPila(p: Partita, posto: number, gruppo?: number[]): Partita {
  controllaTurno(p, posto, "pescare");
  if (p.scarti.length === 0) throw new ErroreBurraco("pilaVuota");
  const cima = p.scarti[p.scarti.length - 1]!;
  const mano = p.mani[posto - 1]!;
  const vietata = p.scarti.length === 1 ? cima.id : null;
  const presa: Partita = {
    ...p,
    scarti: [],
    mani: p.mani.map((m, i) => (i === posto - 1 ? [...m, ...p.scarti] : m)),
    fase: "giocare",
    vietata,
    eventi: conEvento(p, { tipo: "pila", posto, carte: p.scarti.length }),
  };
  if (!pilaBloccata(p)) return presa;
  // Pila bloccata: tris nuovo con la cima e due naturali uguali dalla mano.
  if (eMatta(cima)) throw new ErroreBurraco("pilaBloccata");
  const ids = Array.isArray(gruppo) ? gruppo.map(Number) : [];
  const dallaMano = ids.filter((id) => id !== cima.id);
  const naturali = dallaMano.map((id) => mano.find((c) => c.id === id));
  if (dallaMano.length !== 2 || naturali.some((c) => !c || eMatta(c) || c.valore !== cima.valore)) {
    throw new ErroreBurraco("pilaBloccata");
  }
  return cala(presa, posto, [{ carte: [cima.id, ...dallaMano] }]);
}

/** Il giocatore può prendere il monte adesso? (per la UI e i bot) */
export function puoPrendere(p: Partita, posto: number): boolean {
  if (p.fine || p.turno !== posto || p.fase !== "pescare" || p.scarti.length === 0) return false;
  if (!pilaBloccata(p)) return true;
  const cima = p.scarti[p.scarti.length - 1]!;
  if (eMatta(cima)) return false;
  if (REGOLE.unTrisPerValore && p.combinazioni.some((c) => c.squadra === squadra(posto) && c.tipo === "tris" && c.posate[0]!.come === cima.valore)) return false;
  return p.mani[posto - 1]!.filter((c) => !eMatta(c) && c.valore === cima.valore).length >= 2;
}

/**
 * Cala nuove combinazioni e/o attacca carte a quelle della propria squadra. Si può fare più volte nello
 * stesso turno. Se la mano si svuota e il pozzetto è ancora da prendere, lo si prende «in diretta».
 */
export function cala(p: Partita, posto: number, gruppi: readonly Gruppo[]): Partita {
  controllaTurno(p, posto, "giocare");
  if (!Array.isArray(gruppi) || gruppi.length === 0) throw new ErroreBurraco("combinazioneNonValida");
  const sq = squadra(posto);
  const mano = p.mani[posto - 1]!;
  const usate = new Set<number>();
  let combinazioni = [...p.combinazioni];
  let prossimoId = p.prossimoId;
  let nuove = 0;
  let attaccate = 0;
  const nuoviBurraco: string[] = [];
  for (const g of gruppi) {
    const ids = Array.isArray(g?.carte) ? g.carte : [];
    if (ids.length === 0) throw new ErroreBurraco("combinazioneNonValida");
    const carte: Carta[] = [];
    for (const id of ids) {
      const c = mano.find((x) => x.id === id);
      if (!c || usate.has(c.id)) throw new ErroreBurraco("cartaNonInMano");
      usate.add(c.id);
      carte.push(c);
    }
    if (g.su === undefined || g.su === null) {
      const lettura = leggi(carte);
      if (!lettura) throw new ErroreBurraco("combinazioneNonValida");
      if (
        REGOLE.unTrisPerValore &&
        lettura.tipo === "tris" &&
        combinazioni.some((c) => c.squadra === sq && c.tipo === "tris" && c.posate[0]!.come === lettura.posate[0]!.come)
      ) {
        throw new ErroreBurraco("trisGiaPresente");
      }
      combinazioni.push({ ...lettura, id: prossimoId++, squadra: sq });
      nuove++;
      const b = burraco(lettura);
      if (b) nuoviBurraco.push(b);
    } else {
      const i = combinazioni.findIndex((c) => c.id === Number(g.su));
      if (i < 0 || combinazioni[i]!.squadra !== sq) throw new ErroreBurraco("combinazioneAltrui");
      const vecchia = combinazioni[i]!;
      const lettura = attacca(vecchia, carte);
      if (!lettura) throw new ErroreBurraco("attaccoNonValido");
      combinazioni = combinazioni.map((c, k) => (k === i ? { ...lettura, id: vecchia.id, squadra: sq } : c));
      attaccate += carte.length;
      const prima = burraco(vecchia);
      const dopo = burraco(lettura);
      if (dopo && dopo !== prima) nuoviBurraco.push(dopo);
    }
  }
  const resto = mano.filter((c) => !usate.has(c.id));
  const preso = p.presi[sq - 1]!;
  if (preso) {
    // Dopo il pozzetto si chiude solo scartando: serve una carta da scartare, un burraco e niente matta per ultima.
    if (resto.length === 0) throw new ErroreBurraco("serveScarto");
    if (resto.length === 1 && !haBurraco(combinazioni, sq)) throw new ErroreBurraco("serveBurraco");
    if (resto.length === 1 && eMatta(resto[0]!)) throw new ErroreBurraco("nonChiudereConMatta");
  }
  const eventi: Evento[] = [
    { tipo: "cala", posto, nuove, attaccate },
    ...nuoviBurraco.map((b) => ({ tipo: "burraco" as const, posto, tipoBurraco: b })),
  ];
  let mani = p.mani.map((m, i) => (i === posto - 1 ? resto : m));
  let pozzetti = p.pozzetti;
  let presi = p.presi;
  if (resto.length === 0) {
    // Pozzetto «in diretta»: arriva subito in mano e il turno continua.
    mani = mani.map((m, i) => (i === posto - 1 ? p.pozzetti[sq - 1]! : m));
    pozzetti = p.pozzetti.map((x, i) => (i === sq - 1 ? [] : x));
    presi = p.presi.map((x, i) => (i === sq - 1 ? true : x));
    eventi.push({ tipo: "pozzetto", posto, diretta: true });
  }
  return { ...p, mani, pozzetti, presi, combinazioni, prossimoId, progresso: true, eventi: conEvento(p, ...eventi) };
}

/** Scarta una carta e passa il turno. Può far prendere il pozzetto, chiudere la mano o finirla (tallone, stallo). */
export function scarta(p: Partita, posto: number, idCarta: number): Partita {
  controllaTurno(p, posto, "giocare");
  const mano = p.mani[posto - 1]!;
  const carta = mano.find((c) => c.id === idCarta);
  if (!carta) throw new ErroreBurraco("cartaNonInMano");
  if (p.vietata === carta.id) throw new ErroreBurraco("nonRiscartare");
  const sq = squadra(posto);
  const resto = mano.filter((c) => c.id !== carta.id);
  const base: Partita = {
    ...p,
    mani: p.mani.map((m, i) => (i === posto - 1 ? resto : m)),
    scarti: [...p.scarti, carta],
    vietata: null,
    eventi: conEvento(p, { tipo: "scarta", posto, carta }),
  };
  if (resto.length === 0) {
    if (p.presi[sq - 1]) {
      if (!haBurraco(p.combinazioni, sq)) throw new ErroreBurraco("serveBurraco");
      if (eMatta(carta)) throw new ErroreBurraco("nonChiudereConMatta");
      return { ...base, fine: { motivo: "chiusura", chi: posto }, eventi: conEvento(base, { tipo: "chiusura", posto }) };
    }
    // Pozzetto «con lo scarto»: è della squadra da subito, arriva in mano al prossimo turno.
    return passaTurno({ ...base, presi: p.presi.map((x, i) => (i === sq - 1 ? true : x)), inAttesa: [...p.inAttesa, posto] });
  }
  return passaTurno(base);
}

function passaTurno(p: Partita): Partita {
  if (p.mazzo.length <= REGOLE.carteResiduoTallone) {
    return { ...p, fine: { motivo: "tallone", chi: null }, eventi: conEvento(p, { tipo: "fineTallone" }) };
  }
  const senzaProgressi = p.progresso ? 0 : p.senzaProgressi + 1;
  if (senzaProgressi >= REGOLE.giriStallo * p.n) {
    return { ...p, senzaProgressi, fine: { motivo: "stallo", chi: null }, eventi: conEvento(p, { tipo: "stallo" }) };
  }
  const turno = avanza(p.turno, p.n);
  const prossimo: Partita = { ...p, turno, fase: "pescare", senzaProgressi, progresso: false };
  if (!p.inAttesa.includes(turno)) return prossimo;
  const sq = squadra(turno);
  return {
    ...prossimo,
    inAttesa: p.inAttesa.filter((x) => x !== turno),
    mani: p.mani.map((m, i) => (i === turno - 1 ? [...m, ...p.pozzetti[sq - 1]!] : m)),
    pozzetti: p.pozzetti.map((x, i) => (i === sq - 1 ? [] : x)),
    eventi: conEvento(p, { tipo: "pozzetto", posto: turno, diretta: false }),
  };
}

export interface PunteggioSquadra {
  /** Valore delle carte calate. */
  calate: number;
  /** Bonus dei burraco. */
  burraco: number;
  chiusura: number;
  /** Valore delle carte in mano a fine mano (negativo), compreso un pozzetto preso ma mai arrivato in mano. */
  inMano: number;
  /** −100 se il pozzetto non è stato preso (solo se l'altra squadra ha preso il suo). */
  pozzetto: number;
  totale: number;
}

/** Punteggio della mano per squadra (FIBUR art. 18). */
export function punteggioMano(p: Partita): [PunteggioSquadra, PunteggioSquadra] {
  const nessunoPreso = !p.presi[0] && !p.presi[1];
  const per = (sq: number): PunteggioSquadra => {
    const mie = p.combinazioni.filter((c) => c.squadra === sq);
    const calate = mie.reduce((s, c) => s + puntiCarte(c.posate), 0);
    const bonus = mie.reduce((s, c) => s + bonusBurraco(c), 0);
    const chiusura = p.fine?.motivo === "chiusura" && p.fine.chi !== null && squadra(p.fine.chi) === sq ? REGOLE.bonus.chiusura : 0;
    let inMano = 0;
    p.mani.forEach((m, i) => {
      if (squadra(i + 1) === sq) inMano -= m.reduce((s, c) => s + valorePunti(c), 0);
    });
    if (p.inAttesa.some((x) => squadra(x) === sq)) inMano -= p.pozzetti[sq - 1]!.reduce((s, c) => s + valorePunti(c), 0);
    const pozzetto = !p.presi[sq - 1] && !nessunoPreso ? REGOLE.bonus.pozzettoNonPreso : 0;
    return { calate, burraco: bonus, chiusura, inMano, pozzetto, totale: calate + bonus + chiusura + inMano + pozzetto };
  };
  return [per(1), per(2)];
}

/** Anteprima per la UI (pura, senza effetti): cosa diventerebbero quelle carte calate come combinazione nuova. */
export function anteprima(p: Partita, posto: number, ids: readonly number[], su?: number) {
  const mano = p.mani[posto - 1] ?? [];
  const carte = ids.map((id) => mano.find((c) => c.id === id)).filter((c): c is Carta => c !== undefined);
  if (carte.length !== ids.length || carte.length === 0) return null;
  if (su === undefined) return leggi(carte);
  const comb = p.combinazioni.find((c) => c.id === su && c.squadra === squadra(posto));
  return comb ? attacca(comb, carte) : null;
}
