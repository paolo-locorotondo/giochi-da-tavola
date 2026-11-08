import { expect, test } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

test("dadi: si sceglie il dado, si lancia e il risultato entra nello storico", async ({ page }) => {
  await page.goto("/dadi");
  await expect(page.getByText("Nessun lancio ancora. Tocca Lancia per cominciare.")).toBeVisible();
  await schermata(page, "iniziale");

  await page.getByRole("button", { name: "Lancia" }).click();
  await expect(page.getByRole("button", { name: "Lancia" })).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Lancio in corso…");
  await expect(page.getByRole("status")).toHaveText(/^Risultato: [1-6]$/);
  await expect(page.locator(".dadi-storico .chip")).toHaveCount(1);
  await schermata(page, "risultato");

  await page.getByRole("button", { name: "Cancella i lanci" }).click();
  await expect(page.locator(".dadi-storico .chip")).toHaveCount(0);
});

test("dadi: con due valori personalizzati diventa una moneta", async ({ page }) => {
  await page.goto("/dadi");
  await page.getByRole("radio", { name: "Personalizzato" }).check({ force: true });
  await expect(page.getByRole("button", { name: "Lancia" })).toBeDisabled();
  await page.getByLabel("Valori, uno per riga").fill("Sì\nNo");
  await expect(page.locator(".dado-moneta")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lancia" })).toBeEnabled();
  await page.getByRole("button", { name: "Lancia" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Risultato: (Sì|No)$/);
  await schermata(page, "moneta");

  await page.getByLabel("Valori, uno per riga").fill("Sì\nNo\nForse");
  await expect(page.locator(".dado-moneta")).toHaveCount(0);
});

test("dadi: un solo valore dà un avviso e blocca il lancio", async ({ page }) => {
  await page.goto("/dadi");
  await page.getByRole("radio", { name: "Personalizzato" }).check({ force: true });
  await page.getByLabel("Valori, uno per riga").fill("Solo");
  await expect(page.getByText("Servono almeno due valori diversi.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lancia" })).toBeDisabled();
});

test("dadi: con riduci movimento il risultato è immediato", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dadi");
  await page.getByRole("button", { name: "Lancia" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Risultato: [1-6]$/);
});

test("dadi: ogni valore ha un massimo di caratteri e il testo resta dentro il dado", async ({ page }) => {
  await page.goto("/dadi");
  await page.getByRole("radio", { name: "Personalizzato" }).check({ force: true });
  const campo = page.getByLabel("Valori, uno per riga");
  await campo.fill(`${"W".repeat(40)}\n${"W".repeat(19)}`);
  await expect(campo).toHaveValue(`${"W".repeat(20)}\n${"W".repeat(19)}`);
  await page.getByRole("button", { name: "Lancia" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Risultato: W+$/);
  const dentro = await page.evaluate(() => {
    const s = document.querySelector(".dado-scena")!.getBoundingClientRect();
    const f = document.querySelector(".dado-faccia")!.getBoundingClientRect();
    return f.left >= s.left && f.right <= s.right && f.top >= s.top && f.bottom <= s.bottom;
  });
  expect(dentro).toBe(true);
  await schermata(page, "testo-lungo");
});

test("dadi: il tasto «i» mostra cosa significano le facce del Taboo", async ({ page }) => {
  await page.goto("/dadi");
  await expect(page.getByRole("button", { name: "Cosa significano le facce" })).toHaveCount(0);
  await page.getByRole("radio", { name: "Taboo" }).check({ force: true });
  const info = page.getByRole("button", { name: "Cosa significano le facce" });
  await expect(info).toHaveAttribute("aria-expanded", "false");
  await info.click();
  await expect(page.getByRole("region", { name: "Cosa significano le facce" })).toContainText("Statua di sale");
  await schermata(page, "info-taboo");
  await info.click();
  await expect(page.getByRole("region", { name: "Cosa significano le facce" })).toHaveCount(0);
});

test("dadi: il dado personalizzato ha la sua spiegazione facoltativa", async ({ page }) => {
  await page.goto("/dadi");
  await page.getByRole("radio", { name: "Personalizzato" }).check({ force: true });
  await page.getByLabel("Valori, uno per riga").fill("Sì\nNo");
  await expect(page.getByRole("button", { name: "Cosa significano le facce" })).toHaveCount(0);
  await page.getByLabel("Cosa significano le facce (facoltativo)").fill("• Sì: vai avanti\n• No: fermo");
  await page.getByRole("button", { name: "Cosa significano le facce" }).click();
  await expect(page.getByRole("region", { name: "Cosa significano le facce" })).toContainText("No: fermo");
  await schermata(page, "info-personalizzato");
});
