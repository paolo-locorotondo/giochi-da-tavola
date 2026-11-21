import { expect, test, type Browser, type Page } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

const telefono = { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true };
const NOMI = ["Anna", "Bruno", "Carla", "Dario"];

/** Quattro telefoni nella stessa stanza, tutti seduti. L'organizzatore è Anna; Anna e Carla sono compagne. */
async function stanza(browser: Browser) {
  const contesti = await Promise.all(NOMI.map(() => browser.newContext(telefono)));
  const pagine = await Promise.all(contesti.map((c) => c.newPage()));
  const [host] = pagine as [Page, ...Page[]];
  await host.goto("/burraco");
  await host.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await host.getByLabel(/Nome del giocatore 1/).fill("Anna");
  await host.getByLabel(/Nome del giocatore 2/).fill("Bruno");
  await host.getByLabel(/Nome del giocatore 3/).fill("Carla");
  await host.getByLabel(/Nome del giocatore 4/).fill("Dario");
  await host.getByRole("button", { name: "Crea la partita" }).click();
  await host.getByRole("button", { name: "Anna", exact: true }).click();
  await expect(host).toHaveURL(/\/burraco\/[A-Z0-9]{5}$/);
  const codice = host.url().split("/").pop()!;
  for (const i of [1, 2, 3]) {
    await pagine[i]!.goto(`/burraco/${codice}`);
    await pagine[i]!.getByRole("button", { name: NOMI[i]!, exact: true }).click();
  }
  return { pagine, host, contesti };
}

test("burraco online: creazione a 4 con squadre", async ({ page }) => {
  await page.goto("/burraco");
  await page.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await expect(page.getByLabel(/Nome del giocatore 1 · squadra 1/)).toBeVisible();
  await expect(page.getByLabel(/Nome del giocatore 2 · squadra 2/)).toBeVisible();
  await page.getByRole("radio", { name: /In 2/ }).check();
  await expect(page.getByLabel(/Nome del giocatore 3/)).toHaveCount(0);
  await controllaMobile(page);
});

test("burraco online: quattro telefoni, mano segreta, bot e mano finita", async ({ browser }) => {
  test.setTimeout(240_000);
  const { pagine, host, contesti } = await stanza(browser);
  try {
    await expect(host.getByRole("button", { name: "Inizia la partita" })).toBeEnabled();
    await expect(pagine[1]!.getByText("L'organizzatore avvierà la partita.")).toBeVisible();
    await host.getByRole("button", { name: "Inizia la partita" }).click();
    for (const p of pagine) await expect(p.getByText(/La tua mano: 11 carte/)).toBeVisible();
    // Ognuno vede solo le proprie carte e i nomi di tutti.
    await expect(pagine[1]!.getByText("Anna")).toBeVisible();
    await expect(pagine[1]!.getByRole("button", { name: /Sollecita/ })).toHaveCount(0);
    await controllaMobile(pagine[1]!);
    await schermata(host, "partita");

    // L'organizzatore fa giocare il bot un passo alla volta fino a fine mano (una sola mano).
    const bot = host.getByRole("button", { name: /^Simula mossa col bot/ });
    for (let i = 0; i < 2500; i++) {
      if (await host.getByRole("heading", { name: /Partita finita|Mano finita/ }).first().isVisible()) break;
      if (await bot.isVisible()) await bot.click({ timeout: 2000 }).catch(() => {});
      else await host.waitForTimeout(40);
    }
    await expect(host.getByRole("heading", { name: /Partita finita|Mano finita/ }).first()).toBeVisible();
    await expect(pagine[2]!.getByRole("table", { name: /Punti della mano/ })).toBeVisible();
    await controllaMobile(host);
  } finally {
    await Promise.all(contesti.map((c) => c.close()));
  }
});
