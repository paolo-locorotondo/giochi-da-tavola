/**
 * Impostazioni di un gioco (non di una partita): valgono per tutte le partite su questo telefono.
 * Ogni gioco le dichiara nel suo `manifest.impostazioni`; l'ingranaggio le mostra quando si è dentro quel gioco.
 * Si salvano in localStorage con la chiave `gdt-pref-<gioco>-<chiave>`.
 */
import { useSyncExternalStore } from "react";

export type ValorePreferenza = number | string;

/** Un'impostazione a scelta singola, mostrata come una fila di opzioni. */
export interface ImpostazioneGioco {
  chiave: string;
  testo: string;
  /** Una riga di spiegazione sotto il titolo. */
  aiuto?: string;
  opzioni: readonly { valore: ValorePreferenza; testo: string }[];
  predefinito: ValorePreferenza;
}

const EVENTO = "gdt-preferenza";

const chiaveArchivio = (gioco: string, chiave: string) => `gdt-pref-${gioco}-${chiave}`;

/** Il valore salvato, se è una delle opzioni previste; altrimenti il predefinito. */
export function leggiPreferenza(gioco: string, imp: ImpostazioneGioco): ValorePreferenza {
  let grezzo: string | null = null;
  try {
    grezzo = localStorage.getItem(chiaveArchivio(gioco, imp.chiave));
  } catch {
    /* archivio non disponibile */
  }
  const trovata = imp.opzioni.find((o) => String(o.valore) === grezzo);
  return trovata ? trovata.valore : imp.predefinito;
}

export function scriviPreferenza(gioco: string, chiave: string, valore: ValorePreferenza): void {
  try {
    localStorage.setItem(chiaveArchivio(gioco, chiave), String(valore));
  } catch {
    // Archivio non disponibile: l'evento aggiorna comunque chi ascolta, ma il valore non resta.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function iscriviti(f: () => void): () => void {
  window.addEventListener(EVENTO, f);
  window.addEventListener("storage", f);
  return () => {
    window.removeEventListener(EVENTO, f);
    window.removeEventListener("storage", f);
  };
}

/** Il valore corrente, che si aggiorna quando cambia dalle impostazioni. */
export function usaPreferenza(gioco: string, imp: ImpostazioneGioco): ValorePreferenza {
  return useSyncExternalStore(iscriviti, () => leggiPreferenza(gioco, imp));
}
