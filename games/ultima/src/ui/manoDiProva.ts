import { mazzoCompleto, type Carta } from "../logica";

/**
 * Solo per provare la grafica della mano sul telefono: con `?manoProva=N` aperto all'ingresso nel sito (resta per la scheda), e solo in
 * sviluppo (`pnpm dev`), si aggiungono N carte finte (non giocabili) alla mano mostrata.
 * In produzione `import.meta.env.DEV` è falso e questa funzione non fa nulla; il server non ne sa niente.
 */
/** Letto una volta, all'apertura della pagina: il router poi ripulisce l'indirizzo dai parametri. */
const RICHIESTA: number = (() => {
  try {
    const dev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
    if (!dev || typeof location === "undefined") return 0;
    const dalLink = new URLSearchParams(location.search).get("manoProva");
    if (dalLink !== null) sessionStorage.setItem("gdt-mano-prova", dalLink);
    return Number(sessionStorage.getItem("gdt-mano-prova"));
  } catch {
    return 0;
  }
})();

export function conManoDiProva(mano: readonly Carta[]): readonly Carta[] {
  const n = RICHIESTA;
  if (!Number.isInteger(n) || n <= 0) return mano;
  const mazzo = mazzoCompleto({ sommaPiu2: false, piuUguali: false, taglio: false, scambioRotazione: true });
  // Ordine mescolato in modo fisso, così la prova si ripete uguale.
  const extra = Array.from({ length: Math.min(n, 150) }, (_, i) => ({ ...mazzo[(i * 37) % mazzo.length]!, id: 1000 + i }));
  return [...mano, ...extra];
}
