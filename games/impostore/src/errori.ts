/**
 * Errori di regola della logica di gioco: la logica non scrive frasi, lancia un codice stabile
 * che la UI traduce (voce `errore_<codice>` del dizionario). Il messaggio dell'`Error` è il codice,
 * con un eventuale numero dopo i due punti: `troppiImpostori:2` (massimo 2).
 * Così il codice passa tale e quale nei messaggi del server.
 */
export class ErroreGioco extends Error {
  readonly codice: string;
  readonly n?: number;
  constructor(codice: string, n?: number) {
    super(n === undefined ? codice : `${codice}:${n}`);
    this.name = "ErroreGioco";
    this.codice = codice;
    this.n = n;
  }
}

/** Un errore di validazione che non è (ancora) un'eccezione: il codice e il numero, se serve. */
export interface ProblemaGioco {
  codice: string;
  n?: number;
}

/** Il messaggio nel formato `codice` o `codice:n` (quello di `ErroreGioco`). */
export function messaggioDi(p: ProblemaGioco): string {
  return p.n === undefined ? p.codice : `${p.codice}:${p.n}`;
}

/** Spezza un messaggio `codice[:n]`; null se non ha quella forma. */
export function leggiMessaggio(messaggio: string): ProblemaGioco | null {
  const m = /^([A-Za-z]+)(?::(\d+))?$/.exec(messaggio);
  if (!m) return null;
  return m[2] === undefined ? { codice: m[1]! } : { codice: m[1]!, n: Number(m[2]) };
}
