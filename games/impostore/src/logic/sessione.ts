import { ErroreGioco } from "../errori";
import { creaGiocatori, type Macchina } from "@gdt/engine";
import { nuovaMacchinaImpostore, vincitore, type EventoImpostore, type FaseImpostore, type Vincitore } from "./fasi";
import { creaPartita, eImpostore, verificaTentativo, type Partita } from "./partita";

/**
 * Stato di una partita a un telefono solo. La fase sta nella macchina;
 * gli altri campi sono i dati della fase corrente (chi guarda la carta, chi è stato eliminato, ...).
 */
export interface Sessione {
  macchina: Macchina<FaseImpostore, EventoImpostore>;
  partita: Partita | null;
  /** Indice in `partita.giocatori` di chi sta guardando la propria carta. */
  indiceCarta: number;
  cartaMostrata: boolean;
  eliminato: number | null;
  indovinato: boolean;
}

export type Azione =
  | {
      tipo: "avvia";
      nomi: readonly string[];
      numImpostori: number;
      parole: readonly string[];
      escluse: readonly string[];
      seme: number;
    }
  | { tipo: "mostraCarta" }
  | { tipo: "prossimaCarta" }
  | { tipo: "indiziFatti" }
  | { tipo: "elimina"; posto: number }
  | { tipo: "tenta"; testo: string }
  | { tipo: "nuova" };

export function sessioneIniziale(): Sessione {
  return {
    macchina: nuovaMacchinaImpostore(),
    partita: null,
    indiceCarta: 0,
    cartaMostrata: false,
    eliminato: null,
    indovinato: false,
  };
}

function partitaCorrente(s: Sessione): Partita {
  if (!s.partita) throw new ErroreGioco("nessunaPartita");
  return s.partita;
}

/** Applica un'azione e restituisce il nuovo stato. Le azioni fuori fase lanciano errore. */
export function riduci(s: Sessione, a: Azione): Sessione {
  switch (a.tipo) {
    case "avvia":
      return {
        ...sessioneIniziale(),
        partita: creaPartita(
          {
            giocatori: creaGiocatori(a.nomi),
            numImpostori: a.numImpostori,
            parole: a.parole,
            escluse: a.escluse,
          },
          a.seme,
        ),
      };

    case "mostraCarta":
      return { ...s, cartaMostrata: true };

    case "prossimaCarta": {
      const p = partitaCorrente(s);
      if (s.indiceCarta + 1 < p.giocatori.length) {
        return { ...s, indiceCarta: s.indiceCarta + 1, cartaMostrata: false };
      }
      return { ...s, macchina: s.macchina.invia("avanti") };
    }

    case "indiziFatti":
      return { ...s, macchina: s.macchina.invia("avanti") };

    case "elimina": {
      const p = partitaCorrente(s);
      const evento = eImpostore(p, a.posto) ? "impostoreScoperto" : "impostoreNonScoperto";
      return { ...s, macchina: s.macchina.invia(evento), eliminato: a.posto };
    }

    case "tenta": {
      const p = partitaCorrente(s);
      return {
        ...s,
        macchina: s.macchina.invia("tentativoEseguito"),
        indovinato: verificaTentativo(p, a.testo),
      };
    }

    case "nuova":
      return sessioneIniziale();
  }
}

export interface EsitoSessione {
  scoperto: boolean;
  vincitore: Vincitore;
}

/** Esito della partita, solo quando è finita. */
export function esitoSessione(s: Sessione): EsitoSessione | null {
  if (!s.partita || s.macchina.fase !== "fine") return null;
  const scoperto = s.eliminato !== null && eImpostore(s.partita, s.eliminato);
  return { scoperto, vincitore: vincitore(scoperto, s.indovinato) };
}
