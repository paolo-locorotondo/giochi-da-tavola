import { confronta, numero, type MiniGioco, type Nessuno } from "./tipi";

/** «Raffica»: per qualche secondo si tocca il più possibile; vince chi tocca di più. */
export interface ConfigRaffica {
  durataMs: number;
}

export interface RisultatoRaffica {
  tocchi: number;
}

/** Impostazione «durata», in secondi. */
export const DURATE_S = [3, 5, 10] as const;
export const DURATA_BASE_S = 5;
/** La vista riporta il risultato allo scadere; questo margine copre solo i ritardi del telefono. */
export const MARGINE_RAFFICA_MS = 1500;

const tocchi = (r: RisultatoRaffica | Nessuno): number => ("tocchi" in r ? r.tocchi : 0);

export const raffica: MiniGioco<ConfigRaffica, RisultatoRaffica> = {
  id: "raffica",
  impostazioni: [{ tipo: "scelta", chiave: "durata", valori: DURATE_S, base: DURATA_BASE_S, formato: "secondi" }],
  prepara: (_rng, imp) => ({ durataMs: numero(imp, "durata") * 1000 }),
  durataMassima: (c) => c.durataMs + MARGINE_RAFFICA_MS,
  chiudeAlPrimo: false,
  vincitore: (_config, [a, b]) => confronta(tocchi(a), tocchi(b), "maggiore"),
};
