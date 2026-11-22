import { suona, type Disegno } from "@gdt/suoni";

/** Suoni sintetizzati del gioco (niente file: funzionano offline). Escono solo se l'audio è acceso. */
const CONTO: Disegno = { onda: "sine", volume: 0.18, note: [[660, 0, 0.1]] };
const VIA: Disegno = { onda: "square", volume: 0.12, note: [[1175, 0, 0.18]] };
const PUNTO: Disegno = { onda: "sine", volume: 0.22, note: [[784, 0, 0.1], [988, 0.1, 0.1], [1319, 0.2, 0.22]] };
// Gli stessi due suoni di Tabù («indovinata» e «vietata detta»): giusto e sbagliato al tocco dei mini giochi.
const GIUSTO: Disegno = { onda: "sine", volume: 0.2, note: [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.16]] };
const SBAGLIATO: Disegno = { onda: "square", volume: 0.12, note: [[165, 0, 0.14], [117, 0.15, 0.26]] };
const PARI: Disegno = { onda: "sine", volume: 0.18, note: [[523, 0, 0.14], [523, 0.2, 0.14]] };
const FINE: Disegno = {
  onda: "sine",
  volume: 0.24,
  note: [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.4]],
};

export const suonoConto = () => suona(CONTO);
export const suonoVia = () => suona(VIA);
/** I suoni di fine round partono dopo l'ultimo suono di tocco (il più lungo dura 0,41 s), senza coprirlo. */
export const RITARDO_ESITO_S = 0.45;
export const suonoPunto = (ritardo = 0) => suona(PUNTO, ritardo);
export const suonoPari = (ritardo = 0) => suona(PARI, ritardo);
export const suonoFine = () => suona(FINE);

/**
 * Al massimo `MAX_SOVRAPPOSTI` suoni uguali nella stessa finestra di `FINESTRA_MS`: in Bersagli si colpisce
 * molte volte al secondo e i suoni, sommandosi, diventerebbero un rumore (e potrebbero distorcere).
 * Due tocchi insieme, uno per metà, suonano entrambi. Restituisce se il suono può partire; `adesso` serve ai test.
 */
export const FINESTRA_MS = 250;
export const MAX_SOVRAPPOSTI = 3;
export function consenti(recenti: number[], adesso: number): boolean {
  while (recenti.length > 0 && adesso - recenti[0]! >= FINESTRA_MS) recenti.shift();
  if (recenti.length >= MAX_SOVRAPPOSTI) return false;
  recenti.push(adesso);
  return true;
}

const giusti: number[] = [];
const sbagliati: number[] = [];
/** Tocco giusto (stesso suono di «indovinata» in Tabù). */
export const suonoGiusto = () => {
  if (consenti(giusti, performance.now())) suona(GIUSTO);
};
/** Tocco sbagliato (stesso suono di «vietata detta» in Tabù). */
export const suonoSbagliato = () => {
  if (consenti(sbagliati, performance.now())) suona(SBAGLIATO);
};
