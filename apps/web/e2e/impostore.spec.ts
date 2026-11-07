import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

async function configura(page: Page, nomi: string) {
  // Dal menu, come un utente: la modalità scelta in precedenza resta nella cronologia della pagina ricaricata.
  await page.goto("/");
  await page.getByRole("link", { name: /Impostore/ }).click();
  await page.getByRole("button", { name: /Un solo telefono/ }).click();
  await page.getByLabel(/Giocatori/).fill(nomi);
}

async function giraLeCarte(page: Page, quante: number) {
  for (let i = 0; i < quante; i++) {
    await page.getByRole("button", { name: "Mostra la mia carta" }).click();
    await page.getByRole("button", { name: "Ho visto, passa il telefono" }).click();
  }
}

test("scelta della modalità", async ({ page }) => {
  await page.goto("/impostore");
  await expect(page.getByRole("heading", { name: "Come giocate?" })).toBeVisible();
  await schermata(page, "modalita");
});

test("configurazione: validazione dei campi", async ({ page }) => {
  await configura(page, "Anna\nLuca");
  await schermata(page, "configurazione");

  await page.getByRole("button", { name: "Inizia" }).click();
  await expect(page.locator("p.errore")).toHaveText("Servono almeno 3 giocatori");
  await schermata(page, "configurazione-errore");

  await page.getByLabel(/Giocatori/).fill("Anna\nanna\nLuca");
  await page.getByRole("button", { name: "Inizia" }).click();
  await expect(page.locator("p.errore")).toBeVisible();
  await expect(page.getByText("Passa il telefono a")).toHaveCount(0);
});

test("configurazione: il consiglio sugli impostori segue i giocatori", async ({ page }) => {
  await configura(page, "A\nB\nC");
  const scelta = page.getByLabel("Numero di impostori");
  await expect(scelta.locator("option")).toHaveCount(1);
  await expect(scelta).toContainText("(consigliato)");
  await page.getByLabel(/Giocatori/).fill("A\nB\nC\nD\nE\nF\nG\nH\nI\nL");
  expect(await scelta.locator("option").count()).toBeGreaterThan(1);
});

test("partita: carte, indizi e voto", async ({ page }) => {
  await configura(page, "Anna\nLuca\nMarco\nSara");
  await page.getByRole("button", { name: "Inizia" }).click();

  await expect(page.getByText("Passa il telefono a")).toBeVisible();
  await schermata(page, "carta-coperta");
  await page.getByRole("button", { name: "Mostra la mia carta" }).click();
  await schermata(page, "carta-scoperta");
  await page.getByRole("button", { name: "Ho visto, passa il telefono" }).click();
  await giraLeCarte(page, 3);

  await expect(page.getByRole("heading", { name: "Indizi" })).toBeVisible();
  await schermata(page, "indizi");
  await page.getByRole("button", { name: "Si passa al voto" }).click();

  await expect(page.getByRole("heading", { name: "Voto" })).toBeVisible();
  await schermata(page, "voto");
});

test("la partita sopravvive al refresh", async ({ page }) => {
  await configura(page, "Anna\nLuca\nMarco");
  await page.getByRole("button", { name: "Inizia" }).click();
  await giraLeCarte(page, 3);
  await page.reload();
  // La modalità scelta sta nella cronologia: dopo il refresh si resta in «Un solo telefono» e la partita riprende.
  await expect(page.getByRole("heading", { name: "Indizi" })).toBeVisible();
});

test("fine partita: ogni voto porta al tentativo o alla vittoria degli impostori", async ({ page }) => {
  // Con 3 giocatori e 1 impostore: votare un civile fa vincere gli impostori, votare l'impostore apre il tentativo.
  const esiti = new Set<string>();
  for (const nome of ["Anna", "Luca", "Marco"]) {
    await configura(page, "Anna\nLuca\nMarco");
    await page.getByRole("button", { name: "Inizia" }).click();
    await giraLeCarte(page, 3);
    await page.getByRole("button", { name: "Si passa al voto" }).click();
    await page.getByRole("button", { name: nome }).click();

    if (await page.getByRole("heading", { name: /è stato scoperto/ }).isVisible()) {
      esiti.add("tentativo");
      await schermata(page, "tentativo");
      await page.getByLabel("Parola").fill("parola sbagliata");
      await page.getByRole("button", { name: "Conferma" }).click();
      await expect(page.getByRole("heading", { name: "Vincono i civili!" })).toBeVisible();
      if (!esiti.has("visto-civili")) await schermata(page, "fine-civili");
      esiti.add("visto-civili");
    } else {
      esiti.add("impostori");
      await expect(page.getByRole("heading", { name: "Vincono gli impostori!" })).toBeVisible();
      if (!esiti.has("visto-impostori")) await schermata(page, "fine-impostori");
      esiti.add("visto-impostori");
    }
    await page.getByRole("button", { name: "Nuova partita" }).click();
    await expect(page.getByLabel(/Giocatori/)).toBeVisible();
    await page.evaluate(() => localStorage.clear());
  }
  expect(esiti.has("impostori") && esiti.has("tentativo")).toBe(true);
});

test("online senza server: propone di giocare con un solo telefono", async ({ page }) => {
  // Server che non risponde: così il test non dipende da cosa gira sulla porta 8080 (es. docker compose up).
  await page.routeWebSocket(/\/ws/, () => {});
  await page.goto("/impostore");
  await page.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await expect(page.getByRole("heading", { name: "Server non raggiungibile" })).toBeVisible({ timeout: 30_000 });
  await schermata(page, "online-non-raggiungibile");
  await page.getByRole("button", { name: "Gioca con un solo telefono" }).click();
  await expect(page.getByLabel(/Giocatori/)).toBeVisible();
});
