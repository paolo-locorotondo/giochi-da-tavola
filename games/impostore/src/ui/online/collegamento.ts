import { leggiToken as leggiTokenDi, useCollegamento as useCollegamentoDi, type Collegamento as CollegamentoDi } from "@gdt/collegamento";
import type { Vista } from "../../online";

export type { Messaggio } from "@gdt/collegamento";
export type Collegamento = CollegamentoDi<Vista>;

const GIOCO = "impostore";

/** Il collegamento al server per Impostore (il codice è condiviso con gli altri giochi in `@gdt/collegamento`). */
export const useCollegamento = (codiceIniziale: string | null): Collegamento => useCollegamentoDi<Vista>(GIOCO, codiceIniziale);

/** Il token salvato per un codice: serve a creare/entrare con lo stesso telefono. */
export const leggiToken = (codice: string) => leggiTokenDi(GIOCO, codice);
