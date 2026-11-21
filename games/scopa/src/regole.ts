/**
 * Le regole della Scopa in un posto solo: numeri e scelte del regolamento.
 * Fonti e punti da verificare: vedi «Regole e fonti» nel README del gioco.
 * Per una variante si aggiunge qui una costante (o un'opzione di `config`), poi la si usa in `logica.ts` o `punti.ts`.
 */

/** Numero di giocatori ammessi in questa versione: 2, oppure 4 a coppie (3 rinviato). */
export const POSTI_AMMESSI = [2, 4] as const;
export type Posti = (typeof POSTI_AMMESSI)[number];

/** Carte scoperte sul tavolo all'inizio del round. */
export const CARTE_TAVOLO = 4;
/** Carte date a ognuno a ogni distribuzione. */
export const CARTE_MANO = 3;

/** Punti per vincere la partita: 11 di base, 21 a scelta. */
export const SOGLIE = [11, 21] as const;
export type Soglia = (typeof SOGLIE)[number];
export const SOGLIA_PREDEFINITA: Soglia = 11;

/** Valore di ogni carta nella primiera (per valore della carta: 1 = asso, 8 fante, 9 cavallo, 10 re). */
export const VALORE_PRIMIERA: Readonly<Record<number, number>> = {
  7: 21,
  6: 18,
  1: 16,
  5: 15,
  4: 14,
  3: 13,
  2: 12,
  8: 10,
  9: 10,
  10: 10,
};

/** La primiera si calcola solo con almeno una carta per ogni seme; senza, è nulla (non vale). */
export const PRIMIERA_SERVE_OGNI_SEME = true;

/** La scopa fatta con l'ultima carta giocata del round non vale. */
export const SCOPA_ALL_ULTIMA_GIOCATA = false;

/**
 * Se c'è una carta di pari valore sul tavolo, si deve prendere quella (e solo quella), anche se
 * sarebbe possibile una presa per somma.
 */
export const PRESA_SINGOLA_OBBLIGATORIA = true;

/** Il settebello: il sette di denari. */
export const SETTEBELLO = { seme: "denari", valore: 7 } as const;
/** Il seme che conta per il punto «denari». */
export const SEME_DENARI = "denari";

/** Quanti eventi restano nell'elenco mostrato a tutti. */
export const MAX_EVENTI = 14;
