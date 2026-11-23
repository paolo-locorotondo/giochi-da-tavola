import { expect, test, type Page } from "@playwright/test";
import { fissaCaso } from "./aiuti";
import { passoScopa } from "./scopa-aiuti";

// Refresh a metà partita: si torna alla stessa partita, senza domande (vedi docs/decisioni.md).
test.beforeEach(({ page }) => fissaCaso(page));

/** Etichette (o testi) degli elementi che corrispondono al selettore: l'impronta di una mano o del tavolo. */
const impronta = (page: Page, selettore: string) =>
  page.locator(selettore).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? (e.textContent ?? "").trim()));

test("scopa contro i bot: dopo il refresh la partita è la stessa e si continua", async ({ page }) => {
  await page.goto("/scopa");
  await page.getByRole("button", { name: /Contro i bot/ }).click();
  await page.getByLabel("Il tuo nome").fill("Anna");
  await page.getByRole("radio", { name: /Veloce/ }).check();
  await page.getByRole("radio", { name: /Facile/ }).check();
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  const miaMano = page.locator(".sc-mano button:not(:disabled)");
  await expect(miaMano.first()).toBeVisible({ timeout: 15_000 });
  // Qualche mossa mia (con i bot in mezzo).
  for (let i = 0; i < 6; i++) {
    await expect(miaMano.first()).toBeVisible({ timeout: 15_000 });
    await passoScopa(page);
    await page.waitForTimeout(300);
  }
  await expect(miaMano.first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".sc-presa")).toHaveCount(0);
  const mano = await impronta(page, ".sc-mano button");
  const tavolo = await impronta(page, ".sc-carte-tavolo button");
  expect(mano.length).toBeGreaterThan(0);

  await page.reload();
  await expect(miaMano.first()).toBeVisible();
  expect(await impronta(page, ".sc-mano button")).toEqual(mano);
  expect(await impronta(page, ".sc-carte-tavolo button")).toEqual(tavolo);
  await expect(page.getByText("Anna").first()).toBeVisible();
  await expect(page.getByText("Bot 1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Inizia la partita" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Veloce" })).toHaveAttribute("aria-pressed", "true");

  // Si può continuare: una mossa mia, poi i bot, e di nuovo tocca a me.
  for (let i = 0; i < 3 && (await passoScopa(page)); i++) await page.waitForTimeout(200);
  await expect(miaMano.first()).toBeVisible({ timeout: 15_000 });

  // «Esci dalla partita» cancella il salvataggio: dopo il refresh si riparte dalla creazione.
  await page.getByRole("button", { name: "Esci dalla partita" }).click();
  await page.getByRole("button", { name: "Sì, esci" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Inizia la partita" })).toBeVisible();
});

test("burraco contro i bot: dopo il refresh la mano è la stessa e si continua", async ({ page }) => {
  await page.goto("/burraco");
  await page.getByRole("button", { name: /Contro i bot/ }).click();
  await page.getByLabel("Il tuo nome").fill("Anna");
  await page.getByRole("radio", { name: /Veloce/ }).check();
  await page.getByRole("radio", { name: /Facile/ }).check();
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  const pesca = page.getByRole("button", { name: "Pesca", exact: true });
  // Pesco e scarto la prima carta: un turno mio, poi i bot.
  const giocaUnTurno = async () => {
    await expect(pesca).toBeEnabled({ timeout: 20_000 });
    await pesca.click();
    await expect(page.getByText(/Tocca a te: cala, attacca o scarta/)).toBeVisible();
    await page.locator(".cg-ventaglio button").first().click({ position: { x: 16, y: 24 } });
    await page.getByRole("button", { name: /^Scarta / }).click();
  };
  await giocaUnTurno();
  await expect(pesca).toBeEnabled({ timeout: 20_000 });
  const testoMano = await page.getByText(/La tua mano: \d+ carte/).innerText();
  const mano = await impronta(page, ".cg-ventaglio button");
  expect(mano.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByText(/La tua mano: \d+ carte/)).toHaveText(testoMano);
  await expect(pesca).toBeEnabled();
  expect(await impronta(page, ".cg-ventaglio button")).toEqual(mano);
  await expect(page.getByText("Anna").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Inizia la partita" })).toHaveCount(0);

  await giocaUnTurno();
  await expect(pesca).toBeEnabled({ timeout: 20_000 });
});

test("ultima contro i bot: dopo il refresh la mano è la stessa e si continua", async ({ page }) => {
  await page.goto("/ultima");
  await page.getByRole("button", { name: /Contro i bot/ }).click();
  await page.getByLabel("Il tuo nome").fill("Anna");
  await page.getByRole("radio", { name: /Veloce/ }).check();
  await page.getByRole("radio", { name: /Facile/ }).check();
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await expect(page.getByRole("group", { name: "La tua mano" })).toBeVisible();
  // Aspetto il mio turno (i bot muovono da soli) e lascio che si fermi tutto.
  const pesca = page.getByRole("button", { name: /^Pesca/ }).first();
  await expect(pesca).toBeEnabled({ timeout: 20_000 });
  await page.waitForTimeout(500);
  const mano = await impronta(page, ".ul-mano button.ul-carta");
  expect(mano.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole("group", { name: "La tua mano" })).toBeVisible();
  await expect(pesca).toBeEnabled();
  expect(await impronta(page, ".ul-mano button.ul-carta")).toEqual(mano);
  await expect(page.getByText("Anna").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Inizia la partita" })).toHaveCount(0);

  // Si continua: pesco, la mano cresce di una carta.
  await pesca.click();
  await expect(page.locator(".ul-mano button.ul-carta")).toHaveCount(mano.length + 1);

  await page.getByRole("button", { name: "Esci dalla partita" }).click();
  await page.getByRole("button", { name: "Sì, esci" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Inizia la partita" })).toBeVisible();
});

const casella = (page: Page, r: number, c: number) => page.getByRole("button", { name: new RegExp(`^Casella ${r}, colonna ${c}:`) });

test("tris contro il telefono: dopo il refresh la griglia e il turno sono gli stessi", async ({ page }) => {
  await page.goto("/tris");
  await page.getByRole("button", { name: /Un solo telefono/ }).click();
  await page.getByRole("radio", { name: "Facile" }).check({ force: true });
  await casella(page, 1, 1).click();
  await expect(page.locator(".tris-O")).toHaveCount(1);
  const griglia = () => page.locator(".tris-casella").evaluateAll((els) => els.map((e) => e.textContent));
  const prima = await griglia();
  const stato = await page.getByRole("status").innerText();

  await page.reload();
  expect(await griglia()).toEqual(prima);
  await expect(page.getByRole("status")).toHaveText(stato);
  await expect(page.getByRole("radio", { name: "Facile" })).toBeChecked();

  // Si continua: una mia mossa e risponde il telefono.
  await page.locator(".tris-casella[aria-disabled=false]").first().click();
  await expect(page.locator(".tris-X")).toHaveCount(2);
  await expect(page.locator(".tris-O")).toHaveCount(2);
});

test("tris in due: dopo il refresh si riprende; a partita finita il salvataggio sparisce", async ({ page }) => {
  await page.goto("/tris");
  await page.getByRole("button", { name: /Un solo telefono/ }).click();
  await page.getByRole("radio", { name: "In due" }).check({ force: true });
  await casella(page, 1, 1).click();
  await casella(page, 2, 1).click();
  await page.reload();
  await expect(page.getByRole("radio", { name: "In due" })).toBeChecked();
  await expect(page.locator(".tris-X")).toHaveCount(1);
  await expect(page.locator(".tris-O")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Tocca a X");
  for (const [r, c] of [[1, 2], [2, 2], [1, 3]] as const) await casella(page, r, c).click();
  await expect(page.getByRole("status")).toHaveText("Vince X!");
  await page.reload();
  // Partita finita: niente partita fantasma, la griglia riparte vuota.
  await expect(page.locator(".tris-X, .tris-O")).toHaveCount(0);
});

test("tabu: il refresh a metà turno non ridà tempo", async ({ page }) => {
  await page.goto("/tabu");
  await page.getByRole("button", { name: "Inizia" }).click();
  await page.getByRole("button", { name: "Via!" }).click();
  await expect(page.getByText("60s")).toBeVisible();
  await page.getByRole("button", { name: "Indovinata (+1)" }).click();
  await page.waitForTimeout(3000);
  await page.reload();
  // Il turno continua (non torna a «Via!») con meno tempo e con la parola già fatta.
  await expect(page.getByRole("button", { name: "Indovinata (+1)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Via!" })).toHaveCount(0);
  const rimasti = Number((await page.locator("p.grande").first().innerText()).replace("s", ""));
  expect(rimasti).toBeLessThan(60);
  expect(rimasti).toBeGreaterThan(40);
  await expect(page.getByText("Punti del turno: 1")).toBeVisible();
});

test("tabu: se il tempo è già scaduto, il refresh porta al riepilogo del turno", async ({ page }) => {
  await page.goto("/tabu");
  await page.getByRole("button", { name: "Inizia" }).click();
  await page.getByRole("button", { name: "Via!" }).click();
  await page.getByRole("button", { name: "Indovinata (+1)" }).click();
  // Un telefono rimasto chiuso oltre la scadenza: si porta indietro l'istante di fine salvato.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("gdt-tabu-partita")!);
    s.fineTurno = Date.now() - 5000;
    localStorage.setItem("gdt-tabu-partita", JSON.stringify(s));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tempo scaduto!" })).toBeVisible();
  await expect(page.getByText("1 indovinate, 0 errori")).toBeVisible();
});
