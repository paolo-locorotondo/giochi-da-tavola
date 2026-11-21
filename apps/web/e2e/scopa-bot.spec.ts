import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

async function iniziaContro(page: Page, posti: 2 | 4 = 2) {
  await page.goto("/scopa");
  await page.getByRole("button", { name: /Contro i bot/ }).click();
  await page.getByLabel("Il tuo nome").fill("Anna");
  if (posti === 4) await page.getByRole("radio", { name: /In 4, a coppie/ }).check();
  await page.getByRole("radio", { name: /Veloce/ }).check();
  await page.getByRole("radio", { name: /Facile/ }).check();
}

test("scopa contro i bot: creazione con posti, livello e soglia", async ({ page }) => {
  await iniziaContro(page, 4);
  await expect(page.getByLabel("Nome del bot compagno")).toHaveValue("Bot 2");
  // iniziaContro ha scelto Facile; il livello di base («Medio») si vede sulla pagina di partenza.
  await expect(page.getByRole("radio", { name: /Facile/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Medio/ })).not.toBeChecked();
  await expect(page.getByRole("radio", { name: /11 punti/ })).toBeChecked();
  await schermata(page, "bot-crea");
});

test("scopa contro i bot: la partita si gioca da sola fino alla fine (anche offline)", async ({ page, context }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await expect(page.getByRole("group", { name: /La tua mano|Tua mano/ }).or(page.getByRole("heading", { name: "La tua mano" }))).toBeVisible();
  await controllaMobile(page);

  for (let i = 0; i < 1500; i++) {
    if (await page.getByRole("heading", { name: "Partita finita" }).isVisible()) break;
    const prossimo = page.getByRole("button", { name: "Prossimo round" });
    if (await prossimo.isVisible()) {
      await prossimo.click().catch(() => {});
      continue;
    }
    const presa = page.locator(".sc-combinazione").first();
    if (await presa.isVisible()) {
      await presa.click().catch(() => {});
      continue;
    }
    const carta = page.locator(".sc-mano button:not(:disabled)").first();
    if (await carta.isVisible()) await carta.click({ timeout: 1000 }).catch(() => {});
    else await page.waitForTimeout(100);
  }
  await expect(page.getByRole("heading", { name: "Partita finita" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ricomincia" })).toBeVisible();
  await controllaMobile(page);
});

test("scopa: la scelta della presa mostra le prese e annulla", async ({ page }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  for (let i = 0; i < 1500; i++) {
    if (await page.locator(".sc-presa").isVisible()) break;
    const prossimo = page.getByRole("button", { name: "Prossimo round" });
    if (await prossimo.isVisible()) await prossimo.click().catch(() => {});
    const carta = page.locator(".sc-mano button:not(:disabled)").first();
    if (await carta.isVisible()) await carta.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(60);
  }
  await expect(page.locator(".sc-presa")).toBeVisible();
  await expect(page.getByRole("button", { name: /Prendi/ }).first()).toBeVisible();
  await schermata(page, "bot-scelta-presa");
  await page.getByRole("button", { name: "Annulla" }).click();
  await expect(page.locator(".sc-presa")).toHaveCount(0);
});

test("scopa: «Come giocate?» ha le due modalità", async ({ page }) => {
  await page.goto("/scopa");
  await expect(page.getByRole("heading", { name: "Come giocate?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Contro i bot/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ognuno col suo telefono/ })).toBeVisible();
  await schermata(page, "scelta-modalita");
});
