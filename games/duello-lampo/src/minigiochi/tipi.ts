import type { Rng } from "@gdt/engine";

/** I due giocatori: 0 = chi sta in basso, 1 = chi sta in alto (schermo ruotato). */
export type Lato = 0 | 1;

/** Risultato di chi non ha finito in tempo: ogni mini gioco lo mette dopo chi ha fatto qualcosa. */
export interface Nessuno {
  nessuno: true;
}
export const NESSUNO: Nessuno = { nessuno: true };

/** Valore di un'impostazione: un numero (scelta) o un sì/no (interruttore). */
export type ValoreImpostazione = number | boolean;

/** I valori scelti per le impostazioni di un mini gioco, per chiave. */
export type ValoriImpostazioni = Readonly<Record<string, ValoreImpostazione>>;

/**
 * Un'impostazione del mini gioco, scelta nella preparazione della sfida.
 * Testi: `mg_<id>_imp_<chiave>` per il titolo; i valori si scrivono con `formato` (vedi la UI).
 */
export type ImpostazioneMiniGioco =
  | {
      tipo: "scelta";
      chiave: string;
      /** Le scelte possibili, in ordine. */
      valori: readonly number[];
      base: number;
      /** Come si legge il valore: un numero semplice, secondi, o una griglia «n×n». */
      formato: "numero" | "secondi" | "griglia";
      /** Massimo che dipende da un'altra impostazione (es. caselle che cambiano ≤ caselle della griglia). */
      massimo?: (valori: ValoriImpostazioni) => number;
    }
  | {
      tipo: "interruttore";
      chiave: string;
      base: boolean;
      /** Se vero, l'interruttore è spento e vale `false` (es. «ruotano» con «tutte dritte»). */
      disattivo?: (valori: ValoriImpostazioni) => boolean;
    };

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
  /** Impostazioni facoltative, scelte nella preparazione. */
  impostazioni?: readonly ImpostazioneMiniGioco[];
  /**
   * I parametri del round, uguali per i due giocatori: tutta la casualità passa da qui.
   * `imp` contiene sempre un valore valido per ogni impostazione (vedi `valoriCompleti`).
   * La vista legge solo il `Config`: tutto ciò che le serve va messo qui dentro.
   */
  prepara(rng: Rng, imp: ValoriImpostazioni): Config;
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

/** I valori di base delle impostazioni. */
export function valoriBase(imp: readonly ImpostazioneMiniGioco[] = []): Record<string, ValoreImpostazione> {
  return Object.fromEntries(imp.map((i) => [i.chiave, i.base]));
}

/** Le scelte permesse di un'impostazione «scelta», dati gli altri valori (rispetta `massimo`). */
export function sceltePermesse(i: Extract<ImpostazioneMiniGioco, { tipo: "scelta" }>, valori: ValoriImpostazioni): number[] {
  const max = i.massimo?.(valori) ?? Infinity;
  const permesse = i.valori.filter((v) => v <= max);
  return permesse.length > 0 ? permesse : [Math.min(...i.valori)];
}

/**
 * Completa e corregge i valori (possono venire da un salvataggio vecchio o da una scelta che
 * ha reso un altro valore fuori limite): ogni chiave assente o non valida torna alla base, una
 * scelta oltre il massimo scende al più grande permesso, un interruttore disattivo vale `false`.
 */
export function valoriCompleti(imp: readonly ImpostazioneMiniGioco[] = [], grezzi: Partial<Record<string, unknown>> = {}) {
  const v: Record<string, ValoreImpostazione> = {};
  // Prima i valori validi così come sono, poi le dipendenze (in ordine di dichiarazione).
  for (const i of imp) {
    const g = grezzi[i.chiave];
    v[i.chiave] = i.tipo === "scelta" ? (typeof g === "number" && i.valori.includes(g) ? g : i.base) : typeof g === "boolean" ? g : i.base;
  }
  for (const i of imp) {
    if (i.tipo === "scelta") {
      const permesse = sceltePermesse(i, v);
      const attuale = v[i.chiave] as number;
      if (!permesse.includes(attuale)) v[i.chiave] = Math.max(...permesse.filter((x) => x <= attuale), Math.min(...permesse));
    } else if (i.disattivo?.(v)) {
      v[i.chiave] = false;
    }
  }
  return v;
}

/** Vero se i valori sono tutti quelli di base. */
export const tuttiBase = (imp: readonly ImpostazioneMiniGioco[] = [], valori: ValoriImpostazioni): boolean =>
  imp.every((i) => valori[i.chiave] === i.base);

/** Lettori tipizzati dei valori (dopo `valoriCompleti` ci sono sempre). */
export const numero = (v: ValoriImpostazioni, chiave: string): number => Number(v[chiave]);
export const sino = (v: ValoriImpostazioni, chiave: string): boolean => v[chiave] === true;
