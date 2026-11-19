import { confronta, type MiniGioco, type Nessuno } from "./tipi";

/** «Raffica»: per qualche secondo si tocca il più possibile; vince chi tocca di più. */
export interface ConfigRaffica {
  durataMs: number;
}

export interface RisultatoRaffica {
  tocchi: number;
}

export const DURATA_RAFFICA_MS = 5000;
/** La vista riporta il risultato allo scadere; questo margine copre solo i ritardi del telefono. */
export const MARGINE_RAFFICA_MS = 1500;

const tocchi = (r: RisultatoRaffica | Nessuno): number => ("tocchi" in r ? r.tocchi : 0);

export const raffica: MiniGioco<ConfigRaffica, RisultatoRaffica> = {
  id: "raffica",
  prepara: () => ({ durataMs: DURATA_RAFFICA_MS }),
  durataMassima: (c) => c.durataMs + MARGINE_RAFFICA_MS,
  chiudeAlPrimo: false,
  vincitore: (_config, [a, b]) => confronta(tocchi(a), tocchi(b), "maggiore"),
};
