import { suona, type Disegno } from "@gdt/suoni";

/** Suoni sintetizzati del gioco (niente file: funzionano offline). Escono solo se l'audio è acceso. */
const CONTO: Disegno = { onda: "sine", volume: 0.18, note: [[660, 0, 0.1]] };
const VIA: Disegno = { onda: "square", volume: 0.12, note: [[1175, 0, 0.18]] };
const PUNTO: Disegno = { onda: "sine", volume: 0.22, note: [[784, 0, 0.1], [988, 0.1, 0.1], [1319, 0.2, 0.22]] };
const PARI: Disegno = { onda: "sine", volume: 0.18, note: [[523, 0, 0.14], [523, 0.2, 0.14]] };
const FINE: Disegno = {
  onda: "sine",
  volume: 0.24,
  note: [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.4]],
};

export const suonoConto = () => suona(CONTO);
export const suonoVia = () => suona(VIA);
export const suonoPunto = () => suona(PUNTO);
export const suonoPari = () => suona(PARI);
export const suonoFine = () => suona(FINE);
