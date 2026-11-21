/**
 * Ingresso senza interfaccia (nessun CSS né React): tipi, mazzi, mescolata, ordinamenti e nomi.
 * Lo usano la logica dei giochi e il server, che non sanno caricare i CSS dell'indice.
 */
export { SEMI_FRANCESI, SEMI_ITALIANI, eJolly, mazzoDi } from "./tipi";
export type { Carta, Mazzo, Seme, SemeFrancese, SemeItaliano } from "./tipi";
export { mazzoFrancese, mazzoItaliano, mescola } from "./mazzi";
export type { OpzioniMazzoFrancese } from "./mazzi";
export { ordinaPerSeme, ordinaPerValore } from "./ordine";
export { nomeCarta } from "./nomi";
export { dizionari as dizionariCarte } from "./locales";
