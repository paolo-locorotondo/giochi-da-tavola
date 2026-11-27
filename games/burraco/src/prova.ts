/**
 * Solo per la pagina di PROVA (`pnpm dev`, /prova-carte.html): una partita di Burraco costruita a mano, con le regole
 * vere. Si scelgono le mani, le combinazioni calate, gli scarti, il turno e se il pozzetto è già preso, poi si gioca
 * con il tavolo vero (le mosse passano da `agisci` e i bot da `muoviBot`). Serve a ricreare al volo un caso raro
 * (stallo in chiusura, scale lunghe, tanti tris) senza giocare una partita intera.
 *
 * Non è esportato dall'indice del gioco e la pagina di prova non fa parte della build (vedi
 * packages/engine/src/prova-fuori-dalla-build.test.ts): in produzione questo file non c'è.
 */
import { mazzoCompleto, type Carta } from "./carte";
import { interpreta, scegli, type Combinazione } from "./combinazioni";
import { agisci, muoviBot, botDiTurno, nuovaPartitaLocale, vistaLocale, IO, type PartitaLocale } from "./offline";
import type { Vista } from "./online/gioco";

import "./ui/burraco.css";
export { Tavolo } from "./ui/Tavolo";
export { testoMessaggio } from "./errori-ui";
export { dizionari } from "./locales";
export { agisci, botDiTurno, muoviBot, vistaLocale, IO };
export type { PartitaLocale, Vista };

/** Cosa si sceglie nella pagina di prova. Le carte si scrivono come «7c 7q 2p j» (vedi `leggiCarte`). */
export interface DescrizioneProva {
  /** 2 o 4 giocatori. */
  giocatori: 2 | 4;
  /** Le mani, una per posto (posto 1 = tu). */
  mani: string[];
  /** Combinazioni calate, una per riga, con la squadra: «1: tris 9», «2: scala cuori 3-9 +j», «1: 3q 2q 5q 6q». */
  combinazioni: string;
  /** Gli scarti dal fondo alla cima. */
  scarti: string;
  /** Di chi è il turno (posto) e in che fase. */
  turno: number;
  fase: "pescare" | "giocare";
  /** Pozzetto già preso per squadra 1 e squadra 2. */
  pozzettiPresi: [boolean, boolean];
}

const SEMI: Record<string, Carta["seme"]> = { c: "cuori", q: "quadri", f: "fiori", p: "picche" };
const VALORI: Record<string, number> = { a: 1, j: 11, q: 12, k: 13 };

/**
 * Legge carte scritte a mano: valore poi seme («7c» = sette di cuori, «aq» = asso di quadri, «10p», «kf»),
 * oppure «j» / «jolly» per un jolly. Le carte si prendono da un doppio mazzo senza ripetere lo stesso id.
 */
function lettore() {
  const mazzo = mazzoCompleto();
  const usati = new Set<number>();
  const prendi = (seme: Carta["seme"], valore: number, testo: string): Carta => {
    const c = mazzo.find((x) => x.seme === seme && (seme === null || x.valore === valore) && !usati.has(x.id));
    if (!c) throw new Error(`carta finita (ce ne sono due per mazzo): ${testo}`);
    usati.add(c.id);
    return c;
  };
  const carta = (t: string): Carta => {
    const x = t.trim().toLowerCase();
    if (x === "j" || x === "jolly" || x === "*") return prendi(null, 0, t);
    const m = /^(10|[2-9]|[ajqk])([cqfp])$/.exec(x);
    if (!m) throw new Error(`carta non valida: «${t}» (scrivi per esempio 7c, aq, 10p, kf, j)`);
    const valore = VALORI[m[1]!] ?? Number(m[1]);
    return prendi(SEMI[m[2]!]!, valore, t);
  };
  const carte = (testo: string): Carta[] =>
    testo
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(carta);
  const nomiSemi = { cuori: "c", quadri: "q", fiori: "f", picche: "p" } as const;
  /** «tris 9», «tris 9 +j», «scala cuori 3-9», «scala picche 1-13 +j», oppure le carte una per una. */
  const combinazione = (testo: string): Carta[] => {
    const conMatta = /\+j\b/.test(testo);
    const tris = /^tris\s+(\d+|[ajqk])/i.exec(testo);
    if (tris) {
      const v = tris[1]!.toLowerCase();
      const valore = VALORI[v] ?? Number(v);
      const fuori = ["c", "q", "f"].map((s) => prendi(SEMI[s]!, valore, testo));
      return conMatta ? [...fuori, prendi(null, 0, testo)] : fuori;
    }
    const scala = /^scala\s+(cuori|quadri|fiori|picche)\s+(\d+)-(\d+)/i.exec(testo);
    if (scala) {
      const s = nomiSemi[scala[1]!.toLowerCase() as keyof typeof nomiSemi];
      const da = Number(scala[2]);
      const a = Number(scala[3]);
      const tutte = Array.from({ length: a - da + 1 }, (_, i) => prendi(SEMI[s]!, da + i, testo));
      return conMatta ? [...tutte, prendi(null, 0, testo)] : tutte;
    }
    return carte(testo.replace(/\+j\b/, "j"));
  };
  return { carte, combinazione, avanzi: () => mazzo.filter((c) => !usati.has(c.id)) };
}

/** La partita costruita dalla descrizione. Lancia un errore leggibile se qualcosa non torna. */
export function partitaDiProva(d: DescrizioneProva): PartitaLocale {
  const nomi = d.giocatori === 4 ? ["Tu", "Bot 1", "Compagno", "Bot 2"] : ["Tu", "Bot 1"];
  const base = nuovaPartitaLocale({ nomi, livello: "facile", config: {} }, 7);
  const leggi = lettore();

  const combinazioni: Combinazione[] = [];
  let id = 1;
  for (const riga of d.combinazioni.split("\n").map((r) => r.trim()).filter(Boolean)) {
    const m = /^([12])\s*:\s*(.+)$/.exec(riga);
    if (!m) throw new Error(`combinazione senza squadra: «${riga}» (scrivi «1: tris 9» o «2: scala cuori 3-9»)`);
    const carte = leggi.combinazione(m[2]!);
    const lettura = scegli(interpreta(carte));
    if (!lettura) throw new Error(`non è una combinazione valida: «${riga}»`);
    combinazioni.push({ ...lettura, id: id++, squadra: Number(m[1]) });
  }
  const mani = Array.from({ length: d.giocatori }, (_, i) => leggi.carte(d.mani[i] ?? ""));
  const scarti = leggi.carte(d.scarti);
  // Il resto va nel mazzo e nei pozzetti (11 carte per squadra, se c'è abbastanza).
  const avanzi = leggi.avanzi();
  const pozzetti = [avanzi.slice(0, 11), avanzi.slice(11, 22)];
  const mazzo = avanzi.slice(22);
  if (d.turno < 1 || d.turno > d.giocatori) throw new Error(`turno non valido: ${d.turno}`);

  const p = base.stato.partita!;
  return {
    ...base,
    stato: {
      ...base.stato,
      partita: {
        ...p,
        mani,
        scarti,
        mazzo,
        pozzetti: d.pozzettiPresi.map((preso, i) => (preso ? [] : pozzetti[i]!)),
        presi: [...d.pozzettiPresi],
        inAttesa: [],
        combinazioni,
        prossimoId: id,
        turno: d.turno,
        fase: d.fase,
        vietata: null,
        senzaProgressi: 0,
        progresso: false,
        fine: null,
        eventi: [],
      },
    },
  };
}
