import { IMP_ERRORI, confronta, numero, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Bersagli»: per tutta la durata del round compaiono cerchi in una griglia, ognuno resta acceso
 * per poco e poi sparisce. Si toccano per colpirli: chi ne colpisce di più vince, a parità vince
 * chi è stato più veloce. Chi tocca a vuoto può perdere un punto (una sola volta per round).
 * I due giocatori vedono gli stessi bersagli, nelle stesse celle e agli stessi istanti.
 */
export const DURATE_S = [5, 8, 10] as const;
export const DURATA_BASE_S = 8;
export const LATI = [2, 3, 4] as const;
export const LATO_BASE = 3;
export const VITE_S = [0.8, 1.2, 1.6] as const;
export const VITA_BASE_S = 1.2;
export const RITMI_S = [0.6, 0.9, 1.2] as const;
export const RITMO_BASE_S = 0.9;
/** Il primo bersaglio compare dopo questo tempo; l'ultimo almeno `CODA_MS` prima della fine. */
export const PRIMO_MS = 500;
export const CODA_MS = 400;
/** La vista riporta il risultato allo scadere; questo margine copre solo i ritardi del telefono. */
export const MARGINE_MS = 1500;
export const SOGLIA_PARI_MS = 1;

export interface Bersaglio {
  /** Istante di comparsa, in ms dall'inizio del round. */
  comparsaMs: number;
  /** Istante in cui sparisce da solo. */
  scadeMs: number;
  /** Cella della griglia (da 0 a `lato² - 1`, per righe). */
  cella: number;
}

export interface ConfigBersagli {
  durataMs: number;
  lato: number;
  bersagli: readonly Bersaglio[];
}

export interface RisultatoBersagli {
  /** Bersagli colpiti. */
  colpiti: number;
  /** Somma dei tempi di reazione dei colpiti (da quando sono comparsi). */
  sommaMs: number;
  /** Tocchi a vuoto. */
  vuoti: number;
}

export type EsitoTocco = { tipo: "colpito"; indice: number; ms: number } | { tipo: "ignorato" } | { tipo: "vuoto" };

/** Gli indici dei bersagli accesi all'istante `t`. */
export function attivi(c: ConfigBersagli, t: number): number[] {
  const out: number[] = [];
  c.bersagli.forEach((b, i) => {
    if (b.comparsaMs <= t && t < b.scadeMs) out.push(i);
  });
  return out;
}

/** Cosa succede toccando `cella` all'istante `t`, dati i bersagli già colpiti da chi tocca. */
export function valutaTocco(c: ConfigBersagli, t: number, cella: number, colpitiFinora: ReadonlySet<number>): EsitoTocco {
  const indice = attivi(c, t).find((i) => c.bersagli[i]?.cella === cella);
  if (indice === undefined) return { tipo: "vuoto" };
  if (colpitiFinora.has(indice)) return { tipo: "ignorato" };
  return { tipo: "colpito", indice, ms: Math.max(0, Math.round(t - (c.bersagli[indice] as Bersaglio).comparsaMs)) };
}

const conti = (r: RisultatoBersagli | Nessuno): RisultatoBersagli => ("nessuno" in r ? { colpiti: 0, sommaMs: 0, vuoti: 0 } : r);

export const bersagli: MiniGioco<ConfigBersagli, RisultatoBersagli> = {
  id: "bersagli",
  impostazioni: [
    { tipo: "scelta", chiave: "durata", valori: DURATE_S, base: DURATA_BASE_S, formato: "secondi" },
    { tipo: "scelta", chiave: "lato", valori: LATI, base: LATO_BASE, formato: "griglia" },
    { tipo: "scelta", chiave: "vita", valori: VITE_S, base: VITA_BASE_S, formato: "secondi" },
    { tipo: "scelta", chiave: "ritmo", valori: RITMI_S, base: RITMO_BASE_S, formato: "secondi" },
    IMP_ERRORI,
  ],
  prepara(rng, imp) {
    const durataMs = numero(imp, "durata") * 1000;
    const lato = numero(imp, "lato");
    const vitaMs = Math.round(numero(imp, "vita") * 1000);
    const ritmoMs = Math.round(numero(imp, "ritmo") * 1000);
    const celle = lato * lato;
    const lista: Bersaglio[] = [];
    let ultima = -1;
    for (let t = PRIMO_MS; t < durataMs - CODA_MS; t += ritmoMs) {
      const occupate = new Set(lista.filter((b) => b.scadeMs > t).map((b) => b.cella));
      const libere: number[] = [];
      for (let c = 0; c < celle; c++) if (!occupate.has(c) && c !== ultima) libere.push(c);
      // Nessuna cella libera: la comparsa salta (non succede con le impostazioni ammesse).
      if (libere.length === 0) continue;
      const cella = libere[rng.intero(libere.length)] as number;
      lista.push({ comparsaMs: t, scadeMs: t + vitaMs, cella });
      ultima = cella;
    }
    return { durataMs, lato, bersagli: lista };
  },
  durataMassima: (c) => c.durataMs + MARGINE_MS,
  chiudeAlPrimo: false,
  vincitore(_config, [a, b]): Lato | null {
    const ra = conti(a);
    const rb = conti(b);
    if (ra.colpiti !== rb.colpiti) return ra.colpiti > rb.colpiti ? 0 : 1;
    if (ra.colpiti === 0) return null;
    return confronta(ra.sommaMs, rb.sommaMs, "minore", SOGLIA_PARI_MS);
  },
  /** Errore: almeno un tocco a vuoto nel round (una sola penalità per round). */
  errore: (_config, r) => "vuoti" in r && r.vuoti > 0,
};
