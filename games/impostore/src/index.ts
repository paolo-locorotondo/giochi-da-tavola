export {
  carta,
  creaPartita,
  eImpostore,
  impostoriConsigliati,
  impostoriMassimi,
  normalizza,
  risultatoVoto,
  verificaTentativo,
} from "./logic/partita";
export type { Carta, ConfigPartita, EsitoVoto, Partita } from "./logic/partita";
export { fasiImpostore, nuovaMacchinaImpostore, vincitore } from "./logic/fasi";
export type { EventoImpostore, FaseImpostore, Vincitore } from "./logic/fasi";
export { esitoSessione, riduci, sessioneIniziale } from "./logic/sessione";
export type { Azione, EsitoSessione, Sessione } from "./logic/sessione";
export { categorie, lingueParole, nomeCategoria, paroleDi, VERSIONE_DATI } from "./parole";
export { ErroreGioco, leggiMessaggio, messaggioDi } from "./errori";
export type { ProblemaGioco } from "./errori";
export { dizionari } from "./locales";
export type { Categoria } from "./parole";
export { ImpostoreApp } from "./ui/Impostore";
export { manifest } from "./manifest";
