import { expect, test, type Browser, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

// Le stanze veloci aperte sono condivise dal server: questi test girano uno alla volta
// (progetto «coda-*», vedi playwright.config.ts).
test.describe.configure({ mode: "serial" });
test.beforeEach(({ page }) => fissaCaso(page));

const telefono = { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true };
const MASCHERE = ["[role=timer]", ".sv-riepilogo"];

async function telefoni(browser: Browser, n: number) {
  const contesti = await Promise.all(Array.from({ length: n }, () => browser.newContext(telefono)));
  const pagine = await Promise.all(contesti.map((c) => c.newPage()));
  return { pagine, chiudi: () => Promise.all(contesti.map((c) => c.close())) };
}

async function allaPartitaVeloce(p: Page, nome: string) {
  await p.goto("/ultima");
  await p.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await p.getByRole("button", { name: "Partita veloce" }).click();
  await p.getByLabel("Il tuo nome").fill(nome);
}

/** Con 10 valori di posti c'è il selettore con più/meno, che parte da 2. */
async function scegliPosti(p: Page, n: number) {
  for (let i = 2; i < n; i++) await p.getByRole("button", { name: "Un giocatore in più" }).click();
  await expect(p.getByText(`${n} giocatori`)).toBeVisible();
}

test("ultima veloce: Anna apre, Bruno e Carla entrano, Anna apre con 3 su 4", async ({ browser }) => {
  const { pagine, chiudi } = await telefoni(browser, 3);
  const [anna, bruno, carla] = pagine as [Page, Page, Page];
  try {
    await allaPartitaVeloce(anna, "Anna");
    // Nessuna stanza aperta: impostazioni per aprirne una.
    await expect(anna.getByRole("button", { name: "Apri una stanza veloce" })).toBeVisible();
    await schermata(anna, "veloce-apertura");
    await scegliPosti(anna, 4);
    await anna.getByRole("radio", { name: /Partita a punti/ }).check();
    await anna.getByLabel("Punti per vincere").fill("200");
    await anna.getByRole("radio", { name: "1 min" }).check();
    await anna.getByRole("button", { name: "Apri una stanza veloce" }).click();
    await expect(anna.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();
    await expect(anna.getByText("Aspetto altri 3 giocatori")).toBeVisible();
    await expect(anna).toHaveURL(/\/ultima\/[A-Z0-9]{5}$/);

    // Bruno vede l'anteprima della stanza di Anna ed entra.
    await allaPartitaVeloce(bruno, "Bruno");
    await expect(bruno.getByRole("heading", { name: "Stanza di Anna" })).toBeVisible();
    await expect(bruno.getByText("1 posto su 4")).toBeVisible();
    await expect(bruno.getByText(/A punti, fino a 200/)).toBeVisible();
    await schermata(bruno, "veloce-anteprima");
    await bruno.getByRole("button", { name: "Entra nella stanza" }).click();
    await expect(bruno.getByRole("heading", { name: "Sala d'attesa" })).toBeVisible();

    await allaPartitaVeloce(carla, "Carla");
    await carla.getByRole("button", { name: "Entra nella stanza" }).click();
    await expect(anna.getByText("Aspetto un altro giocatore")).toBeVisible();
    await schermata(anna, "veloce-sala-organizzatore", { maschera: MASCHERE });
    await schermata(bruno, "veloce-sala-ospite", { maschera: MASCHERE });

    // L'organizzatore apre prima che la stanza sia piena.
    await anna.getByRole("button", { name: "Apri adesso con 3 giocatori" }).click();
    for (const p of pagine) await expect(p.getByRole("heading", { name: "La tua mano" })).toBeVisible();
    await expect(anna.locator(".ul-mano > *")).toHaveCount(7);
  } finally {
    await chiudi();
  }
});

test("ultima veloce: la partita parte da sola quando la stanza è piena", async ({ browser }) => {
  const { pagine, chiudi } = await telefoni(browser, 3);
  const [anna, bruno, carla] = pagine as [Page, Page, Page];
  try {
    await allaPartitaVeloce(anna, "Anna");
    await scegliPosti(anna, 3);
    await anna.getByRole("button", { name: "Apri una stanza veloce" }).click();
    await expect(anna.getByText("Aspetto altri 2 giocatori")).toBeVisible();
    for (const [p, nome] of [[bruno, "Bruno"], [carla, "Carla"]] as const) {
      await allaPartitaVeloce(p, nome);
      await p.getByRole("button", { name: "Entra nella stanza" }).click();
    }
    for (const p of pagine) await expect(p.getByRole("heading", { name: "La tua mano" })).toBeVisible();
  } finally {
    await chiudi();
  }
});
