import type { Rng } from "@gdt/engine";

/**
 * Ultima!: logica pura di un round. Non scrive frasi: gli errori sono codici (`ErroreUltima`)
 * che la UI traduce. Il caso (mescolate, pesche dopo un rimescolo) arriva da fuori (`Rng`).
 * Nel mazzo la cima è l'ultimo elemento dell'array. I posti vanno da 1 a n.
 */

export const COLORI = ["rosso", "giallo", "verde", "blu"] as const;
export type Colore = (typeof COLORI)[number];

export type Carta =
  | { id: number; tipo: "numero"; colore: Colore; valore: number }
  | { id: number; tipo: "salta" | "inverti" | "piu2"; colore: Colore }
  | { id: number; tipo: "jolly" | "piu4" };

export type CartaColorata = Extract<Carta, { colore: Colore }>;

export const MIN_GIOCATORI = 2;
export const MAX_GIOCATORI = 10;
export const CARTE_INIZIALI = 7;
/** Punti di una carta con simbolo (Salta, Inverti, +2). */
export const PUNTI_SIMBOLO = 20;
/** Punti di un Jolly o di un Jolly +4. */
export const PUNTI_JOLLY = 50;
/** Quanti eventi restano nell'elenco mostrato a tutti. */
export const MAX_EVENTI = 12;

/** Le varianti scelte alla creazione della stanza; tutte spente di base. */
export interface Varianti {
  /** Un +2 si può rispondere con un +2: il cumulo passa al successivo. */
  sommaPiu2: boolean;
  /** Si calano insieme più carte dello stesso numero (o Salta, o +2). */
  piuUguali: boolean;
  /** Chi ha una carta identica alla appena calata può giocarla fuori turno, entro 3 secondi. */
  taglio: boolean;
  /** Nel mazzo ci sono Scambio e Rotazione (due copie ciascuna). */
  scambioRotazione: boolean;
}
export const NOMI_VARIANTI = ["sommaPiu2", "piuUguali", "taglio", "scambioRotazione"] as const;
export const VARIANTI_BASE: Varianti = { sommaPiu2: false, piuUguali: false, taglio: false, scambioRotazione: false };

export class ErroreUltima extends Error {
  readonly codice: string;
  constructor(codice: string) {
    super(codice);
    this.name = "ErroreUltima";
    this.codice = codice;
  }
}

/** Azioni del round, visibili a tutti: mai la mano di nessuno (le carte pescate restano coperte). */
export type Evento =
  | { tipo: "nuovoRound" }
  | { tipo: "gioca"; posto: number; carta: Carta; colore: Colore | null }
  | { tipo: "pesca"; posto: number }
  | { tipo: "passa"; posto: number }
  | { tipo: "salta"; posto: number }
  | { tipo: "inverti" }
  | { tipo: "piu2"; posto: number }
  | { tipo: "piu4"; posto: number }
  | { tipo: "sfida"; posto: number; contro: number; legale: boolean }
  | { tipo: "accetta"; posto: number }
  | { tipo: "coloreScelto"; posto: number; colore: Colore }
  | { tipo: "ultima"; posto: number }
  | { tipo: "beccato"; posto: number; chi: number }
  | { tipo: "bot"; posto: number }
  | { tipo: "cumulo"; posto: number; quante: number }
  | { tipo: "pescaCumulo"; posto: number; quante: number }
  | { tipo: "mazzoRimescolato" }
  | { tipo: "fineRound"; posto: number; punti: number };

/** Chi ha una carta sola: può dire «Ultima!», o essere beccato. */
export interface UltimaAperta {
  posto: number;
  dichiarata: boolean;
}

/** Un round in corso. Il punteggio e la partita a punti stanno in `gioco.ts`. */
export interface Partita {
  mazzo: Carta[];
  scarto: Carta[];
  /** `mani[posto - 1]`: le carte in mano. Solo il server le conosce. */
  mani: Carta[][];
  verso: 1 | -1;
  /** Il posto di turno (o chi deve rispondere a una sfida). */
  turno: number;
  /** Colore in corso; null = il primo giocatore lo sceglie (la prima carta è un Jolly). */
  colore: Colore | null;
  /** Chi ha di turno ha già pescato: può giocare solo la carta pescata (se c'è), o passare. */
  haPescato: boolean;
  /** Id della carta appena pescata; null se non c'era niente da pescare. */
  pescata: number | null;
  /** Finestre di «Ultima!»: aperte finché il giocatore successivo non agisce (più d'una dopo una Rotazione). */
  ultime: UltimaAperta[];
  /** Le varianti attive (copia della configurazione della stanza). */
  varianti: Varianti;
  /** Somma dei +2: chi è "posto" risponde con un +2 o pesca "quante" carte; "da" ha giocato l'ultimo +2 (null: la prima carta). */
  cumulo: { posto: number; quante: number; da: number | null } | null;
  /**
   * Un +4 da subire. `sospetto` è pubblico (chi l'ha giocato aveva appena pescato);
   * `illegale` resta segreto e si scopre con la sfida.
   */
  sfida: { contro: number; sospetto: boolean; illegale: boolean } | null;
  /** Fine del round: chi ha finito le carte e i punti presi. */
  fine: { vincitore: number; punti: number } | null;
  eventi: Evento[];
}

export const eColorata = (c: Carta): c is CartaColorata => c.tipo !== "jolly" && c.tipo !== "piu4";
export const eJolly = (c: Carta): boolean => !eColorata(c);
const isColore = (v: unknown): v is Colore => typeof v === "string" && (COLORI as readonly string[]).includes(v);

/** Punti che vale una carta rimasta in mano a fine round. */
export function valorePunti(c: Carta): number {
  if (c.tipo === "numero") return c.valore;
  if (eJolly(c)) return PUNTI_JOLLY;
  return PUNTI_SIMBOLO;
}

/** Il mazzo da 108 carte, in ordine fisso (id da 0 a 107). */
export function mazzoCompleto(): Carta[] {
  const carte: Carta[] = [];
  let id = 0;
  for (const colore of COLORI) {
    for (let valore = 0; valore <= 9; valore++) {
      const copie = valore === 0 ? 1 : 2;
      for (let k = 0; k < copie; k++) carte.push({ id: id++, tipo: "numero", colore, valore });
    }
    for (const tipo of ["salta", "inverti", "piu2"] as const) {
      for (let k = 0; k < 2; k++) carte.push({ id: id++, tipo, colore });
    }
  }
  for (let k = 0; k < 4; k++) carte.push({ id: id++, tipo: "jolly" });
  for (let k = 0; k < 4; k++) carte.push({ id: id++, tipo: "piu4" });
  return carte;
}

/**
 * Si può calare la carta sulla scoperta? Un Jolly (anche +4) sempre: il +4 illegale lo scopre
 * la sfida. Le altre: stesso colore in corso, oppure stesso numero o stesso simbolo.
 */
export function puoGiocare(carta: Carta, colore: Colore | null, scoperta: Carta): boolean {
  if (eJolly(carta)) return true;
  if (eColorata(carta) && carta.colore === colore) return true;
  if (eJolly(scoperta)) return false;
  if (carta.tipo === "numero") return scoperta.tipo === "numero" && scoperta.valore === carta.valore;
  return scoperta.tipo === carta.tipo;
}

/** Posto che viene dopo `posto` in `passi` passi, nel verso dato; i posti vanno da 1 a n. */
export function avanza(posto: number, verso: 1 | -1, n: number, passi = 1): number {
  return ((((posto - 1 + verso * passi) % n) + n) % n) + 1;
}

function registra(p: Partita, e: Evento): void {
  p.eventi = [...p.eventi, e].slice(-MAX_EVENTI);
}

function clona(p: Partita): Partita {
  return {
    ...p,
    mazzo: [...p.mazzo],
    scarto: [...p.scarto],
    mani: p.mani.map((m) => [...m]),
    ultime: p.ultime.map((u) => ({ ...u })),
    cumulo: p.cumulo ? { ...p.cumulo } : null,
    sfida: p.sfida ? { ...p.sfida } : null,
    eventi: [...p.eventi],
  };
}

const scoperta = (p: Partita): Carta => p.scarto[p.scarto.length - 1]!;

/** Pesca `quante` carte per `posto`; se il mazzo finisce rimescola lo scarto tranne la carta in cima. */
function pescaCarte(p: Partita, posto: number, quante: number, rng: Rng): void {
  for (let k = 0; k < quante; k++) {
    if (p.mazzo.length === 0) {
      if (p.scarto.length <= 1) return;
      const sopra = p.scarto[p.scarto.length - 1]!;
      p.mazzo = rng.mescola(p.scarto.slice(0, -1));
      p.scarto = [sopra];
      registra(p, { tipo: "mazzoRimescolato" });
    }
    p.mani[posto - 1]!.push(p.mazzo.pop()!);
  }
}

/** Le carte che `posto` può calare adesso (anche un +4 illecito: la sfida lo scopre). Vuoto se non è il suo turno. */
export function giocabili(p: Partita, posto: number): Carta[] {
  if (p.fine || p.sfida || p.colore === null || p.turno !== posto) return [];
  const sopra = scoperta(p);
  // Con un cumulo aperto si risponde solo con un +2, di qualunque colore.
  return p.mani[posto - 1]!.filter((c) => (!p.haPescato || p.pescata === c.id) && (p.cumulo ? c.tipo === "piu2" : puoGiocare(c, p.colore, sopra)));
}

/** Controlli comuni a chi agisce nel proprio turno. */
function turnoLibero(p: Partita, chi: number): void {
  if (p.fine) throw new ErroreUltima("roundFinito");
  if (p.sfida) throw new ErroreUltima("rispondiSfida");
  if (p.colore === null) throw new ErroreUltima("sceglieColore");
  if (p.turno !== chi) throw new ErroreUltima("nonTocca");
}

/** Come "turnoLibero", ma con un cumulo di +2 aperto non si pesca né si passa. */
function turnoSenzaCumulo(p: Partita, chi: number): void {
  turnoLibero(p, chi);
  if (p.cumulo) throw new ErroreUltima("rispondiCumulo");
}

/**
 * Primo round: mazzo mescolato, 7 carte a testa, prima carta scoperta. Un +4 si rimette nel
 * mazzo e se ne gira un'altra. Il suo effetto vale per `primo` (chi inizia il round): Salta
 * lo fa saltare, +2 gli fa pescare 2; Inverti cambia verso e a iniziare è chi siede prima di
 * lui (in due giocatori vale come Salta). Un Jolly lo fa scegliere a `primo`.
 */
export function nuovoRound(n: number, rng: Rng, eventiPrecedenti: Evento[] = [], primo = 1, varianti: Varianti = VARIANTI_BASE): Partita {
  if (!Number.isInteger(n) || n < MIN_GIOCATORI || n > MAX_GIOCATORI) throw new ErroreUltima("numeroGiocatori");
  const mazzo = rng.mescola(mazzoCompleto());
  const mani: Carta[][] = Array.from({ length: n }, () => []);
  for (let k = 0; k < CARTE_INIZIALI; k++) {
    for (let posto = 0; posto < n; posto++) mani[posto]!.push(mazzo.pop()!);
  }
  let prima = mazzo.pop()!;
  while (prima.tipo === "piu4") {
    mazzo.splice(rng.intero(mazzo.length + 1), 0, prima);
    prima = mazzo.pop()!;
  }
  const p: Partita = {
    mazzo,
    scarto: [prima],
    mani,
    verso: 1,
    turno: primo,
    colore: eColorata(prima) ? prima.colore : null,
    haPescato: false,
    pescata: null,
    ultime: [],
    varianti: { ...varianti },
    cumulo: null,
    sfida: null,
    fine: null,
    eventi: [...eventiPrecedenti, { tipo: "nuovoRound" } as Evento].slice(-MAX_EVENTI),
  };
  switch (prima.tipo) {
    case "numero":
    case "jolly":
      break;
    case "salta":
      registra(p, { tipo: "salta", posto: primo });
      p.turno = avanza(primo, 1, n);
      break;
    case "inverti":
      registra(p, { tipo: "inverti" });
      // In due giocatori Inverti vale come Salta: il primo perde il turno.
      // In più di due cambia verso e inizia chi siede prima di lui.
      if (n === 2) p.turno = avanza(primo, 1, n);
      else {
        p.verso = -1;
        p.turno = avanza(primo, -1, n);
      }
      break;
    case "piu2":
      if (varianti.sommaPiu2) {
        // Il primo giocatore ha la stessa scelta di tutti: rispondere con un +2 o pescare 2.
        registra(p, { tipo: "cumulo", posto: primo, quante: 2 });
        p.cumulo = { posto: primo, quante: 2, da: null };
        break;
      }
      registra(p, { tipo: "piu2", posto: primo });
      pescaCarte(p, primo, 2, rng);
      p.turno = avanza(primo, 1, n);
      break;
  }
  return p;
}

/**
 * Cala una carta. Un Jolly vuole il colore. Chi cala l'ultima carta chiude il round: i punti
 * sono quelli delle carte rimaste agli altri. `dichiaraSubito` per il bot, che non dimentica «Ultima!».
 */
export function gioca(p0: Partita, n: number, chi: number, id: number, colore: unknown, rng: Rng, dichiaraSubito = false): Partita {
  const p = clona(p0);
  turnoLibero(p, chi);
  if (p.haPescato && p.pescata !== id) throw new ErroreUltima("soloLaPescata");
  const mano = p.mani[chi - 1]!;
  const indice = mano.findIndex((c) => c.id === id);
  if (indice < 0) throw new ErroreUltima("cartaNonInMano");
  const carta = mano[indice]!;
  if (p.cumulo && carta.tipo !== "piu2") throw new ErroreUltima("rispondiCumulo");

  let coloreScelto: Colore | null = null;
  if (eJolly(carta)) {
    if (!isColore(colore)) throw new ErroreUltima("coloreMancante");
    coloreScelto = colore;
  } else if (!p.cumulo && !puoGiocare(carta, p.colore, scoperta(p))) {
    throw new ErroreUltima("nonGiocabile");
  }

  // Il +4 è legale solo senza carte del colore in corso: chi lo cala lo sa, gli altri no.
  const illegale = carta.tipo === "piu4" && mano.some((c) => eColorata(c) && c.colore === p.colore);
  const sospetto = p.haPescato;

  mano.splice(indice, 1);
  p.scarto.push(carta);
  p.colore = eColorata(carta) ? carta.colore : coloreScelto;
  p.haPescato = false;
  p.pescata = null;
  p.ultime = [];
  registra(p, { tipo: "gioca", posto: chi, carta, colore: p.colore });

  if (mano.length === 0) {
    const punti = p.mani.reduce((somma, m, i) => (i + 1 === chi ? somma : somma + m.reduce((s, c) => s + valorePunti(c), 0)), 0);
    p.fine = { vincitore: chi, punti };
    registra(p, { tipo: "fineRound", posto: chi, punti });
    return p;
  }
  if (mano.length === 1) {
    p.ultime = [{ posto: chi, dichiarata: dichiaraSubito }];
    // Chi dichiara subito (il bot) lascia comunque traccia, come chi preme il pulsante.
    if (dichiaraSubito) registra(p, { tipo: "ultima", posto: chi });
  }

  if (carta.tipo === "piu4") {
    const vittima = avanza(chi, p.verso, n);
    registra(p, { tipo: "piu4", posto: vittima });
    p.sfida = { contro: chi, sospetto, illegale };
    p.turno = vittima;
  } else if (carta.tipo === "numero" || carta.tipo === "jolly") {
    p.turno = avanza(chi, p.verso, n);
  } else if (carta.tipo === "salta") {
    registra(p, { tipo: "salta", posto: avanza(chi, p.verso, n) });
    p.turno = avanza(chi, p.verso, n, 2);
  } else if (carta.tipo === "inverti") {
    registra(p, { tipo: "inverti" });
    // In due giocatori Inverti vale come Salta: si torna a chi ha giocato.
    if (n === 2) {
      p.turno = avanza(chi, p.verso, n, 2);
    } else {
      p.verso = p.verso === 1 ? -1 : 1;
      p.turno = avanza(chi, p.verso, n);
    }
  } else if (p.varianti.sommaPiu2) {
    // Il +2 non si paga subito: la vittima risponde con un +2 o pesca tutto il cumulo.
    const vittima = avanza(chi, p.verso, n);
    const quante = (p.cumulo?.quante ?? 0) + 2;
    p.cumulo = { posto: vittima, quante, da: chi };
    registra(p, { tipo: "cumulo", posto: vittima, quante });
    p.turno = vittima;
  } else {
    const vittima = avanza(chi, p.verso, n);
    registra(p, { tipo: "piu2", posto: vittima });
    pescaCarte(p, vittima, 2, rng);
    p.turno = avanza(vittima, p.verso, n);
  }
  return p;
}

/** Pesca una carta, una volta per turno. Se la si può giocare la si può calare subito; altrimenti si passa. */
export function pesca(p0: Partita, chi: number, rng: Rng): Partita {
  const p = clona(p0);
  turnoSenzaCumulo(p, chi);
  if (p.haPescato) throw new ErroreUltima("giaPescato");
  p.ultime = [];
  const mano = p.mani[chi - 1]!;
  const prima = mano.length;
  pescaCarte(p, chi, 1, rng);
  // Mazzo e scarto esauriti: non c'è niente da pescare, si passa.
  p.haPescato = true;
  p.pescata = mano.length > prima ? mano[mano.length - 1]!.id : null;
  registra(p, { tipo: "pesca", posto: chi });
  return p;
}

/** Passa il turno: solo dopo aver pescato (o se non c'era niente da pescare). */
export function passa(p0: Partita, n: number, chi: number): Partita {
  const p = clona(p0);
  turnoSenzaCumulo(p, chi);
  if (!p.haPescato) throw new ErroreUltima("devePescare");
  p.ultime = [];
  p.haPescato = false;
  p.pescata = null;
  p.turno = avanza(chi, p.verso, n);
  registra(p, { tipo: "passa", posto: chi });
  return p;
}

/** Il primo giocatore sceglie il colore quando la prima carta è un Jolly. */
export function scegliColore(p0: Partita, chi: number, colore: unknown): Partita {
  const p = clona(p0);
  if (p.colore !== null || p.scarto.length !== 1 || !eJolly(scoperta(p))) throw new ErroreUltima("nonSceltaColore");
  if (p.turno !== chi) throw new ErroreUltima("nonTocca");
  if (!isColore(colore)) throw new ErroreUltima("coloreMancante");
  p.colore = colore;
  registra(p, { tipo: "coloreScelto", posto: chi, colore });
  return p;
}

/**
 * Sfida al +4 (chi lo subisce). Se il +4 era illegale, chi l'ha giocato pesca 4 e il turno
 * resta a chi ha sfidato; altrimenti lo sfidante pesca 6 e perde il turno.
 */
export function sfida(p0: Partita, n: number, chi: number, rng: Rng): Partita {
  const p = clona(p0);
  if (!p.sfida) throw new ErroreUltima("nonInSfida");
  if (p.turno !== chi) throw new ErroreUltima("nonTocca");
  const { contro, illegale } = p.sfida;
  p.sfida = null;
  p.ultime = [];
  p.haPescato = false;
  p.pescata = null;
  if (illegale) {
    pescaCarte(p, contro, 4, rng);
  } else {
    pescaCarte(p, chi, 6, rng);
    p.turno = avanza(chi, p.verso, n);
  }
  registra(p, { tipo: "sfida", posto: chi, contro, legale: !illegale });
  return p;
}

/** Subisce il +4 senza sfidare: pesca 4 e perde il turno. */
export function accetta(p0: Partita, n: number, chi: number, rng: Rng): Partita {
  const p = clona(p0);
  if (!p.sfida) throw new ErroreUltima("nonInSfida");
  if (p.turno !== chi) throw new ErroreUltima("nonTocca");
  p.sfida = null;
  p.ultime = [];
  p.haPescato = false;
  p.pescata = null;
  pescaCarte(p, chi, 4, rng);
  p.turno = avanza(chi, p.verso, n);
  registra(p, { tipo: "accetta", posto: chi });
  return p;
}

/** Chi ha un cumulo di +2 davanti lo paga tutto: pesca le carte del cumulo e perde il turno. */
export function pescaCumulo(p0: Partita, n: number, chi: number, rng: Rng): Partita {
  const p = clona(p0);
  if (p.fine) throw new ErroreUltima("roundFinito");
  if (!p.cumulo) throw new ErroreUltima("nessunCumulo");
  if (p.turno !== chi || p.cumulo.posto !== chi) throw new ErroreUltima("nonTocca");
  const { quante } = p.cumulo;
  p.cumulo = null;
  p.ultime = [];
  p.haPescato = false;
  p.pescata = null;
  pescaCarte(p, chi, quante, rng);
  p.turno = avanza(chi, p.verso, n);
  registra(p, { tipo: "pescaCumulo", posto: chi, quante });
  return p;
}

/** Chi resta con una carta preme «Ultima!» prima che il giocatore successivo agisca. */
export function ultima(p0: Partita, chi: number): Partita {
  const p = clona(p0);
  const u = p.ultime.find((x) => x.posto === chi);
  if (!u || p.mani[chi - 1]!.length !== 1) throw new ErroreUltima("nonDichiarabile");
  if (u.dichiarata) throw new ErroreUltima("giaDichiarata");
  u.dichiarata = true;
  registra(p, { tipo: "ultima", posto: chi });
  return p;
}

/** «Beccato!»: chi ha dimenticato «Ultima!» pesca 2, finché la finestra è aperta. */
export function beccato(p0: Partita, chi: number, bersaglio: number, rng: Rng): Partita {
  const p = clona(p0);
  const u = p.ultime.find((x) => x.posto === bersaglio);
  if (!u || u.dichiarata || chi === bersaglio) throw new ErroreUltima("nonBeccabile");
  if (p.mani[bersaglio - 1]!.length !== 1) throw new ErroreUltima("nonBeccabile");
  pescaCarte(p, bersaglio, 2, rng);
  p.ultime = p.ultime.filter((x) => x.posto !== bersaglio);
  registra(p, { tipo: "beccato", posto: bersaglio, chi });
  return p;
}
