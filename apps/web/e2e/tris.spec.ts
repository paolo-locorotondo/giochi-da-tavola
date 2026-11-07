import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

const casella = (page: Page, riga: number, colonna: number) =>
  page.getByRole("button", { name: new RegExp(`^Casella ${riga}, colonna ${colonna}:`) });

async function modalitaDue(page: Page) {
  await page.getByRole("radio", { name: "In due" }).check({ force: true });
}

test("tris: in due si gioca fino alla vittoria e il punteggio cresce", async ({ page }) => {
  await page.goto("/tris");
  await modalitaDue(page);
  await expect(page.getByRole("status")).toHaveText("Tocca a X");
  await schermata(page, "iniziale-due");

  // X: 1-1, 1-2, 1-3 — O: 2-1, 2-2
  for (const [r, c] of [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]] as const) await casella(page, r, c).click();
  await expect(page.getByRole("status")).toHaveText("Vince X!");
  await expect(page.locator(".tris-vincente")).toHaveCount(3);
  await expect(page.getByText("Vittorie di X: 1")).toBeVisible();
  await schermata(page, "vittoria");

  // Con la partita finita le caselle non rispondono
  await casella(page, 3, 3).click({ force: true });
  await expect(page.locator(".tris-O")).toHaveCount(2);

  // Nuova partita: inizia O
  await page.getByRole("button", { name: "Nuova partita" }).click();
  await expect(page.getByRole("status")).toHaveText("Tocca a O");
  await expect(page.getByText("Vittorie di X: 1")).toBeVisible();
});

test("tris: griglia piena senza tris è pareggio; una casella occupata non si può riusare", async ({ page }) => {
  await page.goto("/tris");
  await modalitaDue(page);
  await casella(page, 1, 1).click();
  await casella(page, 1, 1).click({ force: true });
  await expect(page.locator(".tris-X")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Tocca a O");

  // X O X / X O O / O X X  (ordine: 1,2,3,5,4,6,8,... → pareggio)
  const mosse = [[1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]] as const;
  for (const [r, c] of mosse) await casella(page, r, c).click();
  await expect(page.getByRole("status")).toHaveText("Pareggio");
  await expect(page.getByText("Pareggi: 1")).toBeVisible();
  await schermata(page, "pareggio");
});

test("tris: contro il telefono (difficile) risponde e non perde", async ({ page }) => {
  await page.goto("/tris");
  await page.getByRole("radio", { name: "Difficile" }).check({ force: true });
  await expect(page.getByRole("status")).toHaveText("Tocca a te");
  await casella(page, 2, 2).click();
  await expect(page.getByRole("status")).toHaveText("Il telefono pensa…");
  await expect(page.getByRole("status")).toHaveText("Tocca a te");
  await expect(page.locator(".tris-O")).toHaveCount(1);
  await schermata(page, "contro-telefono");
});

test("tris: scegliendo O il telefono inizia da solo", async ({ page }) => {
  await page.goto("/tris");
  await page.getByRole("radio", { name: "O", exact: true }).check({ force: true });
  await expect(page.locator(".tris-X")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Tocca a te");
});

test("tris: in inglese testi e nomi delle caselle sono tradotti", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("gdt-lingua", "en"));
  await page.goto("/tris");
  await expect(page.getByRole("radio", { name: "Two players" })).toBeAttached();
  await expect(page.getByRole("button", { name: "New game" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Row 1, column 1: empty$/ })).toBeVisible();
});
