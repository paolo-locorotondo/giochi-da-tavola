import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

async function apri(page: Page) {
  await page.goto("/burraco");
  await page.getByRole("button", { name: /Contro i bot/ }).click();
  await page.getByLabel("Il tuo nome").fill("Anna");
}

test("burraco contro i bot: creazione con giocatori, livello, punti e scarti", async ({ page }) => {
  await apri(page);
  await expect(page.getByRole("radio", { name: /In 2/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Medio/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /2005 punti/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Sempre liberi/ })).toBeChecked();
  await schermata(page, "bot-crea");
  await expect(page.getByRole("radio", { name: /In 4, a coppie/ })).toBeVisible();
});

test("burraco contro i bot: una mano a 4 si gioca fino in fondo, anche offline", async ({ page, context }) => {
  test.setTimeout(360_000);
  await apri(page);
  await page.getByRole("radio", { name: /In 4, a coppie/ }).check();
  await page.getByRole("radio", { name: /Facile/ }).check();
  await page.getByRole("radio", { name: /Veloce/ }).check();
  await page.getByRole("radio", { name: /Una sola mano/ }).check();
  // Dopo il caricamento non serve più la rete: i bot giocano sul telefono.
  await context.setOffline(true);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await expect(page.getByText(/La tua mano: 11 carte/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Simula mossa col bot/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sollecita/ })).toHaveCount(0);
  await controllaMobile(page);

  // Io: pesco, scarto la prima carta. I bot (anche il mio compagno) fanno il resto.
  // Un limite di tempo (non di giri) e una sola attesa per giro: il test non resta mai appeso.
  const finita = page.getByRole("heading", { name: "Partita finita" });
  const inizio = Date.now();
  while (Date.now() - inizio < 240_000 && !(await finita.isVisible())) {
    await page
      .getByText(/Partita finita|Tocca a te/)
      .first()
      .waitFor({ state: "visible", timeout: 3000 })
      .catch(() => {});
    if (await finita.isVisible()) break;
    const pesca = page.getByRole("button", { name: "Pesca", exact: true });
    if (await pesca.isEnabled().catch(() => false)) {
      await pesca.click({ timeout: 1000 }).catch(() => {});
      continue;
    }
    if (await page.getByText(/Tocca a te: cala, attacca o scarta/).isVisible().catch(() => false)) {
      const prima = page.locator(".cg-griglia button").first();
      if ((await prima.getAttribute("aria-pressed").catch(() => null)) === "false") await prima.click({ timeout: 1000 }).catch(() => {});
      const scarta = page.getByRole("button", { name: /^Scarta |^Chiudi la mano/ });
      if (await scarta.isEnabled().catch(() => false)) await scarta.click({ timeout: 1000 }).catch(() => {});
      const si = page.getByRole("button", { name: "Sì, chiudi" });
      if (await si.isVisible().catch(() => false)) await si.click({ timeout: 1000 }).catch(() => {});
    }
  }
  await expect(page.getByRole("heading", { name: "Partita finita" })).toBeVisible();
  await expect(page.getByRole("table", { name: /Punti della mano/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ricomincia" })).toBeVisible();
  await controllaMobile(page);
  await page.getByRole("button", { name: "Esci dalla partita" }).click();
  await page.getByRole("button", { name: "Sì, esci" }).click();
  await expect(page.getByRole("button", { name: "Inizia la partita" })).toBeVisible();
});

test("burraco: «Come giocate?» ha le due modalità", async ({ page }) => {
  await page.goto("/burraco");
  await expect(page.getByRole("button", { name: /Contro i bot/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ognuno col suo telefono/ })).toBeVisible();
  await controllaMobile(page);
});
