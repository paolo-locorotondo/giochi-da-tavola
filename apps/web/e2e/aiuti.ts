import { expect, type Page } from "@playwright/test";

/** Rende deterministico Math.random: i semi delle partite (e quindi parole, ruoli, ordine) non cambiano tra le esecuzioni. */
export async function fissaCaso(page: Page) {
  await page.addInitScript(() => {
    let x = 12345;
    Math.random = () => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 2 ** 32;
    };
  });
}

/** Vale per ogni schermata: niente scorrimento orizzontale e bersagli toccabili di almeno 44 px d'altezza. */
export async function controllaMobile(page: Page) {
  const larghezze = await page.evaluate(() => ({
    contenuto: document.documentElement.scrollWidth,
    finestra: window.innerWidth,
  }));
  expect(larghezze.contenuto, "scorrimento orizzontale").toBeLessThanOrEqual(larghezze.finestra);

  const piccoli = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button:not(.piccolo), select")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ h: e.getBoundingClientRect().height, t: (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 30) }))
      .filter(({ h }) => h < 44)
      .map(({ t }) => t),
  );
  expect(piccoli, "bersagli sotto i 44 px").toEqual([]);
}

/** Controlli di consegna + confronto con lo screenshot di riferimento (uno per tema: vedi i progetti in playwright.config.ts). */
export async function schermata(page: Page, nome: string, opzioni: { maschera?: string[] } = {}) {
  await controllaMobile(page);
  await expect(page).toHaveScreenshot(`${nome}.png`, {
    fullPage: true,
    mask: (opzioni.maschera ?? []).map((s) => page.locator(s)),
  });
}
