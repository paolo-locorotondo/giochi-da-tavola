import { expect, test } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

async function iniziaContro(page: import("@playwright/test").Page, bot = 2) {
  await page.goto("/ultima");
  await page.getByRole("button", { name: /Contro i bot/ }).click();
  await page.getByLabel("Il tuo nome").fill("Anna");
  for (let i = 1; i < bot; i++) await page.getByRole("button", { name: "Aggiungi un bot" }).click();
}

test("ultima contro i bot: creazione con livello, velocità e nomi dei bot", async ({ page }) => {
  await iniziaContro(page, 2);
  await expect(page.getByLabel("Nome del bot 1")).toHaveValue("Bot 1");
  await expect(page.getByLabel("Nome del bot 2")).toHaveValue("Bot 2");
  await page.getByLabel("Nome del bot 2").fill("Gigi");
  await expect(page.getByRole("radio", { name: /Medio/ })).toBeChecked();
  await schermata(page, "bot-crea");
  // Da 1 a 9 bot: il decimo giocatore non c'è.
  for (let i = 0; i < 8; i++) if (await page.getByRole("button", { name: "Aggiungi un bot" }).isVisible()) await page.getByRole("button", { name: "Aggiungi un bot" }).click();
  await expect(page.getByRole("button", { name: "Aggiungi un bot" })).toHaveCount(0);
  await controllaMobile(page);
});

test("ultima contro i bot: la partita si gioca da sola fino alla fine (anche offline)", async ({ page, context }) => {
  test.setTimeout(120_000);
  await iniziaContro(page, 2);
  await page.getByRole("radio", { name: /Facile/ }).check();
  await page.getByRole("radio", { name: /Veloce/ }).check();
  // Dopo il caricamento non serve più la rete: i bot giocano sul telefono.
  await context.setOffline(true);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await expect(page.getByRole("group", { name: "La tua mano" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Simula mossa col bot/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sollecita/ })).toHaveCount(0);
  await controllaMobile(page);

  // Gioco io: un bot «difficile» scelto dal mio turno non c\u2019è, quindi pesco/passo/gioco la prima carta lecita.
  for (let i = 0; i < 600; i++) {
    if (await page.getByText("Partita finita").isVisible()) break;
    const gioca = page.locator(".ul-mano button.ul-carta:not([aria-disabled=true])").first();
    if (await page.getByRole("button", { name: "Ultima!" }).isVisible()) await page.getByRole("button", { name: "Ultima!" }).click().catch(() => {});
    else if (await page.getByRole("button", { name: "Pesca 4" }).isVisible()) await page.getByRole("button", { name: "Pesca 4" }).click().catch(() => {});
    else if (await page.locator(".ul-colori").first().isVisible()) await page.locator(".ul-colori button").first().click().catch(() => {});
    else if (await gioca.isVisible()) await gioca.click({ timeout: 1000 }).catch(() => {});
    else if (await page.getByRole("button", { name: "Passa" }).isVisible()) await page.getByRole("button", { name: "Passa" }).click().catch(() => {});
    else if (await page.getByRole("button", { name: /^Pesca/ }).isEnabled().catch(() => false)) await page.getByRole("button", { name: /^Pesca/ }).click().catch(() => {});
    else await page.waitForTimeout(100);
  }
  await expect(page.getByText("Partita finita")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ricomincia" })).toBeVisible();
  await controllaMobile(page);
  await page.getByRole("button", { name: "Esci dalla partita" }).click();
  await page.getByRole("button", { name: "Sì, esci" }).click();
  await expect(page.getByRole("button", { name: "Inizia la partita" })).toBeVisible();
});

test("ultima: «Come giocate?» ha le due modalità", async ({ page }) => {
  await page.goto("/ultima");
  await expect(page.getByRole("button", { name: /Contro i bot/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ognuno col suo telefono/ })).toBeVisible();
  await schermata(page, "modalita");
});
