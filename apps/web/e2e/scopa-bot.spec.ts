import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";
import { passoScopa } from "./scopa-aiuti";

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
      await prossimo.click({ timeout: 1000 }).catch(() => {});
      continue;
    }
    if (!(await passoScopa(page))) await page.waitForTimeout(100);
  }
  await expect(page.getByRole("heading", { name: "Partita finita" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ricomincia" })).toBeVisible();
  await controllaMobile(page);
});

/**
 * Gioca fino a un tuo turno in cui una carta della mano ha lo stato cercato:
 * «somma» = più prese possibili, «posa» = nessuna presa, «una» = una presa sola.
 * Lascia la carta scelta (primo tocco fatto) e torna il suo indice.
 */
async function finoACarta(page: Page, tipo: "somma" | "posa" | "una"): Promise<void> {
  for (let i = 0; i < 1500; i++) {
    const prossimo = page.getByRole("button", { name: "Prossimo round" });
    if (await prossimo.isVisible()) await prossimo.click({ timeout: 1000 }).catch(() => {});
    const carte = page.locator(".sc-mano button:not(:disabled)");
    const n = await carte.count();
    for (let k = 0; k < n; k++) {
      await carte.nth(k).click({ timeout: 1000 }).catch(() => {});
      const multi = (await page.locator(".sc-combinazione").count()) > 0;
      const posa = await page.locator(".sc-posa:not(:disabled)").isVisible();
      const evid = await page.locator(".sc-carte-tavolo button.cg-evid").count();
      if ((tipo === "somma" && multi) || (tipo === "posa" && posa) || (tipo === "una" && !multi && !posa && evid > 0)) return;
      // Non è quella cercata: la si deseleziona.
      await carte.nth(k).click({ timeout: 1000 }).catch(() => {});
    }
    // Nessuna carta adatta: si gioca la prima per far avanzare la partita.
    if (n > 0) {
      for (let j = 0; j < 4 && (await passoScopa(page)); j++) await page.waitForTimeout(30);
    }
    await page.waitForTimeout(60);
  }
  throw new Error(`nessuna carta di tipo ${tipo}`);
}

test("scopa: più prese possibili, le carte si evidenziano e il secondo tocco fa la presa", async ({ page }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await finoACarta(page, "somma");
  await expect(page.locator(".sc-presa")).toBeVisible();
  await expect(page.locator(".sc-mano button[aria-pressed=true]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Prendi/ }).first()).toBeVisible();
  await expect(page.locator(".sc-posa")).toBeDisabled();
  expect(await page.locator(".sc-carte-tavolo button.cg-evid").count()).toBeGreaterThan(1);
  await schermata(page, "bot-scelta-presa");
  // Annullare: toccare di nuovo la carta, oppure «Annulla».
  await page.getByRole("button", { name: "Annulla" }).click();
  await expect(page.locator(".sc-presa")).toHaveCount(0);
  await expect(page.locator(".sc-carte-tavolo button.cg-evid")).toHaveCount(0);
  // Una carta sul tavolo non evidenziata non fa niente.
  await finoACarta(page, "somma");
  const prima = await page.locator(".sc-carte-tavolo li").count();
  const fuori = page.locator(".sc-carte-tavolo button.cg-carta:not(.cg-evid)").first();
  if (await fuori.count()) {
    await fuori.click();
    await expect(page.getByText("Non puoi prendere questa carta con quella scelta.")).toBeVisible();
    await expect(page.locator(".sc-carte-tavolo li")).toHaveCount(prima);
  }
  // Secondo tocco su una carta evidenziata: si compone la presa e la mossa parte (o resta la scelta tra più prese).
  const manoPrima = await page.locator(".sc-mano button").count();
  await page.locator(".sc-carte-tavolo button.cg-evid").first().click();
  const scelte = page.locator(".sc-combinazione");
  if ((await scelte.count()) > 0) await scelte.first().click();
  await expect(page.locator(".sc-presa")).toHaveCount(0);
  await expect.poll(() => page.locator(".sc-mano button").count()).not.toBe(manoPrima + 1);
});

test("scopa: nessuna presa, «Posa a terra» conferma la mossa", async ({ page }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await finoACarta(page, "posa");
  await expect(page.locator(".sc-carte-tavolo button.cg-evid")).toHaveCount(0);
  await expect(page.getByText("Con questa carta non prendi niente: posala a terra.")).toBeVisible();
  await schermata(page, "bot-posa-a-terra");
  const tavolo = await page.locator(".sc-carte-tavolo li").count();
  await page.getByRole("button", { name: "Posa a terra" }).click();
  await expect(page.locator(".sc-presa")).toHaveCount(0);
  await expect.poll(() => page.locator(".sc-carte-tavolo li").count()).toBeGreaterThanOrEqual(tavolo);
});

test("scopa: una presa sola, un tocco sulla carta a terra e parte da sola", async ({ page }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await finoACarta(page, "una");
  await expect(page.getByRole("button", { name: "Posa a terra" })).toBeDisabled();
  await schermata(page, "bot-una-presa");
  await page.locator(".sc-carte-tavolo button.cg-evid").first().click();
  await expect(page.locator(".sc-presa")).toHaveCount(0);
});

test("scopa: «Come giocate?» ha le due modalità", async ({ page }) => {
  await page.goto("/scopa");
  await expect(page.getByRole("heading", { name: "Come giocate?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Contro i bot/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ognuno col suo telefono/ })).toBeVisible();
  await schermata(page, "scelta-modalita");
});
