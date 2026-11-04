import type { Giocatore } from "@gdt/engine";
import { carta, creaPartita, eImpostore, impostoriMassimi, verificaTentativo, type Carta, type Partita } from "../logic/partita";
import { vincitore, type Vincitore } from "../logic/fasi";
import { paroleDi, categorie, type Categoria } from "../parole";

/**
 * Impostore con un telefono per giocatore. Modulo puro: lo usa il server, che tiene lo stato
 * e manda a ogni telefono solo la sua `vista` (la carta altrui non viaggia mai sulla rete).
 */

export type FaseOnline = "sala" | "carte" | "indizi" | "voto" | "tentativo" | "fine";

export interface ConfigOnline {
  numImpostori: number;
  categoria: Categoria;
  /** true = contatori dei voti in diretta; false = si rivelano a voto chiuso. */
  votiVisibili: boolean;
}

export interface EsitoRound {
  conteggi: Record<number, number>;
  /** null = pareggio. */
  eliminato: number | null;
  ballottaggio: boolean;
}

export interface StatoOnline {
  fase: FaseOnline;
  nomi: string[];
  config: ConfigOnline;
  /** Posti (indice+1) i cui nomi sono stati scelti da un telefono. */
  occupati: number[];
  partita: Partita | null;
  /** Posti che partecipano alla partita in corso. */
  inGioco: number[];
  viste: number[];
  voti: Record<number, number>;
  /** Esclusi dal voto dall'organizzatore (telefono irraggiungibile): non si aspetta il loro voto. */
  esclusi: number[];
  /** Candidati del ballottaggio; null = primo round. */
  candidati: number[] | null;
  ultimoEsito: EsitoRound | null;
  eliminato: number | null;
  indovinato: boolean;
  /** Parole già uscite in questa stanza, per non ripeterle. */
  usate: string[];
  seme: number;
}

export type AzioneOnline =
  | { tipo: "occupa"; posto: number }
  | { tipo: "libera"; posto: number }
  | { tipo: "avvia"; seme: number }
  | { tipo: "avanti" }
  | { tipo: "visto"; posto: number }
  | { tipo: "vota"; chi: number; posto: number }
  | { tipo: "escludi"; posto: number }
  | { tipo: "tenta"; testo: string }
  | { tipo: "nuova" };

export function nuovoStato(nomi: string[], config: ConfigOnline): StatoOnline {
  const puliti = nomi.map((n) => n.trim().slice(0, 40)).filter(Boolean);
  if (new Set(puliti.map((n) => n.toLocaleLowerCase("it-IT"))).size !== puliti.length) {
    throw new Error("Ci sono nomi uguali");
  }
  if (puliti.length < 3) throw new Error("Servono almeno 3 giocatori");
  if (!categorie.includes(config.categoria)) throw new Error("Categoria non valida");
  if (config.numImpostori < 1 || config.numImpostori > impostoriMassimi(puliti.length)) {
    throw new Error(`Con ${puliti.length} giocatori gli impostori possono essere al massimo ${impostoriMassimi(puliti.length)}`);
  }
  return {
    fase: "sala",
    nomi: puliti,
    config,
    occupati: [],
    partita: null,
    inGioco: [],
    viste: [],
    voti: {},
    esclusi: [],
    candidati: null,
    ultimoEsito: null,
    eliminato: null,
    indovinato: false,
    usate: [],
    seme: 0,
  };
}

function conta(voti: Record<number, number>): Record<number, number> {
  const c: Record<number, number> = {};
  for (const v of Object.values(voti)) c[v] = (c[v] ?? 0) + 1;
  return c;
}

function chiudiRound(s: StatoOnline): StatoOnline {
  const conteggi = conta(s.voti);
  const max = Math.max(...Object.values(conteggi));
  const primi = Object.entries(conteggi)
    .filter(([, v]) => v === max)
    .map(([p]) => Number(p))
    .sort((a, b) => a - b);

  if (primi.length > 1 && s.candidati === null) {
    // Pareggio: ballottaggio solo tra i pari merito.
    return {
      ...s,
      candidati: primi,
      voti: {},
      ultimoEsito: { conteggi, eliminato: null, ballottaggio: true },
    };
  }
  if (primi.length > 1) {
    // Secondo pareggio: nessuno viene eliminato e vince l'impostore.
    return { ...s, fase: "fine", voti: {}, eliminato: null, ultimoEsito: { conteggi, eliminato: null, ballottaggio: false } };
  }
  const eliminato = primi[0] as number;
  const partita = s.partita as Partita;
  const esito: EsitoRound = { conteggi, eliminato, ballottaggio: false };
  return {
    ...s,
    voti: {},
    eliminato,
    ultimoEsito: esito,
    fase: eImpostore(partita, eliminato) ? "tentativo" : "fine",
  };
}

/** Applica un'azione. Lancia un errore se non è permessa in questa fase. */
export function applica(s: StatoOnline, a: AzioneOnline): StatoOnline {
  switch (a.tipo) {
    case "occupa":
      if (a.posto < 1 || a.posto > s.nomi.length) throw new Error("Nome inesistente");
      if (s.occupati.includes(a.posto)) throw new Error("Nome già scelto da un altro");
      return { ...s, occupati: [...s.occupati, a.posto] };

    case "libera":
      return { ...s, occupati: s.occupati.filter((p) => p !== a.posto) };

    case "avvia": {
      if (s.fase !== "sala") throw new Error("La partita è già iniziata");
      const inGioco = [...s.occupati].sort((a, b) => a - b);
      if (inGioco.length < 3) throw new Error("Servono almeno 3 giocatori che hanno scelto il nome");
      if (s.config.numImpostori * 2 >= inGioco.length) {
        throw new Error(`Con ${inGioco.length} giocatori gli impostori possono essere al massimo ${impostoriMassimi(inGioco.length)}`);
      }
      const giocatori: Giocatore[] = inGioco.map((p) => ({ posto: p, nome: s.nomi[p - 1] as string }));
      const partita = creaPartita(
        { giocatori, numImpostori: s.config.numImpostori, parole: paroleDi(s.config.categoria), escluse: s.usate },
        a.seme,
      );
      return {
        ...s,
        fase: "carte",
        partita,
        inGioco,
        viste: [],
        voti: {},
        esclusi: [],
        candidati: null,
        ultimoEsito: null,
        eliminato: null,
        indovinato: false,
        usate: [...s.usate, partita.parola].slice(-30),
        seme: a.seme,
      };
    }

    case "visto":
      if (s.fase !== "carte" || !s.inGioco.includes(a.posto)) return s;
      return s.viste.includes(a.posto) ? s : { ...s, viste: [...s.viste, a.posto] };

    case "avanti":
      if (s.fase === "carte") return { ...s, fase: "indizi" };
      if (s.fase === "indizi") return { ...s, fase: "voto", voti: {}, esclusi: [], candidati: null, ultimoEsito: null };
      throw new Error("Non si può avanzare adesso");

    case "vota": {
      if (s.fase !== "voto") throw new Error("Non si sta votando");
      if (!s.inGioco.includes(a.chi)) throw new Error("Questo giocatore non partecipa");
      const candidati = s.candidati ?? s.inGioco;
      if (!candidati.includes(a.posto)) throw new Error("Non puoi votare questo giocatore");
      if (a.chi === a.posto) throw new Error("Non puoi votare te stesso");
      const voti = { ...s.voti, [a.chi]: a.posto };
      // Chi era stato escluso e poi rientra a votare torna tra i votanti.
      const next = { ...s, voti, esclusi: s.esclusi.filter((p) => p !== a.chi) };
      return mancanti(next).length === 0 ? chiudiRound(next) : next;
    }

    case "escludi": {
      if (s.fase !== "voto") throw new Error("Non si sta votando");
      if (!s.inGioco.includes(a.posto)) throw new Error("Questo giocatore non partecipa");
      if (a.posto in s.voti) throw new Error("Ha già votato");
      if (s.esclusi.includes(a.posto)) return s;
      if (votanti(s).length <= 2) throw new Error("Devono restare almeno 2 votanti");
      const next = { ...s, esclusi: [...s.esclusi, a.posto] };
      return mancanti(next).length === 0 ? chiudiRound(next) : next;
    }

    case "tenta": {
      if (s.fase !== "tentativo" || !s.partita) throw new Error("Nessun tentativo in corso");
      return { ...s, fase: "fine", indovinato: verificaTentativo(s.partita, a.testo) };
    }

    case "nuova":
      if (s.fase !== "fine") throw new Error("La partita non è finita");
      return { ...s, fase: "sala", partita: null, inGioco: [], viste: [], voti: {}, esclusi: [], candidati: null, ultimoEsito: null, eliminato: null, indovinato: false };
  }
}

/** Chi deve votare in questo round: i giocatori meno gli esclusi. */
export function votanti(s: StatoOnline): number[] {
  return s.inGioco.filter((p) => !s.esclusi.includes(p));
}

/** Chi non ha ancora votato nel round in corso (esclusi non inclusi). */
export function mancanti(s: StatoOnline): number[] {
  if (s.fase !== "voto") return [];
  return votanti(s).filter((p) => !(p in s.voti));
}

export interface Fine {
  parola: string;
  impostori: number[];
  eliminato: number | null;
  scoperto: boolean;
  vincitore: Vincitore;
}

export interface Vista {
  fase: FaseOnline;
  config: ConfigOnline;
  /** Il mio posto; null se non ho ancora scelto il nome. */
  io: number | null;
  host: boolean;
  nomi: {
    posto: number;
    nome: string;
    occupato: boolean;
    inGioco: boolean;
    /** Un telefono di questo giocatore è collegato adesso (lo riempie il server, che conosce le connessioni). */
    collegato: boolean;
  }[];
  /** La mia carta: solo la mia. */
  carta: Carta | null;
  viste: number;
  primo: number | null;
  voto: {
    candidati: number[];
    mioVoto: number | null;
    hannoVotato: number;
    totale: number;
    /** Contatori: solo se i voti sono visibili. */
    conteggi: Record<number, number> | null;
    /** Solo per l'organizzatore. */
    mancanti: number[] | null;
    ballottaggio: boolean;
    /** Giocatori esclusi dal voto dall'organizzatore. */
    esclusi: number[];
  } | null;
  /** Esito dell'ultimo round chiuso (voti rivelati). */
  ultimoEsito: EsitoRound | null;
  eliminato: number | null;
  fine: Fine | null;
}

/** Cosa può vedere il telefono di `posto`. Non include mai la carta altrui. */
export function vistaPer(s: StatoOnline, posto: number | null, host: boolean): Vista {
  const p = s.partita;
  const inPartita = posto !== null && s.inGioco.includes(posto);
  const vistaVoto =
    s.fase === "voto"
      ? {
          candidati: s.candidati ?? s.inGioco,
          mioVoto: posto !== null ? (s.voti[posto] ?? null) : null,
          hannoVotato: Object.keys(s.voti).length,
          totale: votanti(s).length,
          conteggi: s.config.votiVisibili ? conta(s.voti) : null,
          mancanti: host ? mancanti(s) : null,
          ballottaggio: s.candidati !== null,
          esclusi: s.esclusi,
        }
      : null;

  let fine: Fine | null = null;
  if (s.fase === "fine" && p) {
    const scoperto = s.eliminato !== null && eImpostore(p, s.eliminato);
    fine = {
      parola: p.parola,
      impostori: [...p.impostori],
      eliminato: s.eliminato,
      scoperto,
      vincitore: vincitore(scoperto, s.indovinato),
    };
  }

  return {
    fase: s.fase,
    config: s.config,
    io: posto,
    host,
    nomi: s.nomi.map((nome, i) => ({
      posto: i + 1,
      nome,
      occupato: s.occupati.includes(i + 1),
      inGioco: s.inGioco.includes(i + 1),
      collegato: false,
    })),
    carta: p && inPartita && s.fase !== "sala" ? carta(p, posto as number) : null,
    viste: s.viste.length,
    primo: p ? p.primoDiTurno : null,
    voto: vistaVoto,
    ultimoEsito: s.ultimoEsito,
    eliminato: s.eliminato,
    fine,
  };
}
