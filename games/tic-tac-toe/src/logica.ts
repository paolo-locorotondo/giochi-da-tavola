import type { Rng } from "@gdt/engine";

/**
 * Tris: logica pura e deterministica. Non scrive frasi: gli errori sono codici (`ErroreTris`)
 * che la UI traduce. Il caso (la mossa del telefono) arriva da fuori (`Rng`).
 */

export type Segno = "X" | "O";
export type Casella = Segno | null;
export type Difficolta = "facile" | "medio" | "difficile";
export const DIFFICOLTA: readonly Difficolta[] = ["facile", "medio", "difficile"];

/** Le otto linee vincenti, per indice di casella (0 = in alto a sinistra, 8 = in basso a destra). */
export const LINEE: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Fine partita: `vincitore` null = pareggio (e `linea` null). */
export interface Esito {
  vincitore: Segno | null;
  linea: readonly number[] | null;
}

export interface Partita {
  griglia: readonly Casella[];
  turno: Segno;
  /** null = si sta ancora giocando. */
  esito: Esito | null;
}

export type CodiceErrore = "partitaFinita" | "casellaNonValida" | "casellaOccupata";

export class ErroreTris extends Error {
  readonly codice: CodiceErrore;
  constructor(codice: CodiceErrore) {
    super(codice);
    this.name = "ErroreTris";
    this.codice = codice;
  }
}

export const altro = (s: Segno): Segno => (s === "X" ? "O" : "X");

export function nuovaPartita(inizia: Segno = "X"): Partita {
  return { griglia: Array<Casella>(9).fill(null), turno: inizia, esito: null };
}

/** La linea di tre segni uguali, se c'è. */
export function trovaLinea(griglia: readonly Casella[]): readonly number[] | null {
  for (const l of LINEE) {
    const [a, b, c] = l;
    if (griglia[a] && griglia[a] === griglia[b] && griglia[a] === griglia[c]) return l;
  }
  return null;
}

export function caselleLibere(griglia: readonly Casella[]): number[] {
  const libere: number[] = [];
  griglia.forEach((c, i) => {
    if (c === null) libere.push(i);
  });
  return libere;
}

/** Mette il segno di chi ha il turno nella casella; restituisce la nuova partita. */
export function muovi(p: Partita, casella: number): Partita {
  if (p.esito) throw new ErroreTris("partitaFinita");
  if (!Number.isInteger(casella) || casella < 0 || casella > 8) throw new ErroreTris("casellaNonValida");
  if (p.griglia[casella] !== null) throw new ErroreTris("casellaOccupata");
  const griglia = p.griglia.map((c, i) => (i === casella ? p.turno : c));
  const linea = trovaLinea(griglia);
  if (linea) return { griglia, turno: p.turno, esito: { vincitore: p.turno, linea } };
  if (caselleLibere(griglia).length === 0) return { griglia, turno: p.turno, esito: { vincitore: null, linea: null } };
  return { griglia, turno: altro(p.turno), esito: null };
}

/** Valore di una posizione per `io` (minimax): più alto se vince, più basso se perde; vincere prima vale di più. */
function valuta(griglia: Casella[], turno: Segno, io: Segno, profondita: number): number {
  const linea = trovaLinea(griglia);
  if (linea) return griglia[linea[0]!] === io ? 10 - profondita : profondita - 10;
  const libere = caselleLibere(griglia);
  if (libere.length === 0) return 0;
  let migliore = turno === io ? -Infinity : Infinity;
  for (const i of libere) {
    griglia[i] = turno;
    const v = valuta(griglia, altro(turno), io, profondita + 1);
    griglia[i] = null;
    migliore = turno === io ? Math.max(migliore, v) : Math.min(migliore, v);
  }
  return migliore;
}

/** Le mosse ottime per chi ha il turno (tutte quelle di valore massimo). */
export function mosseOttime(p: Partita): number[] {
  const io = p.turno;
  const griglia = [...p.griglia];
  let massimo = -Infinity;
  let ottime: number[] = [];
  for (const i of caselleLibere(griglia)) {
    griglia[i] = io;
    const v = valuta(griglia, altro(io), io, 1);
    griglia[i] = null;
    if (v > massimo) {
      massimo = v;
      ottime = [i];
    } else if (v === massimo) ottime.push(i);
  }
  return ottime;
}

/** Su cento mosse, quante il livello «medio» gioca ottime (le altre sono a caso). */
export const PERCENTUALE_MEDIO = 55;

/** La mossa del telefono: facile = a caso, medio = ottima 55 volte su 100, difficile = sempre ottima (non si batte). */
export function mossaTelefono(p: Partita, difficolta: Difficolta, rng: Rng): number {
  const libere = caselleLibere(p.griglia);
  if (p.esito || libere.length === 0) throw new ErroreTris("partitaFinita");
  const scelta = (da: number[]) => da[rng.intero(da.length)]!;
  if (difficolta === "facile") return scelta(libere);
  if (difficolta === "medio" && rng.intero(100) >= PERCENTUALE_MEDIO) return scelta(libere);
  return scelta(mosseOttime(p));
}

/** Punteggio di una serie di partite: vittorie di X, di O e pareggi. */
export interface Punteggio {
  X: number;
  O: number;
  pareggi: number;
}

export const punteggioVuoto = (): Punteggio => ({ X: 0, O: 0, pareggi: 0 });

export function aggiungiEsito(p: Punteggio, e: Esito): Punteggio {
  return e.vincitore ? { ...p, [e.vincitore]: p[e.vincitore] + 1 } : { ...p, pareggi: p.pareggi + 1 };
}
