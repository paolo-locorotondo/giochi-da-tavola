import { creaRng, hashSeme } from "./rng";

/**
 * Codice partita da 8 caratteri: 6 di seme + 1 di versione dati + 1 di controllo.
 * Il controllo copre anche i parametri della partita (n. giocatori, categoria, ...),
 * che non stanno nel codice ma si inseriscono a mano: se un telefono ha parametri
 * diversi il codice viene rifiutato. Con un solo carattere di controllo un errore
 * sfugge una volta su 31: basta a evitare sviste, non a difendersi da chi bara.
 */

export const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const BASE = ALFABETO.length; // 31
const LUNGHEZZA_SEME = 6;
const MAX_VERSIONE = BASE - 1;

export interface CodicePartita {
  /** Intero in [0, 31^6) da passare a creaRng. */
  seme: number;
  /** Versione dei dati/regole, 0..30. */
  versione: number;
}

export type Parametri = Readonly<Record<string, string | number>>;

function carattere(indice: number): string {
  return ALFABETO.charAt(indice);
}

/** Serializza i parametri in modo indipendente dall'ordine delle chiavi. */
function serializza(parametri: Parametri): string {
  return Object.keys(parametri)
    .sort()
    .map((k) => `${k}=${parametri[k]}`)
    .join(";");
}

function controllo(corpo: string, parametri: Parametri): string {
  return carattere(hashSeme(`${corpo}|${serializza(parametri)}`) % BASE);
}

/** Genera un codice con un seme casuale (da usare sul telefono che crea la partita). */
export function generaCodice(
  parametri: Parametri,
  versione: number,
  casuale: () => number = Math.random,
): string {
  const seme = Math.floor(casuale() * BASE ** LUNGHEZZA_SEME);
  return codificaCodice({ seme, versione }, parametri);
}

export function codificaCodice({ seme, versione }: CodicePartita, parametri: Parametri): string {
  if (!Number.isInteger(seme) || seme < 0 || seme >= BASE ** LUNGHEZZA_SEME) {
    throw new RangeError(`Seme fuori intervallo: ${seme}`);
  }
  if (!Number.isInteger(versione) || versione < 0 || versione > MAX_VERSIONE) {
    throw new RangeError(`Versione fuori intervallo (0..${MAX_VERSIONE}): ${versione}`);
  }
  let corpo = "";
  let resto = seme;
  for (let i = 0; i < LUNGHEZZA_SEME; i++) {
    corpo = carattere(resto % BASE) + corpo;
    resto = Math.floor(resto / BASE);
  }
  corpo += carattere(versione);
  return corpo + controllo(corpo, parametri);
}

export type EsitoCodice =
  | { ok: true; codice: CodicePartita }
  | { ok: false; errore: "formato" | "controllo" };

/** Normalizza l'input utente: maiuscole, senza spazi né trattini (`k7f2-m9qx` → `K7F2M9QX`). */
export function normalizzaCodice(testo: string): string {
  return testo.toUpperCase().replace(/[\s-]/g, "");
}

export function decodificaCodice(testo: string, parametri: Parametri): EsitoCodice {
  const t = normalizzaCodice(testo);
  if (t.length !== LUNGHEZZA_SEME + 2 || [...t].some((c) => !ALFABETO.includes(c))) {
    return { ok: false, errore: "formato" };
  }
  const corpo = t.slice(0, LUNGHEZZA_SEME + 1);
  if (controllo(corpo, parametri) !== t.charAt(LUNGHEZZA_SEME + 1)) {
    return { ok: false, errore: "controllo" };
  }
  let seme = 0;
  for (let i = 0; i < LUNGHEZZA_SEME; i++) {
    seme = seme * BASE + ALFABETO.indexOf(t.charAt(i));
  }
  return { ok: true, codice: { seme, versione: ALFABETO.indexOf(t.charAt(LUNGHEZZA_SEME)) } };
}

/** Formattazione per la lettura a voce: `K7F2M9QX` → `K7F2-M9QX`. */
export function formattaCodice(codice: string): string {
  return `${codice.slice(0, 4)}-${codice.slice(4)}`;
}

/** Comodità: RNG pronto a partire da un codice decodificato. */
export function rngDaCodice(codice: CodicePartita) {
  return creaRng(codice.seme);
}
