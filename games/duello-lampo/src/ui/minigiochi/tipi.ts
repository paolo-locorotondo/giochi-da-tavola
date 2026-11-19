import type { Traduttore } from "@gdt/i18n";
import type { it } from "../../locales/it";
import type { Lato, Nessuno } from "../../minigiochi";

export type T = Traduttore<typeof it>;

/** Cosa riceve la vista di un mini gioco: una per ogni metà dello schermo. */
export interface VistaProps<Config, Risultato> {
  config: Config;
  lato: Lato;
  /** `performance.now()` nel momento in cui il round è partito: il tempo zero dei due giocatori. */
  inizio: number;
  /** Una sola delle due viste (la prima) può fare i suoni condivisi, per non raddoppiarli. */
  principale: boolean;
  /** La vista lo chiama una volta sola, quando il suo giocatore ha finito. */
  onRisultato(r: Risultato): void;
}

/** Il testo breve di un risultato, per la schermata dell'esito. */
export type Descrivi<Risultato> = (r: Risultato | Nessuno, t: T) => string;
