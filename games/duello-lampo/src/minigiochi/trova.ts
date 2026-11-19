import { confronta, type Lato, type MiniGioco, type Nessuno } from "./tipi";

/**
 * Mini giochi «trova»: una griglia di figure colorate. A ogni passo cambiano **solo alcune
 * caselle** a caso (non tutta la griglia, che stancherebbe la vista); dopo qualche passo, tra le
 * caselle che cambiano c'è la figura da trovare. Vince chi la tocca per primo; chi tocca
 * un'altra figura, o tocca prima che il bersaglio compaia, perde il round.
 *
 * Le figure sono solo nomi: la vista sceglie l'icona di ognuna (vedi `ui/minigiochi/TrovaVista`).
 * «Trova il panda» e «Trova lo smile» sono due configurazioni dello stesso modulo.
 */

/** Come si comporta la griglia. Oggi sono valori fissi; diventeranno le impostazioni del mini gioco. */
export interface ParametriTrova {
  /** Lato della griglia (3 = 3×3, 4 = 4×4, …). */
  lato: number;
  /** Quante caselle cambiano a ogni passo (da 1 a tutte). */
  cambi: number;
  /** Ogni quanto cambiano, in millisecondi. */
  passoMs: number;
  /** Le figure che cambiano prendono anche una direzione nuova. */
  ruotano: boolean;
  /** Tutte le figure dritte verso il giocatore (modalità facile): niente rotazioni. */
  dritte: boolean;
}

export const PARAMETRI_BASE: ParametriTrova = { lato: 4, cambi: 3, passoMs: 1000, ruotano: true, dritte: false };

/** Quanti colori diversi (indici in una tavolozza di token) si usano. */
export const NUMERO_COLORI = 5;
/** Quanti passi (cambi) prima di quello con il bersaglio. */
export const PASSI_MIN = 2;
export const PASSI_MAX = 6;
/** Dopo la comparsa del bersaglio, quanto tempo si lascia per trovarlo. */
export const MARGINE_MS = 5000;
export const SOGLIA_PARI_MS = 1;

export interface CasellaTrova {
  figura: string;
  /** Indice del colore, da 0 a `NUMERO_COLORI - 1`. */
  colore: number;
  /** Rotazione in gradi, a passi di 45 (sempre 0 con `dritte`). */
  gradi: number;
}

/** Le caselle che cambiano in un passo: posizione e nuovo contenuto. */
export type CambioTrova = readonly { posizione: number; casella: CasellaTrova }[];

export interface ConfigTrova {
  lato: number;
  passoMs: number;
  /** La griglia all'inizio del round. */
  iniziale: readonly CasellaTrova[];
  /** I cambi, uno per passo; nell'ultimo c'è il bersaglio in `posizione`. */
  passi: readonly CambioTrova[];
  /** La casella del bersaglio. */
  posizione: number;
}

/** `ms` dalla comparsa del bersaglio; `trovato` dice se ha toccato il bersaglio. */
export interface RisultatoTrova {
  trovato: boolean;
  ms: number;
}

/** Quando compare il bersaglio, in millisecondi dall'inizio del round. */
export const comparsa = (c: ConfigTrova): number => c.passi.length * c.passoMs;

/** La griglia dopo `n` passi (0 = quella iniziale). */
export function grigliaAlPasso(c: ConfigTrova, n: number): CasellaTrova[] {
  const g = [...c.iniziale];
  for (const cambio of c.passi.slice(0, n)) for (const { posizione, casella } of cambio) g[posizione] = casella;
  return g;
}

/** 0 = ha trovato, 1 = non ha toccato, 2 = ha sbagliato. */
function grado(r: RisultatoTrova | Nessuno): 0 | 1 | 2 {
  if ("nessuno" in r) return 1;
  return r.trovato ? 0 : 2;
}

const uguali = (a: CasellaTrova, b: CasellaTrova) => a.figura === b.figura && a.colore === b.colore && a.gradi === b.gradi;

/** Crea un mini gioco «trova»: `bersaglio` va trovato tra i `distrattori` (che non lo contengono). */
export function creaTrova(
  id: string,
  bersaglio: string,
  distrattori: readonly string[],
  parametri: ParametriTrova = PARAMETRI_BASE,
): MiniGioco<ConfigTrova, RisultatoTrova> {
  if (distrattori.length === 0 || distrattori.includes(bersaglio)) throw new Error(`creaTrova: distrattori non validi per «${id}»`);
  const { lato, passoMs, ruotano, dritte } = parametri;
  const caselle = lato * lato;
  const cambi = Math.min(Math.max(1, parametri.cambi), caselle);

  return {
    id,
    prepara(rng) {
      const gradi = () => (dritte ? 0 : rng.intero(8) * 45);
      const nuova = (figura: string): CasellaTrova => ({ figura, colore: rng.intero(NUMERO_COLORI), gradi: gradi() });
      const distrattore = () => nuova(distrattori[rng.intero(distrattori.length)] as string);

      const iniziale = Array.from({ length: caselle }, distrattore);
      const griglia = [...iniziale];
      const quanti = PASSI_MIN + rng.intero(PASSI_MAX - PASSI_MIN + 1);
      const passi: CambioTrova[] = [];
      let posizione = 0;

      for (let p = 0; p <= quanti; p++) {
        const scelte = rng.mescola(Array.from({ length: caselle }, (_, i) => i)).slice(0, cambi);
        const ultimo = p === quanti;
        if (ultimo) posizione = scelte[rng.intero(scelte.length)] as number;
        const cambio = scelte.map((i) => {
          const prima = griglia[i] as CasellaTrova;
          let casella: CasellaTrova;
          if (ultimo && i === posizione) casella = nuova(bersaglio);
          else {
            // Ogni casella che cambia deve cambiare davvero, altrimenti non si vede.
            do {
              casella = distrattore();
              if (!ruotano) casella = { ...casella, gradi: prima.gradi };
            } while (uguali(casella, prima));
          }
          griglia[i] = casella;
          return { posizione: i, casella };
        });
        passi.push(cambio);
      }
      return { lato, passoMs, iniziale, passi, posizione };
    },
    durataMassima: (c) => comparsa(c) + MARGINE_MS,
    chiudeAlPrimo: false,
    vincitore(_config, [a, b]): Lato | null {
      const ga = grado(a);
      const gb = grado(b);
      if (ga !== gb) return ga < gb ? 0 : 1;
      if (ga === 0) return confronta((a as RisultatoTrova).ms, (b as RisultatoTrova).ms, "minore", SOGLIA_PARI_MS);
      return null;
    },
  };
}

export const ANIMALI = ["gatto", "cane", "uccello", "pesce", "coniglio", "topo", "lumaca", "scoiattolo", "tartaruga"] as const;

/** «Trova il panda»: tra animali di ogni tipo. */
export const panda = creaTrova("panda", "panda", ANIMALI);

/** «Trova lo smile»: tra faccine tristi, una sola sorride. */
export const smile = creaTrova("smile", "felice", ["triste"]);
