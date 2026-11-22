import type { Page } from "@playwright/test";

/**
 * Una mossa di Scopa a due tocchi, per i test che giocano da soli. Ogni chiamata fa un passo:
 * - nessuna carta scelta: tocca la prima carta della mano;
 * - carta scelta con più prese: tocca il pulsante della prima presa ancora possibile;
 * - carta scelta con una presa: tocca la carta evidenziata sul tavolo;
 * - carta scelta senza prese: «Posa a terra».
 * Torna true se ha toccato qualcosa.
 */
export async function passoScopa(page: Page): Promise<boolean> {
  const tocca = async (l: ReturnType<Page["locator"]>) => {
    if (!(await l.first().isVisible())) return false;
    await l.first().click({ timeout: 1000 }).catch(() => {});
    return true;
  };
  if (await page.locator(".sc-presa").isVisible()) {
    if (await tocca(page.locator(".sc-combinazione"))) return true;
    if (await tocca(page.locator(".sc-carte-tavolo button.cg-evid"))) return true;
    return tocca(page.locator(".sc-posa:not(:disabled)"));
  }
  return tocca(page.locator(".sc-mano button:not(:disabled)"));
}
