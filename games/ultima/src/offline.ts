import type { RichiestaOnline } from "@gdt/engine";
import { LIVELLI, type Livello } from "./bot";
import { ErroreUltima, MAX_GIOCATORI } from "./logica";
import { applica, nuovoStato, ultimaOnline, vistaPer, type StatoOnline, type Vista } from "./online/gioco";

/**
 * Ultima! su un solo telefono, contro i bot. Riusa la macchina a stati dell'online: il telefono
 * fa da server per sé stesso. Chi gioca siede al posto 1 ed è l'organizzatore; ai posti 2..n ci
 * sono i bot, tutti dello stesso livello. La mano dei bot non si vede mai: la vista è quella
 * del posto 1. Puro: il caso arriva dal `seme`, i tempi li decide la UI.
 */

export const IO = 1;

/** Pausa tra una mossa dei bot e l'altra, in millisecondi. */
export const VELOCITA = { lenta: 2200, normale: 1300, veloce: 600 } as const;
export type Velocita = keyof typeof VELOCITA;
export const VELOCITA_PREDEFINITA: Velocita = "normale";

/**
 * Tempo minimo che i bot lasciano a chi ha calato la penultima carta senza dire «Ultima!»,
 * prima di poterlo beccare (anche con la velocità più alta).
 */
export const RITARDO_BECCATO_MS = 1800;

export interface ConfigLocale {
  /** Il mio nome e quello dei bot, nell'ordine dei posti. */
  nomi: string[];
  livello: Livello;
  config: unknown;
}

export interface PartitaLocale {
  stato: StatoOnline;
  livello: Livello;
}

/** Crea e avvia la partita: tutti i posti sono occupati (io al primo, i bot agli altri). */
export function nuovaPartitaLocale({ nomi, livello, config }: ConfigLocale, seme: number): PartitaLocale {
  if (!LIVELLI.includes(livello)) throw new ErroreUltima("configNonValida");
  if (!Array.isArray(nomi) || nomi.length > MAX_GIOCATORI) throw new ErroreUltima("numeroGiocatori");
  let stato = nuovoStato(nomi, config);
  for (let posto = 1; posto <= stato.nomi.length; posto++) stato = applica(stato, { tipo: "occupa", posto });
  stato = applica(stato, { tipo: "avvia", seme });
  return { stato, livello };
}

/**
 * Una mia richiesta (gioca, pesca, «Ultima!», prossimo round…), con gli stessi permessi dell'online.
 * Lancia un `ErroreUltima` se non è permessa. «Simula mossa col bot» qui non serve: i bot giocano da soli.
 */
export function agisci(p: PartitaLocale, richiesta: RichiestaOnline, seme: () => number): PartitaLocale {
  if (richiesta.tipo === "mossaBot") throw new ErroreUltima("azioneNonValida");
  const azione = ultimaOnline.traduci(p.stato, { posto: IO, host: true, seme, ora: () => Date.now() }, richiesta);
  return azione ? { ...p, stato: applica(p.stato, azione) } : p;
}

/** Il bot che deve muovere adesso; null se tocca a me o il round è finito. */
export function botDiTurno(p: PartitaLocale): number | null {
  const s = p.stato;
  if (s.fase !== "partita" || !s.partita || s.partita.fine) return null;
  return s.partita.turno === IO ? null : s.partita.turno;
}

/** Pausa prima della prossima mossa di un bot: se ho dimenticato «Ultima!» lascio almeno il tempo di dirlo. */
export function pausaBot(p: PartitaLocale, velocita: Velocita): number {
  const dimenticata = p.stato.partita?.ultime.some((u) => u.posto === IO && !u.dichiarata);
  return dimenticata ? Math.max(VELOCITA[velocita], RITARDO_BECCATO_MS) : VELOCITA[velocita];
}

/** Il bot di turno fa la sua mossa (anche «Beccato!» se ho dimenticato «Ultima!»). */
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
