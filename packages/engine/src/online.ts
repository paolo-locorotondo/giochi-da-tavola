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
  /** L'ora in millisecondi (come `Date.now()`): la logica pura non legge l'orologio, lo fa chi chiama. */
  ora(): number;
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

/** Come si formano le squadre in una stanza veloce. */
export type ModoSquadre = "arrivo" | "caso" | "scelte";

/** Il gioco supporta la «partita veloce a stanze aperte». */
export interface PartitaVeloceOnline {
  /**
   * Quanti posti può avere una stanza veloce, in ordine crescente, senza doppioni.
   * Un solo valore = posti fissi (Tris [2], Burraco [4]); più valori = li sceglie chi apre
   * (Scopa [2, 4], Ultima! intervalloPosti(2, 10)).
   */
  posti: readonly number[];
  /**
   * L'organizzatore può aprire prima che la stanza sia piena, con un numero di giocatori che sta
   * in `posti` (es. Ultima!: con 3 su 6). Falso o assente = si parte solo a stanza piena.
   * Non si può avere insieme a `squadre`.
   */
  anticipato?: boolean;
  /**
   * Le squadre per quel numero di posti: i posti di ogni squadra. null = ognuno per sé.
   * Scopa: (n) => n === 4 ? [[1, 3], [2, 4]] : null.
   */
  squadre?(posti: number): readonly (readonly number[])[] | null;
  /**
   * Controlla le impostazioni scelte da chi apre (arrivano dalla rete) e le completa con il numero
   * di giocatori che partono. Il risultato va a `nuovoStato(nomi, config)`. Lancia un errore
   * (codice da mostrare) se non sono valide. Si chiama all'apertura (con i posti) e all'avvio
   * (con i giocatori effettivi).
   */
  configVeloce(grezza: unknown, giocatori: number): unknown;
}

/** [min, min+1, …, max]: per i giochi con un intervallo di giocatori. */
export function intervalloPosti(min: number, max: number): number[] {
  const posti: number[] = [];
  for (let n = min; n <= max; n++) posti.push(n);
  return posti;
}

/** Cosa sceglie chi apre una stanza veloce (arriva dalla rete: il server lo controlla). */
export interface AperturaVeloce {
  posti: number;
  config: unknown;
  /** Solo se il gioco ha squadre per quei posti; altrimenti ignorato. */
  squadre?: ModoSquadre;
  /** Uno di ATTESE_VELOCE_MS. */
  attesaMs: number;
}

/** Tempi d'attesa che si possono scegliere: 1, 2, 3, 5 minuti. Predefinito 2 (come la coda di oggi). */
export const ATTESE_VELOCE_MS = [60_000, 120_000, 180_000, 300_000] as const;
export const ATTESA_VELOCE_PREDEFINITA_MS = 120_000;
/** L'avviso «tra 10 secondi». */
export const CONTO_VELOCE_MS = 10_000;
/** Il conto con le squadre «scelte in sala» dura di più: servono 30 secondi per sedersi. */
export const CONTO_VELOCE_SCELTE_MS = 30_000;

/** Riepilogo di una stanza veloce aperta, mostrato prima di agganciarsi. */
export interface AnteprimaVeloce {
  codice: string;
  organizzatore: string;
  posti: number;
  occupati: number;
  /** Già passata da `configVeloce`: la UI del gioco sa leggerla. */
  config: unknown;
  squadre: ModoSquadre | null;
  attesaMs: number;
}

/** Comandi di un telefono nella sala d'attesa veloce (quelli di sala solo per l'organizzatore). */
export type ComandoSala =
  | { comando: "apriAdesso" | "annullaAvvio" | "aspettaAncora" | "chiudiSala" }
  /** `id` = chi spostare: sé stessi, o chiunque se si è l'organizzatore. */
  | { comando: "squadra"; id: number; squadra: number };

export type MomentoSala = "attesa" | "conto" | "scaduta";

/** La sala d'attesa veloce vista da un telefono (generica per tutti i giochi). */
export interface VistaSalaVeloce {
  gioco: string;
  codice: string;
  momento: MomentoSala;
  /** Millisecondi che mancano alla scadenza dell'attesa o del conto (la UI li conta da sé). */
  restaMs: number;
  posti: number;
  /** Con quanti si può aprire prima (null = solo a stanza piena). */
  minimo: number | null;
  config: unknown;
  attesaMs: number;
  squadre: ModoSquadre | null;
  /** Squadre del gioco per `posti` (stesse di `squadre()`), per disegnarle. */
  postiSquadre: readonly (readonly number[])[] | null;
  host: boolean;
  /** In ordine di arrivo. */
  giocatori: {
    id: number; // numero d'arrivo, stabile, non il token
    nome: string;
    io: boolean;
    organizzatore: boolean;
    collegato: boolean;
    /** Indice in `postiSquadre`; null senza squadre o con «a caso» (si decide all'avvio). */
    squadra: number | null;
  }[];
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
  /**
   * Partita veloce a stanze aperte: il server tiene la sala d'attesa fuori dallo stato del gioco;
   * all'avvio chiama `nuovoStato(nomi, veloce.configVeloce(config, n))`, siede i telefoni ai posti
   * 1..n e manda l'azione `avvia` per conto dell'organizzatore. Il gioco non deve sapere altro.
   */
  veloce?: PartitaVeloceOnline;
}
