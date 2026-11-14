import { creaGiocatori, creaRng, type Giocatore } from "@gdt/engine";

export type Ruolo = "lupo" | "contadino" | "veggente" | "medico";

/** Da che parte sta un ruolo. Con un ruolo nuovo il compilatore chiede qui la sua fazione. */
export type Fazione = "lupi" | "villaggio";

const FAZIONE: Record<Ruolo, Fazione> = {
  lupo: "lupi",
  contadino: "villaggio",
  veggente: "villaggio",
  medico: "villaggio",
};

export function fazione(ruolo: Ruolo): Fazione {
  return FAZIONE[ruolo];
}

export const MIN_GIOCATORI = 8;
export const MAX_GIOCATORI = 24;

/** Versione della forma dello stato salvato: le partite salvate con un'altra versione si scartano. */
export const VERSIONE_STATO = 2;

/** Lupi: 2 da 8 a 15 giocatori, 3 da 16. */
export function lupiPer(n: number): number {
  return n >= 16 ? 3 : 2;
}

/** Personaggi speciali che si possono togliere o aggiungere, con il numero di giocatori da cui compaiono da soli. */
export const SPECIALI: readonly { ruolo: Ruolo; da: number; quanti: number }[] = [{ ruolo: "medico", da: 11, quanti: 1 }];

/** Gli speciali che compaiono da soli con `n` giocatori. */
export function specialiPredefiniti(n: number): Ruolo[] {
  return SPECIALI.filter((x) => n >= x.da).map((x) => x.ruolo);
}

/** Le carte della partita, non mescolate: lupi, un veggente, gli speciali scelti e il resto contadini. */
export function composizione(n: number, speciali: readonly Ruolo[] = specialiPredefiniti(n)): Ruolo[] {
  const ruoli: Ruolo[] = [];
  for (let i = 0; i < lupiPer(n); i++) ruoli.push("lupo");
  ruoli.push("veggente");
  for (const x of SPECIALI) {
    if (speciali.includes(x.ruolo)) for (let i = 0; i < x.quanti; i++) ruoli.push(x.ruolo);
  }
  while (ruoli.length < n) ruoli.push("contadino");
  return ruoli;
}

/** Quanti contadini restano con questa composizione (negativo = troppi speciali). */
export function contadiniRestanti(n: number, speciali: readonly Ruolo[]): number {
  const fissi = lupiPer(n) + 1 + SPECIALI.filter((x) => speciali.includes(x.ruolo)).reduce((a, x) => a + x.quanti, 0);
  return n - fissi;
}

export function distribuisciRuoli(n: number, seme: number, speciali: readonly Ruolo[] = specialiPredefiniti(n)): Ruolo[] {
  return creaRng(seme).mescola(composizione(n, speciali).slice(0, n));
}

export type Fase =
  | "carte"
  | "veggente"
  | "medico"
  | "lupi"
  | "alba"
  | "voto"
  | "esito"
  | "fine";

/** Fasi in cui un ruolo si sveglia di notte. */
export type FaseNotte = "medico" | "veggente" | "lupi";

export interface Stato {
  versione: number;
  giocatori: Giocatore[];
  /** Ruolo attuale di ogni posto. */
  ruoli: Record<number, Ruolo>;
  /** Ruolo ricevuto all'inizio, che non cambia mai. */
  ruoliIniziali: Record<number, Ruolo>;
  vivi: number[];
  fase: Fase;
  notte: number;
  indiceCarta: number;
  cartaMostrata: boolean;
  vittima: number | null;
  protetto: number | null;
  /** Posto ispezionato dal veggente questa notte (il risultato resta visibile finché si prosegue). */
  ispezionato: number | null;
  /** Chi è morto nell'ultima notte (vuoto = nessuno). */
  mortiNotte: number[];
  /** Candidati del ballottaggio; null = primo turno di voto. */
  ballottaggio: number[] | null;
  /** Esito dell'ultimo voto, per mostrarlo. */
  eliminato: number | null;
  /**
   * Perché non c'è un eliminato, come codice (la UI lo traduce): "ballottaggio" = primo pareggio,
   * "ancora-pari" = secondo pareggio o nessun voto. null = nulla da dire.
   */
  esitoVoto: "ballottaggio" | "ancora-pari" | null;
  /** La fazione che ha vinto, se la partita è finita. */
  vincitore: Fazione | null;
  /** Se il narratore dice il ruolo di chi muore (di notte o al voto); a fine partita si vedono comunque tutti. */
  svelaRuoli: boolean;
  /** Se il narratore è anche un giocatore: il telefono sta al centro e i ruoli non si mostrano mai. */
  narratoreGioca: boolean;
  /** Prima notte senza vittima: i lupi si riconoscono soltanto (la vittima è il moderatore). */
  primaNotteSenzaVittima: boolean;
}

export type Azione =
  | {
      tipo: "avvia";
      nomi: readonly string[];
      seme: number;
      /** Speciali in gioco; se manca, quelli previsti per il numero di giocatori. */
      speciali?: readonly Ruolo[];
      svelaRuoli?: boolean;
      narratoreGioca?: boolean;
      primaNotteSenzaVittima?: boolean;
    }
  | { tipo: "azzera" }
  | { tipo: "mostraCarta" }
  | { tipo: "prossimaCarta" }
  | { tipo: "scegli"; posto: number }
  | { tipo: "avanti" }
  | { tipo: "chiudiVoto"; voti: Record<number, number> }
  | { tipo: "dopoVoto" };

export function statoIniziale(): Stato {
  return {
    versione: VERSIONE_STATO,
    giocatori: [],
    ruoli: {},
    ruoliIniziali: {},
    vivi: [],
    fase: "carte",
    notte: 0,
    indiceCarta: 0,
    cartaMostrata: false,
    vittima: null,
    protetto: null,
    ispezionato: null,
    mortiNotte: [],
    ballottaggio: null,
    eliminato: null,
    esitoVoto: null,
    vincitore: null,
    svelaRuoli: false,
    narratoreGioca: false,
    primaNotteSenzaVittima: true,
  };
}

/** Fine partita e fazioni che vincono (la lista, non il singolo vincitore: pronta per più fazioni). */
export function finePartita(
  ruoli: Record<number, Ruolo>,
  vivi: readonly number[],
): { fine: boolean; vincitori: Fazione[] } {
  const lupi = vivi.filter((p) => ruoli[p] === "lupo").length;
  if (lupi === 0) return { fine: true, vincitori: ["villaggio"] };
  if (lupi >= vivi.length - lupi) return { fine: true, vincitori: ["lupi"] };
  return { fine: false, vincitori: [] };
}

export function vincitore(ruoli: Record<number, Ruolo>, vivi: readonly number[]): Stato["vincitore"] {
  return finePartita(ruoli, vivi).vincitori[0] ?? null;
}

/** I posti che vincono: tutta la fazione vincente, vivi e morti. */
export function postiVincitori(s: Stato): number[] {
  if (s.vincitore === null) return [];
  return s.giocatori.map((g) => g.posto).filter((p) => s.ruoli[p] !== undefined && fazione(s.ruoli[p]) === s.vincitore);
}

/** Quel che succede nella notte mentre si applicano gli effetti. */
export interface EsitoNotte {
  /** Chi muore sbranato dai lupi (null = nessuno). */
  sbranato: number | null;
  /** Gli altri morti della notte, nell'ordine in cui si annunciano. */
  altri: number[];
}

/** Descrittore di una fase notturna: quando si sveglia, chi può scegliere, dove va la scelta, che effetto ha. */
export interface DescrittoreNotte {
  fase: FaseNotte;
  /** Il ruolo che si sveglia: la fase esiste solo se il ruolo è nella partita. */
  ruolo: Ruolo;
  /** Se in questa notte la fase si gioca (es. il medico dalla seconda notte). */
  quando: (s: Stato) => boolean;
  /** Campo dello stato dove finisce la scelta. */
  campo: "vittima" | "ispezionato" | "protetto";
  /** Se questa notte si sceglie qualcuno (es. la prima notte i lupi si riconoscono soltanto). */
  sceglie: (s: Stato) => boolean;
  /** Se la scelta, una volta fatta, non si cambia più. */
  unaSolaScelta: boolean;
  /** Chi si può scegliere tra i vivi. */
  puoiScegliere: (s: Stato, posto: number) => boolean;
  /** Ordine di applicazione degli effetti (crescente): non è l'ordine di risveglio. */
  ordineEffetto: number;
  /** Effetto sull'esito della notte. Se nessuno con il ruolo è vivo, la scelta è finta e non si applica. */
  effetto: (s: Stato, esito: EsitoNotte) => EsitoNotte;
}

/** Ordine in cui si svegliano i ruoli della notte. Ogni fase si gioca anche se chi ha il ruolo è morto. */
export const FASI_NOTTE: readonly DescrittoreNotte[] = [
  {
    fase: "medico",
    ruolo: "medico",
    quando: (s) => s.notte >= 2,
    campo: "protetto",
    sceglie: () => true,
    unaSolaScelta: false,
    // Protegge chiunque tranne sé stesso, anche la stessa persona più notti di fila.
    puoiScegliere: (s, p) => s.ruoli[p] !== "medico",
    ordineEffetto: 2,
    effetto: (s, e) => (e.sbranato !== null && e.sbranato === s.protetto ? { ...e, sbranato: null } : e),
  },
  {
    fase: "veggente",
    ruolo: "veggente",
    quando: () => true,
    campo: "ispezionato",
    sceglie: () => true,
    unaSolaScelta: true,
    puoiScegliere: (s, p) => s.ruoli[p] !== "veggente",
    ordineEffetto: 3,
    effetto: (_s, e) => e,
  },
  {
    fase: "lupi",
    ruolo: "lupo",
    quando: () => true,
    campo: "vittima",
    sceglie: (s) => !(s.notte === 1 && s.primaNotteSenzaVittima),
    unaSolaScelta: false,
    puoiScegliere: (s, p) => s.ruoli[p] !== "lupo",
    ordineEffetto: 1,
    effetto: (s, e) => ({ ...e, sbranato: s.vittima }),
  },
];

export function descrittoreNotte(fase: Fase): DescrittoreNotte | undefined {
  return FASI_NOTTE.find((d) => d.fase === fase);
}

/** La scelta già fatta in questa notte per il descrittore (null = nessuna). */
export function sceltaNotte(s: Stato, d: DescrittoreNotte): number | null {
  return s[d.campo];
}

/** Se qualcuno con il ruolo della fase è vivo: altrimenti la fase si gioca per finta, senza risultati. */
export function ruoloAttivo(s: Stato, d: DescrittoreNotte): boolean {
  return haRuoloVivo(s, d.ruolo);
}

/**
 * Chi si può scegliere nella fase notturna `fase`: solo i vivi che il descrittore ammette.
 * Fuori dalla notte, o in una fase senza scelta, la lista è vuota.
 */
export function candidatiNotte(s: Stato, fase: Fase = s.fase): number[] {
  const d = descrittoreNotte(fase);
  return d && d.sceglie(s) ? s.vivi.filter((p) => d.puoiScegliere(s, p)) : [];
}

export function haRuoloVivo(s: Stato, ruolo: Ruolo): boolean {
  return s.vivi.some((p) => s.ruoli[p] === ruolo);
}

/** Primo e unico posto con il massimo dei voti, oppure l'elenco dei pari merito. */
export function contaVoti(voti: Record<number, number>): { eliminato: number | null; pari: number[] } {
  const righe = Object.entries(voti).map(([p, v]) => [Number(p), v] as const);
  const max = Math.max(0, ...righe.map(([, v]) => v));
  if (max === 0) return { eliminato: null, pari: [] };
  const primi = righe.filter(([, v]) => v === max).map(([p]) => p);
  return primi.length === 1 ? { eliminato: primi[0] ?? null, pari: [] } : { eliminato: null, pari: primi };
}

/** La fase si gioca in questa partita e in questa notte? */
function siGioca(s: Stato, d: DescrittoreNotte): boolean {
  return Object.values(s.ruoliIniziali).includes(d.ruolo) && d.quando(s);
}

/** Se `fase` è la prima fase giocata della notte (il narratore la apre dicendo che scende la notte). */
export function primaFaseDellaNotte(s: Stato, fase: Fase): boolean {
  return FASI_NOTTE.find((d) => siGioca(s, d))?.fase === fase;
}

/**
 * Fase notturna successiva a `dopo` (null = dall'inizio della notte): salta quelle che non si giocano.
 * Quando la notte è finita la risolve.
 */
function prossimaFaseNotte(s: Stato, dopo: Fase | null): Stato {
  const da = dopo === null ? 0 : FASI_NOTTE.findIndex((d) => d.fase === dopo) + 1;
  const prossima = FASI_NOTTE.slice(da).find((d) => siGioca(s, d));
  return prossima ? { ...s, fase: prossima.fase } : risolviNotte(s);
}

function risolviNotte(s: Stato): Stato {
  const ordine = [...FASI_NOTTE].sort((x, y) => x.ordineEffetto - y.ordineEffetto);
  const esito = ordine.reduce<EsitoNotte>(
    (e, d) => (siGioca(s, d) && d.sceglie(s) && ruoloAttivo(s, d) ? d.effetto(s, e) : e),
    { sbranato: null, altri: [] },
  );
  const morti = [...(esito.sbranato === null ? [] : [esito.sbranato]), ...esito.altri.filter((p) => p !== esito.sbranato)];
  const vivi = s.vivi.filter((p) => !morti.includes(p));
  return { ...s, vivi, mortiNotte: morti, fase: "alba", vincitore: vincitore(s.ruoli, vivi) };
}

export function riduci(s: Stato, a: Azione): Stato {
  switch (a.tipo) {
    case "avvia": {
      const giocatori = creaGiocatori(a.nomi);
      const ruoli = distribuisciRuoli(giocatori.length, a.seme, a.speciali ?? specialiPredefiniti(giocatori.length));
      const mappa: Record<number, Ruolo> = {};
      giocatori.forEach((g, i) => {
        mappa[g.posto] = ruoli[i] ?? "contadino";
      });
      return {
        ...statoIniziale(),
        giocatori,
        ruoli: mappa,
        ruoliIniziali: { ...mappa },
        vivi: giocatori.map((g) => g.posto),
        svelaRuoli: a.svelaRuoli ?? false,
        narratoreGioca: a.narratoreGioca ?? false,
        primaNotteSenzaVittima: a.primaNotteSenzaVittima ?? true,
      };
    }
    case "azzera":
      return statoIniziale();
    case "mostraCarta":
      return { ...s, cartaMostrata: true };
    case "prossimaCarta": {
      if (s.indiceCarta + 1 < s.giocatori.length) {
        return { ...s, indiceCarta: s.indiceCarta + 1, cartaMostrata: false };
      }
      return nuovaNotte({ ...s, cartaMostrata: false });
    }
    case "scegli": {
      const d = descrittoreNotte(s.fase);
      if (!d || !candidatiNotte(s).includes(a.posto)) return s;
      if (d.unaSolaScelta && sceltaNotte(s, d) !== null) return s;
      return { ...s, [d.campo]: a.posto };
    }
    case "avanti": {
      if (descrittoreNotte(s.fase)) return prossimaFaseNotte(s, s.fase);
      if (s.fase === "alba") return { ...s, fase: "voto", ballottaggio: null, esitoVoto: null };
      return s;
    }
    case "chiudiVoto": {
      const { eliminato, pari } = contaVoti(a.voti);
      if (eliminato === null && pari.length > 1 && s.ballottaggio === null) {
        return { ...s, ballottaggio: pari, esitoVoto: "ballottaggio" };
      }
      if (eliminato === null) {
        return { ...s, fase: "esito", eliminato: null, ballottaggio: null, esitoVoto: "ancora-pari" };
      }
      const vivi = s.vivi.filter((p) => p !== eliminato);
      return { ...s, vivi, fase: "esito", eliminato, ballottaggio: null, esitoVoto: null, vincitore: vincitore(s.ruoli, vivi) };
    }
    case "dopoVoto":
      return s.vincitore ? { ...s, fase: "fine" } : nuovaNotte(s);
  }
}

function nuovaNotte(s: Stato): Stato {
  return prossimaFaseNotte(
    {
      ...s,
      notte: s.notte + 1,
      vittima: null,
      protetto: null,
      ispezionato: null,
      mortiNotte: [],
      eliminato: null,
      esitoVoto: null,
      ballottaggio: null,
    },
    null,
  );
}
