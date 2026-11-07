import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

/** Porta uno dei selettori − / + al valore voluto, un tocco alla volta. */
async function imposta(page: Page, etichetta: string, da: number, a: number, passo: number) {
  const gruppo = page.getByRole("group", { name: etichetta });
  const tasto = gruppo.getByRole("button", { name: a > da ? /^Più/ : /^Meno/ });
  for (let n = Math.abs(a - da) / passo; n > 0; n--) await tasto.click();
  await expect(gruppo.locator("output")).toHaveText(String(a));
}

async function avvia(page: Page, turni = 3, secondi = 30) {
  await page.goto("/tabu");
  await page.getByLabel("Prima squadra").fill("Rossi");
  await page.getByLabel("Seconda squadra").fill("Blu");
  await imposta(page, "Turni per squadra", 5, turni, 1);
  await imposta(page, "Secondi per turno", 60, secondi, 5);
  await page.getByRole("button", { name: "Inizia" }).click();
}

test("configurazione: valori di partenza e nomi vuoti", async ({ page }) => {
  await page.goto("/tabu");
  await expect(page.getByLabel("Prima squadra")).toHaveValue("Squadra 1");
  await expect(page.getByLabel("Seconda squadra")).toHaveValue("Squadra 2");
  await expect(page.getByRole("group", { name: "Turni per squadra" }).locator("output")).toHaveText("5");
  await expect(page.getByRole("group", { name: "Secondi per turno" }).locator("output")).toHaveText("60");
  await schermata(page, "configurazione");

  // Limiti: i tasti si fermano al minimo e al massimo.
  const turni = page.getByRole("group", { name: "Turni per squadra" });
  await imposta(page, "Turni per squadra", 5, 1, 1);
  await expect(turni.getByRole("button", { name: /^Meno/ })).toBeDisabled();
  await imposta(page, "Turni per squadra", 1, 5, 1);

  await page.getByLabel("Prima squadra").fill("   ");
  await page.getByLabel("Seconda squadra").fill("");
  await page.getByRole("button", { name: "Inizia" }).click();
  await expect(page.getByRole("heading", { name: "Squadra 1" })).toBeVisible();
});

test("tocca alla prima squadra", async ({ page }) => {
  await avvia(page);
  await expect(page.getByRole("heading", { name: "Rossi" })).toBeVisible();
  await schermata(page, "pronti");
});

test("turno: i pulsanti cambiano carta e il tempo scade", async ({ page }) => {
  await page.clock.install();
  await avvia(page, "3", "30");
  await page.getByRole("button", { name: "Via!" }).click();
  await expect(page.getByText("30s")).toBeVisible();
  await expect(page.locator("p.vietata")).toHaveCount(5);
  await schermata(page, "gioco");

  await page.getByRole("button", { name: "Indovinata (+1)" }).click();
  await page.getByRole("button", { name: "Vietata detta (−1)" }).click();
  await page.getByRole("button", { name: "Passa", exact: true }).click();

  await page.clock.fastForward(31_000);
  await expect(page.getByRole("heading", { name: "Tempo scaduto!" })).toBeVisible();
  await expect(page.getByText("1 indovinate, 1 errori")).toBeVisible();
  await schermata(page, "riepilogo");

  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Blu" })).toBeVisible();
  await expect(page.getByText("Rossi 0 – 0 Blu")).toBeVisible();
});

test("partita completa fino alla fine", async ({ page }) => {
  await page.clock.install();
  await avvia(page, "3", "30");
  // 3 turni a testa: Rossi indovina una parola a turno, Blu nessuna.
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Via!" }).click();
    if (i % 2 === 0) await page.getByRole("button", { name: "Indovinata (+1)" }).click();
    await page.clock.fastForward(31_000);
    await page.getByRole("button", { name: "Avanti" }).click();
  }
  await expect(page.getByRole("heading", { name: "Vince Rossi!" })).toBeVisible();
  await expect(page.getByText("Rossi 3 – 0 Blu")).toBeVisible();
  await schermata(page, "fine");

  await page.getByRole("button", { name: "Nuova partita" }).click();
  await expect(page.getByLabel("Prima squadra")).toBeVisible();
});

test("la partita sopravvive al refresh e si può chiudere", async ({ page }) => {
  await avvia(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rossi" })).toBeVisible();

  await page.getByRole("button", { name: "Chiudi la partita" }).click();
  await page.getByRole("button", { name: "No, continua" }).click();
  await expect(page.getByRole("heading", { name: "Rossi" })).toBeVisible();
  await page.getByRole("button", { name: "Chiudi la partita" }).click();
  await page.getByRole("button", { name: "Sì, chiudi" }).click();
  await expect(page.getByLabel("Prima squadra")).toBeVisible();
});
