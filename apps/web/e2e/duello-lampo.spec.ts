import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

const basso = (page: Page) => page.locator(".dl-meta--basso");
const alto = (page: Page) => page.locator(".dl-meta--alto");

/** Entrambi toccano «Sono pronto»: poi parte il conto alla rovescia. */
async function pronti(page: Page) {
  await basso(page).getByRole("button", { name: "Sono pronto" }).click();
  await alto(page).getByRole("button", { name: "Sono pronto" }).click();
}

/** Lascia acceso un solo mini gioco e 3 round, poi inizia. */
async function iniziaCon(page: Page, id: "Via!" | "Raffica" | "Stop") {
  await page.goto("/duello-lampo");
  for (const nome of ["Via!", "Raffica", "Stop"] as const) {
    if (nome !== id) await page.getByRole("checkbox", { name: new RegExp(nome === "Via!" ? "Via!" : nome) }).uncheck();
  }
  await page.getByRole("radio", { name: "3" }).check({ force: true });
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
}

test("duello lampo: preparazione con scelta dei mini giochi", async ({ page }) => {
  await page.goto("/duello-lampo");
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: /Via!/ })).toBeChecked();
  await schermata(page, "preparazione");

  // Senza mini giochi non si parte.
  for (const c of await page.getByRole("checkbox").all()) await c.uncheck();
  await expect(page.getByRole("alert")).toHaveText("Scegli almeno un mini gioco.");
  await expect(page.getByRole("button", { name: "Inizia la sfida" })).toBeDisabled();

  await page.getByRole("button", { name: "Tutti" }).click();
  await expect(page.getByRole("checkbox", { name: /Raffica/ })).toBeChecked();
  await page.getByRole("button", { name: "A caso" }).click();
  await expect(page.getByRole("button", { name: "Inizia la sfida" })).toBeEnabled();
});

test("duello lampo: la scelta si ricorda sul telefono", async ({ page }) => {
  await page.goto("/duello-lampo");
  await page.getByRole("checkbox", { name: /Raffica/ }).uncheck();
  await page.getByLabel("Chi sta in basso").fill("Anna");
  await page.getByRole("radio", { name: "3" }).check({ force: true });
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 3");
  await expect(basso(page).locator(".dl-testa")).toContainText("Anna 0 - 0");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Raffica/ })).not.toBeChecked();
  await expect(page.getByLabel("Chi sta in basso")).toHaveValue("Anna");
  await expect(page.getByRole("radio", { name: "3" })).toBeChecked();
});

test("duello lampo: Via! tocco anticipato; la metà in alto è ruotata", async ({ page }) => {
  await iniziaCon(page, "Via!");

  await expect(basso(page).getByRole("heading", { name: "Via!" })).toBeVisible();
  // La metà in alto è a testa in giù per chi le sta di fronte.
  await expect(alto(page)).toHaveCSS("transform", /matrix\(-1, .*-1/);
  await schermata(page, "regola");

  await basso(page).getByRole("button", { name: "Sono pronto" }).click();
  await expect(basso(page).getByText("Aspetto l'altro giocatore…")).toBeVisible();
  await alto(page).getByRole("button", { name: "Sono pronto" }).click();

  // Prima del via: chi tocca perde il round.
  await expect(basso(page).getByRole("button", { name: "Aspetta…" })).toBeVisible({ timeout: 10_000 });
  await basso(page).getByRole("button", { name: "Aspetta…" }).dispatchEvent("pointerdown");
  await expect(basso(page).getByRole("status")).toHaveText("Punto per Giocatore 2");
  await expect(alto(page).getByRole("status")).toHaveText("Punto per te!");
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 3");
  await expect(basso(page).locator(".dl-testa")).toContainText("Giocatore 1 0 - 1 Giocatore 2");
  // Con «Avanti» ancora spento l'immagine cambierebbe da una prova all'altra.
  await expect(basso(page).getByRole("button", { name: "Avanti" })).toBeEnabled();
  await schermata(page, "esito");
});

test("duello lampo: una sfida intera fino alla rivincita", async ({ page }) => {
  await iniziaCon(page, "Via!");

  // Il giocatore in basso vince i primi due round toccando all'ORA.
  for (let i = 0; i < 2; i++) {
    await pronti(page);
    await expect(basso(page).getByRole("button", { name: "ORA!" })).toBeVisible({ timeout: 15_000 });
    if (i === 0) await schermata(page, "ora");
    await basso(page).getByRole("button", { name: "ORA!" }).dispatchEvent("pointerdown");
    await expect(basso(page).getByRole("status")).toHaveText("Punto per te!");
    const avanti = basso(page).getByRole("button", { name: "Avanti" });
    await expect(avanti).toBeEnabled();
    await avanti.click();
  }
  // Il terzo round (i round sono fissi) lo vince chi sta in alto: 2 a 1 per chi sta in basso.
  await pronti(page);
  await expect(alto(page).getByRole("button", { name: "ORA!" })).toBeVisible({ timeout: 15_000 });
  await alto(page).getByRole("button", { name: "ORA!" }).dispatchEvent("pointerdown");
  await expect(alto(page).getByRole("status")).toHaveText("Punto per te!");
  const finale = basso(page).getByRole("button", { name: "Risultato finale" });
  await expect(finale).toBeEnabled();
  await finale.click();

  await expect(basso(page).getByRole("status")).toHaveText("Hai vinto la sfida!");
  await expect(alto(page).getByRole("status")).toHaveText("Giocatore 1 ha vinto la sfida");
  await schermata(page, "fine");

  await basso(page).getByRole("button", { name: "Rivincita" }).click();
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 3");
  await expect(basso(page).locator(".dl-testa")).toContainText("0 - 0");
});

test("duello lampo: Raffica conta i tocchi e chiude da sola", async ({ page }) => {
  await iniziaCon(page, "Raffica");
  await pronti(page);
  const zonaBasso = basso(page).locator(".dl-raffica");
  await expect(zonaBasso).toBeVisible({ timeout: 10_000 });
  for (let i = 0; i < 5; i++) await zonaBasso.dispatchEvent("pointerdown");
  for (let i = 0; i < 2; i++) await alto(page).locator(".dl-raffica").dispatchEvent("pointerdown");
  await schermata(page, "raffica", { maschera: [".dl-raffica-info"] });
  // Dopo 5 secondi il round si chiude da solo: 5 tocchi contro 2.
  await expect(basso(page).getByRole("status")).toHaveText("Punto per te!", { timeout: 15_000 });
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Tu: 5 tocchi");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Giocatore 2: 2 tocchi");
});

test("duello lampo: Stop al centro si ferma e dà lo scarto", async ({ page }) => {
  await iniziaCon(page, "Stop");
  await pronti(page);
  await expect(basso(page).locator(".dl-stop")).toBeVisible({ timeout: 10_000 });
  await schermata(page, "stop", { maschera: [".dl-pista"] });
  await basso(page).locator(".dl-stop").dispatchEvent("pointerdown");
  await alto(page).locator(".dl-stop").dispatchEvent("pointerdown");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("scarto");
});

test("duello lampo: l'uscita chiede conferma", async ({ page }) => {
  await page.goto("/duello-lampo");
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await page.getByRole("button", { name: "Esci dalla sfida" }).click();
  await page.getByRole("button", { name: "Resta" }).click();
  await expect(basso(page).getByRole("heading")).toBeVisible();
  await page.getByRole("button", { name: "Esci dalla sfida" }).click();
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByText("Chi sta in basso")).toBeVisible();
});
