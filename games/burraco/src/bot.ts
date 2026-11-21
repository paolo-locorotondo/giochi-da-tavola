import { SEMI_FRANCESI, type SemeFrancese } from "@gdt/carte";
import type { Rng } from "@gdt/engine";
import { eMatta, valorePunti, type Carta } from "./carte";
import { attacca, leggi, puntiCarte, type Combinazione } from "./combinazioni";
import {
  ErroreBurraco,
  cala,
  prendiPila,
  pesca,
  pilaBloccata,
  puoPrendere,
  scarta,
  squadra,
  type Gruppo,
  type Partita,
} from "./logica";
import { REGOLE } from "./regole";

/**
 * Il bot: sceglie *un passo* del turno (pescare o prendere il monte, calare, scartare). Puro e deterministico.
 * Usa solo ciò che quel giocatore vedrebbe: la sua mano e lo stato pubblico (combinazioni, monte, carte
 * rimaste negli altri). Non guarda mai le mani altrui né i pozzetti.
 */

export type MossaBot =
  | { tipo: "pesca" }
  | { tipo: "pila"; gruppo?: number[] }
  | { tipo: "cala"; gruppi: Gruppo[] }
  | { tipo: "scarta"; carta: number };

/** Come gioca un bot: facile a caso, medio sbaglia spesso, difficile gioca sempre la mossa migliore. */
export type Livello = "facile" | "medio" | "difficile";
export const LIVELLI: readonly Livello[] = ["facile", "medio", "difficile"];

/** A «medio» il bot gioca la mossa migliore 55 volte su 100 (come in Ultima!). */
export const PERCENTUALE_MEDIO = 0.55;

const naturaleA = (c: Carta, seme: SemeFrancese, pos: number): boolean =>
  c.seme === seme && (c.valore === 1 ? pos === 1 || pos === 14 : c.valore === pos);

/** Tutte le combinazioni nuove possibili con queste carte (insiemi di id già validi). */
function candidati(carte: readonly Carta[], valoriTrisVietati: ReadonlySet<number>): number[][] {
  const ris: number[][] = [];
  const matte = [...carte].filter(eMatta).sort((a, b) => valorePunti(a) - valorePunti(b));
  // Tris
  for (let v = 1; v <= 13; v++) {
    if (v === 2 || valoriTrisVietati.has(v)) continue;
    const nat = carte.filter((c) => !eMatta(c) && c.valore === v);
    if (nat.length >= 3) ris.push(nat.slice(0, REGOLE.massimoTris - 1).map((c) => c.id));
    if (nat.length >= 2 && matte.length > 0) ris.push([...nat.slice(0, REGOLE.massimoTris - 2).map((c) => c.id), matte[0]!.id]);
  }
  // Scale
  for (const seme of SEMI_FRANCESI) {
    for (let s = 1; s <= 12; s++) {
      for (let e = s + 2; e <= 14; e++) {
        const usate = new Set<number>();
        let buco = false;
        let ok = true;
        for (let p = s; p <= e && ok; p++) {
          const c = carte.find((x) => !usate.has(x.id) && naturaleA(x, seme, p));
          if (c) {
            usate.add(c.id);
            continue;
          }
          const m = matte.find((x) => !usate.has(x.id));
          if (buco || !m) ok = false;
          else {
            buco = true;
            usate.add(m.id);
          }
        }
        if (ok && usate.size >= 3) ris.push([...usate]);
      }
    }
  }
  return ris;
}

/** Il miglior insieme di combinazioni nuove disgiunte (a ogni giro la candidata che vale di più). */
export function miglioriNuove(mano: readonly Carta[], squadraCombs: readonly Combinazione[]): Gruppo[] {
  const vietati = new Set(squadraCombs.filter((c) => c.tipo === "tris").map((c) => c.posate[0]!.come));
  let rimaste = [...mano];
  const gruppi: Gruppo[] = [];
  for (;;) {
    let migliore: { ids: number[]; valore: number } | null = null;
    for (const ids of candidati(rimaste, vietati)) {
      const carte = ids.map((id) => rimaste.find((c) => c.id === id)!);
      const lettura = leggi(carte);
      if (!lettura) continue;
      const matte = lettura.posate.filter((p) => p.matta).length;
      const valore = puntiCarte(lettura.posate) + 25 * carte.length - 15 * matte;
      if (!migliore || valore > migliore.valore) migliore = { ids, valore };
    }
    if (!migliore) break;
    const usate = new Set(migliore.ids);
    gruppi.push({ carte: migliore.ids });
    // Due tris dello stesso valore non si possono avere: il secondo diventa vietato.
    const l = leggi(migliore.ids.map((id) => rimaste.find((c) => c.id === id)!))!;
    if (l.tipo === "tris") vietati.add(l.posate[0]!.come);
    rimaste = rimaste.filter((c) => !usate.has(c.id));
  }
  return gruppi;
}

/** Carte che si possono attaccare alle combinazioni della squadra (un gruppo per combinazione). */
export function attaccabili(mano: readonly Carta[], mie: readonly Combinazione[], escluse: ReadonlySet<number>): Gruppo[] {
  const gruppi: Gruppo[] = [];
  let libere = mano.filter((c) => !escluse.has(c.id));
  for (const comb of mie) {
    let corrente: Combinazione = comb;
    const prese: number[] = [];
    // Prima le carte naturali (le matte solo se servono), una alla volta finché si attaccano.
    let giro = true;
    while (giro) {
      giro = false;
      for (const c of [...libere].sort((a, b) => Number(eMatta(a)) - Number(eMatta(b)) || a.valore - b.valore)) {
        if (prese.includes(c.id)) continue;
        // Una matta si attacca solo se la combinazione non ne ha già (e solo a una scala/tris di 4+ carte: non sprecarle).
        if (eMatta(c) && corrente.posate.length < 4) continue;
        const l = attacca(corrente, [c]);
        if (l) {
          corrente = { ...l, id: corrente.id, squadra: corrente.squadra };
          prese.push(c.id);
          giro = true;
          break;
        }
      }
    }
    if (prese.length > 0) {
      gruppi.push({ carte: prese, su: comb.id });
      libere = libere.filter((c) => !prese.includes(c.id));
    }
  }
  return gruppi;
}

const puntiGruppi = (mano: readonly Carta[], gruppi: readonly Gruppo[]): number =>
  gruppi.reduce((s, g) => s + g.carte.reduce((t, id) => t + valorePunti(mano.find((c) => c.id === id)!), 0), 0);

function pianoDiCalata(p: Partita, posto: number): Gruppo[] {
  const mano = p.mani[posto - 1]!;
  const sq = squadra(posto);
  const mie = p.combinazioni.filter((c) => c.squadra === sq);
  const nuove = miglioriNuove(mano, mie);
  const usate = new Set(nuove.flatMap((g) => g.carte));
  const att = attaccabili(mano, mie, usate);
  return [...nuove, ...att];
}

/** Il primo piano valido (togliendo in coda i gruppi che fanno rifiutare la mossa: chiusura, burraco). */
function calataValida(p: Partita, posto: number, gruppi: readonly Gruppo[]): Gruppo[] | null {
  const ordinati = [...gruppi].sort((a, b) => b.carte.length - a.carte.length);
  for (let k = ordinati.length; k >= 1; k--) {
    const prova = ordinati.slice(0, k);
    try {
      cala(p, posto, prova);
      return prova;
    } catch (e) {
      if (!(e instanceof ErroreBurraco)) throw e;
    }
  }
  return null;
}

/** Quanto conviene tenere una carta in mano (più alto = meglio tenerla, quindi scartare le basse). */
function utilitaCarta(c: Carta, mano: readonly Carta[], avversarie: readonly Combinazione[], difficile: boolean): number {
  if (eMatta(c)) return 1000;
  const stesso = mano.filter((x) => x.id !== c.id && !eMatta(x) && x.valore === c.valore).length;
  const vicine = mano.filter((x) => x.id !== c.id && x.seme === c.seme && Math.abs(x.valore - c.valore) <= 2 && x.valore !== c.valore).length;
  let u = stesso * 12 + vicine * 10 - valorePunti(c);
  if (difficile) {
    // Non regalare carte che servono agli avversari.
    const regalo = avversarie.some((a) => a.tipo === "tris" && a.posate[0]!.come === c.valore) ? 25 : 0;
    u -= regalo;
  }
  return u;
}

function sceltaScarto(p: Partita, posto: number, difficile: boolean, rng?: Rng): number {
  const mano = p.mani[posto - 1]!;
  const sq = squadra(posto);
  const avversarie = p.combinazioni.filter((c) => c.squadra !== sq);
  const ordinate = [...mano].sort((a, b) => utilitaCarta(a, mano, avversarie, difficile) - utilitaCarta(b, mano, avversarie, difficile) || a.id - b.id);
  const lecite = ordinate.filter((c) => {
    try {
      scarta(p, posto, c.id);
      return true;
    } catch (e) {
      if (e instanceof ErroreBurraco) return false;
      throw e;
    }
  });
  if (lecite.length === 0) throw new ErroreBurraco("nullaDaFare");
  return (rng ? lecite[rng.intero(lecite.length)]! : lecite[0]!).id;
}

/** Il bot vuole il monte? Sì se con quelle carte si cala molto di più e non si raccoglie troppa zavorra. */
function vuolePila(p: Partita, posto: number): number[] | true | false {
  if (!puoPrendere(p, posto)) return false;
  const mano = p.mani[posto - 1]!;
  const sq = squadra(posto);
  const mie = p.combinazioni.filter((c) => c.squadra === sq);
  const cima = p.scarti[p.scarti.length - 1]!;
  if (pilaBloccata(p)) {
    const due = mano.filter((c) => !eMatta(c) && c.valore === cima.valore).slice(0, 2);
    return due.length === 2 ? due.map((c) => c.id) : false;
  }
  const prima = puntiGruppi(mano, [...miglioriNuove(mano, mie), ...attaccabili(mano, mie, new Set(miglioriNuove(mano, mie).flatMap((g) => g.carte)))]);
  const tutte = [...mano, ...p.scarti];
  const nuove = miglioriNuove(tutte, mie);
  const dopo = puntiGruppi(tutte, [...nuove, ...attaccabili(tutte, mie, new Set(nuove.flatMap((g) => g.carte)))]);
  const usate = new Set([...nuove, ...attaccabili(tutte, mie, new Set(nuove.flatMap((g) => g.carte)))].flatMap((g) => g.carte));
  const zavorra = p.scarti.filter((c) => !usate.has(c.id)).reduce((s, c) => s + valorePunti(c), 0);
  const guadagno = dopo - prima - zavorra / 2;
  const usaMonte = p.scarti.some((c) => usate.has(c.id));
  return usaMonte && guadagno > 15;
}

/** La mossa migliore (livello «difficile»). Lancia `ErroreBurraco` se non c'è nulla da fare. */
export function mossaBot(p: Partita, posto: number, difficile = true): MossaBot {
  if (p.fine) throw new ErroreBurraco("manoFinita");
  if (p.turno !== posto) throw new ErroreBurraco("nonTocca");
  if (p.fase === "pescare") {
    const v = vuolePila(p, posto);
    if (Array.isArray(v)) return { tipo: "pila", gruppo: v };
    if (v) return { tipo: "pila" };
    return { tipo: "pesca" };
  }
  const piano = calataValida(p, posto, pianoDiCalata(p, posto));
  if (piano) return { tipo: "cala", gruppi: piano };
  return { tipo: "scarta", carta: sceltaScarto(p, posto, difficile) };
}

/**
 * La mossa di un bot di un certo livello: «difficile» è `mossaBot`; gli altri partono da quella e a volte
 * ripiegano su una mossa lecita meno buona (non calare, scartare a caso). Il caso arriva da `rng`.
 */
export function mossaBotLivello(p: Partita, posto: number, livello: Livello, rng: Rng): MossaBot {
  const base = mossaBot(p, posto, livello === "difficile");
  if (livello === "difficile") return base;
  const casuale = livello === "facile" || rng.next() >= PERCENTUALE_MEDIO;
  if (!casuale) return base;
  switch (base.tipo) {
    case "pila":
      return { tipo: "pesca" };
    case "cala": {
      // Cala una cosa sola, o niente: passa direttamente allo scarto.
      if (rng.next() < 0.4) return { tipo: "scarta", carta: sceltaScarto(p, posto, false, rng) };
      return { tipo: "cala", gruppi: [base.gruppi[0]!] };
    }
    case "scarta":
      return { tipo: "scarta", carta: sceltaScarto(p, posto, false, rng) };
    default:
      return base;
  }
}

/** Esegue sulla logica la mossa scelta dal bot. */
export function eseguiMossa(p: Partita, posto: number, m: MossaBot): Partita {
  switch (m.tipo) {
    case "pesca":
      return pesca(p, posto);
    case "pila":
      return prendiPila(p, posto, m.gruppo);
    case "cala":
      return cala(p, posto, m.gruppi);
    case "scarta":
      return scarta(p, posto, m.carta);
  }
}
