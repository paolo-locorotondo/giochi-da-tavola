import { confronta, numero, type MiniGioco, type Nessuno } from "./tipi";

/**
 * «Stop al centro»: un indicatore scorre avanti e indietro su una barra; si tocca quando è
 * al centro. Vince chi si ferma più vicino. La posizione dipende solo dal tempo trascorso,
 * quindi i due giocatori vedono lo stesso movimento.
 */
export interface ConfigStop {
  /** Durata di un'andata e ritorno, in millisecondi. */
  periodoMs: number;
  /** Punto del ciclo da cui si parte (0 ≤ faseMs < periodoMs). */
  faseMs: number;
}

/** `distanza` dal centro, da 0 (preciso) a 0,5 (ai bordi). */
export interface RisultatoStop {
  distanza: number;
}

/** Impostazione «velocità»: 1 lenta, 2 media, 3 veloce. Per ognuna, il periodo minimo e massimo (ms). */
export const VELOCITA = [1, 2, 3] as const;
export const VELOCITA_BASE = 2;
export const PERIODI: Readonly<Record<number, readonly [number, number]>> = { 1: [2600, 3400], 2: [1600, 2600], 3: [1000, 1500] };
export const PERIODO_MIN_MS = 1000;
export const PERIODO_MAX_MS = 3400;
/** Quanti cicli si lasciano al massimo prima di chiudere il round. */
export const CICLI_MASSIMI = 2;
/** Sotto questa differenza di distanza (frazione della barra) i due contano come pari. */
export const SOGLIA_PARI = 0.004;

/** Posizione dell'indicatore dopo `tMs` millisecondi: 0 = sinistra, 1 = destra (onda triangolare). */
export function posizione(config: ConfigStop, tMs: number): number {
  const p = (((tMs + config.faseMs) % config.periodoMs) + config.periodoMs) % config.periodoMs / config.periodoMs;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

/** Distanza dal centro di una posizione (0–1). */
export const distanzaDalCentro = (pos: number): number => Math.abs(pos - 0.5);

const distanza = (r: RisultatoStop | Nessuno): number => ("distanza" in r ? r.distanza : Infinity);

export const stop: MiniGioco<ConfigStop, RisultatoStop> = {
  id: "stop",
  impostazioni: [{ tipo: "scelta", chiave: "velocita", valori: VELOCITA, base: VELOCITA_BASE, formato: "numero" }],
  prepara(rng, imp) {
    const [min, max] = PERIODI[numero(imp, "velocita")] ?? (PERIODI[VELOCITA_BASE] as readonly [number, number]);
    const periodoMs = min + rng.intero(max - min + 1);
    return { periodoMs, faseMs: rng.intero(periodoMs) };
  },
  durataMassima: (c) => c.periodoMs * CICLI_MASSIMI,
  chiudeAlPrimo: false,
  vincitore(_config, [a, b]) {
    const da = distanza(a);
    const db = distanza(b);
    // Se uno solo ha toccato vince lui; se nessuno ha toccato è pari.
    if (da === Infinity || db === Infinity) return da === db ? null : da < db ? 0 : 1;
    return confronta(da, db, "minore", SOGLIA_PARI);
  },
};
