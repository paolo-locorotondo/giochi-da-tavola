import { suona, type Disegno } from "@gdt/suoni";

/** Suoni dell'Impostore (sintetizzati): fine partita. */
const CIVILI: Disegno = {
  onda: "triangle",
  volume: 0.22,
  note: [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.4]],
};
const IMPOSTORI: Disegno = {
  onda: "sawtooth",
  volume: 0.1,
  note: [[392, 0, 0.2], [311, 0.2, 0.2], [262, 0.4, 0.2], [196, 0.6, 0.45]],
};

export const suonoFine = (vincitore: "civili" | "impostori") => suona(vincitore === "civili" ? CIVILI : IMPOSTORI);
