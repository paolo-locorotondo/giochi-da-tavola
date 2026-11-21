import { SEMI_FRANCESI, type SemeFrancese } from "@gdt/carte/logica";
import { eMatta, valorePunti, type Carta } from "./carte";
import { REGOLE } from "./regole";

/**
 * Il cuore del Burraco: riconoscere tris e scale (sequenze), con al più una matta.
 * Puro: nessuno stato, nessuna frase. Le carte sono al massimo 14, quindi la ricerca è esaustiva.
 */

/** Una carta dentro una combinazione: che valore occupa e se fa da matta. */
export interface Posata {
  carta: Carta;
  /** Per una scala la posizione (1 = asso basso … 13 = K, 14 = asso alto); per un tris il valore del tris. */
  come: number;
  matta: boolean;
}

export type TipoCombinazione = "tris" | "scala";
export type TipoBurraco = "pulito" | "semipulito" | "sporco";

export interface Interpretazione {
  tipo: TipoCombinazione;
  /** Solo per la scala. */
  seme: SemeFrancese | null;
  /** In ordine di posizione (scala) o di valore e id (tris). */
  posate: Posata[];
}

export interface Combinazione extends Interpretazione {
  id: number;
  squadra: number;
}

export const matteIn = (posate: readonly Posata[]): number => posate.filter((p) => p.matta).length;

/** Tris: da 3 a 9 carte dello stesso valore (non 2), al più una matta, mai solo matte. */
function comeTris(carte: readonly Carta[]): Interpretazione | null {
  if (carte.length < REGOLE.minimoCombinazione || carte.length > REGOLE.massimoTris) return null;
  const naturali = carte.filter((c) => !eMatta(c));
  const matte = carte.filter((c) => eMatta(c));
  if (matte.length > 1 || naturali.length === 0) return null;
  const valore = naturali[0]!.valore;
  if (naturali.some((c) => c.valore !== valore)) return null;
  const posate: Posata[] = [...naturali]
    .sort((a, b) => a.id - b.id)
    .map((carta) => ({ carta, come: valore, matta: false }));
  for (const carta of matte) posate.push({ carta, come: valore, matta: true });
  return { tipo: "tris", seme: null, posate };
}

/** La carta può stare naturalmente alla posizione `pos` di una scala di `seme`? (asso a 1 o 14, il 2 del seme a 2) */
function naturaleA(c: Carta, seme: SemeFrancese, pos: number): boolean {
  if (c.seme !== seme) return false;
  if (c.valore === 1) return pos === 1 || pos === 14;
  return c.valore === pos;
}

/**
 * Tutte le scale possibili con esattamente queste carte: per ogni seme e posizione iniziale si assegnano
 * le carte alle posizioni (naturali o, al più una volta, una matta). Carte uguali (due mazzi) danno la
 * stessa lettura: si tiene una sola interpretazione per forma.
 */
function comeScale(carte: readonly Carta[]): Interpretazione[] {
  const n = carte.length;
  if (n < REGOLE.minimoCombinazione || n > REGOLE.massimoScala) return [];
  const risultati: Interpretazione[] = [];
  const viste = new Set<string>();
  // Il seme è quello delle carte che non possono fare da matta (tutte uguali); se sono tutte matte, si provano i semi dei 2.
  const fisse = carte.filter((c) => !eMatta(c));
  const semiFissi = new Set(fisse.map((c) => c.seme));
  if (semiFissi.size > 1) return [];
  const semi = fisse.length > 0 ? SEMI_FRANCESI.filter((s) => semiFissi.has(s)) : SEMI_FRANCESI.filter((s) => carte.some((c) => c.seme === s));
  for (const seme of semi) {
    for (let inizio = 1; inizio + n - 1 <= 14; inizio++) {
      const usate = new Array<boolean>(n).fill(false);
      const posate: Posata[] = [];
      const prova = (pos: number, matte: number): void => {
        if (pos === inizio + n) {
          const naturali = posate.filter((p) => !p.matta).length;
          // Una scala di sole matte non esiste (FIBUR art. 10: niente giochi di sole matte).
          if (naturali === 0) return;
          const chiave = `${seme}:${posate.map((p) => `${p.come}${p.matta ? "m" : ""}${p.carta.seme ?? "j"}${p.carta.valore}`).join(",")}`;
          if (viste.has(chiave)) return;
          viste.add(chiave);
          risultati.push({ tipo: "scala", seme, posate: [...posate] });
          return;
        }
        const provate = new Set<string>();
        for (let i = 0; i < n; i++) {
          if (usate[i]) continue;
          const c = carte[i]!;
          const forma = `${c.seme}${c.valore}`;
          if (provate.has(forma)) continue; // carta identica già provata in questa posizione
          provate.add(forma);
          if (naturaleA(c, seme, pos)) {
            usate[i] = true;
            posate.push({ carta: c, come: pos, matta: false });
            prova(pos + 1, matte);
            posate.pop();
            usate[i] = false;
          }
          if (eMatta(c) && matte === 0) {
            usate[i] = true;
            posate.push({ carta: c, come: pos, matta: true });
            prova(pos + 1, matte + 1);
            posate.pop();
            usate[i] = false;
          }
        }
      };
      prova(inizio, 0);
    }
  }
  return risultati;
}

/** Tutti i modi validi di leggere quell'insieme di carte. Vuoto = non è una combinazione. */
export function interpreta(carte: readonly Carta[]): Interpretazione[] {
  if (new Set(carte.map((c) => c.id)).size !== carte.length) return [];
  const tris = comeTris(carte);
  return tris ? [tris] : comeScale(carte);
}

/**
 * Posizione della matta, per metterla più in basso possibile (FIBUR art. 10), tranne al posto dell'asso:
 * lì va in alto (la posizione 1 conta come la più alta).
 */
function posMatta(i: Interpretazione): number {
  const come = i.posate.find((p) => p.matta)?.come ?? 0;
  return come === 1 ? 15 : come;
}

/**
 * La lettura da usare: quella con meno matte (così il 2 al suo posto resta naturale e il burraco
 * è pulito se può esserlo); a parità la matta più in basso (FIBUR art. 10: «le matte libere vanno
 * collocate sempre nella posizione più bassa»), salvo quando in basso c'è l'asso.
 */
export function scegli(interpretazioni: readonly Interpretazione[]): Interpretazione | null {
  if (interpretazioni.length === 0) return null;
  return [...interpretazioni].sort((a, b) => {
    const m = matteIn(a.posate) - matteIn(b.posate);
    if (m !== 0) return m;
    // Asso alto preferito solo se serve: a parità, la scala che parte più in basso.
    const pa = posMatta(a);
    const pb = posMatta(b);
    if (pa !== pb) return pa - pb;
    return (a.posate[0]?.come ?? 0) - (b.posate[0]?.come ?? 0);
  })[0]!;
}

/** La migliore lettura di queste carte, o null. */
export const leggi = (carte: readonly Carta[]): Interpretazione | null => scegli(interpreta(carte));

/**
 * Attaccare carte a una combinazione: si rilegge l'unione di carte vecchie e nuove, ma ogni matta già
 * calata deve restare con la stessa carta e nella stessa posizione (FIBUR art. 10: la matta non si sposta,
 * si sostituisce solo con la carta che rappresenta). Null se nessuna lettura lo permette.
 */
export function attacca(comb: Interpretazione, nuove: readonly Carta[]): Interpretazione | null {
  const tutte = [...comb.posate.map((p) => p.carta), ...nuove];
  const vecchieMatte = comb.posate.filter((p) => p.matta);
  const letture = interpreta(tutte).filter(
    (i) =>
      i.tipo === comb.tipo &&
      (comb.tipo === "tris" || i.seme === comb.seme) &&
      vecchieMatte.every((m) => i.posate.some((p) => p.matta && p.carta.id === m.carta.id && p.come === m.come)),
  );
  return scegli(letture);
}

export const puntiCarte = (posate: readonly Posata[]): number => posate.reduce((s, p) => s + valorePunti(p.carta), 0);

/** Che burraco è (o null se ha meno di 7 carte). FIBUR art. 13. */
export function burraco(c: Interpretazione): TipoBurraco | null {
  if (c.posate.length < REGOLE.carteBurraco) return null;
  if (c.tipo === "tris" && !REGOLE.burracoDiTris) return null;
  const matta = c.posate.findIndex((p) => p.matta);
  if (matta < 0) return "pulito";
  if (c.tipo === "tris") return c.posate.length >= 8 ? "semipulito" : "sporco";
  // Scala: la matta è in testa o in coda e precede o segue almeno sette carte (FIBUR art. 13).
  const inTesta = matta === 0;
  const inCoda = matta === c.posate.length - 1;
  return (inTesta || inCoda) && c.posate.length - 1 >= 7 ? "semipulito" : "sporco";
}

export function bonusBurraco(c: Interpretazione): number {
  const b = burraco(c);
  return b ? REGOLE.bonus[b] : 0;
}
