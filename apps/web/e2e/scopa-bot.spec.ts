import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";
import { manoScopa, passoScopa, prendibiliScopa, terraScopa } from "./scopa-aiuti";

/** Lo screenshot a pagina intera dipende da dove è scorsa la pagina (la barra in alto è sticky): si parte sempre dall'alto. */
async function schermataDallAlto(page: Page, nome: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await schermata(page, nome);
}

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
 * «somma» = più carte a terra si possono prendere, «posa» = nessuna presa («Posa qui»), «una» = una sola carta.
 * Lascia la carta scelta (primo tocco fatto).
 */
async function finoACarta(page: Page, tipo: "somma" | "posa" | "una"): Promise<void> {
  for (let i = 0; i < 1500; i++) {
    const prossimo = page.getByRole("button", { name: "Prossimo round" });
    if (await prossimo.isVisible()) await prossimo.click({ timeout: 1000 }).catch(() => {});
    const carte = manoScopa(page);
    const n = await carte.count();
    for (let k = 0; k < n; k++) {
      await carte.nth(k).click({ timeout: 1000 }).catch(() => {});
      const posa = await page.locator(".cg-segnaposto").isVisible();
      const evid = await prendibiliScopa(page).count();
      if ((tipo === "somma" && evid > 1) || (tipo === "posa" && posa) || (tipo === "una" && !posa && evid === 1)) return;
      // Non è quella cercata: la si deseleziona.
      await carte.nth(k).click({ timeout: 1000 }).catch(() => {});
    }
    // Nessuna carta adatta: si gioca la prima per far avanzare la partita.
    if (n > 0) {
      for (let j = 0; j < 6 && (await passoScopa(page)); j++) await page.waitForTimeout(30);
    }
    await page.waitForTimeout(60);
  }
  throw new Error(`nessuna carta di tipo ${tipo}`);
}

test("scopa: più carte prendibili, si evidenziano e «Conferma» parte solo con una presa completa", async ({ page }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await finoACarta(page, "somma");
  await expect(page.locator(".cg-mano button[aria-pressed=true]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Conferma" })).toBeDisabled();
  await expect(page.locator(".cg-segnaposto")).toHaveCount(0);
  expect(await prendibiliScopa(page).count()).toBeGreaterThan(1);
  await schermataDallAlto(page, "bot-scelta-presa");
  // Annullare: «Annulla» lascia la carta in mano.
  await page.getByRole("button", { name: "Annulla" }).click();
  await expect(page.locator(".cg-mano button[aria-pressed=true]")).toHaveCount(0);
  await expect(prendibiliScopa(page)).toHaveCount(0);
  // Una carta sul tavolo non evidenziata non fa niente.
  await finoACarta(page, "somma");
  const prima = await terraScopa(page).count();
  const fuori = page.locator(".cg-zona button.cg-carta:not(.cg-evid)").first();
  if (await fuori.count()) {
    await fuori.click();
    await expect(page.getByText("Non puoi prendere questa carta con quella scelta.")).toBeVisible();
    await expect(terraScopa(page)).toHaveCount(prima);
  }
  // Si toccano le carte una a una: la mossa parte solo con «Conferma».
  const manoPrima = await page.locator(".cg-mano button.cg-carta").count();
  const conferma = page.getByRole("button", { name: "Conferma" });
  for (let j = 0; j < 8 && !(await conferma.isEnabled()); j++) await prendibiliScopa(page).first().click();
  await expect(conferma).toBeEnabled();
  await expect(page.locator(".cg-mano button.cg-carta")).toHaveCount(manoPrima);
  await conferma.click();
  await expect(page.locator(".cg-mano button[aria-pressed=true]")).toHaveCount(0);
  await expect.poll(() => page.locator(".cg-mano button.cg-carta").count()).not.toBe(manoPrima + 1);
});

test("scopa: nessuna presa, «Posa qui» sul tavolo conferma la mossa", async ({ page }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await finoACarta(page, "posa");
  await expect(prendibiliScopa(page)).toHaveCount(0);
  await expect(page.getByText("Con questa carta non prendi niente: tocca «Posa qui» sul tavolo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Conferma" })).toHaveCount(0);
  await schermataDallAlto(page, "bot-posa-a-terra");
  const tavolo = await terraScopa(page).count();
  await page.getByRole("button", { name: "Posa qui" }).click();
  await expect(page.locator(".cg-segnaposto")).toHaveCount(0);
  await expect.poll(() => terraScopa(page).count()).toBeGreaterThanOrEqual(tavolo);
});

test("scopa: una sola carta prendibile, la tocchi e poi «Conferma»", async ({ page }) => {
  test.setTimeout(240_000);
  await iniziaContro(page, 2);
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await finoACarta(page, "una");
  await expect(page.getByRole("button", { name: "Conferma" })).toBeDisabled();
  await schermataDallAlto(page, "bot-una-presa");
  await prendibiliScopa(page).first().click();
  await expect(page.getByRole("button", { name: "Conferma" })).toBeEnabled();
  await page.getByRole("button", { name: "Conferma" }).click();
  await expect(page.locator(".cg-mano button[aria-pressed=true]")).toHaveCount(0);
});

test("scopa: «Come giocate?» ha le due modalità", async ({ page }) => {
  await page.goto("/scopa");
  await expect(page.getByRole("heading", { name: "Come giocate?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Contro i bot/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ognuno col suo telefono/ })).toBeVisible();
  await schermata(page, "scelta-modalita");
});
