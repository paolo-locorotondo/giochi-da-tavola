import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

// La coda della partita veloce è una sola per tutto il server: questi test non possono girare
// insieme (altrimenti due telefoni di test diversi si abbinano tra loro). Il progetto «coda-*»
// li esegue uno alla volta (vedi playwright.config.ts).
test.describe.configure({ mode: "serial" });
test.beforeEach(({ page }) => fissaCaso(page));

const casella = (page: Page, riga: number, colonna: number) =>
  page.getByRole("button", { name: new RegExp(`^Casella ${riga}, colonna ${colonna}:`) });

test("tris online: partita veloce, due telefoni in coda vengono abbinati", async ({ browser }) => {
  const ctx1 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const ctx2 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const primo = await ctx1.newPage();
  const secondo = await ctx2.newPage();
  try {
    for (const [p, nome] of [[primo, "Anna"], [secondo, "Bruno"]] as const) {
      await p.goto("/tris");
      await p.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
      await p.getByRole("button", { name: "Partita veloce" }).click();
      await p.getByLabel("Il tuo nome").fill(nome);
      if (p === primo) await schermata(p, "veloce-nome");
      await p.getByRole("button", { name: "Cerca un avversario" }).click();
      if (p === primo) {
        await expect(p.getByRole("heading", { name: "In coda…" })).toBeVisible();
        await schermata(p, "veloce-in-coda");
      }
    }
    // Abbinati: la partita è già avviata, il primo in coda è X e muove per primo.
    await expect(primo.getByRole("status")).toHaveText("Tocca a te");
    await expect(secondo.getByRole("status")).toHaveText("Tocca a Anna");
    await expect(primo).toHaveURL(/\/tris\/[A-Z0-9]{5}$/);
    await casella(primo, 2, 2).click();
    await expect(secondo.getByRole("status")).toHaveText("Tocca a te");
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});

test("tris online: chi annulla la coda non viene abbinato", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  try {
    await p.goto("/tris");
    await p.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
    await p.getByRole("button", { name: "Partita veloce" }).click();
    await p.getByLabel("Il tuo nome").fill("Carla");
    await p.getByRole("button", { name: "Cerca un avversario" }).click();
    await p.getByRole("button", { name: "Annulla" }).click();
    await expect(p.getByRole("button", { name: "Cerca un avversario" })).toBeVisible();
  } finally {
    await ctx.close();
  }
});
