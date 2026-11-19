import { creaGiocatori, creaRng, type Giocatore } from "@gdt/engine";

export type Ruolo = "lupo" | "contadino" | "veggente" | "medico" | "indemoniato" | "massone" | "medium" | "criceto" | "gufo" | "mitomane";

/** Da che parte sta un ruolo. Con un ruolo nuovo il compilatore chiede qui la sua fazione. */
/** Il criceto mannaro è una fazione a sé: vince da solo se è vivo a fine partita. */
export type Fazione = "lupi" | "villaggio" | "criceto";

const FAZIONE: Record<Ruolo, Fazione> = {
  lupo: "lupi",
  contadino: "villaggio",
  veggente: "villaggio",
  medico: "villaggio",
  // L'Indemoniato è umano per chi conta i lupi e per il veggente, ma vince con i lupi.
  indemoniato: "lupi",
  massone: "villaggio",
  medium: "villaggio",
  criceto: "criceto",
  gufo: "villaggio",
  // Il Mitomane parte dal villaggio; se imita un lupo il suo ruolo diventa «lupo» e con esso la fazione.
  mitomane: "villaggio",
};

export function fazione(ruolo: Ruolo): Fazione {
  return FAZIONE[ruolo];
}

export const MIN_GIOCATORI = 8;
export const MAX_GIOCATORI = 24;

/** Da questo numero di giocatori il Gufo è letale: il gufato muore all'alba se non è un mannaro. */
export const MIN_GUFO_LETALE = 20;

/** Versione della forma dello stato salvato: le partite salvate con un'altra versione si scartano. */
export const VERSIONE_STATO = 7;

/** Lupi: 2 da 8 a 15 giocatori, 3 da 16. */
export function lupiPer(n: number): number {
  return n >= 16 ? 3 : 2;
}

/** Personaggi speciali che si possono togliere o aggiungere, con il numero di giocatori da cui compaiono da soli. */
export const SPECIALI: readonly { ruolo: Ruolo; da: number; quanti: number }[] = [
  { ruolo: "medium", da: 9, quanti: 1 },
  { ruolo: "indemoniato", da: 10, quanti: 1 },
  { ruolo: "medico", da: 11, quanti: 1 },
  { ruolo: "gufo", da: 12, quanti: 1 },
  { ruolo: "massone", da: 13, quanti: 2 },
  { ruolo: "criceto", da: 15, quanti: 1 },
  { ruolo: "mitomane", da: 16, quanti: 1 },
];

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
  | "medium"
  | "massoni"
  | "gufo"
  | "veggente"
  | "medico"
  | "lupi"
  | "mitomane"
  | "alba"
  | "discussione"
  | "voto"
  | "arringhe"
  | "voto2"
  | "esito"
  | "fine";

/** Fasi in cui un ruolo si sveglia di notte. */
export type FaseNotte = "medium" | "massoni" | "gufo" | "medico" | "veggente" | "lupi" | "mitomane";

/** Cosa è successo in una notte: chi ha scelto chi (solo i ruoli vivi) e chi è morto. */
export interface NottePassata {
  notte: number;
  scelte: { fase: FaseNotte; posto: number }[];
  morti: number[];
}

/** Cosa è successo in un giorno: gli indiziati del primo turno e chi è stato eliminato dal voto. */
export interface GiornoPassato {
  /** Numero del giorno: il giorno N viene dopo la notte N. */
  giorno: number;
  indiziati: number[];
  eliminato: number;
}

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
  /** Storico delle notti già risolte, dalla prima. */
  storico: NottePassata[];
  /** Storico dei giorni con un'eliminazione, dal primo. */
  storicoGiorni: GiornoPassato[];
  /** Chi il Gufo ha indicato questa notte (null = nessuno). */
  gufato: number | null;
  /** Chi il Mitomane ha scelto di imitare (null = nessuno). */
  imitato: number | null;
  /** Posto ispezionato dal veggente questa notte (il risultato resta visibile finché si prosegue). */
  ispezionato: number | null;
  /** Chi è morto nell'ultima notte (vuoto = nessuno). */
  mortiNotte: number[];
  /** Gli indiziati del giorno (i due più votati al primo turno); null = il primo turno non c'è ancora stato. */
  indiziati: number[] | null;
  /** Chi ha il «Benvenuto!» (l'ultimo morto); null = il narratore, quindi vince chi è primo nell'elenco. */
  benvenuto: number | null;
  /** Chi è stato linciato nell'ultimo voto. */
  eliminato: number | null;
  /** L'ultimo linciato, che resta fino al voto successivo: il Medium lo interroga la notte dopo. */
  linciato: number | null;
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
    storico: [],
    storicoGiorni: [],
    indiceCarta: 0,
    cartaMostrata: false,
    vittima: null,
    protetto: null,
    gufato: null,
    imitato: null,
    ispezionato: null,
    mortiNotte: [],
    indiziati: null,
    benvenuto: null,
    eliminato: null,
    linciato: null,
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
  const criceto = vivi.some((p) => ruoli[p] === "criceto");
  // Il criceto conta come umano; se è vivo alla fine, vince lui da solo.
  const chi: Fazione | null = lupi === 0 ? "villaggio" : lupi >= vivi.length - lupi ? "lupi" : null;
  if (chi === null) return { fine: false, vincitori: [] };
  return { fine: true, vincitori: [criceto ? "criceto" : chi] };
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
  /** Cambi di ruolo a fine notte (posto → nuovo ruolo). */
  cambi: Record<number, Ruolo>;
}

/** Descrittore di una fase notturna: quando si sveglia, chi può scegliere, dove va la scelta, che effetto ha. */
export interface DescrittoreNotte {
  fase: FaseNotte;
  /** Il ruolo che si sveglia: la fase esiste solo se il ruolo è nella partita. */
  ruolo: Ruolo;
  /** Se in questa notte la fase si gioca (es. il medico dalla seconda notte). */
  quando: (s: Stato) => boolean;
  /** Campo dello stato dove finisce la scelta. */
  campo: "vittima" | "ispezionato" | "protetto" | "gufato" | "imitato" | null;
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
    // Dalla seconda notte sente lo spirito dell'ultimo linciato: lupo o no. Nessuna scelta.
    fase: "medium",
    ruolo: "medium",
    quando: (s) => s.notte >= 2,
    campo: null,
    sceglie: () => false,
    unaSolaScelta: false,
    puoiScegliere: () => false,
    ordineEffetto: 4,
    effetto: (_s, e) => e,
  },
  {
    // Solo la prima notte i due massoni si riconoscono. Nessuna scelta.
    fase: "massoni",
    ruolo: "massone",
    quando: (s) => s.notte === 1,
    campo: null,
    sceglie: () => false,
    unaSolaScelta: false,
    puoiScegliere: () => false,
    ordineEffetto: 5,
    effetto: (_s, e) => e,
  },
  {
    // Indica uno a ogni notte. Letale (20+ giocatori): il gufato muore all'alba se non è un mannaro.
    // Non letale: il gufato va tra gli indiziati del primo turno (vedi `chiudiVoto`).
    fase: "gufo",
    ruolo: "gufo",
    quando: () => true,
    campo: "gufato",
    sceglie: () => true,
    unaSolaScelta: false,
    puoiScegliere: (s, p) => s.ruoli[p] !== "gufo",
    ordineEffetto: 6,
    effetto: (s, e) =>
      gufoLetale(s) && s.gufato !== null && !eMannaro(s.ruoli[s.gufato])
        ? { ...e, altri: [...e.altri, s.gufato] }
        : e,
  },
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
    // Se guarda il criceto mannaro, questi muore insieme allo sbranato (se quella notte nessuno muore, non muore nemmeno lui).
    effetto: (s, e) =>
      s.ispezionato !== null && s.ruoli[s.ispezionato] === "criceto" && e.sbranato !== null
        ? { ...e, altri: [...e.altri, s.ispezionato] }
        : e,
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
    // Il criceto mannaro non si può sbranare: se lo scelgono, nessuno muore.
    effetto: (s, e) => ({ ...e, sbranato: s.vittima !== null && s.ruoli[s.vittima] === "criceto" ? null : s.vittima }),
  },
  {
    // Una volta sola, alla fine della seconda notte: indica un vivo. Lupo → diventa lupo, veggente → veggente,
    // altrimenti resta umano. Da lì si sveglia con il nuovo ruolo. Se muore nella notte, non cambia nulla.
    fase: "mitomane",
    ruolo: "mitomane",
    quando: (s) => s.notte === 2,
    campo: "imitato",
    sceglie: () => true,
    unaSolaScelta: true,
    puoiScegliere: (s, p) => s.ruoli[p] !== "mitomane",
    ordineEffetto: 7,
    effetto: (s, e) => {
      const chi = s.vivi.find((p) => s.ruoli[p] === "mitomane");
      if (chi === undefined || s.imitato === null) return e;
      if (e.sbranato === chi || e.altri.includes(chi)) return e;
      const nuovo = s.ruoli[s.imitato];
      return nuovo === "lupo" || nuovo === "veggente" ? { ...e, cambi: { ...e.cambi, [chi]: nuovo } } : e;
    },
  },
];

export function descrittoreNotte(fase: Fase): DescrittoreNotte | undefined {
  return FASI_NOTTE.find((d) => d.fase === fase);
}

/** La scelta già fatta in questa notte per il descrittore (null = nessuna). */
export function sceltaNotte(s: Stato, d: DescrittoreNotte): number | null {
  return d.campo === null ? null : s[d.campo];
}

/** Il Gufo è letale nelle partite con 20 o più giocatori. */
export function gufoLetale(s: Pick<Stato, "giocatori">): boolean {
  return s.giocatori.length >= MIN_GUFO_LETALE;
}

/** Mannari: lupi e criceto. Il Gufo Letale non li uccide. */
function eMannaro(ruolo: Ruolo | undefined): boolean {
  return ruolo === "lupo" || ruolo === "criceto";
}

/** I massoni della partita (dalle carte ricevute), per mostrarli la prima notte. */
export function massoni(s: Stato): number[] {
  return s.giocatori.map((g) => g.posto).filter((p) => s.ruoliIniziali[p] === "massone");
}

/** Il Medium sente «lupo» solo se l'ultimo linciato lo era davvero: l'Indemoniato e gli altri contano come umani. */
export function linciatoEraLupo(s: Stato): boolean {
  return s.linciato !== null && s.ruoli[s.linciato] === "lupo";
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

/**
 * Distanza in senso orario da chi ha il «Benvenuto!» (1 = il primo dopo di lui). I nomi sono in ordine orario:
 * senza un morto che lo tiene, il Benvenuto è del narratore, che siede prima del primo nome.
 */
export function distanzaBenvenuto(s: Pick<Stato, "giocatori" | "benvenuto">, posto: number): number {
  const n = s.giocatori.length;
  const indice = s.giocatori.findIndex((g) => g.posto === posto);
  if (s.benvenuto === null) return indice + 1;
  const da = s.giocatori.findIndex((g) => g.posto === s.benvenuto);
  const d = (indice - da + n) % n;
  return d === 0 ? n : d;
}

/** I candidati dal più votato; a parità di voti prima chi è più vicino, in senso orario, al «Benvenuto!». */
export function classificaVoti(s: Pick<Stato, "giocatori" | "benvenuto">, candidati: readonly number[], voti: Record<number, number>): number[] {
  return [...candidati].sort(
    (x, y) => (voti[y] ?? 0) - (voti[x] ?? 0) || distanzaBenvenuto(s, x) - distanzaBenvenuto(s, y),
  );
}

/** Quante persone votano al secondo turno: i vivi che non sono indiziati. */
export function votantiSecondoTurno(s: Stato): number {
  return s.vivi.filter((p) => !(s.indiziati ?? []).includes(p)).length;
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
    { sbranato: null, altri: [], cambi: {} },
  );
  const ruoli = { ...s.ruoli, ...esito.cambi };
  const morti = [...(esito.sbranato === null ? [] : [esito.sbranato]), ...esito.altri.filter((p) => p !== esito.sbranato)];
  const vivi = s.vivi.filter((p) => !morti.includes(p));
  const scelte = FASI_NOTTE.flatMap((d) => {
    const posto = d.campo === null ? null : s[d.campo];
    return siGioca(s, d) && d.sceglie(s) && ruoloAttivo(s, d) && posto !== null ? [{ fase: d.fase, posto }] : [];
  });
  return {
    ...s,
    storico: [...s.storico, { notte: s.notte, scelte, morti }],
    ruoli,
    vivi,
    mortiNotte: morti,
    // Il «Benvenuto!» passa all'ultimo morto: se muore qualcuno nella notte, a lui (prima lo sbranato).
    benvenuto: morti[0] ?? s.benvenuto,
    fase: "alba",
    vincitore: vincitore(ruoli, vivi),
  };
}

/** Il ruolo che il Mitomane diventerebbe imitando `posto`: lupo, veggente, oppure resta Mitomane (umano). */
export function ruoloImitato(s: Stato, posto: number | null): Ruolo {
  const r = posto === null ? undefined : s.ruoli[posto];
  return r === "lupo" || r === "veggente" ? r : "mitomane";
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
      if (!d || d.campo === null || !candidatiNotte(s).includes(a.posto)) return s;
      if (d.unaSolaScelta && sceltaNotte(s, d) !== null) return s;
      return { ...s, [d.campo]: a.posto };
    }
    case "avanti": {
      if (descrittoreNotte(s.fase)) return prossimaFaseNotte(s, s.fase);
      if (s.fase === "alba") return { ...s, fase: "discussione" };
      if (s.fase === "discussione") return { ...s, fase: "voto", indiziati: null };
      if (s.fase === "arringhe") return { ...s, fase: "voto2" };
      return s;
    }
    case "chiudiVoto": {
      if (s.fase === "voto") {
        // Primo turno: i due più votati tra i vivi sono gli indiziati.
        const indiziati = classificaVoti(s, s.vivi, a.voti).slice(0, 2);
        // Gufo non letale (e vivo): anche il gufato è indiziato, se ancora vivo e non lo è già.
        if (!gufoLetale(s) && haRuoloVivo(s, "gufo") && s.gufato !== null && s.vivi.includes(s.gufato) && !indiziati.includes(s.gufato)) {
          indiziati.push(s.gufato);
        }
        return { ...s, fase: "arringhe", indiziati };
      }
      if (s.fase === "voto2") {
        // Secondo turno: tra gli indiziati, il più votato è linciato.
        const [eliminato] = classificaVoti(s, s.indiziati ?? [], a.voti);
        if (eliminato === undefined) return s;
        const vivi = s.vivi.filter((p) => p !== eliminato);
        return { ...s, storicoGiorni: [...s.storicoGiorni, { giorno: s.notte, indiziati: s.indiziati ?? [], eliminato }], vivi, fase: "esito", eliminato, linciato: eliminato, benvenuto: eliminato, vincitore: vincitore(s.ruoli, vivi) };
      }
      return s;
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
      gufato: null,
      imitato: null,
      ispezionato: null,
      mortiNotte: [],
      eliminato: null,
      indiziati: null,
    },
    null,
  );
}
