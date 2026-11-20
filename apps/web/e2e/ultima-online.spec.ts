import { expect, test, type Browser, type Page } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

const telefono = { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true };

/** Tre telefoni nella stessa stanza «Anna / Bruno / Carla», tutti seduti. L'organizzatore è Anna. */
async function stanza(browser: Browser, config: { punti?: number } = {}) {
  const contesti = await Promise.all([1, 2, 3].map(() => browser.newContext(telefono)));
  const [host, bruno, carla] = await Promise.all(contesti.map((c) => c.newPage()));
  await host!.goto("/ultima");
  await host!.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await host!.getByLabel("Nome del giocatore 1").fill("Anna");
  await host!.getByLabel("Nome del giocatore 2").fill("Bruno");
  await host!.getByRole("button", { name: "Aggiungi un giocatore" }).click();
  await host!.getByLabel("Nome del giocatore 3").fill("Carla");
  if (config.punti) {
    await host!.getByRole("radio", { name: /Partita a punti/ }).check();
    await host!.getByLabel("Punti per vincere").fill(String(config.punti));
  }
  await host!.getByRole("button", { name: "Crea la partita" }).click();
  await host!.getByRole("button", { name: "Anna", exact: true }).click();
  await expect(host!).toHaveURL(/\/ultima\/[A-Z0-9]{5}$/);
  const codice = host!.url().split("/").pop()!;
  for (const [p, nome] of [[bruno!, "Bruno"], [carla!, "Carla"]] as const) {
    await p.goto(`/ultima/${codice}`);
    await p.getByRole("button", { name: nome, exact: true }).click();
  }
  return { host: host!, bruno: bruno!, carla: carla!, contesti };
}

/** L'organizzatore fa giocare il bot finché il round (o la partita) finisce. */
async function giocaConBot(host: Page, finale: RegExp) {
  const bot = host.getByRole("button", { name: /^Simula mossa col bot/ });
  for (let i = 0; i < 800; i++) {
    if (await host.getByText(finale).first().isVisible()) return;
    if (await bot.isVisible()) await bot.click({ timeout: 2000 }).catch(() => {});
    else await host.waitForTimeout(50);
  }
  throw new Error("la partita non è finita");
}

test("ultima: creazione e sala d'attesa", async ({ page }) => {
  await page.goto("/ultima");
  await page.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await page.getByLabel("Nome del giocatore 1").fill("Anna");
  await page.getByLabel("Nome del giocatore 2").fill("Bruno");
  await expect(page.getByRole("button", { name: "Crea la partita" })).toBeEnabled();
  await schermata(page, "crea");
  await page.getByRole("radio", { name: /Partita a punti/ }).check();
  await expect(page.getByLabel("Punti per vincere")).toHaveValue("500");
  await controllaMobile(page);
});

test("ultima: tre telefoni, mano segreta, bot e round finito", async ({ browser }) => {
  const { host, bruno, carla, contesti } = await stanza(browser);
  try {
    await expect(host.getByRole("button", { name: "Inizia la partita" })).toBeEnabled();
    await expect(bruno.getByText("L'organizzatore avvierà la partita.")).toBeVisible();
    await host.getByRole("button", { name: "Inizia la partita" }).click();

    // Ognuno vede solo la propria mano: 7 carte (9 se la prima carta è un +2 per Anna).
    for (const [p, n] of [[host, "Anna"], [bruno, "Bruno"], [carla, "Carla"]] as const) {
      const mano = p.getByRole("group", { name: "La tua mano" }).locator(".ul-carta");
      await expect(mano.first()).toBeVisible();
      const quante = await mano.count();
      expect([7, 9]).toContain(quante);
      await expect(p.getByText(n, { exact: false }).first()).toBeVisible();
    }
    // Il pulsante del bot lo vede solo l'organizzatore.
    await expect(host.getByRole("button", { name: /^Simula mossa col bot/ })).toBeVisible();
    await expect(bruno.getByRole("button", { name: /Simula mossa col bot/ })).toHaveCount(0);
    await expect(carla.getByRole("button", { name: /Simula mossa col bot/ })).toHaveCount(0);
    await controllaMobile(bruno);

    await giocaConBot(host, /Partita finita/);
    await expect(host.getByText(/ha vinto!|Hai vinto!/).first()).toBeVisible();
    await expect(bruno.getByText(/ha vinto!|Hai vinto!/).first()).toBeVisible();
    await expect(host.getByRole("button", { name: "Ricomincia" })).toBeVisible();
    await expect(bruno.getByRole("button", { name: "Ricomincia" })).toHaveCount(0);
    await controllaMobile(host);

    await host.getByRole("button", { name: "Ricomincia" }).click();
    await expect(host.getByText("Round 1")).toBeVisible();
  } finally {
    await Promise.all(contesti.map((c) => c.close()));
  }
});

test("ultima: partita a punti, prossimo round e chiusura", async ({ browser }) => {
  const { host, bruno, contesti } = await stanza(browser, { punti: 2000 });
  try {
    await host.getByRole("button", { name: "Inizia la partita" }).click();
    await giocaConBot(host, /Round finito/);
    await expect(host.getByRole("button", { name: "Prossimo round" })).toBeVisible();
    await expect(bruno.getByText("L'organizzatore avvierà il prossimo round.")).toBeVisible();
    await host.getByRole("button", { name: "Prossimo round" }).click();
    await expect(host.getByText(/^Round 2/)).toBeVisible();

    await host.getByRole("button", { name: "Chiudi la partita" }).click();
    await host.getByRole("button", { name: "Sì, chiudi" }).click();
    await expect(bruno.getByText("Partita chiusa")).toBeVisible();
  } finally {
    await Promise.all(contesti.map((c) => c.close()));
  }
});
