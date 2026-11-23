/**
 * La partita in corso di un gioco su un solo telefono, salvata in localStorage per sopravvivere al
 * refresh della pagina. Chiave `gdt.<gioco>.partitaInCorso`.
 *
 * Il salvataggio ha una **versione dello schema**: se la versione non è quella attesa, se il JSON non è
 * valido o se la funzione di controllo del gioco non lo accetta, il salvataggio si scarta in silenzio
 * (e si riparte dalla schermata di creazione). Ogni accesso allo storage è protetto da try/catch.
 *
 * Si salva solo mentre la partita è in corso: chi esce o chiude la partita chiama `cancellaPartita`.
 */

const chiavePartita = (gioco: string) => `gdt.${gioco}.partitaInCorso`;

interface Busta {
  versione: number;
  dati: unknown;
}

/** La partita salvata, se esiste, ha la versione giusta e supera `valida`; altrimenti null (e il salvataggio si cancella). */
export function leggiPartita<T>(gioco: string, versione: number, valida: (dati: unknown) => dati is T): T | null {
  try {
    const grezzo = localStorage.getItem(chiavePartita(gioco));
    if (grezzo === null) return null;
    const busta = JSON.parse(grezzo) as Partial<Busta> | null;
    if (busta && typeof busta === "object" && busta.versione === versione && valida(busta.dati)) return busta.dati;
  } catch {
    /* JSON rotto, controllo che lancia o storage non disponibile: salvataggio scartato */
  }
  cancellaPartita(gioco);
  return null;
}

export function scriviPartita(gioco: string, versione: number, dati: unknown): void {
  try {
    localStorage.setItem(chiavePartita(gioco), JSON.stringify({ versione, dati } satisfies Busta));
  } catch {
    /* niente memoria o dati non serializzabili: la partita funziona, ma non si riprende */
  }
}

export function cancellaPartita(gioco: string): void {
  try {
    localStorage.removeItem(chiavePartita(gioco));
  } catch {
    /* storage non disponibile */
  }
}
