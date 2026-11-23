import type { Page } from "@playwright/test";

/** Le carte della mia mano che si possono toccare (Mano di @gdt/carte). */
export const manoScopa = (page: Page) => page.locator(".cg-mano button.cg-carta:not(:disabled)");
/** Le carte a terra che si possono prendere con la carta scelta (evidenziate). */
export const prendibiliScopa = (page: Page) => page.locator(".cg-zona button.cg-evid");
/** Tutte le carte a terra (pulsanti con una carta della mano scelta, immagini altrimenti). */
export const terraScopa = (page: Page) => page.locator(".cg-zona .cg-carta");

/**
 * Una mossa di Scopa, per i test che giocano da soli. Ogni chiamata fa un passo:
 * - nessuna carta scelta: tocca la prima carta della mano;
 * - carta scelta senza prese: «Posa qui» sul tavolo;
 * - carta scelta con prese: «Conferma» se è attivo, altrimenti tocca una carta a terra evidenziata.
 * Torna true se ha toccato qualcosa.
 */
export async function passoScopa(page: Page): Promise<boolean> {
  const tocca = async (l: ReturnType<Page["locator"]>, i = 0) => {
    const n = await l.count();
    if (n === 0 || !(await l.nth(i % n).isVisible())) return false;
    await l.nth(i % n).click({ timeout: 1000 }).catch(() => {});
    return true;
  };
  const scelta = (await page.locator(".cg-mano button[aria-pressed=true]").count()) > 0;
  if (scelta) {
    if (await tocca(page.locator(".cg-segnaposto"))) return true;
    const conferma = page.getByRole("button", { name: "Conferma" });
    if ((await conferma.isVisible()) && (await conferma.isEnabled())) return tocca(conferma);
    // Un tocco sbagliato (carta non compatibile con quelle già toccate) fa ripartire la presa: se si toccasse sempre la
    // prima carta evidenziata si potrebbe oscillare all'infinito, quindi l'indice ruota a ogni passo.
    return tocca(prendibiliScopa(page), giro.get(page) ?? 0).finally(() => giro.set(page, (giro.get(page) ?? 0) + 1));
  }
  giro.set(page, 0);
  return tocca(manoScopa(page));
}

/** Quanti tocchi a terra sono stati fatti con la carta scelta (per ruotare la carta toccata). */
const giro = new WeakMap<Page, number>();
