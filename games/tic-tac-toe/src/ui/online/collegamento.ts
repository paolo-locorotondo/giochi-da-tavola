import { leggiToken as leggiTokenDi, useCollegamento as useCollegamentoDi, type Collegamento as CollegamentoDi } from "@gdt/collegamento";
import type { Vista } from "../../online";

export type Collegamento = CollegamentoDi<Vista>;

const GIOCO = "tris";

export const useCollegamento = (codiceIniziale: string | null): Collegamento => useCollegamentoDi<Vista>(GIOCO, codiceIniziale);
export const leggiToken = (codice: string) => leggiTokenDi(GIOCO, codice);
