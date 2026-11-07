export const MIN_GIOCATORI = 4;

/** Problema trovato nei nomi: un codice, non una frase (la UI lo traduce nella lingua scelta). */
export type ErroreConfigurazione =
  | { codice: "nome-vuoto"; posto: number }
  | { codice: "nome-duplicato"; nome: string }
  | { codice: "pochi"; minimo: number };

/**
 * Controlla i nomi prima di avviare la partita; restituisce il problema o null.
 * Stesse regole di `creaGiocatori` (nome vuoto, duplicato senza badare alle maiuscole), ma senza frasi:
 * i nomi sbagliati hanno la precedenza sul numero minimo.
 */
export function validaConfigurazione(nomi: readonly string[]): ErroreConfigurazione | null {
  const visti = new Set<string>();
  for (const [indice, grezzo] of nomi.entries()) {
    const nome = grezzo.trim();
    if (nome.length === 0) return { codice: "nome-vuoto", posto: indice + 1 };
    const chiave = nome.toLocaleLowerCase("it-IT");
    if (visti.has(chiave)) return { codice: "nome-duplicato", nome };
    visti.add(chiave);
  }
  if (nomi.length < MIN_GIOCATORI) return { codice: "pochi", minimo: MIN_GIOCATORI };
  return null;
}
