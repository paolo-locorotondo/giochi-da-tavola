import { UltimaOnline } from "./UltimaOnline";
import "./ultima.css";

/** Indirizzo `/ultima/CODICE`: il codice porta direttamente nella partita. */
function codiceDaIndirizzo(): string | null {
  const parti = window.location.pathname.split("/");
  return parti[2] ? parti[2].toUpperCase() : null;
}

/** Solo online: la mano è segreta, con un solo telefono non avrebbe senso. */
export function UltimaApp() {
  return <UltimaOnline codiceIniziale={codiceDaIndirizzo()} />;
}
