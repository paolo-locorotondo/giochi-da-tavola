import type { Lingua } from "@gdt/i18n";
import en from "../data/en/personaggi.json";
import it from "../data/it/personaggi.json";
import { MIN_GUFO_LETALE, type Ruolo } from "./logica";

interface TestiRuolo {
  nome: string;
  /** Il nome al plurale, per l'elenco della composizione («2 massoni»). */
  plurale: string;
  /** Cosa legge il giocatore sulla propria carta (seconda persona). */
  tuo: string;
  /** La voce di «I personaggi» nel regolamento (terza persona). */
  regolamento: string;
  /** Variante per le partite grandi (oggi solo il Gufo Letale): nome e testo della carta. */
  letale?: { nome: string; tuo: string };
}

/**
 * Testi dei personaggi per lingua, da `data/<lingua>/personaggi.json`.
 * I tipi obbligano ogni lingua a esistere e ogni file ad avere un elemento per ogni ruolo del codice:
 * una mancanza non compila.
 */
export const PERSONAGGI: Record<Lingua, Record<Ruolo, TestiRuolo>> = { it, en };

/** Il Gufo diventa «Gufo Letale» da MIN_GUFO_LETALE giocatori: passa `giocatori` dove la partita è nota. */
function testiPer(ruolo: Ruolo, lingua: Lingua, giocatori?: number) {
  const t = PERSONAGGI[lingua][ruolo];
  return ruolo === "gufo" && giocatori !== undefined && giocatori >= MIN_GUFO_LETALE && t.letale ? t.letale : t;
}

export function nomeRuolo(ruolo: Ruolo, lingua: Lingua, giocatori?: number): string {
  return testiPer(ruolo, lingua, giocatori).nome;
}

export function pluraleRuolo(ruolo: Ruolo, lingua: Lingua): string {
  return PERSONAGGI[lingua][ruolo].plurale;
}

/** Cosa legge il giocatore sulla propria carta. */
export function descrizioneRuolo(ruolo: Ruolo, lingua: Lingua, giocatori?: number): string {
  return testiPer(ruolo, lingua, giocatori).tuo;
}

/** Voci della sezione «I personaggi» del regolamento, nell'ordine del file. */
export function personaggiRegolamento(lingua: Lingua): { nome: string; testo: string }[] {
  const testi = PERSONAGGI[lingua];
  return (Object.keys(testi) as Ruolo[]).map((r) => ({ nome: testi[r].nome, testo: testi[r].regolamento }));
}
