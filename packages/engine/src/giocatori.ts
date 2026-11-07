import { MAX_CARATTERI_NOME, limitaTesto } from "./testo";

export interface Giocatore {
  /** Numero di posto al tavolo, a partire da 1. Identifica il giocatore in partita. */
  posto: number;
  nome: string;
}

/**
 * Crea i giocatori dai nomi, nell'ordine dato. Il posto è la posizione + 1.
 * I nomi più lunghi di `MAX_CARATTERI_NOME` vengono accorciati.
 * Errore se un nome è vuoto o duplicato (dopo il trim).
 */
export function creaGiocatori(nomi: readonly string[]): Giocatore[] {
  const visti = new Set<string>();
  return nomi.map((nomeGrezzo, indice) => {
    const nome = limitaTesto(nomeGrezzo.trim(), MAX_CARATTERI_NOME);
    if (nome.length === 0) {
      throw new Error(`Il giocatore al posto ${indice + 1} non ha un nome`);
    }
    const chiave = nome.toLocaleLowerCase("it-IT");
    if (visti.has(chiave)) {
      throw new Error(`Nome duplicato: ${nome}`);
    }
    visti.add(chiave);
    return { posto: indice + 1, nome };
  });
}
