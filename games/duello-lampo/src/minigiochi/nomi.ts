import { COLORI, type Colore } from "./colore";
import { IMP_ERRORI, confronta, numero, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Colori e nomi»: passano uno dopo l'altro nomi di colori, quasi sempre scritti con un colore
 * diverso (es. «Rosso» scritto in verde). Alcune parole, in posizioni casuali, sono scritte con
 * il **loro** colore (es. «Blu» in blu): vince chi tocca per primo mentre una di queste è sullo
 * schermo. Chi tocca quando nome e colore non combaciano sbaglia e perde il round.
 *
 * Quante parole passano e quante combaciano sono impostazioni; le posizioni delle parole giuste
 * sono casuali (anche la prima o l'ultima), così né il fermo né il conto delle parole dicono
 * quando toccare.
 */
export interface ParolaColorata {
  parola: Colore;
  inchiostro: Colore;
}

export interface ConfigNomi {
  /** Quanto resta ogni parola sullo schermo, in millisecondi. */
  passoMs: number;
  /** Le parole in ordine; solo quelle in `giuste` hanno parola e inchiostro uguali. */
  parole: readonly ParolaColorata[];
  /** Le posizioni delle parole che combaciano, in ordine crescente. */
  giuste: readonly number[];
}

/** `ms` = ha toccato su una parola giusta (tempo dalla sua comparsa); `sbagliato` = ha toccato quando non combaciava. */
export type RisultatoNomi = { ms: number } | { sbagliato: true };

/** Impostazione «tempo per parola», in secondi. */
export const PASSI_S = [0.8, 1.3, 2] as const;
export const PASSO_BASE_S = 1.3;
/** Impostazione «parole nel round». */
export const PAROLE_MIN = 2;
export const PAROLE_MAX = 10;
export const PAROLE_BASE = 6;
/** Impostazione «parole che combaciano»: almeno una, al massimo tutte tranne una. */
export const GIUSTE_BASE = 1;
/** Margine dopo l'ultima parola: copre solo i ritardi del telefono. */
export const MARGINE_MS = 300;
export const SOGLIA_PARI_MS = 1;

const intervallo = (da: number, a: number): number[] => Array.from({ length: a - da + 1 }, (_, i) => da + i);

/** Quando compare la prima parola giusta, in millisecondi dall'inizio del round. */
export const comparsaGiusta = (c: ConfigNomi): number => (c.giuste[0] ?? 0) * c.passoMs;

/** 0 = ha toccato su una parola giusta, 1 = non ha toccato, 2 = ha toccato quando non combaciava. */
function grado(r: RisultatoNomi | Nessuno): 0 | 1 | 2 {
  if ("sbagliato" in r) return 2;
  if ("nessuno" in r) return 1;
  return 0;
}

export const nomi: MiniGioco<ConfigNomi, RisultatoNomi> = {
  id: "nomi",
  impostazioni: [
    { tipo: "scelta", chiave: "passo", valori: PASSI_S, base: PASSO_BASE_S, formato: "secondi" },
    { tipo: "scelta", chiave: "parole", valori: intervallo(PAROLE_MIN, PAROLE_MAX), base: PAROLE_BASE, formato: "numero", contatore: true },
    {
      tipo: "scelta",
      chiave: "giuste",
      valori: intervallo(1, PAROLE_MAX - 1),
      base: GIUSTE_BASE,
      formato: "numero",
      contatore: true,
      // Se combaciassero tutte non ci sarebbe niente da distinguere.
      massimo: (v) => numero(v, "parole") - 1,
    },
    IMP_ERRORI,
  ],
  prepara(rng, imp) {
    const totale = numero(imp, "parole");
    const quante = Math.min(Math.max(1, numero(imp, "giuste")), totale - 1);
    const giuste = rng
      .mescola(intervallo(0, totale - 1))
      .slice(0, quante)
      .sort((a, b) => a - b);
    const parole: ParolaColorata[] = [];
    for (let i = 0; i < totale; i++) {
      // Mai la stessa parola di fila, così il cambio si vede (anche tra due parole giuste vicine).
      let parola: Colore;
      do parola = COLORI[rng.intero(COLORI.length)] as Colore;
      while (parola === parole[parole.length - 1]?.parola);
      if (giuste.includes(i)) {
        parole.push({ parola, inchiostro: parola });
      } else {
        const altri = COLORI.filter((c) => c !== parola);
        parole.push({ parola, inchiostro: altri[rng.intero(altri.length)] as Colore });
      }
    }
    return { passoMs: Math.round(numero(imp, "passo") * 1000), parole, giuste };
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
