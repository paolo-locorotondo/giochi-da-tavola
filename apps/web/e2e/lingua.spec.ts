import { expect, test } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(async ({ page }) => {
  await fissaCaso(page);
  await page.addInitScript(() => localStorage.setItem("gdt-lingua", "en"));
});

test("inglese: menu, impostazioni e attributo lang", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Table games" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await schermata(page, "menu-en");
});

test("inglese: Tabù parte con le carte inglesi", async ({ page }) => {
  await page.goto("/tabu");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await schermata(page, "tabu-config-en");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Go!" }).click();
  await expect(page.getByText("Don't say:")).toBeVisible();
  await schermata(page, "tabu-gioco-en", { maschera: [".carta", ".grande"] });
});

test("inglese: Lupus e Impostore", async ({ page }) => {
  await page.goto("/lupus");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await schermata(page, "lupus-config-en");
  await page.goto("/impostore");
  await expect(page.getByRole("heading", { name: "How are you playing?" })).toBeVisible();
  await schermata(page, "impostore-modalita-en");
});
