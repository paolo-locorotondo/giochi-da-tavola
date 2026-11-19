import { IMP_ERRORI, confronta, numero, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Colore giusto» (effetto Stroop): compare il nome di un colore scritto con un altro colore e
 * si tocca il colore **con cui è scritto**, non quello che dice la parola. Vince chi risponde
 * giusto per primo; chi sbaglia perde il round.
 */
/** Tutti i colori possibili, nell'ordine: con l'impostazione «colori» se ne usano i primi n. */
export const TUTTI_COLORI = ["rosso", "blu", "verde", "giallo", "viola"] as const;
export type Colore = (typeof TUTTI_COLORI)[number];
/** I colori di base (i primi quattro). */
export const COLORI: readonly Colore[] = TUTTI_COLORI.slice(0, 4);
export const NUMERI_COLORI = [4, 5] as const;
export const NUMERO_COLORI_BASE = 4;
export const coloriDa = (n: number): readonly Colore[] => TUTTI_COLORI.slice(0, n);

export interface ConfigColore {
  /** I colori in gioco (sono anche i tasti). */
  colori: readonly Colore[];
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
  impostazioni: [
    { tipo: "scelta", chiave: "colori", valori: NUMERI_COLORI, base: NUMERO_COLORI_BASE, formato: "numero" },
    IMP_ERRORI,
  ],
  prepara(rng, imp) {
    const colori = coloriDa(numero(imp, "colori"));
    const parola = colori[rng.intero(colori.length)] as Colore;
    const altri = colori.filter((c) => c !== parola);
    const inchiostro = altri[rng.intero(altri.length)] as Colore;
    return { colori, parola, inchiostro, attesaMs: ATTESA_MIN_MS + rng.intero(ATTESA_MAX_MS - ATTESA_MIN_MS + 1) };
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
  /** Errore: toccare un colore sbagliato (o toccare prima che compaia la parola). */
  errore: (_config, r) => "giusto" in r && !r.giusto,
};
