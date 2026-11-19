import { COLORI, type Colore } from "./colore";
import { confronta, numero, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Colori e nomi»: passano uno dopo l'altro nomi di colori scritti con un colore diverso
 * (es. «Rosso» scritto in verde). Quando compare una parola scritta con il **suo** colore
 * (es. «Blu» in blu) vince chi tocca per primo. Chi tocca prima perde il round, come in «Via!».
 */
export interface ParolaColorata {
  parola: Colore;
  inchiostro: Colore;
}

export interface ConfigNomi {
  /** Quanto resta ogni parola sullo schermo, in millisecondi. */
  passoMs: number;
  /** Le parole in ordine; solo l'ultima ha parola e inchiostro uguali. */
  parole: readonly ParolaColorata[];
}

export type RisultatoNomi = { ms: number } | { anticipo: true };

/** Impostazione «tempo per parola», in secondi. */
export const PASSI_S = [0.8, 1.3, 2] as const;
export const PASSO_BASE_S = 1.3;
export const PAROLE_MIN = 2;
export const PAROLE_MAX = 6;
export const MARGINE_MS = 3000;
export const SOGLIA_PARI_MS = 1;

/** Quando compare la parola giusta, in millisecondi dall'inizio del round. */
export const comparsaGiusta = (c: ConfigNomi): number => (c.parole.length - 1) * c.passoMs;

/** 0 = ha toccato sulla parola giusta, 1 = non ha toccato, 2 = ha toccato prima. */
function grado(r: RisultatoNomi | Nessuno): 0 | 1 | 2 {
  if ("anticipo" in r) return 2;
  if ("nessuno" in r) return 1;
  return 0;
}

export const nomi: MiniGioco<ConfigNomi, RisultatoNomi> = {
  id: "nomi",
  impostazioni: [{ tipo: "scelta", chiave: "passo", valori: PASSI_S, base: PASSO_BASE_S, formato: "secondi" }],
  prepara(rng, imp) {
    const quante = PAROLE_MIN + rng.intero(PAROLE_MAX - PAROLE_MIN + 1);
    const parole: ParolaColorata[] = [];
    for (let i = 0; i < quante - 1; i++) {
      // Mai la stessa parola di fila, così il cambio si vede.
      let parola: Colore;
      do parola = COLORI[rng.intero(COLORI.length)] as Colore;
      while (parola === parole[parole.length - 1]?.parola);
      const altri = COLORI.filter((c) => c !== parola);
      parole.push({ parola, inchiostro: altri[rng.intero(altri.length)] as Colore });
    }
    let giusta: Colore;
    do giusta = COLORI[rng.intero(COLORI.length)] as Colore;
    while (giusta === parole[parole.length - 1]?.parola);
    parole.push({ parola: giusta, inchiostro: giusta });
    return { passoMs: Math.round(numero(imp, "passo") * 1000), parole };
  },
  durataMassima: (c) => comparsaGiusta(c) + MARGINE_MS,
  chiudeAlPrimo: true,
  vincitore(_config, [a, b]): Lato | null {
    const ga = grado(a);
    const gb = grado(b);
    if (ga !== gb) return ga < gb ? 0 : 1;
    if ("ms" in a && "ms" in b) return confronta(a.ms, b.ms, "minore", SOGLIA_PARI_MS);
    return null;
  },
};
