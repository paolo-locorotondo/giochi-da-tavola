import { creaGiocatori } from "@gdt/engine";
import { impostoriMassimi } from "./partita";

/** Un nome per riga: toglie spazi e righe vuote. */
export function nomiDaTesto(testo: string): string[] {
  return testo
    .split("\n")
    .map((riga) => riga.trim())
    .filter((riga) => riga.length > 0);
}

/** Controlli sui dati della configurazione, prima di avviare la partita. Restituisce l'errore o null. */
export function validaConfigurazione(nomi: string[], numImpostori: number): string | null {
  try {
    creaGiocatori(nomi);
  } catch (e) {
    return e instanceof Error ? e.message : "Nomi non validi";
  }
  if (nomi.length < 3) return "Servono almeno 3 giocatori";
  if (numImpostori * 2 >= nomi.length) {
    return `Con ${nomi.length} giocatori gli impostori possono essere al massimo ${impostoriMassimi(nomi.length)}`;
  }
  return null;
}
