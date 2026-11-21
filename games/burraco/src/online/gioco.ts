import { MAX_CARATTERI_NOME, creaRng, limitaTesto, type GiocoOnline, type Rng } from "@gdt/engine";
import { eseguiMossa, mossaBotLivello, type Livello } from "../bot";
import { LIVELLI } from "../bot";
import type { Carta } from "../carte";
import type { Combinazione } from "../combinazioni";
import {
  ErroreBurraco,
  MAX_EVENTI,
  avanza,
  cala,
  nuovaMano,
  pesca,
  pilaBloccata,
  prendiPila,
  puoPrendere,
  punteggioMano,
  scarta,
  squadra,
  type Evento,
  type Gruppo,
  type MotivoFine,
  type Partita,
  type PunteggioSquadra,
} from "../logica";
import { OBIETTIVI, OBIETTIVO_BASE, PILA_BASE, PILE, type Obiettivo, type Pila } from "../regole";

/**
 * Burraco con un telefono per giocatore. Modulo puro: lo usa il server e anche il telefono contro i bot
 * (`offline.ts`). La mano è segreta: delle altre si vede solo quante carte hanno; i pozzetti si vedono
 * solo come «da prendere» o «preso»; il monte degli scarti e le combinazioni sono pubblici.
 *
 * Punto di aggancio della partita veloce (blocco E, non fatto qui): oggi la stanza si crea con 2 o 4 nomi
 * (`nuovoStato(nomi, config)`); per `veloce` basterà aggiungere `veloce: { posti: [4], squadre, configVeloce }`
 * all'oggetto `burracoOnline` in fondo a questo file, senza toccare la logica.
 */

export type FaseOnline = "sala" | "partita" | "fineMano" | "fine";

export interface ConfigOnline {
  /** Punti da raggiungere; 0 = una sola mano. */
  obiettivo: Obiettivo;
  pila: Pila;
}

export interface StatoOnline {
  fase: FaseOnline;
  nomi: string[];
  config: ConfigOnline;
  occupati: number[];
  partita: Partita | null;
  /** Chi apre la mano in corso (ruota). */
  primo: number;
  /** Punti delle due squadre (`punti[squadra - 1]`). */
  punti: [number, number];
  mano: number;
  /** Punteggio dell'ultima mano finita, riga per riga. */
  ultima: [PunteggioSquadra, PunteggioSquadra] | null;
  /** La squadra che ha vinto la partita (1 o 2). */
  vincitore: number | null;
  seme: number;
  mosse: number;
}

export type AzioneOnline =
  | { tipo: "occupa"; posto: number }
  | { tipo: "libera"; posto: number }
  | { tipo: "avvia"; seme: number }
  | { tipo: "pesca"; chi: number }
  | { tipo: "prendiPila"; chi: number; gruppo?: number[] }
  | { tipo: "cala"; chi: number; gruppi: unknown }
  | { tipo: "scarta"; chi: number; carta: number }
  /** Un passo del bot per `posto`: online lo chiede l'organizzatore (difficile, annunciato); offline gli avversari. */
  | { tipo: "bot"; posto: number; livello?: Livello }
  | { tipo: "prossimaMano"; seme: number }
  | { tipo: "ricomincia"; seme: number };

/** Config dalla rete: va controllata campo per campo. Assente = valori di base. */
export function leggiConfig(grezza: unknown): ConfigOnline {
  const c = (typeof grezza === "object" && grezza !== null ? grezza : {}) as Record<string, unknown>;
  const obiettivo = c.obiettivo === undefined ? OBIETTIVO_BASE : c.obiettivo;
  if (!(OBIETTIVI as readonly unknown[]).includes(obiettivo)) throw new ErroreBurraco("configNonValida");
  const pila = c.pila === undefined ? PILA_BASE : c.pila;
  if (!(PILE as readonly unknown[]).includes(pila)) throw new ErroreBurraco("configNonValida");
  return { obiettivo: obiettivo as Obiettivo, pila: pila as Pila };
}

export function nuovoStato(nomi: string[], config: unknown): StatoOnline {
  if (!Array.isArray(nomi)) throw new ErroreBurraco("nomiNonValidi");
  const puliti = nomi.map((n) => limitaTesto(String(n).trim(), MAX_CARATTERI_NOME));
  if (puliti.length !== 2 && puliti.length !== 4) throw new ErroreBurraco("numeroGiocatori");
  if (puliti.some((n) => !n) || new Set(puliti.map((n) => n.toLocaleLowerCase("it-IT"))).size !== puliti.length) {
    throw new ErroreBurraco("nomiNonValidi");
  }
  return {
    fase: "sala",
    nomi: puliti,
    config: leggiConfig(config),
    occupati: [],
    partita: null,
    primo: 1,
    punti: [0, 0],
    mano: 0,
    ultima: null,
    vincitore: null,
    seme: 0,
    mosse: 0,
  };
}

const eUnPosto = (s: StatoOnline, p: number) => Number.isInteger(p) && p >= 1 && p <= s.nomi.length;

/** Caso di un passo del bot: dal seme della mano e dal numero della mossa (la partita con lo stesso seme si ripete). */
function rngDellaMossa(s: StatoOnline): Rng {
  return creaRng((s.seme ^ Math.imul(s.mosse + 1, 0x9e3779b1)) >>> 0);
}

function iniziaMano(s: StatoOnline, seme: number, primo: number, mano: number, punti: [number, number], eventi: Evento[] = []): StatoOnline {
  return {
    ...s,
    fase: "partita",
    partita: nuovaMano(s.nomi.length, creaRng(seme), primo, s.config.pila, mano, eventi),
    primo,
    punti,
    mano,
    ultima: null,
    vincitore: null,
    seme,
    mosse: 0,
  };
}

/** Dopo ogni passo: se la mano è finita somma i punti e decide se la partita continua. */
function dopoMossa(s: StatoOnline, partita: Partita): StatoOnline {
  const avanzato = { ...s, partita, mosse: s.mosse + 1 };
  if (!partita.fine) return avanzato;
  const righe = punteggioMano(partita);
  const punti: [number, number] = [s.punti[0] + righe[0].totale, s.punti[1] + righe[1].totale];
  const { obiettivo } = s.config;
  if (obiettivo === 0) return { ...avanzato, fase: "fine", punti, ultima: righe, vincitore: punti[0] === punti[1] ? null : punti[0] > punti[1] ? 1 : 2 };
  const arrivata = punti.some((x) => x >= obiettivo);
  // A pari punti si gioca un'altra mano (FIBUR/uso comune: vince chi ha più punti oltre l'obiettivo).
  if (arrivata && punti[0] !== punti[1]) return { ...avanzato, fase: "fine", punti, ultima: righe, vincitore: punti[0] > punti[1] ? 1 : 2 };
  return { ...avanzato, fase: "fineMano", punti, ultima: righe };
}

/** Controlla `gruppi` che arrivano dalla rete: lista di `{ carte: number[]; su?: number }`. */
function leggiGruppi(grezzi: unknown): Gruppo[] {
  if (!Array.isArray(grezzi) || grezzi.length === 0 || grezzi.length > 20) throw new ErroreBurraco("combinazioneNonValida");
  return grezzi.map((g) => {
    const o = (typeof g === "object" && g !== null ? g : {}) as Record<string, unknown>;
    if (!Array.isArray(o.carte) || o.carte.length === 0 || o.carte.length > 30 || !o.carte.every((x) => Number.isInteger(x))) {
      throw new ErroreBurraco("combinazioneNonValida");
    }
    if (o.su !== undefined && o.su !== null && !Number.isInteger(o.su)) throw new ErroreBurraco("combinazioneNonValida");
    return { carte: o.carte as number[], ...(o.su === undefined || o.su === null ? {} : { su: o.su as number }) };
  });
}

/** Applica un'azione. Lancia un `ErroreBurraco` se non è permessa in questa fase. */
export function applica(s: StatoOnline, a: AzioneOnline): StatoOnline {
  const n = s.nomi.length;
  switch (a.tipo) {
    case "occupa":
      if (!eUnPosto(s, a.posto)) throw new ErroreBurraco("nomeInesistente");
      if (s.occupati.includes(a.posto)) throw new ErroreBurraco("nomeOccupato");
      return { ...s, occupati: [...s.occupati, a.posto] };

    case "libera":
      return s.fase === "sala" ? { ...s, occupati: s.occupati.filter((p) => p !== a.posto) } : s;

    case "avvia":
      if (s.fase !== "sala") throw new ErroreBurraco("giaIniziata");
      if (s.occupati.length < n) throw new ErroreBurraco("pochiHannoScelto");
      return iniziaMano(s, a.seme, 1, 1, s.punti);

    case "prossimaMano":
      if (s.fase !== "fineMano") throw new ErroreBurraco("nonFinitaMano");
      return iniziaMano(s, a.seme, avanza(s.primo, n), s.mano + 1, s.punti, s.partita?.eventi ?? []);

    case "ricomincia":
      if (s.fase !== "fine") throw new ErroreBurraco("nonFinita");
      return iniziaMano(s, a.seme, avanza(s.primo, n), 1, [0, 0]);

    default:
      return mossa(s, a);
  }
}

function mossa(s: StatoOnline, a: Extract<AzioneOnline, { tipo: "pesca" | "prendiPila" | "cala" | "scarta" | "bot" }>): StatoOnline {
  if (s.fase !== "partita" || !s.partita) throw new ErroreBurraco("nonInCorso");
  const p = s.partita;
  const chi = a.tipo === "bot" ? a.posto : a.chi;
  if (!eUnPosto(s, chi)) throw new ErroreBurraco("nonPartecipa");
  switch (a.tipo) {
    case "pesca":
      return dopoMossa(s, pesca(p, chi));
    case "prendiPila": {
      const gruppo = a.gruppo === undefined ? undefined : Array.isArray(a.gruppo) && a.gruppo.every((x) => Number.isInteger(x)) ? a.gruppo : null;
      if (gruppo === null) throw new ErroreBurraco("pilaBloccata");
      return dopoMossa(s, prendiPila(p, chi, gruppo));
    }
    case "cala":
      return dopoMossa(s, cala(p, chi, leggiGruppi(a.gruppi)));
    case "scarta":
      if (!Number.isInteger(a.carta)) throw new ErroreBurraco("cartaNonInMano");
      return dopoMossa(s, scarta(p, chi, a.carta));
    case "bot": {
      const livello = a.livello ?? "difficile";
      if (!LIVELLI.includes(livello)) throw new ErroreBurraco("configNonValida");
      let m;
      try {
        m = mossaBotLivello(p, chi, livello, rngDellaMossa(s));
      } catch {
        throw new ErroreBurraco("nullaDaFare");
      }
      // Online (senza livello) il passo del bot è annunciato a tutti; offline si vede solo la sua mossa.
      const conEvento: Partita = a.livello ? p : { ...p, eventi: [...p.eventi, { tipo: "bot" as const, posto: chi }].slice(-MAX_EVENTI) };
      return dopoMossa(s, eseguiMossa(conEvento, chi, m));
    }
  }
}

/** Posti che il gioco aspetta: chi ha il turno. */
export function mancanti(s: StatoOnline): number[] {
  return s.fase === "partita" && s.partita && !s.partita.fine ? [s.partita.turno] : [];
}

export interface VistaGiocatore {
  posto: number;
  nome: string;
  squadra: number;
  occupato: boolean;
  collegato: boolean;
  organizzatore: boolean;
  /** Quante carte ha in mano (mai quali). */
  carte: number;
}

export interface VistaSquadra {
  punti: number;
  /** Il pozzetto è già stato preso (anche se ancora in arrivo in mano). */
  pozzettoPreso: boolean;
}

export interface Vista {
  fase: FaseOnline;
  io: number | null;
  /** La mia squadra (1 o 2); null se guardo. */
  miaSquadra: number | null;
  host: boolean;
  config: ConfigOnline;
  mano: number;
  nomi: VistaGiocatore[];
  squadre: [VistaSquadra, VistaSquadra];
  /** La mia mano; vuota per chi guarda. */
  carte: Carta[];
  /** Combinazioni di tutti (pubbliche). */
  combinazioni: Combinazione[];
  /** Il monte degli scarti per intero, dal fondo alla cima. */
  scarti: Carta[];
  mazzo: number;
  turno: number | null;
  mioTurno: boolean;
  fasePasso: "pescare" | "giocare" | null;
  /** Posso prendere il monte adesso (con la pila bloccata dipende dalla mia mano). */
  possoPrendere: boolean;
  pilaBloccata: boolean;
  /** Carta che non posso riscartare subito. */
  vietata: number | null;
  eventi: Evento[];
  fineMano: { motivo: MotivoFine; chi: number | null } | null;
  /** Il punteggio dell'ultima mano finita. */
  ultima: [PunteggioSquadra, PunteggioSquadra] | null;
  vincitore: number | null;
}

export function vistaPer(s: StatoOnline, posto: number | null, host: boolean): Vista {
  const p = s.partita;
  const inMano = s.fase === "partita" && p !== null && !p.fine;
  const turno = inMano && p ? p.turno : null;
  const mioTurno = posto !== null && turno === posto;
  return {
    fase: s.fase,
    io: posto,
    miaSquadra: posto === null ? null : squadra(posto),
    host,
    config: s.config,
    mano: s.mano,
    nomi: s.nomi.map((nome, i) => ({
      posto: i + 1,
      nome,
      squadra: squadra(i + 1),
      occupato: s.occupati.includes(i + 1),
      collegato: false,
      organizzatore: false,
      carte: p ? p.mani[i]!.length : 0,
    })),
    squadre: [
      { punti: s.punti[0], pozzettoPreso: p?.presi[0] ?? false },
      { punti: s.punti[1], pozzettoPreso: p?.presi[1] ?? false },
    ],
    carte: p && posto !== null ? p.mani[posto - 1]! : [],
    combinazioni: p ? p.combinazioni : [],
    scarti: p ? p.scarti : [],
    mazzo: p ? p.mazzo.length : 0,
    turno,
    mioTurno,
    fasePasso: mioTurno && p ? p.fase : null,
    possoPrendere: mioTurno && p !== null && posto !== null ? puoPrendere(p, posto) : false,
    pilaBloccata: p ? pilaBloccata(p) : false,
    vietata: mioTurno && p ? p.vietata : null,
    eventi: p ? p.eventi : [],
    fineMano: p?.fine ?? null,
    ultima: s.ultima,
    vincitore: s.vincitore,
  };
}

const POSTI = (s: StatoOnline) => s.nomi.map((_, i) => i + 1);

export const burracoOnline: GiocoOnline<StatoOnline, AzioneOnline, Vista> = {
  id: "burraco",
  nuovoStato,
  applica,
  momento: (s) => (s.fase === "sala" ? "sala" : s.fase === "fine" ? "fine" : "inCorso"),
  inGioco: (s) => (s.fase === "sala" ? [] : POSTI(s)),
  mancanti,

  traduci(_s, ctx, a) {
    const mio = ctx.posto;
    const soloHost = () => {
      if (!ctx.host) throw new ErroreBurraco("soloHost");
    };
    const partecipa = (): number => {
      if (mio === null) throw new ErroreBurraco("nonPartecipa");
      return mio;
    };
    switch (a.tipo) {
      case "avvia":
        soloHost();
        return { tipo: "avvia", seme: ctx.seme() };
      case "prossimaMano":
        soloHost();
        return { tipo: "prossimaMano", seme: ctx.seme() };
      case "ricomincia":
        soloHost();
        return { tipo: "ricomincia", seme: ctx.seme() };
      case "mossaBot":
        soloHost();
        return { tipo: "bot", posto: Number(a.posto) };
      case "pesca":
        return { tipo: "pesca", chi: partecipa() };
      case "prendiPila":
        return { tipo: "prendiPila", chi: partecipa(), gruppo: a.gruppo as number[] | undefined };
      case "cala":
        return { tipo: "cala", chi: partecipa(), gruppi: a.gruppi };
      case "scarta":
        return { tipo: "scarta", chi: partecipa(), carta: Number(a.carta) };
      default:
        throw new ErroreBurraco("azioneNonValida");
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
