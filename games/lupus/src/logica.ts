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

export type Fase =
  | "carte"
  | "lupi"
  | "veggente"
  | "medico"
  | "alba"
  | "voto"
  | "esito"
  | "fine";

/** Fasi in cui un ruolo si sveglia di notte. */
export type FaseNotte = "lupi" | "veggente" | "medico";

export interface Stato {
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
  ultimoProtetto: number | null;
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
}

export type Azione =
  | { tipo: "avvia"; nomi: readonly string[]; seme: number; svelaRuoli?: boolean; narratoreGioca?: boolean }
  | { tipo: "azzera" }
  | { tipo: "mostraCarta" }
  | { tipo: "prossimaCarta" }
  | { tipo: "scegli"; posto: number }
  | { tipo: "avanti" }
  | { tipo: "chiudiVoto"; voti: Record<number, number> }
  | { tipo: "dopoVoto" };

/** Numero di lupi consigliato: circa uno ogni quattro giocatori. */
export function lupiConsigliati(n: number): number {
  return Math.max(1, Math.round(n / 4));
}

/** Ruoli speciali in base ai giocatori: veggente da 5, medico da 7. */
export function distribuisciRuoli(n: number, seme: number): Ruolo[] {
  const ruoli: Ruolo[] = [];
  for (let i = 0; i < lupiConsigliati(n); i++) ruoli.push("lupo");
  if (n >= 5) ruoli.push("veggente");
  if (n >= 7) ruoli.push("medico");
  while (ruoli.length < n) ruoli.push("contadino");
  return creaRng(seme).mescola(ruoli);
}

export function statoIniziale(): Stato {
  return {
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
    ultimoProtetto: null,
    ispezionato: null,
    mortiNotte: [],
    ballottaggio: null,
    eliminato: null,
    esitoVoto: null,
    vincitore: null,
    svelaRuoli: true,
    narratoreGioca: false,
  };
}

/** Fine partita e fazioni che vincono (la lista, non il singolo vincitore: pronta per più fazioni). */
export function finePartita(
  ruoli: Record<number, Ruolo>,
  vivi: readonly number[],
): { fine: boolean; vincitori: Fazione[] } {
  const lupi = vivi.filter((p) => ruoli[p] !== undefined && fazione(ruoli[p]) === "lupi").length;
  if (lupi === 0) return { fine: true, vincitori: ["villaggio"] };
  if (lupi >= vivi.length - lupi) return { fine: true, vincitori: ["lupi"] };
  return { fine: false, vincitori: [] };
}

export function vincitore(ruoli: Record<number, Ruolo>, vivi: readonly number[]): Stato["vincitore"] {
  return finePartita(ruoli, vivi).vincitori[0] ?? null;
}

/** Descrittore di una fase notturna: chi si sveglia, chi può scegliere, dove va la scelta e come incide sui morti. */
export interface DescrittoreNotte {
  fase: FaseNotte;
  ruolo: Ruolo;
  /** Campo dello stato dove finisce la scelta. */
  campo: "vittima" | "ispezionato" | "protetto";
  /** Se la scelta, una volta fatta, non si cambia più. */
  unaSolaScelta: boolean;
  /** Chi si può scegliere tra i vivi. */
  puoiScegliere: (s: Stato, posto: number) => boolean;
  /** Ordine di applicazione degli effetti sui morti della notte (crescente). */
  ordineEffetto: number;
  /** Effetto sui morti: riceve l'elenco finora e restituisce il nuovo. */
  effetto: (s: Stato, morti: number[]) => number[];
}

/** Ordine in cui si svegliano i ruoli della notte. Un ruolo assente dalla partita viene saltato. */
export const FASI_NOTTE: readonly DescrittoreNotte[] = [
  {
    fase: "lupi",
    ruolo: "lupo",
    campo: "vittima",
    unaSolaScelta: false,
    puoiScegliere: (s, p) => s.ruoli[p] !== "lupo",
    ordineEffetto: 1,
    effetto: (s, morti) => (s.vittima === null ? morti : [...morti, s.vittima]),
  },
  {
    fase: "veggente",
    ruolo: "veggente",
    campo: "ispezionato",
    unaSolaScelta: true,
    puoiScegliere: (s, p) => s.ruoli[p] !== "veggente",
    ordineEffetto: 0,
    effetto: (_s, morti) => morti,
  },
  {
    fase: "medico",
    ruolo: "medico",
    campo: "protetto",
    unaSolaScelta: false,
    puoiScegliere: (s, p) => p !== s.ultimoProtetto,
    ordineEffetto: 2,
    // Con il medico morto la fase si fa lo stesso (per non svelare nulla), ma la scelta è finta e non salva nessuno.
    effetto: (s, morti) => (haRuoloVivo(s, "medico") ? morti.filter((p) => p !== s.protetto) : morti),
  },
];

export function descrittoreNotte(fase: Fase): DescrittoreNotte | undefined {
  return FASI_NOTTE.find((d) => d.fase === fase);
}

/** La scelta già fatta in questa notte per il descrittore (null = nessuna). */
export function sceltaNotte(s: Stato, d: DescrittoreNotte): number | null {
  return s[d.campo];
}

/**
 * Chi si può scegliere nella fase notturna `fase`: solo i vivi che il descrittore ammette.
 * Fuori dalla notte la lista è vuota.
 */
export function candidatiNotte(s: Stato, fase: Fase = s.fase): number[] {
  const d = descrittoreNotte(fase);
  return d ? s.vivi.filter((p) => d.puoiScegliere(s, p)) : [];
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

/**
 * Fase notturna successiva a `dopo` (null = dall'inizio della notte): salta i ruoli che non esistono
 * nella partita. Quando la notte è finita la risolve, così la vittima muore anche senza veggente o medico.
 */
function prossimaFaseNotte(s: Stato, dopo: Fase | null): Stato {
  const da = dopo === null ? 0 : FASI_NOTTE.findIndex((d) => d.fase === dopo) + 1;
  const prossima = FASI_NOTTE.slice(da).find((d) => Object.values(s.ruoli).includes(d.ruolo));
  return prossima ? { ...s, fase: prossima.fase } : risolviNotte(s);
}

function risolviNotte(s: Stato): Stato {
  const ordine = [...FASI_NOTTE].sort((x, y) => x.ordineEffetto - y.ordineEffetto);
  const morti = ordine.reduce<number[]>((m, d) => d.effetto(s, m), []);
  const vivi = s.vivi.filter((p) => !morti.includes(p));
  return {
    ...s,
    vivi,
    mortiNotte: morti,
    ultimoProtetto: haRuoloVivo(s, "medico") ? s.protetto : null,
    fase: "alba",
    vincitore: vincitore(s.ruoli, vivi),
  };
}

export function riduci(s: Stato, a: Azione): Stato {
  switch (a.tipo) {
    case "avvia": {
      const giocatori = creaGiocatori(a.nomi);
      const ruoli = distribuisciRuoli(giocatori.length, a.seme);
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
        svelaRuoli: a.svelaRuoli ?? true,
        narratoreGioca: a.narratoreGioca ?? false,
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
        // Secondo pareggio, o nessun voto: nessuno viene eliminato.
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
