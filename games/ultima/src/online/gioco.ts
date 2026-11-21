import { MAX_CARATTERI_NOME, creaRng, limitaTesto, type GiocoOnline, type Rng } from "@gdt/engine";
import { PROB_ULTIMA, eseguiMossa, mossaBotLivello, type Livello } from "../bot";
import {
  ErroreUltima,
  MAX_EVENTI,
  MAX_GIOCATORI,
  MIN_GIOCATORI,
  NOMI_VARIANTI,
  VARIANTI_BASE,
  accetta,
  avanza,
  beccato,
  giocabili,
  gioca,
  nuovoRound,
  passa,
  pesca,
  pescaCumulo,
  scegliColore,
  sfida,
  taglia,
  ultima,
  valorePunti,
  carteTagliabili,
  type Carta,
  type Colore,
  type Evento,
  type Partita,
  type UltimaAperta,
  type Varianti,
} from "../logica";

/**
 * Ultima! con un telefono per giocatore. Modulo puro: lo usa il server, che tiene lo stato e
 * manda a ognuno la sua vista. La mano è segreta: le carte altrui non passano mai sulla rete,
 * degli altri si vede solo quante carte hanno.
 */

export type FaseOnline = "sala" | "partita" | "fineRound" | "fine";
export type ModoPunteggio = "singolo" | "punti";

export interface ConfigOnline {
  /** `singolo` = un solo round; `punti` = più round fino alla soglia. */
  modo: ModoPunteggio;
  /** Punti da raggiungere nella partita a punti. */
  soglia: number;
  /** Impostazioni iniziali della stanza (regole facoltative), spente di base. */
  varianti: Varianti;
}

export const SOGLIA_PREDEFINITA = 500;
export const SOGLIA_MIN = 50;
export const SOGLIA_MAX = 2000;

export interface StatoOnline {
  fase: FaseOnline;
  nomi: string[];
  config: ConfigOnline;
  /** Posti scelti da un telefono. */
  occupati: number[];
  partita: Partita | null;
  /** Chi apre il round in corso (ruota a ogni round). */
  primo: number;
  /** Punti di ogni posto (`punti[posto - 1]`). */
  punti: number[];
  round: number;
  /** Chi ha vinto la partita (round singolo, o soglia raggiunta). */
  vincitore: number | null;
  /** Il seme del round e quante mosse sono state fatte: danno il caso delle pesche dopo un rimescolo. */
  seme: number;
  mosse: number;
}

export type AzioneOnline =
  | { tipo: "occupa"; posto: number }
  | { tipo: "libera"; posto: number }
  | { tipo: "avvia"; seme: number }
  /** `ora` la aggiunge `traduci` (da `ctx.ora()`): apre la finestra di taglio. Non viene dal telefono. */
  | { tipo: "gioca"; chi: number; carta: number; colore?: unknown; scambiaCon?: unknown; insieme?: unknown; ora?: number }
  /** `dichiara`: solo per i bot offline, che dicono «Ultima!» insieme al taglio. */
  | { tipo: "taglia"; chi: number; carta: number; ora: number; dichiara?: boolean }
  | { tipo: "pesca"; chi: number }
  | { tipo: "passa"; chi: number }
  | { tipo: "scegliColore"; chi: number; colore: unknown }
  | { tipo: "sfida"; chi: number }
  | { tipo: "accetta"; chi: number }
  | { tipo: "ultima"; chi: number }
  | { tipo: "beccato"; chi: number; bersaglio: number }
  | { tipo: "pescaCumulo"; chi: number }
  /**
   * Il bot fa una mossa per `posto`. Online la chiede l'organizzatore (livello difficile, evento «mossa
   * simulata dal bot»); offline la macchina a stati la usa per gli avversari, con il loro `livello`.
   */
  | { tipo: "bot"; posto: number; livello?: Livello; ora?: number }
  | { tipo: "prossimoRound"; seme: number }
  | { tipo: "ricomincia"; seme: number };

/** Config dalla rete: va controllata campo per campo. Assente = round singolo. */
export function leggiConfig(grezza: unknown): ConfigOnline {
  const c = (typeof grezza === "object" && grezza !== null ? grezza : {}) as Record<string, unknown>;
  const modo = c.modo === undefined ? "singolo" : c.modo;
  if (modo !== "singolo" && modo !== "punti") throw new ErroreUltima("configNonValida");
  const soglia = c.soglia === undefined ? SOGLIA_PREDEFINITA : c.soglia;
  if (typeof soglia !== "number" || !Number.isInteger(soglia) || soglia < SOGLIA_MIN || soglia > SOGLIA_MAX) {
    throw new ErroreUltima("configNonValida");
  }
  const grezze = c.varianti === undefined ? {} : c.varianti;
  if (typeof grezze !== "object" || grezze === null || Array.isArray(grezze)) throw new ErroreUltima("configNonValida");
  const g = grezze as Record<string, unknown>;
  const varianti = { ...VARIANTI_BASE };
  for (const nome of NOMI_VARIANTI) {
    const v = g[nome];
    if (v === undefined) continue;
    if (typeof v !== "boolean") throw new ErroreUltima("configNonValida");
    varianti[nome] = v;
  }
  return { modo, soglia, varianti };
}

export function nuovoStato(nomi: string[], config: unknown): StatoOnline {
  if (!Array.isArray(nomi)) throw new ErroreUltima("nomiNonValidi");
  const puliti = nomi.map((n) => limitaTesto(String(n).trim(), MAX_CARATTERI_NOME));
  if (puliti.length < MIN_GIOCATORI || puliti.length > MAX_GIOCATORI) throw new ErroreUltima("numeroGiocatori");
  if (puliti.some((n) => !n) || new Set(puliti.map((n) => n.toLocaleLowerCase("it-IT"))).size !== puliti.length) {
    throw new ErroreUltima("nomiNonValidi");
  }
  return {
    fase: "sala",
    nomi: puliti,
    config: leggiConfig(config),
    occupati: [],
    partita: null,
    primo: 1,
    punti: puliti.map(() => 0),
    round: 0,
    vincitore: null,
    seme: 0,
    mosse: 0,
  };
}

const eUnPosto = (s: StatoOnline, p: number) => Number.isInteger(p) && p >= 1 && p <= s.nomi.length;

/** Caso di una mossa: dal seme del round e dal numero della mossa, così la partita si ripete con lo stesso seme. */
function rngDellaMossa(s: StatoOnline): Rng {
  return creaRng((s.seme ^ Math.imul(s.mosse + 1, 0x9e3779b1)) >>> 0);
}

function iniziaRound(s: StatoOnline, seme: number, primo: number, round: number, punti: number[], eventi: Evento[] = []): StatoOnline {
  return {
    ...s,
    fase: "partita",
    partita: nuovoRound(s.nomi.length, creaRng(seme), eventi, primo, s.config.varianti),
    primo,
    punti,
    round,
    vincitore: null,
    seme,
    mosse: 0,
  };
}

/** Dopo una mossa: se il round è finito aggiorna i punti e decide se la partita continua. */
function dopoMossa(s: StatoOnline, partita: Partita): StatoOnline {
  const avanzato = { ...s, partita, mosse: s.mosse + 1 };
  if (!partita.fine) return avanzato;
  const { vincitore, punti } = partita.fine;
  const totali = s.punti.map((x, i) => (i + 1 === vincitore ? x + punti : x));
  if (s.config.modo === "singolo" || totali[vincitore - 1]! >= s.config.soglia) {
    return { ...avanzato, fase: "fine", punti: totali, vincitore };
  }
  return { ...avanzato, fase: "fineRound", punti: totali };
}

/** Applica un'azione. Lancia un `ErroreUltima` se non è permessa in questa fase. */
export function applica(s: StatoOnline, a: AzioneOnline): StatoOnline {
  const n = s.nomi.length;
  switch (a.tipo) {
    case "occupa":
      if (!eUnPosto(s, a.posto)) throw new ErroreUltima("nomeInesistente");
      if (s.occupati.includes(a.posto)) throw new ErroreUltima("nomeOccupato");
      return { ...s, occupati: [...s.occupati, a.posto] };

    case "libera":
      // A partita avviata il posto resta del giocatore: cambia solo il telefono (lo decide il server).
      return s.fase === "sala" ? { ...s, occupati: s.occupati.filter((p) => p !== a.posto) } : s;

    case "avvia":
      if (s.fase !== "sala") throw new ErroreUltima("giaIniziata");
      if (s.occupati.length < n) throw new ErroreUltima("pochiHannoScelto");
      return iniziaRound(s, a.seme, 1, 1, s.punti);

    case "prossimoRound":
      if (s.fase !== "fineRound") throw new ErroreUltima("nonFinitoRound");
      return iniziaRound(s, a.seme, avanza(s.primo, 1, n), s.round + 1, s.punti, s.partita?.eventi ?? []);

    case "ricomincia":
      if (s.fase !== "fine") throw new ErroreUltima("nonFinita");
      return iniziaRound(s, a.seme, avanza(s.primo, 1, n), 1, s.nomi.map(() => 0));

    default:
      return mossa(s, a);
  }
}

function mossa(s: StatoOnline, a: Extract<AzioneOnline, { tipo: "gioca" | "pesca" | "passa" | "scegliColore" | "sfida" | "accetta" | "ultima" | "beccato" | "pescaCumulo" | "taglia" | "bot" }>): StatoOnline {
  if (s.fase !== "partita" || !s.partita) throw new ErroreUltima("nonInCorso");
  const n = s.nomi.length;
  const p = s.partita;
  const rng = rngDellaMossa(s);
  const chi = a.tipo === "bot" ? a.posto : a.chi;
  if (!eUnPosto(s, chi)) throw new ErroreUltima("nonPartecipa");
  switch (a.tipo) {
    case "gioca":
      return dopoMossa(s, gioca(p, n, chi, a.carta, a.colore, rng, false, { scambiaCon: a.scambiaCon, insieme: a.insieme, ora: a.ora }));
    case "pesca":
      return dopoMossa(s, pesca(p, chi, rng));
    case "passa":
      return dopoMossa(s, passa(p, n, chi));
    case "scegliColore":
      return dopoMossa(s, scegliColore(p, chi, a.colore));
    case "sfida":
      return dopoMossa(s, sfida(p, n, chi, rng));
    case "accetta":
      return dopoMossa(s, accetta(p, n, chi, rng));
    case "pescaCumulo":
      return dopoMossa(s, pescaCumulo(p, n, chi, rng));
    case "taglia":
      return dopoMossa(s, taglia(p, n, chi, a.carta, a.ora, rng, a.dichiara === true));
    case "ultima":
      return dopoMossa(s, ultima(p, chi));
    case "beccato":
      return dopoMossa(s, beccato(p, chi, a.bersaglio, rng));
    case "bot": {
      // Online (senza livello) è il bot di «Simula mossa»: difficile e annunciato negli eventi.
      // Offline gli avversari sono bot dichiarati: si vede solo la loro mossa.
      const livello = a.livello ?? "difficile";
      let m;
      try {
        m = mossaBotLivello(p, n, chi, livello, rng);
      } catch {
        throw new ErroreUltima("nullaDaFare");
      }
      const dichiara = rng.next() < PROB_ULTIMA[livello];
      // L'evento «mossa simulata dal bot» precede quello della mossa, così si legge in ordine.
      const conEvento: Partita = a.livello ? p : { ...p, eventi: [...p.eventi, { tipo: "bot" as const, posto: chi }].slice(-MAX_EVENTI) };
      return dopoMossa(s, eseguiMossa(conEvento, n, chi, m, rng, dichiara, a.ora));
    }
  }
}

/** Posti che il gioco aspetta: chi deve agire (anche per rispondere a un +4 o scegliere il colore). */
export function mancanti(s: StatoOnline): number[] {
  return s.fase === "partita" && s.partita ? [s.partita.turno] : [];
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
  /** Punti totali della partita. */
  punti: number;
  /** A fine round: i punti delle carte che gli sono rimaste. */
  puntiInMano: number | null;
}

export interface Vista {
  fase: FaseOnline;
  /** Il mio posto; null se non ne ho uno (chi guarda). */
  io: number | null;
  host: boolean;
  config: ConfigOnline;
  round: number;
  nomi: VistaGiocatore[];
  /** La mia mano; vuota per chi guarda. */
  mano: Carta[];
  /** Id delle carte che posso calare adesso (nel mio turno). */
  giocabili: number[];
  /** La carta scoperta in cima allo scarto. */
  scoperta: Carta | null;
  /** Colore in corso; null = lo deve ancora scegliere il primo giocatore. */
  colore: Colore | null;
  verso: 1 | -1;
  /** Carte rimaste nel mazzo. */
  mazzo: number;
  /** Il posto di turno (o chi deve rispondere); null fuori dal round. */
  turno: number | null;
  mioTurno: boolean;
  /** Ho già pescato in questo turno. */
  haPescato: boolean;
  /** Devo scegliere il colore (primo giocatore dopo un jolly scoperto). */
  sceltaColore: boolean;
  /** Un +4 da subire: il mio caso se `turno` sono io. `sospetto` è pubblico, la legalità no. */
  sfida: { contro: number; sospetto: boolean } | null;
  /** Finestre di «Ultima!»: chi, e se l'ha già detto. */
  ultime: UltimaAperta[];
  /** Taglio: la carta appena calata e chi l'ha calata, finché si può tagliare. Il tempo lo conta il telefono. */
  taglio: { posto: number; carta: Carta } | null;
  /** Id delle mie carte identiche, se posso tagliare adesso. */
  puoTagliare: number[];
  /** Somma dei +2: chi deve rispondere con un +2 o pescare, e quante carte. */
  cumulo: { posto: number; quante: number; da: number | null } | null;
  eventi: Evento[];
  /** Il round è finito: chi ha vinto e quanti punti ha preso. */
  fineRound: { vincitore: number; punti: number } | null;
  /** Il vincitore della partita (dopo l'ultimo round). */
  vincitore: number | null;
}

export function vistaPer(s: StatoOnline, posto: number | null, host: boolean): Vista {
  const p = s.partita;
  const inRound = s.fase === "partita" && p !== null && !p.fine;
  const turno = inRound && p ? p.turno : null;
  const mioTurno = posto !== null && turno === posto;
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
      punti: s.punti[i]!,
      puntiInMano: p?.fine ? p.mani[i]!.reduce((somma, c) => somma + valorePunti(c), 0) : null,
    })),
    mano: p && posto !== null ? p.mani[posto - 1]! : [],
    giocabili: p && posto !== null ? giocabili(p, posto).map((c) => c.id) : [],
    scoperta: p ? p.scarto[p.scarto.length - 1]! : null,
    colore: p ? p.colore : null,
    verso: p ? p.verso : 1,
    mazzo: p ? p.mazzo.length : 0,
    turno,
    mioTurno,
    haPescato: mioTurno && p ? p.haPescato : false,
    sceltaColore: mioTurno && p !== null && p.colore === null,
    // L'esito segreto della sfida (`illegale`) non esce mai dal server.
    sfida: p?.sfida ? { contro: p.sfida.contro, sospetto: p.sfida.sospetto } : null,
    ultime: p?.ultime ?? [],
    cumulo: p?.cumulo ?? null,
    taglio: inRound && p?.apertaTaglio ? { posto: p.apertaTaglio.posto, carta: p.apertaTaglio.carta } : null,
    puoTagliare: inRound && p && posto !== null ? carteTagliabili(p, posto).map((c) => c.id) : [],
    eventi: p ? p.eventi : [],
    fineRound: p?.fine ?? null,
    vincitore: s.vincitore,
  };
}

const POSTI = (s: StatoOnline) => s.nomi.map((_, i) => i + 1);

export const ultimaOnline: GiocoOnline<StatoOnline, AzioneOnline, Vista> = {
  id: "ultima",
  nuovoStato,
  applica,
  momento: (s) => (s.fase === "sala" ? "sala" : s.fase === "fine" ? "fine" : "inCorso"),
  inGioco: (s) => (s.fase === "sala" ? [] : POSTI(s)),
  mancanti,

  traduci(_s, ctx, a) {
    const mio = ctx.posto;
    const soloHost = () => {
      if (!ctx.host) throw new ErroreUltima("soloHost");
    };
    const partecipa = (): number => {
      if (mio === null) throw new ErroreUltima("nonPartecipa");
      return mio;
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
      case "mossaBot":
        soloHost();
        return { tipo: "bot", posto: Number(a.posto), ora: ctx.ora() };
      case "gioca":
        return { tipo: "gioca", chi: partecipa(), carta: Number(a.carta), colore: a.colore, scambiaCon: a.scambiaCon === undefined ? undefined : Number(a.scambiaCon),
          // La lista la controlla la logica (variante, mano, stesso valore); qui solo numeri.
          insieme: a.insieme === undefined ? undefined : Array.isArray(a.insieme) ? a.insieme.slice(0, 20).map(Number) : a.insieme,
          ora: ctx.ora(),
        };
      case "taglia":
        // Solo dal proprio telefono, mai con «Simula mossa»: la gara la decide l'ordine di arrivo al server.
        return { tipo: "taglia", chi: partecipa(), carta: Number(a.carta), ora: ctx.ora() };
      case "scegliColore":
        return { tipo: "scegliColore", chi: partecipa(), colore: a.colore };
      case "beccato":
        return { tipo: "beccato", chi: partecipa(), bersaglio: Number(a.posto) };
      case "pescaCumulo":
      case "pesca":
      case "passa":
      case "sfida":
      case "accetta":
      case "ultima":
        return { tipo: a.tipo, chi: partecipa() };
      default:
        throw new ErroreUltima("azioneNonValida");
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
