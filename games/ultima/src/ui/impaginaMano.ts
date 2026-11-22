import { CARTE_PER_RIGA, impaginaMano as impagina, type RigaMano as Riga } from "@gdt/carte/ventaglio";
import type { Carta, Colore } from "../logica";

/**
 * Ordine della mano di Ultima! per il ventaglio. L'impaginazione (righe bilanciate, tagli fra un colore e
 * l'altro) è quella condivisa di `@gdt/carte` (`impaginaMano`); qui ci sono solo l'ordine e la chiave di gruppo.
 * La sovrapposizione la calcola il CSS (`.cg-riga` di `@gdt/carte`, misure in `.ul-mano` di `ultima.css`).
 */

export { CARTE_PER_RIGA };

/** Ordine dei blocchi di colore; i jolly vengono dopo. */
export const ORDINE_COLORI: readonly Colore[] = ["blu", "giallo", "rosso", "verde"];

export type ChiaveGruppo = Colore | "jolly";
export type RigaMano = Riga<Carta, ChiaveGruppo>;

export const chiaveGruppo = (c: Carta): ChiaveGruppo => ("colore" in c ? c.colore : "jolly");

/** Posizione dentro il colore: numeri 0-9, poi Salta, Inverti, +2; fra i jolly Jolly, +4, Scambio, Rotazione. */
function rango(c: Carta): number {
  switch (c.tipo) {
    case "numero":
      return c.valore;
    case "salta":
      return 10;
    case "inverti":
      return 11;
    case "piu2":
      return 12;
    case "jolly":
      return 0;
    case "piu4":
      return 1;
    case "scambio":
      return 2;
    case "rotazione":
      return 3;
  }
}

const posizioneGruppo = (k: ChiaveGruppo) => (k === "jolly" ? ORDINE_COLORI.length : ORDINE_COLORI.indexOf(k));

/** Blocchi per colore (blu, giallo, rosso, verde), poi i jolly; a parità per id. Per `Array.sort`. */
export const confrontaMano = (a: Carta, b: Carta): number =>
  posizioneGruppo(chiaveGruppo(a)) - posizioneGruppo(chiaveGruppo(b)) || rango(a) - rango(b) || a.id - b.id;

/** Le carte in ordine: blocchi per colore (blu, giallo, rosso, verde), poi i jolly; a parità per id. */
export function ordinaMano(mano: readonly Carta[]): Carta[] {
  return [...mano].sort(confrontaMano);
}

/** La mano di Ultima! in righe: ordine per colore, gruppi per colore, al più `capacita` carte per riga. */
export function impaginaMano(mano: readonly Carta[], capacita: number = CARTE_PER_RIGA): RigaMano[] {
  return impagina(mano, { capacita, chiave: chiaveGruppo, ordine: confrontaMano });
}
