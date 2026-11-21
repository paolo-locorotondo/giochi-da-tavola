import { SEMI_ITALIANI, type Carta } from "@gdt/carte/logica";
import { PRIMIERA_SERVE_OGNI_SEME, SEME_DENARI, SETTEBELLO, VALORE_PRIMIERA } from "./regole";

/** Squadra: a 2 giocatori ognuno è una squadra; a 4 le coppie. */
export type Squadra = 0 | 1;

/** Valore di una carta nella primiera. */
export const valorePrimiera = (c: Carta): number => VALORE_PRIMIERA[c.valore] ?? 0;

/**
 * Primiera di un mazzetto: per ogni seme la carta di valore primiero più alto, poi la somma.
 * null = nulla (manca almeno un seme e la regola chiede tutti i semi).
 */
export function primiera(carte: readonly Carta[]): number | null {
  let somma = 0;
  for (const seme of SEMI_ITALIANI) {
    const migliore = Math.max(0, ...carte.filter((c) => c.seme === seme).map(valorePrimiera));
    if (migliore === 0 && PRIMIERA_SERVE_OGNI_SEME) return null;
    somma += migliore;
  }
  return somma;
}

const eSettebello = (c: Carta) => c.seme === SETTEBELLO.seme && c.valore === SETTEBELLO.valore;

/** Il conteggio di una squadra a fine round, per il riepilogo. */
export interface ConteggioSquadra {
  carte: number;
  denari: number;
  settebello: boolean;
  /** null = primiera nulla (manca un seme). */
  primiera: number | null;
  scope: number;
}

/** Chi prende ogni punto: la squadra, oppure null se pari (nessuno). */
export interface PuntiRound {
  conteggi: [ConteggioSquadra, ConteggioSquadra];
  carte: Squadra | null;
  denari: Squadra | null;
  settebello: Squadra | null;
  primiera: Squadra | null;
  /** Punti del round per squadra (carte + denari + settebello + primiera + scope). */
  totale: [number, number];
}

/** Chi ha di più; null a pari. */
function chiHaDiPiu(a: number, b: number): Squadra | null {
  if (a === b) return null;
  return a > b ? 0 : 1;
}

/**
 * Punti di un round. `prese[posto-1]`, `scope[posto-1]` e `squadre[posto-1]` sono per posto;
 * il conteggio si fa per squadra (a 4 si sommano i mazzetti della coppia).
 */
export function puntiRound(prese: readonly (readonly Carta[])[], scope: readonly number[], squadre: readonly Squadra[]): PuntiRound {
  const mazzetti: [Carta[], Carta[]] = [[], []];
  const scopeSq: [number, number] = [0, 0];
  prese.forEach((p, i) => {
    const sq = squadre[i]!;
    mazzetti[sq].push(...p);
    scopeSq[sq] += scope[i] ?? 0;
  });
  const conteggi = mazzetti.map((m, sq) => ({
    carte: m.length,
    denari: m.filter((c) => c.seme === SEME_DENARI).length,
    settebello: m.some(eSettebello),
    primiera: primiera(m),
    scope: scopeSq[sq]!,
  })) as [ConteggioSquadra, ConteggioSquadra];

  const [a, b] = conteggi;
  const carte = chiHaDiPiu(a.carte, b.carte);
  const denari = chiHaDiPiu(a.denari, b.denari);
  const settebello: Squadra | null = a.settebello ? 0 : b.settebello ? 1 : null;
  // Primiera nulla vale meno di qualsiasi primiera valida; nulle tutte e due = nessuno.
  const primieraVinta = chiHaDiPiu(a.primiera ?? -1, b.primiera ?? -1);

  const totale: [number, number] = [a.scope, b.scope];
  for (const vinto of [carte, denari, settebello, primieraVinta]) if (vinto !== null) totale[vinto]++;
  return { conteggi, carte, denari, settebello, primiera: primieraVinta, totale };
}
