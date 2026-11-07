import { creaGiocatori } from "@gdt/engine";

export const MIN_GIOCATORI = 4;

/** Controlla i nomi prima di avviare la partita; restituisce il messaggio d'errore o null. */
export function validaConfigurazione(nomi: readonly string[]): string | null {
  try {
    creaGiocatori(nomi);
  } catch (e) {
    return e instanceof Error ? e.message : "Nomi non validi";
  }
  if (nomi.length < MIN_GIOCATORI) return `Servono almeno ${MIN_GIOCATORI} giocatori`;
  return null;
}
