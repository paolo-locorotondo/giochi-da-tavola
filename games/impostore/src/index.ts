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
export { esitoSessione, riduci, sessioneIniziale } from "./logic/sessione";
export type { Azione, EsitoSessione, Sessione } from "./logic/sessione";
export { categorie, paroleDi, VERSIONE_DATI } from "./parole";
export type { Categoria } from "./parole";
export { ImpostoreApp } from "./ui/ImpostoreApp";
export { manifest } from "./manifest";
