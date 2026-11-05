import { creaGiocatori, creaRng, type Giocatore } from "@gdt/engine";

export type Ruolo = "lupo" | "contadino" | "veggente" | "medico";

export type Fase =
  | "carte"
  | "lupi"
  | "veggente"
  | "medico"
  | "alba"
  | "voto"
  | "esito"
  | "fine";

export interface Stato {
  giocatori: Giocatore[];
  ruoli: Record<number, Ruolo>;
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
  messaggioVoto: string | null;
  vincitore: "lupi" | "villaggio" | null;
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
    messaggioVoto: null,
    vincitore: null,
    svelaRuoli: true,
    narratoreGioca: false,
  };
}

export function vincitore(ruoli: Record<number, Ruolo>, vivi: readonly number[]): Stato["vincitore"] {
  const lupi = vivi.filter((p) => ruoli[p] === "lupo").length;
  if (lupi === 0) return "villaggio";
  if (lupi >= vivi.length - lupi) return "lupi";
  return null;
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
 * Fase notturna successiva: salta i ruoli che non esistono nella partita.
 * Quando la notte è finita (nessun altro ruolo da svegliare) la risolve, così
 * la vittima muore anche nelle partite senza veggente o senza medico.
 */
function dopoLupi(s: Stato): Stato {
  return Object.values(s.ruoli).includes("veggente") ? { ...s, fase: "veggente" } : dopoVeggente(s);
}
function dopoVeggente(s: Stato): Stato {
  return Object.values(s.ruoli).includes("medico") ? { ...s, fase: "medico" } : risolviNotte(s);
}

function risolviNotte(s: Stato): Stato {
  // Con il medico morto la fase si fa lo stesso (per non svelare nulla), ma la scelta è finta e non salva nessuno.
  const protezione = haRuoloVivo(s, "medico") ? s.protetto : null;
  const morto = s.vittima !== null && s.vittima !== protezione ? s.vittima : null;
  const vivi = s.vivi.filter((p) => p !== morto);
  const v = vincitore(s.ruoli, vivi);
  return {
    ...s,
    vivi,
    mortiNotte: morto === null ? [] : [morto],
    ultimoProtetto: protezione,
    fase: "alba",
    vincitore: v,
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
      if (s.fase === "lupi") return { ...s, vittima: a.posto };
      // Il veggente guarda una sola persona a notte: dopo la prima scelta non si cambia.
      if (s.fase === "veggente") return s.ispezionato === null ? { ...s, ispezionato: a.posto } : s;
      if (s.fase === "medico") return { ...s, protetto: a.posto };
      return s;
    }
    case "avanti": {
      if (s.fase === "lupi") return dopoLupi(s);
      if (s.fase === "veggente") return dopoVeggente(s);
      if (s.fase === "medico") return risolviNotte(s);
      if (s.fase === "alba") return { ...s, fase: "voto", ballottaggio: null, messaggioVoto: null };
      return s;
    }
    case "chiudiVoto": {
      const { eliminato, pari } = contaVoti(a.voti);
      if (eliminato === null && pari.length > 1 && s.ballottaggio === null) {
        return { ...s, ballottaggio: pari, messaggioVoto: "Pareggio: ballottaggio tra i pari merito." };
      }
      if (eliminato === null) {
        // Secondo pareggio, o nessun voto: nessuno viene eliminato.
        return { ...s, fase: "esito", eliminato: null, ballottaggio: null, messaggioVoto: "Ancora pari: nessuno viene eliminato." };
      }
      const vivi = s.vivi.filter((p) => p !== eliminato);
      return { ...s, vivi, fase: "esito", eliminato, ballottaggio: null, messaggioVoto: null, vincitore: vincitore(s.ruoli, vivi) };
    }
    case "dopoVoto":
      return s.vincitore ? { ...s, fase: "fine" } : nuovaNotte(s);
  }
}

function nuovaNotte(s: Stato): Stato {
  return {
    ...s,
    fase: "lupi",
    notte: s.notte + 1,
    vittima: null,
    protetto: null,
    ispezionato: null,
    mortiNotte: [],
    eliminato: null,
    messaggioVoto: null,
    ballottaggio: null,
  };
}
