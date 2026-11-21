import { IMP_ERRORI, confronta, numero, type Lato, type MiniGioco, type Nessuno } from "./tipi";
import { colonne } from "./memoria";

/**
 * «Il più grande»: compaiono dei numeri e si tocca il più grande. Vince chi lo tocca giusto per
 * primo; chi tocca un altro numero perde il round. I due giocatori vedono gli stessi numeri,
 * nelle stesse posizioni.
 */
export const NUMERI_SCELTI = [4, 6, 9] as const;
export const NUMERI_BASE = 6;
export const CIFRE_SCELTE = [2, 3] as const;
export const CIFRE_BASE = 2;
export const DISTANZE = [1, 5, 10] as const;
export const DISTANZA_BASE = 5;
/** Dopo quanti ms dalla comparsa il round si chiude comunque. */
export const DURATA_MS = 6000;
export const SOGLIA_PARI_MS = 1;

/** L'intervallo dei numeri per quante cifre. */
export const intervallo = (cifre: number): readonly [number, number] => (cifre === 2 ? [10, 99] : [100, 999]);

export interface ConfigPiuGrande {
  colonne: number;
  /** I numeri, nella posizione della griglia (distinti). */
  numeri: readonly number[];
  /** La posizione del numero più grande. */
  indicePiuGrande: number;
}

export interface RisultatoPiuGrande {
  giusto: boolean;
  /** Dal momento in cui i numeri compaiono. */
  ms: number;
}

/** 0 = numero giusto, 1 = nessun tocco, 2 = numero sbagliato. */
function grado(r: RisultatoPiuGrande | Nessuno): 0 | 1 | 2 {
  if ("nessuno" in r) return 1;
  return r.giusto ? 0 : 2;
}

export const piugrande: MiniGioco<ConfigPiuGrande, RisultatoPiuGrande> = {
  id: "piugrande",
  impostazioni: [
    { tipo: "scelta", chiave: "numeri", valori: NUMERI_SCELTI, base: NUMERI_BASE, formato: "numero" },
    { tipo: "scelta", chiave: "cifre", valori: CIFRE_SCELTE, base: CIFRE_BASE, formato: "numero" },
    { tipo: "scelta", chiave: "distanza", valori: DISTANZE, base: DISTANZA_BASE, formato: "numero" },
    IMP_ERRORI,
  ],
  prepara(rng, imp) {
    const quanti = numero(imp, "numeri");
    const distanza = numero(imp, "distanza");
    const [min, max] = intervallo(numero(imp, "cifre"));
    // Il più grande sta tra il minimo che lascia posto agli altri e il massimo; gli altri sono
    // distinti e almeno `distanza` sotto di lui, quindi il vincolo vale sempre (senza rifiuti).
    const piuPiccolo = min + distanza + quanti - 2;
    const grande = piuPiccolo + rng.intero(max - piuPiccolo + 1);
    const candidati: number[] = [];
    for (let n = min; n <= grande - distanza; n++) candidati.push(n);
    const altri = rng.mescola(candidati).slice(0, quanti - 1);
    const numeri = rng.mescola([grande, ...altri]);
    return { colonne: colonne(quanti), numeri, indicePiuGrande: numeri.indexOf(grande) };
  },
  durataMassima: () => DURATA_MS,
  chiudeAlPrimo: false,
  vincitore(_config, [a, b]): Lato | null {
    const ga = grado(a);
    const gb = grado(b);
    if (ga !== gb) return ga < gb ? 0 : 1;
    if (ga === 0) return confronta((a as RisultatoPiuGrande).ms, (b as RisultatoPiuGrande).ms, "minore", SOGLIA_PARI_MS);
    return null;
  },
  /** Errore: toccare un numero che non è il più grande. */
  errore: (_config, r) => "giusto" in r && !r.giusto,
};
