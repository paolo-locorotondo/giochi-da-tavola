import type { RichiestaOnline } from "@gdt/engine";
import { LIVELLI, type Livello } from "./bot";
import { ErroreBurraco } from "./logica";
import { applica, burracoOnline, nuovoStato, vistaPer, type StatoOnline, type Vista } from "./online/gioco";

/**
 * Burraco su un solo telefono, contro i bot. Riusa la macchina a stati dell'online: il telefono fa da
 * server per sé stesso. Chi gioca siede al posto 1 ed è l'organizzatore; ai posti 2..n ci sono i bot, tutti
 * dello stesso livello. A 4 giocatori il compagno (posto 3) è un bot e gioca sulla tua squadra.
 * Puro: il caso arriva dal `seme`, i tempi li decide la UI.
 */

export const IO = 1;

/** Pausa tra un passo dei bot e l'altro, in millisecondi. */
export const VELOCITA = { lenta: 2200, normale: 1300, veloce: 600 } as const;
export type Velocita = keyof typeof VELOCITA;
export const VELOCITA_PREDEFINITA: Velocita = "normale";

export interface ConfigLocale {
  /** Il mio nome e quello dei bot, nell'ordine dei posti (2 o 4). */
  nomi: string[];
  livello: Livello;
  config: unknown;
}

export interface PartitaLocale {
  stato: StatoOnline;
  livello: Livello;
}

export function nuovaPartitaLocale({ nomi, livello, config }: ConfigLocale, seme: number): PartitaLocale {
  if (!LIVELLI.includes(livello)) throw new ErroreBurraco("configNonValida");
  let stato = nuovoStato(nomi, config);
  for (let posto = 1; posto <= stato.nomi.length; posto++) stato = applica(stato, { tipo: "occupa", posto });
  stato = applica(stato, { tipo: "avvia", seme });
  return { stato, livello };
}

/** Una mia richiesta (pesca, cala, scarta, prossima mano…), con gli stessi permessi dell'online. */
export function agisci(p: PartitaLocale, richiesta: RichiestaOnline, seme: () => number): PartitaLocale {
  if (richiesta.tipo === "mossaBot") throw new ErroreBurraco("azioneNonValida");
  const azione = burracoOnline.traduci(p.stato, { posto: IO, host: true, seme, ora: () => Date.now() }, richiesta);
  return azione ? { ...p, stato: applica(p.stato, azione) } : p;
}

/** Il bot che deve muovere adesso; null se tocca a me o la mano è finita. */
export function botDiTurno(p: PartitaLocale): number | null {
  const s = p.stato;
  if (s.fase !== "partita" || !s.partita || s.partita.fine) return null;
  return s.partita.turno === IO ? null : s.partita.turno;
}

export const pausaBot = (_p: PartitaLocale, velocita: Velocita): number => VELOCITA[velocita];

/** Il bot di turno fa un passo (pesca, cala o scarta). */
export function muoviBot(p: PartitaLocale): PartitaLocale {
  const posto = botDiTurno(p);
  if (posto === null) return p;
  return { ...p, stato: applica(p.stato, { tipo: "bot", posto, livello: p.livello }) };
}

/** Cosa vedo io: la mia mano, degli altri solo quante carte hanno. Tutti risultano collegati. */
export function vistaLocale(p: PartitaLocale): Vista {
  const v = vistaPer(p.stato, IO, true);
  return { ...v, nomi: v.nomi.map((n) => ({ ...n, collegato: true, organizzatore: n.posto === IO })) };
}

/** Versione dello schema della partita salvata (alzarla scarta i salvataggi vecchi). */
export const VERSIONE_SALVATAGGIO = 1;

/** Ciò che si salva per riprendere la partita dopo un refresh: lo stato (JSON puro) e la velocità dei bot. */
export interface Salvataggio {
  partita: PartitaLocale;
  velocita: Velocita;
}

/** Controllo del salvataggio letto dallo storage (una partita finita non si salva, quindi manca la fase «fine»): forma, livello, velocità e, in ultimo, che la vista si costruisca. */
export function eSalvataggio(d: unknown): d is Salvataggio {
  try {
    const s = d as Salvataggio;
    const st = s.partita.stato;
    if (!(s.velocita in VELOCITA) || !LIVELLI.includes(s.partita.livello)) return false;
    if (!["partita", "fineMano"].includes(st.fase) || !Array.isArray(st.nomi) || !st.nomi.every((n) => typeof n === "string")) return false;
    if (st.fase === "partita" && (!st.partita || !Number.isInteger(st.partita.turno))) return false;
    vistaLocale(s.partita);
    return true;
  } catch {
    return false;
  }
}

/** Dopo un refresh lo stato si riprende com'è: nessuna finestra a tempo da chiudere. */
export const riprendi = (p: PartitaLocale): PartitaLocale => p;
