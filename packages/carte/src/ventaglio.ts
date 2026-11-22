/**
 * Ingresso del solo ventaglio (impaginazione pura + componente con il suo CSS), senza le carte grafiche:
 * per i giochi che disegnano carte proprie (Ultima!).
 */
export { CARTE_PER_RIGA, impaginaMano } from "./impagina";
export type { GruppoMano, OpzioniImpagina, RigaMano } from "./impagina";
export { Ventaglio } from "./ui/Ventaglio";
export type { PropsVentaglio } from "./ui/Ventaglio";
