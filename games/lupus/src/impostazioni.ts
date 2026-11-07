import { traduttore, type Lingua } from "@gdt/i18n";
import type { ImpostazioneGioco } from "@gdt/preferenze";
import { dizionari } from "./locales";

/**
 * Schermata di transizione: dopo «torna a dormire» e tra notte e giorno compare per questi secondi
 * una schermata sempre uguale. Chiave, valori e predefinito non dipendono dalla lingua; cambiano solo i testi.
 */
function transizione(lingua: Lingua): ImpostazioneGioco {
  const t = traduttore(dizionari, lingua);
  return {
    chiave: "transizione",
    testo: t("impTransizione"),
    aiuto: t("impTransizioneAiuto"),
    opzioni: [
      { valore: 0, testo: t("impNo") },
      ...[3, 5, 8, 10].map((n) => ({ valore: n, testo: t("impSecondi", { n }) })),
    ],
    predefinito: 5,
  };
}

/** Per leggere il valore con `usaPreferenza` (chiave e opzioni sono uguali in ogni lingua); i testi non si mostrano da qui. */
export const TRANSIZIONE: ImpostazioneGioco = transizione("it");

/** Le impostazioni del gioco con i testi nella lingua scelta. */
export function impostazioni(lingua: Lingua): readonly ImpostazioneGioco[] {
  return [transizione(lingua)];
}
