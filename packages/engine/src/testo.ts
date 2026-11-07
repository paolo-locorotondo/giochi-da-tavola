/** Massimo di caratteri di un nome (giocatore, squadra): oltre, i nomi escono dagli elementi grafici. */
export const MAX_CARATTERI_NOME = 20;

/** Accorcia a `max` caratteri, contando i simboli interi (non le unità UTF-16: un'emoji conta uno). */
export function limitaTesto(testo: string, max: number): string {
  const simboli = Array.from(testo);
  return simboli.length <= max ? testo : simboli.slice(0, max).join("");
}

/** Accorcia ogni riga a `max` caratteri, lasciando intatte le altre: serve ai campi «uno per riga». */
export function limitaRighe(testo: string, max: number): string {
  return testo
    .split("\n")
    .map((r) => limitaTesto(r, max))
    .join("\n");
}
