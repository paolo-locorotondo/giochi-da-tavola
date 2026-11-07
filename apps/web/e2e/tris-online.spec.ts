import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

const casella = (page: Page, riga: number, colonna: number) =>
  page.getByRole("button", { name: new RegExp(`^Casella ${riga}, colonna ${colonna}:`) });

/** L'organizzatore crea la stanza «Anna / Bruno», si siede (X) e ritorna il codice. */
async function creaStanza(page: Page): Promise<string> {
  await page.goto("/tris");
  await page.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await page.getByLabel("Nome di chi gioca con X").fill("Anna");
  await page.getByLabel("Nome di chi gioca con O").fill("Bruno");
  await schermata(page, "crea");
  await page.getByRole("button", { name: "Crea la partita" }).click();
  await page.getByRole("button", { name: /^Anna \(X\)/ }).click();
  await expect(page).toHaveURL(/\/tris\/[A-Z0-9]{5}$/);
  return page.url().split("/").pop()!;
}

test("tris online: due telefoni giocano una partita e chiedono la rivincita", async ({ browser }) => {
  const ctx1 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const ctx2 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const host = await ctx1.newPage();
  const ospite = await ctx2.newPage();
  try {
    const codice = await creaStanza(host);
    await expect(host.getByRole("button", { name: "Inizia la partita" })).toBeDisabled();
    await schermata(host, "sala-attesa", { maschera: [".accordion"] });

    await ospite.goto(`/tris/${codice}`);
    await ospite.getByRole("button", { name: /^Bruno \(O\)/ }).click();
    await expect(host.getByText("Ci siete tutti e due.")).toBeVisible();
    await host.getByRole("button", { name: "Inizia la partita" }).click();

    await expect(host.getByRole("status")).toHaveText("Tocca a te");
    await expect(ospite.getByRole("status")).toHaveText("Tocca a Anna");
    await schermata(ospite, "partita-attesa", { maschera: [".accordion"] });

    // Chi non ha il turno non muove; chi ce l'ha sì. X: 1-1, 1-2, 1-3 — O: 2-1, 2-2.
    await casella(ospite, 1, 1).click({ force: true });
    await expect(ospite.locator(".tris-X")).toHaveCount(0);
    for (const [p, r, c] of [[host, 1, 1], [ospite, 2, 1], [host, 1, 2], [ospite, 2, 2], [host, 1, 3]] as const) {
      await casella(p, r, c).click();
    }
    await expect(host.getByRole("status")).toHaveText("Hai vinto!");
    await expect(ospite.getByRole("status")).toHaveText("Ha vinto Anna");
    await schermata(host, "vittoria", { maschera: [".accordion"] });

    await host.getByRole("button", { name: "Rivincita" }).click();
    await expect(ospite.getByText("Anna vuole la rivincita.")).toBeVisible();
    await ospite.getByRole("button", { name: "Rivincita" }).click();
    // Ora inizia O (Bruno).
    await expect(ospite.getByRole("status")).toHaveText("Tocca a te");
    await expect(host.getByRole("status")).toHaveText("Tocca a Bruno");
    await expect(host.getByText("Anna (X): 1")).toBeVisible();

    // Un terzo telefono guarda soltanto.
    const ctx3 = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const terzo = await ctx3.newPage();
    await terzo.goto(`/tris/${codice}`);
    await expect(terzo.getByText("Stai guardando la partita", { exact: true })).toBeVisible();
    await ctx3.close();
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});

test("tris online: l'organizzatore chiude la partita per tutti", async ({ browser }) => {
  const ctx1 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const ctx2 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const host = await ctx1.newPage();
  const ospite = await ctx2.newPage();
  try {
    const codice = await creaStanza(host);
    await ospite.goto(`/tris/${codice}`);
    await expect(ospite.getByText("Chi sei?")).toBeVisible();
    await host.getByRole("button", { name: "Chiudi la partita" }).click();
    await host.getByRole("button", { name: "Sì, chiudi" }).click();
    await expect(host.getByText("Partita chiusa")).toBeVisible();
    await expect(ospite.getByText("Partita chiusa")).toBeVisible();
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});
