import dati from "../data/it/carte.json";

/**
 * Carte originali (non sono quelle del gioco commerciale): parola da far indovinare
 * e cinque parole vietate. Si modificano in `data/it/carte.json`, vedi il README del gioco.
 */
export interface Carta {
  parola: string;
  vietate: string[];
}

export const CARTE: Carta[] = dati;
