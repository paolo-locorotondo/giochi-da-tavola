import type { ProblemaGioco } from "../errori";
import { impostoriMassimi } from "./partita";

/** Un nome per riga: toglie spazi e righe vuote. */
export function nomiDaTesto(testo: string): string[] {
  return testo
    .split("\n")
    .map((riga) => riga.trim())
    .filter((riga) => riga.length > 0);
}

/**
 * Controlli sui dati della configurazione, prima di avviare la partita.
 * Restituisce il problema (codice da tradurre nella UI) o null.
 */
export function validaConfigurazione(nomi: string[], numImpostori: number): ProblemaGioco | null {
  const visti = new Set<string>();
  for (const grezzo of nomi) {
    const nome = grezzo.trim();
    if (nome.length === 0) return { codice: "nomeVuoto" };
    const chiave = nome.toLocaleLowerCase("it-IT");
    if (visti.has(chiave)) return { codice: "nomiUguali" };
    visti.add(chiave);
  }
  if (nomi.length < 3) return { codice: "pochiGiocatori" };
  if (numImpostori * 2 >= nomi.length) return { codice: "troppiImpostori", n: impostoriMassimi(nomi.length) };
  return null;
}
