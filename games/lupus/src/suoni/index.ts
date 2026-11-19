import { suona, suonaFile, type Disegno } from "@gdt/suoni";
import galloUrl from "./gallo.mp3";
import ululatoUrl from "./ululato.mp3";
import lupoPiangeUrl from "./lupo_piange.mp3";
import ninnaNannaUrl from "./ninna_nanna_carillon.mp3";
import type { Ruolo } from "../logica";

/**
 * Suoni di Lupus in fabula. Gallo e ululato sono registrazioni (file mp3 in questa cartella: per cambiarli
 * basta sostituirli); gli altri sono sintetizzati e si ritoccano qui sotto. Se un mp3 non parte
 * si ripiega sulla versione sintetizzata.
 */
const GALLO: Disegno = {
  onda: "sawtooth",
  volume: 0.07,
  note: [[700, 0, 0.14, 1100], [750, 0.2, 0.14, 1150], [800, 0.4, 0.16, 1250], [1000, 0.62, 0.55, 1300]],
};
const ULULATO: Disegno = { onda: "triangle", volume: 0.2, note: [[280, 0, 0.9, 560], [560, 0.8, 0.6, 520], [520, 1.3, 1, 260]] };

const MORTO_LUPO: Disegno = { onda: "triangle", volume: 0.2, note: [[420, 0, 0.3, 680], [680, 0.3, 0.45, 340]] };
const MORTO_CONTADINO: Disegno = { onda: "sine", volume: 0.3, note: [[110, 0, 0.5], [82, 0.55, 0.9]] };
const MORTO_VEGGENTE: Disegno = {
  onda: "sine",
  volume: 0.18,
  note: [[1319, 0, 0.3], [988, 0.25, 0.3], [740, 0.5, 0.3], [494, 0.75, 0.7]],
};
const MORTO_MEDICO: Disegno = { onda: "sine", volume: 0.25, note: [[90, 0, 0.12], [90, 0.3, 0.12], [440, 0.7, 1.1]] };

const FINE_CONTADINI: Disegno = {
  onda: "triangle",
  volume: 0.22,
  note: [[392, 0, 0.18], [523, 0.18, 0.18], [659, 0.36, 0.18], [784, 0.54, 0.18], [1047, 0.72, 0.6]],
};
const FINE_LUPI: Disegno = { onda: "triangle", volume: 0.2, note: [[250, 0, 1, 520], [520, 0.9, 0.6, 500], [500, 1.4, 1.3, 230]] };

/** Il verso di chi muore, uno per ruolo: con un ruolo nuovo il compilatore chiede il suo suono. */
const VERSO_MORTE: Record<Ruolo, Disegno> = {
  lupo: MORTO_LUPO,
  contadino: MORTO_CONTADINO,
  veggente: MORTO_VEGGENTE,
  medico: MORTO_MEDICO,
  indemoniato: MORTO_LUPO,
  massone: MORTO_CONTADINO,
  medium: MORTO_VEGGENTE,
  criceto: MORTO_CONTADINO,
  gufo: MORTO_CONTADINO,
  mitomane: MORTO_CONTADINO,
};

/** Gallo e ululato restituiscono una promessa che si risolve quando il suono è finito. */
export const suonoUlulato = () => suonaFile(ululatoUrl, ULULATO);
export const suonoGallo = () => suonaFile(galloUrl, GALLO);
/** Alla morte del lupo c'è il suo pianto (mp3); per gli altri ruoli un verso sintetizzato. */
export const suonoMorte = (ruolo: Ruolo, ritardo = 0) =>
  ruolo === "lupo" ? void suonaFile(lupoPiangeUrl, MORTO_LUPO, ritardo) : suona(VERSO_MORTE[ruolo], ritardo);
/** Ninna nanna della schermata «Occhi chiusi»: si ferma da sola (con `interrompi`) quando la transizione finisce. */
export const suonoNinnaNanna = (interrompi: AbortSignal) => suonaFile(ninnaNannaUrl, undefined, 0, interrompi);
export const suonoFine = (vincitore: "lupi" | "villaggio") => suona(vincitore === "lupi" ? FINE_LUPI : FINE_CONTADINI);
