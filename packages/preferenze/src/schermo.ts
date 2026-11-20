/**
 * Un gioco che occupa tutto lo schermo (es. una partita divisa a metà) lo dichiara con
 * `segnalaSchermoIntero(true)` all'inizio e `false` alla fine: l'app nasconde la sua barra in alto,
 * così non copre il gioco. Gli altri giochi non devono fare nulla: la barra resta.
 */
export const EVENTO_SCHERMO_INTERO = "gdt-schermo-intero";

export function segnalaSchermoIntero(attivo: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<boolean>(EVENTO_SCHERMO_INTERO, { detail: attivo }));
}

/** Per l'app: chiama `f` a ogni cambio. Restituisce la funzione per smettere di ascoltare. */
export function seguiSchermoIntero(f: (attivo: boolean) => void): () => void {
  const ascolta = (e: Event) => f(Boolean((e as CustomEvent<boolean>).detail));
  window.addEventListener(EVENTO_SCHERMO_INTERO, ascolta);
  return () => window.removeEventListener(EVENTO_SCHERMO_INTERO, ascolta);
}
