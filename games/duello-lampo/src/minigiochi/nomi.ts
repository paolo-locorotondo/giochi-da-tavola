import { COLORI, type Colore } from "./colore";
import { IMP_ERRORI, confronta, numero, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Colori e nomi»: passano uno dopo l'altro nomi di colori scritti con un colore diverso
 * (es. «Rosso» scritto in verde). A un certo punto compare una parola scritta con il **suo**
 * colore (es. «Blu» in blu): vince chi tocca per primo mentre è sullo schermo. Chi tocca quando
 * nome e colore non combaciano sbaglia e perde il round.
 *
 * Dopo la parola giusta ne passano **altre**: se lo scorrimento si fermasse, il fermo direbbe da
 * solo che è il momento di toccare (e il gioco diventerebbe come «Via!»).
 */
export interface ParolaColorata {
  parola: Colore;
  inchiostro: Colore;
}

export interface ConfigNomi {
  /** Quanto resta ogni parola sullo schermo, in millisecondi. */
  passoMs: number;
  /** Le parole in ordine; solo quella in `indiceGiusta` ha parola e inchiostro uguali. */
  parole: readonly ParolaColorata[];
  /** La posizione della parola che combacia. */
  indiceGiusta: number;
}

/** `ms` = ha toccato sulla parola giusta (tempo dalla sua comparsa); `sbagliato` = ha toccato quando non combaciava. */
export type RisultatoNomi = { ms: number } | { sbagliato: true };

/** Impostazione «tempo per parola», in secondi. */
export const PASSI_S = [0.8, 1.3, 2] as const;
export const PASSO_BASE_S = 1.3;
/** Quante parole passano prima di quella giusta (almeno una, così la prima non combacia mai). */
export const PRIMA_MIN = 1;
export const PRIMA_MAX = 5;
/** Quante parole passano dopo quella giusta, prima che il round finisca. */
export const PAROLE_DOPO = 3;
/** Margine dopo l'ultima parola: copre solo i ritardi del telefono. */
export const MARGINE_MS = 300;
export const SOGLIA_PARI_MS = 1;

/** Quando compare la parola giusta, in millisecondi dall'inizio del round. */
export const comparsaGiusta = (c: ConfigNomi): number => c.indiceGiusta * c.passoMs;

/** 0 = ha toccato sulla parola giusta, 1 = non ha toccato, 2 = ha toccato quando non combaciava. */
function grado(r: RisultatoNomi | Nessuno): 0 | 1 | 2 {
  if ("sbagliato" in r) return 2;
  if ("nessuno" in r) return 1;
  return 0;
}

export const nomi: MiniGioco<ConfigNomi, RisultatoNomi> = {
  id: "nomi",
  impostazioni: [{ tipo: "scelta", chiave: "passo", valori: PASSI_S, base: PASSO_BASE_S, formato: "secondi" }, IMP_ERRORI],
  prepara(rng, imp) {
    const indiceGiusta = PRIMA_MIN + rng.intero(PRIMA_MAX - PRIMA_MIN + 1);
    const totale = indiceGiusta + 1 + PAROLE_DOPO;
    const parole: ParolaColorata[] = [];
    for (let i = 0; i < totale; i++) {
      // Mai la stessa parola di fila, così il cambio si vede.
      let parola: Colore;
      do parola = COLORI[rng.intero(COLORI.length)] as Colore;
      while (parola === parole[parole.length - 1]?.parola);
      if (i === indiceGiusta) {
        parole.push({ parola, inchiostro: parola });
      } else {
        const altri = COLORI.filter((c) => c !== parola);
        parole.push({ parola, inchiostro: altri[rng.intero(altri.length)] as Colore });
      }
    }
    return { passoMs: Math.round(numero(imp, "passo") * 1000), parole, indiceGiusta };
  },
  durataMassima: (c) => c.parole.length * c.passoMs + MARGINE_MS,
  chiudeAlPrimo: true,
  vincitore(_config, [a, b]): Lato | null {
    const ga = grado(a);
    const gb = grado(b);
    if (ga !== gb) return ga < gb ? 0 : 1;
    if ("ms" in a && "ms" in b) return confronta(a.ms, b.ms, "minore", SOGLIA_PARI_MS);
    return null;
  },
  /** Errore: toccare quando nome e colore non combaciano. */
  errore: (_config, r) => "sbagliato" in r,
};
