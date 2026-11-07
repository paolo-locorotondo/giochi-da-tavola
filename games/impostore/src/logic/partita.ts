import { ErroreGioco } from "../errori";
import { creaRng, type Giocatore } from "@gdt/engine";

export interface ConfigPartita {
  giocatori: readonly Giocatore[];
  numImpostori: number;
  /** Parole della categoria scelta, nell'ordine del file dati. */
  parole: readonly string[];
  /** Parole già uscite di recente: scartate se resta almeno una alternativa. */
  escluse?: readonly string[];
}

export interface Partita {
  giocatori: readonly Giocatore[];
  parola: string;
  /** Posti degli impostori, in ordine crescente. */
  impostori: readonly number[];
  /** Posto di chi dà il primo indizio. */
  primoDiTurno: number;
}

/** Massimo di impostori ammesso: devono restare meno della metà dei giocatori. */
export function impostoriMassimi(numGiocatori: number): number {
  return Math.max(1, Math.floor((numGiocatori - 1) / 2));
}

/** Numero consigliato: 1 fino a 6 giocatori, 2 da 7 a 10, 3 da 11 in su. */
export function impostoriConsigliati(numGiocatori: number): number {
  const consigliati = numGiocatori <= 6 ? 1 : numGiocatori <= 10 ? 2 : 3;
  return Math.min(consigliati, impostoriMassimi(numGiocatori));
}

export type Carta ={ ruolo: "impostore" } | { ruolo: "civile"; parola: string };

/**
 * Crea la partita in modo deterministico dal seme.
 * L'ordine delle estrazioni (parola, impostori, primo di turno) fa parte del formato:
 * cambiarlo cambia l'esito dei codici esistenti e richiede di incrementare la versione dati.
 */
export function creaPartita(config: ConfigPartita, seme: number | string): Partita {
  const { giocatori, numImpostori, parole, escluse = [] } = config;
  const n = giocatori.length;

  if (n < 3) throw new ErroreGioco("pochiGiocatori");
  if (!Number.isInteger(numImpostori) || numImpostori < 1 || numImpostori * 2 >= n) {
    throw new ErroreGioco("impostoriNonValidi");
  }
  if (parole.length === 0) throw new ErroreGioco("categoriaVuota");

  const rng = creaRng(seme);
  const disponibili = parole.filter((p) => !escluse.includes(p));
  const pool = disponibili.length > 0 ? disponibili : parole;

  const parola = pool[rng.intero(pool.length)] as string;
  const impostori = rng
    .mescola(giocatori.map((g) => g.posto))
    .slice(0, numImpostori)
    .sort((a, b) => a - b);
  const primoDiTurno = (giocatori[rng.intero(n)] as Giocatore).posto;

  return { giocatori, parola, impostori, primoDiTurno };
}

/** Ciò che il giocatore al posto dato vede sulla propria carta segreta. */
export function carta(partita: Partita, posto: number): Carta {
  if (!partita.giocatori.some((g) => g.posto === posto)) {
    throw new ErroreGioco("postoInesistente", posto);
  }
  return partita.impostori.includes(posto)
    ? { ruolo: "impostore" }
    : { ruolo: "civile", parola: partita.parola };
}

/** Confronto tollerante: ignora maiuscole, accenti, spazi e punteggiatura. */
export function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Il tentativo dell'impostore coincide con la parola segreta? */
export function verificaTentativo(partita: Partita, tentativo: string): boolean {
  const t = normalizza(tentativo);
  return t.length > 0 && t === normalizza(partita.parola);
}

export type EsitoVoto =
  | { tipo: "eliminato"; posto: number }
  | { tipo: "pareggio"; posti: number[] };

/** `voti` associa ogni votante al posto votato. Il più votato viene eliminato. */
export function risultatoVoto(voti: Readonly<Record<number, number>>): EsitoVoto {
  const conteggio = new Map<number, number>();
  for (const votato of Object.values(voti)) {
    conteggio.set(votato, (conteggio.get(votato) ?? 0) + 1);
  }
  if (conteggio.size === 0) throw new ErroreGioco("nessunVoto");
  const massimo = Math.max(...conteggio.values());
  const posti = [...conteggio].filter(([, v]) => v === massimo).map(([p]) => p).sort((a, b) => a - b);
  return posti.length === 1
    ? { tipo: "eliminato", posto: posti[0] as number }
    : { tipo: "pareggio", posti };
}

export function eImpostore(partita: Partita, posto: number): boolean {
  return partita.impostori.includes(posto);
}
