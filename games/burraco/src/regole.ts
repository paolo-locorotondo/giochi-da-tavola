/**
 * Tutte le regole del Burraco in un solo posto. Fonti e punti «da verificare» nel README del gioco.
 * Verificate sul Codice di gara FIBUR (edizione 2026), su it.wikipedia.org/wiki/Burraco e su pagat.com.
 */
export const REGOLE = {
  /** Carte a testa e carte di ogni pozzetto (FIBUR art. 4). */
  carteInMano: 11,
  cartePozzetto: 11,
  /** Carte minime di una combinazione (tris o scala). */
  minimoCombinazione: 3,
  /** Un tris arriva a 8 carte uguali più una matta (FIBUR art. 12). */
  massimoTris: 9,
  /** Una scala arriva a 13 carte più una matta (FIBUR art. 11). */
  massimoScala: 14,
  /** Da quante carte una combinazione è un burraco (FIBUR art. 13). */
  carteBurraco: 7,
  /** Quando nel tallone restano queste carte la mano finisce, senza bonus di chiusura (FIBUR art. 17). */
  carteResiduoTallone: 2,
  /**
   * Stallo (FIBUR art. 16): se per tanti giri di fila nessuno pesca dal tallone né cala, la mano si interrompe
   * senza bonus. Qui: due giri completi (2 × giocatori turni).
   */
  giriStallo: 2,
  /**
   * Il burraco di tris (7 o più carte uguali): la FIBUR (art. 13) lo prevede, ma l'utente ha deciso di non
   * farlo nella prima versione (vedi «Varianti possibili» nel README del gioco). Basta mettere `true` per attivarlo.
   */
  burracoDiTris: false,
  /** Una squadra non può avere due tris dello stesso valore (regola di Pagat; la FIBUR non la dice: da verificare). */
  unTrisPerValore: true,
  bonus: {
    pulito: 200,
    /** Una matta in testa o in coda a sette carte pulite, o un tris di 8 carte con una matta (FIBUR art. 13, edizione 2026). */
    semipulito: 150,
    sporco: 100,
    chiusura: 100,
    /** Negativo; non si conta se nessuna delle due squadre ha preso il pozzetto (FIBUR art. 18). */
    pozzettoNonPreso: -100,
  },
} as const;

/** Punteggi obiettivo scelti alla creazione. 0 = una sola mano. */
export const OBIETTIVI = [0, 1505, 2005, 3005] as const;
export type Obiettivo = (typeof OBIETTIVI)[number];
export const OBIETTIVO_BASE: Obiettivo = 2005;

/**
 * Presa del monte degli scarti.
 * - `libera` (base): regola italiana verificata (FIBUR, Wikipedia, Pagat): si prende sempre tutto il monte,
 *   nessuna carta lo blocca e non c'è obbligo di usarne le carte.
 * - `bloccata` (variante del piano, NON trovata nelle fonti italiane): se nel monte c'è una matta si prende solo con due
 *   carte naturali in mano dello stesso valore della cima, con cui si cala subito un tris.
 */
export const PILE = ["libera", "bloccata"] as const;
export type Pila = (typeof PILE)[number];
export const PILA_BASE: Pila = "libera";

export const GIOCATORI = [2, 4] as const;
