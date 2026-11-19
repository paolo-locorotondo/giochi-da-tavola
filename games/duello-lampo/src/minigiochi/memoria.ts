import { confronta, numero, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Memoria lampo»: si accende una breve sequenza di caselle, poi va ripetuta toccandole nello
 * stesso ordine. Vince chi la ripete giusta per primo; chi sbaglia una casella perde il round.
 * I due giocatori vedono la stessa sequenza, ognuno sulla sua metà.
 */
/** Impostazioni: quante caselle e quanto è lunga la sequenza. */
export const CASELLE_SCELTE = [4, 6, 9] as const;
export const CASELLE = 4;
export const LUNGHEZZE = [3, 4, 5, 6, 7, 8] as const;
export const LUNGHEZZA = 4;
/** Colonne della griglia per ogni numero di caselle. */
export const colonne = (caselle: number): number => (caselle === 4 ? 2 : 3);
/** Quanto resta accesa ogni casella nella dimostrazione, e la pausa tra una e l'altra. */
export const ACCESA_MS = 550;
export const PAUSA_MS = 250;
export const ATTESA_INIZIALE_MS = 600;

export interface ConfigMemoria {
  /** Quante caselle ha la griglia. */
  caselle: number;
  /** Le caselle da ripetere, nell'ordine (da 0 a `caselle - 1`). */
  sequenza: readonly number[];
}

/** `ms` dal momento in cui si può cominciare a ripetere (fine della dimostrazione). */
export interface RisultatoMemoria {
  /** Sequenza completata giusta? Se è sbagliata `ms` è quando ha sbagliato. */
  giusta: boolean;
  ms: number;
}

/** Fine della dimostrazione, in millisecondi dall'inizio del round. */
export const fineDimostrazione = (c: ConfigMemoria): number =>
  ATTESA_INIZIALE_MS + c.sequenza.length * (ACCESA_MS + PAUSA_MS);

export const MARGINE_MS = 8000;
export const SOGLIA_PARI_MS = 1;

/** 0 = sequenza giusta, 1 = non ha finito, 2 = ha sbagliato. */
function grado(r: RisultatoMemoria | Nessuno): 0 | 1 | 2 {
  if ("nessuno" in r) return 1;
  return r.giusta ? 0 : 2;
}

export const memoria: MiniGioco<ConfigMemoria, RisultatoMemoria> = {
  id: "memoria",
  impostazioni: [
    { tipo: "scelta", chiave: "caselle", valori: CASELLE_SCELTE, base: CASELLE, formato: "numero" },
    { tipo: "scelta", chiave: "lunghezza", valori: LUNGHEZZE, base: LUNGHEZZA, formato: "numero" },
  ],
  prepara(rng, imp) {
    const caselle = numero(imp, "caselle");
    const lunghezza = numero(imp, "lunghezza");
    const sequenza: number[] = [];
    // Mai la stessa casella due volte di fila: la dimostrazione sarebbe poco chiara.
    while (sequenza.length < lunghezza) {
      const n = rng.intero(caselle);
      if (n !== sequenza[sequenza.length - 1]) sequenza.push(n);
    }
    return { caselle, sequenza };
  },
  durataMassima: (c) => fineDimostrazione(c) + MARGINE_MS,
  chiudeAlPrimo: false,
  vincitore(_config, [a, b]): Lato | null {
    const ga = grado(a);
    const gb = grado(b);
    if (ga !== gb) return ga < gb ? 0 : 1;
    if (ga === 0) return confronta((a as RisultatoMemoria).ms, (b as RisultatoMemoria).ms, "minore", SOGLIA_PARI_MS);
    return null;
  },
};
