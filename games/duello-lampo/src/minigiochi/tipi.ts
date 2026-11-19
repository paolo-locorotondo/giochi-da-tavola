import type { Rng } from "@gdt/engine";

/** I due giocatori: 0 = chi sta in basso, 1 = chi sta in alto (schermo ruotato). */
export type Lato = 0 | 1;

/** Risultato di chi non ha finito in tempo: ogni mini gioco lo mette dopo chi ha fatto qualcosa. */
export interface Nessuno {
  nessuno: true;
}
export const NESSUNO: Nessuno = { nessuno: true };

/**
 * Un mini gioco, solo regole: niente DOM e niente tempo reale, così si prova con i test.
 * La vista (React) sta in `ui/minigiochi` e riporta un `Risultato`; qui si decide chi vince.
 *
 * Per aggiungerne uno: un file qui con l'oggetto `MiniGioco`, una riga in `index.ts`, la vista
 * in `ui/minigiochi`, una riga in `ui/minigiochi/index.ts` e i testi in `locales/{it,en}.ts`.
 */
export interface MiniGioco<Config, Risultato> {
  /** Identificatore stabile (anche chiave del salvataggio della scelta). */
  id: string;
  /** I parametri del round, uguali per i due giocatori: tutta la casualità passa da qui. */
  prepara(rng: Rng): Config;
  /** Dopo quanti millisecondi dall'inizio il round si chiude comunque (chi non ha finito è `NESSUNO`). */
  durataMassima(config: Config): number;
  /** Se vero il round si chiude appena uno dei due ha un risultato (es. «Via!»: chi tocca prima). */
  chiudeAlPrimo: boolean;
  /** Chi vince il round; `null` = pari, nessun punto. */
  vincitore(config: Config, risultati: readonly [Risultato | Nessuno, Risultato | Nessuno]): Lato | null;
}

/** Esito di un confronto tra due numeri: `meglio` dice se è meglio il più piccolo o il più grande. */
export function confronta(a: number, b: number, meglio: "minore" | "maggiore", soglia = 0): Lato | null {
  if (Math.abs(a - b) <= soglia) return null;
  const primoVince = meglio === "minore" ? a < b : a > b;
  return primoVince ? 0 : 1;
}
