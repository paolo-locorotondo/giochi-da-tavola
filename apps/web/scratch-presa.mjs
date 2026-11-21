import { chromium } from "@playwright/test";
const OUT = "F:/Paolo/4_Work/MyProjects/gdt-worktrees/scopa/shots";
const browser = await chromium.launch();
for (const tema of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: tema, locale: "it-IT", serviceWorkers: "block" });
  const page = await ctx.newPage();
  let found = false;
  for (let seed = 1; seed < 40 && !found; seed++) {
    await page.addInitScript((s) => { let x = s; Math.random = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; }; }, seed);
    await page.goto("http://localhost:5303/scopa");
    await page.getByRole("button", { name: /Contro i bot/ }).click();
    await page.getByLabel("Il tuo nome").fill("Anna");
    await page.getByRole("radio", { name: /Veloce/ }).check();
    await page.getByRole("radio", { name: /Facile/ }).check();
    await page.getByRole("button", { name: "Inizia la partita" }).click();
    for (let i = 0; i < 300; i++) {
      if (await page.locator(".sc-presa").isVisible()) { found = true; break; }
      if (await page.getByText("Round finito").first().isVisible()) break;
      const b = page.locator(".sc-mano button:not(:disabled)").first();
      if (await b.isVisible()) await b.click({ timeout: 500 }).catch(() => {});
      await page.waitForTimeout(60);
    }
    if (found) {
      await page.locator(".sc-presa").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUT}/${tema}-04-scelta-presa.png`, fullPage: true });
      console.log(tema, "seed", seed);
    }
    await page.goto("about:blank");
    await page.context().clearCookies();
  }
  if (!found) console.log(tema, "nessuna presa multipla trovata");
  await ctx.close();
}
await browser.close();
