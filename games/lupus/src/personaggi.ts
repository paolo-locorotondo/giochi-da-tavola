import type { Lingua } from "@gdt/i18n";
import en from "../data/en/personaggi.json";
import it from "../data/it/personaggi.json";
import type { Ruolo } from "./logica";

interface TestiRuolo {
  nome: string;
  /** Cosa legge il giocatore sulla propria carta (seconda persona). */
  tuo: string;
  /** La voce di «I personaggi» nel regolamento (terza persona). */
  regolamento: string;
}

/**
 * Testi dei personaggi per lingua, da `data/<lingua>/personaggi.json`.
 * I tipi obbligano ogni lingua a esistere e ogni file ad avere un elemento per ogni ruolo del codice:
 * una mancanza non compila.
 */
export const PERSONAGGI: Record<Lingua, Record<Ruolo, TestiRuolo>> = { it, en };

export function nomeRuolo(ruolo: Ruolo, lingua: Lingua): string {
  return PERSONAGGI[lingua][ruolo].nome;
}

/** Cosa legge il giocatore sulla propria carta. */
export function descrizioneRuolo(ruolo: Ruolo, lingua: Lingua): string {
  return PERSONAGGI[lingua][ruolo].tuo;
}

/** Voci della sezione «I personaggi» del regolamento, nell'ordine del file. */
export function personaggiRegolamento(lingua: Lingua): { nome: string; testo: string }[] {
  const testi = PERSONAGGI[lingua];
  return (Object.keys(testi) as Ruolo[]).map((r) => ({ nome: testi[r].nome, testo: testi[r].regolamento }));
}
