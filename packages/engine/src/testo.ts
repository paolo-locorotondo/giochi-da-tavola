/** Massimo di caratteri di un nome (giocatore, squadra): oltre, i nomi escono dagli elementi grafici. */
export const MAX_CARATTERI_NOME = 20;

/** Accorcia a `max` caratteri, contando i simboli interi (non le unità UTF-16: un'emoji conta uno). */
export function limitaTesto(testo: string, max: number): string {
  const simboli = Array.from(testo);
  return simboli.length <= max ? testo : simboli.slice(0, max).join("");
}

/**
 * Accorcia ogni riga a `max` caratteri, lasciando intatte le altre: serve ai campi «uno per riga».
 * Con `maxNomi` tiene al più quel numero di righe con un nome: le righe vuote non contano e restano libere
 * (si può andare a capo quanto si vuole), i nomi oltre il massimo si scartano.
 */
export function limitaRighe(testo: string, max: number, maxNomi?: number): string {
  let nomi = 0;
  const righe = testo.split("\n").map((r) => {
    const corta = limitaTesto(r, max);
    if (corta.trim().length === 0) return corta;
    nomi++;
    return maxNomi !== undefined && nomi > maxNomi ? "" : corta;
  });
  return righe.join("\n");
}

/** Vero se il testo ha più nomi di `maxNomi` (cioè se `limitaRighe` ne scarterebbe qualcuno). */
export function superaRighe(testo: string, maxNomi: number): boolean {
  return contaRighe(testo) > maxNomi;
}

/** Righe non vuote di un campo «uno per riga» (i nomi già scritti). */
export function contaRighe(testo: string): number {
  return testo.split("\n").filter((r) => r.trim().length > 0).length;
}
