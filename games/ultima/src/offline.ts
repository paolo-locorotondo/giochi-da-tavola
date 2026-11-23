import type { RichiestaOnline } from "@gdt/engine";
import { creaRng } from "@gdt/engine";
import { LIVELLI, PROB_ULTIMA, mossaTaglioBot, type Livello } from "./bot";
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

/**
 * Reazione dei bot a un taglio: mai prima di 1 s (così chi gioca col telefono in mano ha il vantaggio del tocco)
 * e mai oltre 2,5 s (la finestra dura 3 s), altrimenti la pausa scelta per i bot.
 */
export const TAGLIO_BOT_MIN_MS = 1000;
export const TAGLIO_BOT_MAX_MS = 2500;
export const ritardoTaglioBot = (velocita: Velocita): number => Math.min(TAGLIO_BOT_MAX_MS, Math.max(TAGLIO_BOT_MIN_MS, VELOCITA[velocita]));

/** Pausa prima della prossima mossa di un bot: se ho dimenticato «Ultima!» lascio almeno il tempo di dirlo. */
export function pausaBot(p: PartitaLocale, velocita: Velocita): number {
  const dimenticata = p.stato.partita?.ultime.some((u) => u.posto === IO && !u.dichiarata);
  let pausa = dimenticata ? Math.max(VELOCITA[velocita], RITARDO_BECCATO_MS) : VELOCITA[velocita];
  // Se un bot ha un taglio da fare, il bot di turno aspetta che l'abbia fatto.
  if (botDelTaglio(p) !== null) pausa = Math.max(pausa, ritardoTaglioBot(velocita) + 150);
  return pausa;
}

/** Il bot di turno fa la sua mossa (anche «Beccato!» se ho dimenticato «Ultima!»). `ora` apre la finestra di taglio. */
export function muoviBot(p: PartitaLocale, ora: number = Date.now()): PartitaLocale {
  const posto = botDiTurno(p);
  if (posto === null) return p;
  return { ...p, stato: applica(p.stato, { tipo: "bot", posto, livello: p.livello, ora }) };
}

/** Il caso del taglio dipende solo dallo stato, così la decisione non cambia a ogni controllo. */
function rngTaglio(p: PartitaLocale, posto: number) {
  const s = p.stato;
  return creaRng((s.seme ^ Math.imul(s.mosse + 3, 0x85ebca6b) ^ Math.imul(posto, 0xc2b2ae35)) >>> 0);
}

/**
 * Il bot che taglia adesso (se c'è): il posto più basso tra quelli con una carta identica che «se ne accorgono»
 * (probabilità del livello). Deterministico con il seme. La finestra la controlla chi chiama (UI, con l'ora).
 */
export function botDelTaglio(p: PartitaLocale): { posto: number; carta: number } | null {
  const s = p.stato;
  if (s.fase !== "partita" || !s.partita || s.partita.fine || !s.partita.apertaTaglio) return null;
  for (let posto = 1; posto <= s.nomi.length; posto++) {
    if (posto === IO) continue;
    const carta = mossaTaglioBot(s.partita, posto, p.livello, rngTaglio(p, posto));
    if (carta !== null) return { posto, carta };
  }
  return null;
}

/** Il bot taglia. Lancia un `ErroreUltima` (`tagliTardi`…) se la finestra non c'è più. */
export function tagliaBot(p: PartitaLocale, taglio: { posto: number; carta: number }, ora: number = Date.now()): PartitaLocale {
  const dichiara = rngTaglio(p, taglio.posto).next() < PROB_ULTIMA[p.livello];
  return { ...p, stato: applica(p.stato, { tipo: "taglia", chi: taglio.posto, carta: taglio.carta, ora, dichiara }) };
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
    if (!["partita", "fineRound"].includes(st.fase) || !Array.isArray(st.nomi) || !st.nomi.every((n) => typeof n === "string")) return false;
    if (st.fase === "partita" && (!st.partita || !Number.isInteger(st.partita.turno))) return false;
    vistaLocale(s.partita);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dopo un refresh la finestra di taglio (3 s, ora assoluta) è già scaduta o quasi: si chiude, senza bloccare
 * la partita. Il «Ultima!» dimenticato resta com'è: i bot lo beccano dopo la loro pausa, come prima.
 */
export function riprendi(p: PartitaLocale): PartitaLocale {
  const partita = p.stato.partita;
  if (!partita?.apertaTaglio) return p;
  return { ...p, stato: { ...p.stato, partita: { ...partita, apertaTaglio: null } } };
}
