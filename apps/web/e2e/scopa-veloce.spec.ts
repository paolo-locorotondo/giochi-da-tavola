import { expect, test, type Browser, type Page } from "@playwright/test";
import { fissaCaso, schermata, betaLetto } from "./aiuti";

// Le stanze veloci aperte sono condivise dal server: questi test girano uno alla volta
// (progetto «coda-*», vedi playwright.config.ts).
test.describe.configure({ mode: "serial" });
test.beforeEach(({ page }) => fissaCaso(page));

const telefono = { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true };
const MASCHERE = ["[role=timer]", ".sv-riepilogo"];

async function telefoni(browser: Browser, n: number) {
  const contesti = await Promise.all(Array.from({ length: n }, () => browser.newContext(telefono)));
  await Promise.all(contesti.map(betaLetto));
  const pagine = await Promise.all(contesti.map((c) => c.newPage()));
  return { pagine, chiudi: () => Promise.all(contesti.map((c) => c.close())) };
}

async function allaPartitaVeloce(p: Page, nome: string) {
  await p.goto("/scopa");
  await p.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await p.getByRole("button", { name: "Partita veloce" }).click();
  await p.getByLabel("Il tuo nome").fill(nome);
}

/** Il riepilogo ha il codice della stanza (casuale): con una riga o due l'altezza cambierebbe, quindi lo si fissa. */
const fissaRiepilogo = (p: Page) => p.locator(".sv-riepilogo").evaluate((e) => (e.textContent = "Riepilogo"));

/** Chiude la stanza d'attesa: le stanze aperte sono condivise dal server e non devono restare ai test dopo. */
async function chiudiSala(p: Page) {
  await p.getByRole("button", { name: "Chiudi la stanza" }).click();
  await p.getByRole("button", { name: "Sì, chiudi" }).click();
  await expect(p.getByRole("heading", { name: "Sala d'attesa" })).toHaveCount(0);
}

test("scopa veloce: «Partita veloce» sta in cima, prima di «Ho un codice»", async ({ page }) => {
  await page.goto("/scopa");
  await page.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  const bottoni = await page.locator("form button").allTextContents();
  expect(bottoni[0]).toBe("Partita veloce");
  expect(bottoni[1]).toMatch(/Ho un codice/);
});

test("scopa veloce a 4: Anna apre a 21 punti, altri tre entrano, coppie 1+3 e 2+4, parte da sola", async ({ browser }) => {
  test.setTimeout(120_000);
  const { pagine, chiudi } = await telefoni(browser, 4);
  const [anna, bruno, carla, dino] = pagine as [Page, Page, Page, Page];
  try {
    await allaPartitaVeloce(anna, "Anna");
    // Nessuna stanza aperta: impostazioni per aprirne una.
    await expect(anna.getByRole("button", { name: "Apri una stanza veloce" })).toBeVisible();
    await anna.getByRole("radio", { name: "4", exact: true }).check();
    await anna.getByRole("radio", { name: /21 punti/ }).check();
    await anna.getByRole("radio", { name: "In ordine di arrivo" }).check();
    await anna.getByRole("radio", { name: "5 min" }).check();
    await schermata(anna, "veloce-apertura");
    await anna.getByRole("button", { name: "Apri una stanza veloce" }).click();
    await expect(anna.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();
    await expect(anna.getByText("Aspetto altri 3 giocatori")).toBeVisible();
    // Una stanza da 4 non parte con meno giocatori: niente «Apri adesso».
    await expect(anna.getByRole("button", { name: /Apri adesso/ })).toHaveCount(0);
    await expect(anna).toHaveURL(/\/scopa\/[A-Z0-9]{5}$/);

    // Bruno vede l'anteprima con le impostazioni scelte da Anna ed entra.
    await allaPartitaVeloce(bruno, "Bruno");
    await expect(bruno.getByRole("heading", { name: "Stanza di Anna" })).toBeVisible();
    await expect(bruno.getByText("1 posto su 4")).toBeVisible();
    await expect(bruno.getByText(/In 4 · a 21 punti/)).toBeVisible();
    await schermata(bruno, "veloce-anteprima");
    await bruno.getByRole("button", { name: "Entra nella stanza" }).click();
    await expect(bruno.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();

    await allaPartitaVeloce(carla, "Carla");
    await carla.getByRole("button", { name: "Entra nella stanza" }).click();
    await expect(anna.getByText("Aspetto un altro giocatore")).toBeVisible();
    // Le squadre si vedono in sala: Anna + Carla contro Bruno + (chi arriva).
    await expect(anna.getByText("Squadra A")).toBeVisible();
    await fissaRiepilogo(anna);
    await fissaRiepilogo(bruno);
    await schermata(anna, "veloce-sala-organizzatore", { maschera: MASCHERE });
    await schermata(bruno, "veloce-sala-ospite", { maschera: MASCHERE });

    await allaPartitaVeloce(dino, "Dino");
    await dino.getByRole("button", { name: "Entra nella stanza" }).click();
    for (const p of pagine) await expect(p.getByRole("heading", { name: "La tua mano" })).toBeVisible();
    await expect(anna.locator(".sc-mano button")).toHaveCount(3);
  } finally {
    await chiudi();
  }
});

test("scopa veloce a 2: senza squadre, parte da sola al secondo arrivo", async ({ browser }) => {
  const { pagine, chiudi } = await telefoni(browser, 2);
  const [anna, bruno] = pagine as [Page, Page];
  try {
    await allaPartitaVeloce(anna, "Anna");
    await anna.getByRole("radio", { name: "2", exact: true }).check();
    await expect(anna.getByText("Squadre", { exact: true })).toHaveCount(0);
    await anna.getByRole("button", { name: "Apri una stanza veloce" }).click();
    await expect(anna.getByText("Aspetto un altro giocatore")).toBeVisible();
    await allaPartitaVeloce(bruno, "Bruno");
    await bruno.getByRole("button", { name: "Entra nella stanza" }).click();
    for (const p of pagine) await expect(p.getByRole("heading", { name: "La tua mano" })).toBeVisible();
  } finally {
    await chiudi();
  }
});

test("scopa veloce: la sala sopravvive a un refresh e la chiude l'organizzatore", async ({ browser }) => {
  const { pagine, chiudi } = await telefoni(browser, 2);
  const [anna, pippo] = pagine as [Page, Page];
  try {
    await allaPartitaVeloce(anna, "Anna");
    await anna.getByRole("radio", { name: "4", exact: true }).check();
    await anna.getByRole("button", { name: "Apri una stanza veloce" }).click();
    await expect(anna.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();
    await allaPartitaVeloce(pippo, "Pippo");
    await pippo.getByRole("button", { name: "Entra nella stanza" }).click();
    await expect(anna.getByText("Aspetto altri 2 giocatori")).toBeVisible();
    await pippo.goto("/scopa");
    await pippo.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
    await pippo.getByRole("button", { name: "Partita veloce" }).click();
    await expect(pippo.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();
    await expect(anna.getByText("Pippo (2)")).toHaveCount(0);
    await chiudiSala(anna);
  } finally {
    await chiudi();
  }
});
