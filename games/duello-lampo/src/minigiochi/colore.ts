import { confronta, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Colore giusto» (effetto Stroop): compare il nome di un colore scritto con un altro colore e
 * si tocca il colore **con cui è scritto**, non quello che dice la parola. Vince chi risponde
 * giusto per primo; chi sbaglia perde il round.
 */
export const COLORI = ["rosso", "blu", "verde", "giallo"] as const;
export type Colore = (typeof COLORI)[number];

export interface ConfigColore {
  /** La parola mostrata (il nome di un colore). */
  parola: Colore;
  /** Il colore con cui è scritta: la risposta giusta. Sempre diverso dalla parola. */
  inchiostro: Colore;
  /** Attesa prima che la parola compaia, in millisecondi. */
  attesaMs: number;
}

/** `ms` dall'apparizione della parola; `giusto` dice se ha toccato il colore dell'inchiostro. */
export interface RisultatoColore {
  giusto: boolean;
  ms: number;
}

export const ATTESA_MIN_MS = 800;
export const ATTESA_MAX_MS = 2000;
export const MARGINE_MS = 5000;
export const SOGLIA_PARI_MS = 1;

/** 0 = risposta giusta, 1 = nessuna risposta, 2 = risposta sbagliata. */
function grado(r: RisultatoColore | Nessuno): 0 | 1 | 2 {
  if ("nessuno" in r) return 1;
  return r.giusto ? 0 : 2;
}

export const colore: MiniGioco<ConfigColore, RisultatoColore> = {
  id: "colore",
  prepara(rng) {
    const parola = COLORI[rng.intero(COLORI.length)] as Colore;
    const altri = COLORI.filter((c) => c !== parola);
    const inchiostro = altri[rng.intero(altri.length)] as Colore;
    return { parola, inchiostro, attesaMs: ATTESA_MIN_MS + rng.intero(ATTESA_MAX_MS - ATTESA_MIN_MS + 1) };
  },
  durataMassima: (c) => c.attesaMs + MARGINE_MS,
  chiudeAlPrimo: false,
  vincitore(_config, [a, b]): Lato | null {
    const ga = grado(a);
    const gb = grado(b);
    if (ga !== gb) return ga < gb ? 0 : 1;
    if (ga === 0) return confronta((a as RisultatoColore).ms, (b as RisultatoColore).ms, "minore", SOGLIA_PARI_MS);
    return null;
  },
};
