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
    tipo: "durata",
    chiave: "transizione",
    testo: t("impTransizione"),
    aiuto: t("impTransizioneAiuto"),
    min: 1,
    max: 60,
    predefinito: 5,
    unita: [t("impOre"), t("impMinuti"), t("impSecondiUnita")],
  };
}

/** Durata del timer della discussione, in secondi (da 1 secondo a 1 ora). */
export const SECONDI_DISCUSSIONE_PREDEFINITI = 180;
function discussione(lingua: Lingua): ImpostazioneGioco {
  const t = traduttore(dizionari, lingua);
  return {
    tipo: "durata",
    chiave: "discussione",
    testo: t("impDiscussione"),
    aiuto: t("impDiscussioneAiuto"),
    min: 1,
    max: 3600,
    predefinito: SECONDI_DISCUSSIONE_PREDEFINITI,
    unita: [t("impOre"), t("impMinuti"), t("impSecondiUnita")],
  };
}

/** Per leggere il valore con `usaPreferenza` (chiave e opzioni sono uguali in ogni lingua); i testi non si mostrano da qui. */
export const TRANSIZIONE: ImpostazioneGioco = transizione("it");

export const DISCUSSIONE: ImpostazioneGioco = discussione("it");

/** Le impostazioni del gioco con i testi nella lingua scelta. */
export function impostazioni(lingua: Lingua): readonly ImpostazioneGioco[] {
  return [transizione(lingua), discussione(lingua)];
}
