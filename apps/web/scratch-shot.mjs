import { chromium } from "@playwright/test";
import fs from "node:fs";
const OUT = "F:/Paolo/4_Work/MyProjects/gdt-worktrees/scopa/shots";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const tema of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: tema, locale: "it-IT", serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.addInitScript(() => { let x = 777; Math.random = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; }; });
  const shot = (n) => page.screenshot({ path: `${OUT}/${tema}-${n}.png`, fullPage: true });
  await page.goto("http://localhost:5303/");
  await shot("00-home");
  await page.goto("http://localhost:5303/scopa");
  await shot("01-modalita");
  await page.getByRole("button", { name: /Contro i bot/ }).click();
  await page.getByLabel("Il tuo nome").fill("Anna");
  await shot("02-crea");
  await page.getByRole("radio", { name: /Veloce/ }).check();
  await page.getByRole("radio", { name: /Facile/ }).check();
  await page.getByRole("button", { name: "Inizia la partita" }).click();
  await page.waitForTimeout(300);
  await shot("03-tavolo");
  // gioca finche compare la scelta della presa o il riepilogo
  let presa = false, fine = false;
  for (let i = 0; i < 400 && !fine; i++) {
    if (await page.getByText("Round finito").first().isVisible()) { fine = true; break; }
    const carte = page.locator(".sc-mano button:not(:disabled)");
    const n = await carte.count();
    if (n > 0) {
      let toccata = false;
      for (let k = 0; k < n && !presa; k++) {
        await carte.nth(k).click();
        if (await page.locator(".sc-presa").isVisible()) {
          presa = true; await shot("04-scelta-presa");
          await page.locator(".sc-combinazione").first().click();
          toccata = true; break;
        }
        await page.waitForTimeout(30);
        if (!(await page.locator(".sc-mano button:not(:disabled)").count())) { toccata = true; break; }
      }
      if (!toccata && !presa) { /* la prima carta e' gia' stata giocata nel ciclo */ }
    }
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);
  await shot("05-riepilogo");
  await page.locator(".sc-riepilogo summary").click();
  await shot("06-riepilogo-prese");
  console.log(tema, "presa", presa, "fine", fine);
  await ctx.close();
}
await browser.close();
