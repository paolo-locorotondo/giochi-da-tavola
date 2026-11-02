export {
  carta,
  creaPartita,
  eImpostore,
  normalizza,
  risultatoVoto,
  verificaTentativo,
} from "./logic/partita";
export type { Carta, ConfigPartita, EsitoVoto, Partita } from "./logic/partita";
export { fasiImpostore, nuovaMacchinaImpostore, vincitore } from "./logic/fasi";
export type { EventoImpostore, FaseImpostore, Vincitore } from "./logic/fasi";
export { categorie, paroleDi, VERSIONE_DATI } from "./parole";
export type { Categoria } from "./parole";
