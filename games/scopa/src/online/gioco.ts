import type { Carta } from "@gdt/carte/logica";
import { MAX_CARATTERI_NOME, creaRng, limitaTesto, type GiocoOnline, type Rng } from "@gdt/engine";
import { mossaBotLivello, eseguiMossa, type Livello } from "../bot";
import { ErroreScopa, avanza, gioca, nuovoRound, presePossibili, squadreDiBase, type Evento, type FineRound, type Partita, type Squadra } from "../logica";
import { POSTI_AMMESSI, SOGLIE, SOGLIA_PREDEFINITA, type Posti, type Soglia } from "../regole";

/**
 * Scopa con un telefono per giocatore. Modulo puro: lo usa il server, che tiene lo stato e manda a
 * ognuno la sua vista. La mano è segreta: le carte altrui non passano mai sulla rete; anche le
 * prese restano coperte (solo il numero) fino al riepilogo di fine round.
 *
 * TODO partita veloce (blocco 5, lo fa un altro agente): aggiungere `veloce` a `scopaOnline`
 * con `posti: [2, 4]`, `squadre: (n) => (n === 4 ? [[1, 3], [2, 4]] : null)` e `configVeloce`
 * (completa `posti` e controlla `soglia`). `nuovoStato(nomi, config)` e `applica` non cambiano.
 */

export type FaseOnline = "sala" | "partita" | "fineRound" | "fine";

export interface ConfigOnline {
  /** 2 giocatori, oppure 4 a coppie. */
  posti: Posti;
  /** Punti per vincere la partita. */
  soglia: Soglia;
}

export interface StatoOnline {
  fase: FaseOnline;
  nomi: string[];
  config: ConfigOnline;
  occupati: number[];
  /** La squadra di ogni posto (a 2 una per uno; a 4 le coppie, cambiabili in sala). */
  squadre: Squadra[];
  partita: Partita | null;
  /** Chi apre il round in corso (ruota a ogni round). */
  primo: number;
  /** Punti della partita per squadra. */
  punti: [number, number];
  round: number;
  /** La squadra che ha vinto la partita. */
  vincitore: Squadra | null;
  seme: number;
  mosse: number;
}

export type AzioneOnline =
  | { tipo: "occupa"; posto: number }
  | { tipo: "libera"; posto: number }
  | { tipo: "avvia"; seme: number }
  | { tipo: "gioca"; chi: number; carta: number; presa?: number[] }
  /** Scambia le squadre di due posti (solo in sala, solo a 4). */
  | { tipo: "squadre"; a: number; b: number }
  /** Il bot fa la mossa di `posto`. Online la chiede l'organizzatore (difficile, evento visibile); offline gli avversari. */
  | { tipo: "bot"; posto: number; livello?: Livello }
  | { tipo: "prossimoRound"; seme: number }
  | { tipo: "ricomincia"; seme: number };

/** Config dalla rete: va controllata campo per campo. `posti` assente = quanti sono i nomi. */
export function leggiConfig(grezza: unknown, giocatori?: number): ConfigOnline {
  const c = (typeof grezza === "object" && grezza !== null ? grezza : {}) as Record<string, unknown>;
  const posti = c.posti === undefined ? giocatori : c.posti;
  if (typeof posti !== "number" || !(POSTI_AMMESSI as readonly number[]).includes(posti)) throw new ErroreScopa("configNonValida");
  if (giocatori !== undefined && posti !== giocatori) throw new ErroreScopa("configNonValida");
  const soglia = c.soglia === undefined ? SOGLIA_PREDEFINITA : c.soglia;
  if (typeof soglia !== "number" || !(SOGLIE as readonly number[]).includes(soglia)) throw new ErroreScopa("configNonValida");
  return { posti: posti as Posti, soglia: soglia as Soglia };
}

export function nuovoStato(nomi: string[], config: unknown): StatoOnline {
  if (!Array.isArray(nomi)) throw new ErroreScopa("nomiNonValidi");
  const puliti = nomi.map((n) => limitaTesto(String(n).trim(), MAX_CARATTERI_NOME));
  if (!(POSTI_AMMESSI as readonly number[]).includes(puliti.length)) throw new ErroreScopa("numeroGiocatori");
  if (puliti.some((n) => !n) || new Set(puliti.map((n) => n.toLocaleLowerCase("it-IT"))).size !== puliti.length) {
    throw new ErroreScopa("nomiNonValidi");
  }
  return {
    fase: "sala",
    nomi: puliti,
    config: leggiConfig(config, puliti.length),
    occupati: [],
    squadre: squadreDiBase(puliti.length),
    partita: null,
    primo: 1,
    punti: [0, 0],
    round: 0,
    vincitore: null,
    seme: 0,
    mosse: 0,
  };
}

const eUnPosto = (s: StatoOnline, p: number) => Number.isInteger(p) && p >= 1 && p <= s.nomi.length;

/** Caso di una mossa del bot: dal seme del round e dal numero della mossa, così la partita si ripete. */
function rngDellaMossa(s: StatoOnline): Rng {
  return creaRng((s.seme ^ Math.imul(s.mosse + 1, 0x9e3779b1)) >>> 0);
}

function iniziaRound(s: StatoOnline, seme: number, primo: number, round: number, punti: [number, number], eventi: Evento[] = []): StatoOnline {
  return {
    ...s,
    fase: "partita",
    partita: nuovoRound(s.nomi.length, creaRng(seme), eventi, primo, s.squadre),
    primo,
    punti,
    round,
    vincitore: null,
    seme,
    mosse: 0,
  };
}

/** Dopo una mossa: se il round è finito somma i punti e decide se la partita continua. */
function dopoMossa(s: StatoOnline, partita: Partita): StatoOnline {
  const avanzato = { ...s, partita, mosse: s.mosse + 1 };
  if (!partita.fine) return avanzato;
  const t = partita.fine.punti.totale;
  const totali: [number, number] = [s.punti[0] + t[0], s.punti[1] + t[1]];
  const max = Math.max(totali[0], totali[1]);
  // Si vince arrivando alla soglia con più punti dell'altra squadra; a pari si gioca un altro round.
  if (max >= s.config.soglia && totali[0] !== totali[1]) {
    return { ...avanzato, fase: "fine", punti: totali, vincitore: totali[0] > totali[1] ? 0 : 1 };
  }
  return { ...avanzato, fase: "fineRound", punti: totali };
}

/** Applica un'azione. Lancia un `ErroreScopa` se non è permessa in questa fase. */
export function applica(s: StatoOnline, a: AzioneOnline): StatoOnline {
  const n = s.nomi.length;
  switch (a.tipo) {
    case "occupa":
      if (!eUnPosto(s, a.posto)) throw new ErroreScopa("nomeInesistente");
      if (s.occupati.includes(a.posto)) throw new ErroreScopa("nomeOccupato");
      return { ...s, occupati: [...s.occupati, a.posto] };

    case "libera":
      // A partita avviata il posto resta del giocatore: cambia solo il telefono (lo decide il server).
      return s.fase === "sala" ? { ...s, occupati: s.occupati.filter((p) => p !== a.posto) } : s;

    case "squadre": {
      if (s.fase !== "sala") throw new ErroreScopa("giaIniziata");
      if (n !== 4) throw new ErroreScopa("soloQuattro");
      if (!eUnPosto(s, a.a) || !eUnPosto(s, a.b) || a.a === a.b) throw new ErroreScopa("nomeInesistente");
      if (s.squadre[a.a - 1] === s.squadre[a.b - 1]) throw new ErroreScopa("stessaSquadra");
      const squadre = s.squadre.map((q, i) => (i === a.a - 1 ? s.squadre[a.b - 1]! : i === a.b - 1 ? s.squadre[a.a - 1]! : q));
      return { ...s, squadre };
    }

    case "avvia":
      if (s.fase !== "sala") throw new ErroreScopa("giaIniziata");
      if (s.occupati.length < n) throw new ErroreScopa("pochiHannoScelto");
      return iniziaRound(s, a.seme, 1, 1, s.punti);

    case "prossimoRound":
      if (s.fase !== "fineRound") throw new ErroreScopa("nonFinitoRound");
      return iniziaRound(s, a.seme, avanza(s.primo, n), s.round + 1, s.punti, s.partita?.eventi ?? []);

    case "ricomincia":
      if (s.fase !== "fine") throw new ErroreScopa("nonFinita");
      return iniziaRound(s, a.seme, avanza(s.primo, n), 1, [0, 0]);

    default:
      return mossa(s, a);
  }
}

function mossa(s: StatoOnline, a: Extract<AzioneOnline, { tipo: "gioca" | "bot" }>): StatoOnline {
  if (s.fase !== "partita" || !s.partita) throw new ErroreScopa("nonInCorso");
  const p = s.partita;
  const chi = a.tipo === "bot" ? a.posto : a.chi;
  if (!eUnPosto(s, chi)) throw new ErroreScopa("nonPartecipa");
  if (a.tipo === "gioca") return dopoMossa(s, gioca(p, chi, a.carta, a.presa));

  // Online (senza livello) è il bot di «Simula mossa»: difficile e annunciato negli eventi.
  // Offline gli avversari sono bot dichiarati: si vede solo la loro mossa.
  const livello = a.livello ?? "difficile";
  let m;
  try {
    m = mossaBotLivello(p, chi, livello, rngDellaMossa(s));
  } catch {
    throw new ErroreScopa("nullaDaFare");
  }
  const conEvento: Partita = a.livello ? p : { ...p, eventi: [...p.eventi, { tipo: "bot" as const, posto: chi }] };
  return dopoMossa(s, eseguiMossa(conEvento, chi, m));
}

/** Posti che il gioco aspetta: chi deve giocare. */
export function mancanti(s: StatoOnline): number[] {
  return s.fase === "partita" && s.partita && !s.partita.fine ? [s.partita.turno] : [];
}

export interface VistaGiocatore {
  posto: number;
  nome: string;
  occupato: boolean;
  /** Lo riempie il server, che conosce le connessioni. */
  collegato: boolean;
  organizzatore: boolean;
  /** Quante carte ha in mano (mai quali). */
  carte: number;
  /** Quante carte ha preso nel round (mai quali: fino a fine round). */
  prese: number;
  scope: number;
  squadra: Squadra;
}

/** Il riepilogo di fine round: qui le prese si vedono. */
export interface RiepilogoRound {
  fine: FineRound;
  /** Le carte prese da ogni posto (`prese[posto - 1]`). */
  prese: Carta[][];
  scope: number[];
}

export interface Vista {
  fase: FaseOnline;
  io: number | null;
  host: boolean;
  config: ConfigOnline;
  round: number;
  nomi: VistaGiocatore[];
  squadre: Squadra[];
  /** La mia squadra; null per chi guarda. */
  miaSquadra: Squadra | null;
  /** La mia mano; vuota per chi guarda. */
  mano: Carta[];
  /** Le prese possibili per ogni carta della mia mano (vuoto = resta sul tavolo): serve a scegliere la presa. Solo nel mio turno. */
  prese: Record<number, number[][]>;
  tavolo: Carta[];
  /** Carte rimaste nel mazzo. */
  mazzo: number;
  mani: { corrente: number; totale: number };
  turno: number | null;
  mioTurno: boolean;
  eventi: Evento[];
  punti: [number, number];
  riepilogo: RiepilogoRound | null;
  vincitore: Squadra | null;
}

export function vistaPer(s: StatoOnline, posto: number | null, host: boolean): Vista {
  const p = s.partita;
  const inRound = s.fase === "partita" && p !== null && !p.fine;
  const turno = inRound && p ? p.turno : null;
  const mioTurno = posto !== null && turno === posto;
  const mano = p && posto !== null ? p.mani[posto - 1]! : [];
  const prese: Record<number, number[][]> = {};
  if (mioTurno && p) for (const c of mano) prese[c.id] = presePossibili(p, c).map((comb) => comb.map((x) => x.id));
  return {
    fase: s.fase,
    io: posto,
    host,
    config: s.config,
    round: s.round,
    nomi: s.nomi.map((nome, i) => ({
      posto: i + 1,
      nome,
      occupato: s.occupati.includes(i + 1),
      collegato: false,
      organizzatore: false,
      carte: p ? p.mani[i]!.length : 0,
      prese: p && !p.fine ? p.prese[i]!.length : 0,
      scope: p ? p.scope[i]! : 0,
      squadra: s.squadre[i]!,
    })),
    squadre: s.squadre,
    miaSquadra: posto !== null ? s.squadre[posto - 1]! : null,
    mano,
    prese,
    tavolo: p ? p.tavolo : [],
    mazzo: p ? p.mazzo.length : 0,
    mani: { corrente: p ? p.mano : 0, totale: p ? p.totaleMani : 0 },
    turno,
    mioTurno,
    eventi: p ? p.eventi : [],
    punti: s.punti,
    // Le prese si scoprono solo a fine round.
    riepilogo: p?.fine ? { fine: p.fine, prese: p.prese, scope: p.scope } : null,
    vincitore: s.vincitore,
  };
}

const POSTI = (s: StatoOnline) => s.nomi.map((_, i) => i + 1);

export const scopaOnline: GiocoOnline<StatoOnline, AzioneOnline, Vista> = {
  id: "scopa",
  nuovoStato,
  applica,
  momento: (s) => (s.fase === "sala" ? "sala" : s.fase === "fine" ? "fine" : "inCorso"),
  inGioco: (s) => (s.fase === "sala" ? [] : POSTI(s)),
  mancanti,

  traduci(_s, ctx, a) {
    const mio = ctx.posto;
    const soloHost = () => {
      if (!ctx.host) throw new ErroreScopa("soloHost");
    };
    switch (a.tipo) {
      case "avvia":
        soloHost();
        return { tipo: "avvia", seme: ctx.seme() };
      case "prossimoRound":
        soloHost();
        return { tipo: "prossimoRound", seme: ctx.seme() };
      case "ricomincia":
        soloHost();
        return { tipo: "ricomincia", seme: ctx.seme() };
      case "squadre":
        soloHost();
        return { tipo: "squadre", a: Number(a.a), b: Number(a.b) };
      case "mossaBot":
        soloHost();
        return { tipo: "bot", posto: Number(a.posto) };
      case "gioca": {
        if (mio === null) throw new ErroreScopa("nonPartecipa");
        const presa = a.presa === undefined ? undefined : Array.isArray(a.presa) && a.presa.every((x) => typeof x === "number") ? (a.presa as number[]) : null;
        if (presa === null) throw new ErroreScopa("presaNonValida");
        return { tipo: "gioca", chi: mio, carta: Number(a.carta), presa };
      }
      default:
        throw new ErroreScopa("azioneNonValida");
    }
  },

  vistaPer(s, posto, host, presenze) {
    const v = vistaPer(s, posto, host);
    return {
      ...v,
      nomi: v.nomi.map((n) => ({ ...n, collegato: presenze.collegati.has(n.posto), organizzatore: n.posto === presenze.organizzatore })),
    };
  },
};
