import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

// Le stanze veloci aperte sono condivise dal server: questi test non possono girare insieme
// (altrimenti due telefoni di test diversi si agganciano alla stessa stanza). Il progetto «coda-*»
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
        await expect(p.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();
        await expect(p.getByText("Aspetto un altro giocatore")).toBeVisible();
        await expect(p).toHaveURL(/\/tris\/[A-Z0-9]{5}$/);
        await schermata(p, "veloce-sala", { maschera: ["[role=timer]", ".sv-riepilogo"] });
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
    await expect(p.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();
    await p.getByRole("button", { name: "Esci dalla sala" }).click();
    await expect(p.getByRole("button", { name: "Cerca un avversario" })).toBeVisible();
  } finally {
    await ctx.close();
  }
});

test("tris online: il refresh in attesa non fa perdere il posto", async ({ browser }) => {
  const ctx1 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const ctx2 = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const primo = await ctx1.newPage();
  const secondo = await ctx2.newPage();
  try {
    await primo.goto("/tris");
    await primo.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
    await primo.getByRole("button", { name: "Partita veloce" }).click();
    await primo.getByLabel("Il tuo nome").fill("Anna");
    await primo.getByRole("button", { name: "Cerca un avversario" }).click();
    await expect(primo.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();
    await primo.reload();
    await expect(primo.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();

    await secondo.goto("/tris");
    await secondo.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
    await secondo.getByRole("button", { name: "Partita veloce" }).click();
    await secondo.getByLabel("Il tuo nome").fill("Bruno");
    await secondo.getByRole("button", { name: "Cerca un avversario" }).click();
    await expect(primo.getByRole("status")).toHaveText("Tocca a te");
    await expect(secondo.getByRole("status")).toHaveText("Tocca a Anna");
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});
