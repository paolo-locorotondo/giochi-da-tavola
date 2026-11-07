/**
 * Contratto di un gioco «ognuno col suo telefono». Il server (`apps/server`) è uno solo per
 * tutti i giochi: gestisce stanze, telefoni, posti e connessioni; il gioco gli dà le regole
 * con un oggetto `GiocoOnline`. Tutto puro: niente rete qui, si testa da solo.
 *
 * Posti: numeri da 1 in su. Il server sceglie e libera i posti per conto dei telefoni e lo
 * comunica al gioco con le azioni `{ tipo: "occupa" | "libera"; posto }`, che `applica` deve
 * accettare.
 */

/** Momento della partita, visto dal server per decidere chi può prendere o lasciare un posto. */
export type MomentoOnline = "sala" | "inCorso" | "fine";

/** Chi sta chiedendo un'azione. */
export interface ContestoOnline {
  /** Il posto del telefono; null se non ne ha ancora scelto uno. */
  posto: number | null;
  /** È l'organizzatore (ha creato la partita o ne ha ripreso il posto). */
  host: boolean;
  /** Un numero casuale (lo fornisce il server, la logica resta deterministica). */
  seme(): number;
}

/** Richiesta grezza di un telefono: arriva dalla rete, va controllata campo per campo. */
export interface RichiestaOnline {
  tipo: string;
  [campo: string]: unknown;
}

/** Chi è collegato adesso e chi organizza: lo sa solo il server, lo passa alla vista. */
export interface PresenzeOnline {
  collegati: ReadonlySet<number>;
  organizzatore: number | null;
}

export interface GiocoOnline<Stato, Azione extends { tipo: string }, Vista> {
  /** Lo stesso `id` del manifest del gioco. */
  id: string;
  /** Stato iniziale. `config` arriva dalla rete: va controllato. Lancia un errore se non è valido. */
  nuovoStato(nomi: string[], config: unknown): Stato;
  /** Applica un'azione già permessa. Lancia un errore se non è valida in questa fase. */
  applica(stato: Stato, azione: Azione): Stato;
  /**
   * Controlla i permessi e traduce la richiesta in un'azione di gioco.
   * Lancia un errore (messaggio da mostrare) se non è permessa; null = niente da fare.
   * Non riceve mai `occupa`, `libera`, `riprendi`: quelli li gestisce il server.
   */
  traduci(stato: Stato, ctx: ContestoOnline, richiesta: RichiestaOnline): Azione | null;
  /** Cosa vede il telefono di `posto`: mai un segreto altrui. */
  vistaPer(stato: Stato, posto: number | null, host: boolean, presenze: PresenzeOnline): Vista;
  momento(stato: Stato): MomentoOnline;
  /** Posti che giocano la partita in corso (si possono riprendere da un altro telefono). */
  inGioco(stato: Stato): readonly number[];
  /** Posti che il gioco sta aspettando (per il pulsante «sollecita»). */
  mancanti?(stato: Stato): readonly number[];
}
