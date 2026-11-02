/**
 * Parole usate di recente, per categoria, salvate sul telefono.
 * Servono a non ripetere subito la stessa parola. Se il browser blocca lo storage
 * il gioco continua a funzionare, solo senza memoria.
 */

const CHIAVE = "gdt.impostore.recenti";
const MAX_RECENTI = 10;

type Recenti = Record<string, string[]>;

function leggi(): Recenti {
  try {
    const raw = localStorage.getItem(CHIAVE);
    return raw ? (JSON.parse(raw) as Recenti) : {};
  } catch {
    return {};
  }
}

export function leggiRecenti(categoria: string): string[] {
  const valori = leggi()[categoria];
  return Array.isArray(valori) ? valori : [];
}

export function ricordaParola(categoria: string, parola: string): void {
  try {
    const tutti = leggi();
    const nuove = [...(tutti[categoria] ?? []).filter((p) => p !== parola), parola];
    tutti[categoria] = nuove.slice(-MAX_RECENTI);
    localStorage.setItem(CHIAVE, JSON.stringify(tutti));
  } catch {
    // storage non disponibile: nessuna memoria, nessun errore per il giocatore
  }
}
