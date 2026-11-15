import { suona, type Disegno } from "@gdt/suoni";

/** Suoni del Tabù (sintetizzati): carta indovinata, parola vietata, carta passata. */
const INDOVINATA: Disegno = { onda: "sine", volume: 0.2, note: [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.16]] };
const VIETATA: Disegno = { onda: "square", volume: 0.12, note: [[165, 0, 0.14], [117, 0.15, 0.26]] };
const PASSA: Disegno = { onda: "triangle", volume: 0.18, note: [[600, 0, 0.08], [440, 0.08, 0.12]] };

export const suonoIndovinata = () => suona(INDOVINATA);
export const suonoVietata = () => suona(VIETATA);
export const suonoPassa = () => suona(PASSA);
