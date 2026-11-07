import type { ImpostazioneGioco } from "@gdt/preferenze";

/**
 * Schermata di transizione: dopo «torna a dormire» e tra notte e giorno compare per questi secondi
 * sempre la stessa schermata, così chi riapre gli occhi troppo presto non vede il ruolo successivo.
 */
export const TRANSIZIONE: ImpostazioneGioco = {
  chiave: "transizione",
  testo: "Schermata di transizione",
  aiuto: "Tra un ruolo e l'altro e tra notte e giorno: il tempo per tornare a dormire senza vedere la schermata dopo.",
  opzioni: [
    { valore: 0, testo: "No" },
    { valore: 3, testo: "3 s" },
    { valore: 5, testo: "5 s" },
    { valore: 8, testo: "8 s" },
    { valore: 10, testo: "10 s" },
  ],
  predefinito: 5,
};

export const IMPOSTAZIONI = [TRANSIZIONE] as const;
