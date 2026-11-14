import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(async ({ page }) => {
  await fissaCaso(page);
  // I test del giro di gioco partono senza transizione (si prova a parte); il valore predefinito è 5 s.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("prova-transizione")) localStorage.setItem("gdt-pref-lupus-transizione", "0");
  });
});

const NOMI = "Anna\nLuca\nMarco\nSara\nElena\nPaolo\nGiulia\nMatteo";
const NOMI_11 = NOMI + "\nChiara\nDavide\nIrene";

async function avvia(page: Page, nomi = NOMI) {
  await page.goto("/lupus");
  await page.getByLabel(/Giocatori/).fill(nomi);
  await page.getByRole("button", { name: "Inizia" }).click();
}

async function giraLeCarte(page: Page, quante: number) {
  for (let i = 0; i < quante; i++) {
    await page.getByRole("button", { name: "Mostra il mio ruolo" }).click();
    await page.getByRole("button", { name: "Ho visto, passa il telefono" }).click();
  }
}

test("configurazione: validazione dei campi", async ({ page }) => {
  await page.goto("/lupus");
  await schermata(page, "configurazione");

  await page.getByLabel(/Giocatori/).fill("Anna\nLuca\nMarco");
  await page.getByRole("button", { name: "Inizia" }).click();
  await expect(page.locator("p.errore")).toHaveText("Servono almeno 8 giocatori");
  await schermata(page, "configurazione-errore");

  await page.getByLabel(/Giocatori/).fill("Anna\nLuca\nMarco\nanna");
  await page.getByRole("button", { name: "Inizia" }).click();
  await expect(page.locator("p.errore")).toBeVisible();
});

test("configurazione: la composizione cresce con i giocatori e si può cambiare", async ({ page }) => {
  await page.goto("/lupus");
  const campo = page.getByLabel(/Giocatori/);
  await campo.fill(NOMI);
  await expect(page.getByText("Ruoli: 2 lupi, 1 veggente, 5 contadini.")).toBeVisible();
  await campo.fill(NOMI_11);
  await expect(page.getByText("Ruoli: 2 lupi, 1 veggente, 1 medico, 7 contadini.")).toBeVisible();
  await schermata(page, "configurazione-composizione");
  await page.getByLabel("Con il Medico").uncheck();
  await expect(page.getByText("Ruoli: 2 lupi, 1 veggente, 8 contadini.")).toBeVisible();
});

test("distribuzione delle carte e prima notte (veggente, poi lupi che si riconoscono)", async ({ page }) => {
  await avvia(page);
  await expect(page.getByText("Carta 1 di 8")).toBeVisible();
  await schermata(page, "carta-coperta");
  await page.getByRole("button", { name: "Mostra il mio ruolo" }).click();
  await schermata(page, "carta-scoperta");
  await page.getByRole("button", { name: "Ho visto, passa il telefono" }).click();
  await giraLeCarte(page, 7);

  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();

  await expect(page.getByRole("heading", { name: "I lupi scelgono la vittima" })).toBeVisible();
  // La prima notte nessuno viene sbranato: nessun nome da scegliere, si prosegue subito.
  await expect(page.locator("div.giocatori button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conferma e torna a dormire" })).toBeEnabled();
  await schermata(page, "notte-lupi");
});

test("la notte non offre candidati vietati", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 8);
  // Il veggente non indaga su di sé: i candidati sono meno dei giocatori.
  expect(await page.locator("div.giocatori button").count()).toBe(7);
});

test("un giro completo: prima notte, alba, voto e seconda notte", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 8);

  await page.locator("div.giocatori button").first().click();
  await expect(page.getByText(/È un lupo!|Non è un lupo\./)).toBeVisible();
  await schermata(page, "notte-veggente");
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();

  await expect(page.getByRole("heading", { name: "Il villaggio si risveglia" })).toBeVisible();
  await schermata(page, "alba");
  await page.getByRole("button", { name: "Si discute e si vota" }).click();

  await expect(page.getByRole("heading", { name: "Votazione" })).toBeVisible();
  const chiudi = page.getByRole("button", { name: /Chiudi la votazione|Vai al ballottaggio/ });
  await expect(chiudi).toBeDisabled();
  await schermata(page, "votazione");
  // Tutti i vivi votano lo stesso candidato.
  const piu = page.getByRole("button", { name: "+" }).first();
  while (await piu.isEnabled()) await piu.click();
  await expect(chiudi).toBeEnabled();
  await schermata(page, "votazione-compilata");
  await chiudi.click();
  await expect(page.getByRole("heading", { name: /è eliminato/ })).toBeVisible();
  await schermata(page, "esito");
});

test("dalla seconda notte il medico (11 giocatori) si sveglia per primo e non può scegliere sé stesso", async ({ page }) => {
  await avvia(page, NOMI_11);
  await giraLeCarte(page, 11);
  // Prima notte: veggente e lupi, nessun medico.
  await expect(page.getByRole("heading", { name: "Il medico protegge" })).toHaveCount(0);
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await page.getByRole("button", { name: "Si discute e si vota" }).click();
  const piu = page.getByRole("button", { name: "+" }).first();
  while (await piu.isEnabled()) await piu.click();
  await page.getByRole("button", { name: /Chiudi la votazione|Vai al ballottaggio/ }).click();
  await page.getByRole("button", { name: "Scende la notte" }).click();
  await expect(page.getByRole("heading", { name: "Il medico protegge" })).toBeVisible();
  expect(await page.locator("div.giocatori button").count()).toBeLessThanOrEqual(10);
  await schermata(page, "notte-medico");
});

test("la partita sopravvive al refresh e si può chiudere", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 3);
  await page.reload();
  await expect(page.getByText("Carta 4 di 8")).toBeVisible();

  await page.getByRole("button", { name: "Chiudi la partita" }).click();
  await schermata(page, "chiudi-conferma");
  await page.getByRole("button", { name: "No, continua" }).click();
  await expect(page.getByText("Carta 4 di 8")).toBeVisible();
  await page.getByRole("button", { name: "Chiudi la partita" }).click();
  await page.getByRole("button", { name: "Sì, chiudi" }).click();
  await expect(page.getByLabel(/Giocatori/)).toBeVisible();
});

test("pulsanti di fine turno: lupi «Conferma e torna a dormire», veggente «Ho visto, torna a dormire»", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 8);
  await expect(page.getByRole("button", { name: "Ho visto, torna a dormire" })).toBeDisabled();
  await page.locator("div.giocatori button").first().click();
  await expect(page.getByRole("button", { name: "Ho visto, torna a dormire" })).toBeEnabled();
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await expect(page.getByRole("button", { name: "Conferma e torna a dormire" })).toBeEnabled();
});

test("transizione: tra un ruolo e l'altro compare una schermata uguale, poi la schermata del ruolo", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("prova-transizione", "1");
    localStorage.setItem("gdt-pref-lupus-transizione", "3");
  });
  await page.clock.install();
  await avvia(page);
  await giraLeCarte(page, 8);

  // Dopo l'ultima carta: prima la transizione, la schermata del veggente non c'è ancora.
  await expect(page.getByRole("heading", { name: "Occhi chiusi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toHaveCount(0);
  await schermata(page, "transizione");
  await page.clock.runFor(3500);
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();

  // Dopo il veggente: di nuovo la stessa schermata, non quella dei lupi.
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Occhi chiusi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "I lupi scelgono la vittima" })).toHaveCount(0);
  await page.clock.runFor(3500);
  await expect(page.getByRole("heading", { name: "I lupi scelgono la vittima" })).toBeVisible();
});

test("transizione dell'alba: sole e «Il villaggio si risveglia» prima del racconto della notte", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("prova-transizione", "1");
    localStorage.setItem("gdt-pref-lupus-transizione", "3");
  });
  await page.clock.install();
  await avvia(page);
  await giraLeCarte(page, 8);
  await page.clock.runFor(3500); // dopo l'ultima carta
  await page.locator("div.giocatori button").first().click(); // veggente
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await page.clock.runFor(3500);
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click(); // lupi
  // Dopo i lupi: transizione del giorno (sole), il racconto della notte non c'è ancora.
  await expect(page.locator(".transizione-sole")).toBeVisible();
  await expect(page.locator(".transizione-luna")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Il villaggio si risveglia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Si discute e si vota" })).toHaveCount(0);
  await schermata(page, "transizione-alba");
  await page.clock.runFor(3500);
  await expect(page.getByRole("button", { name: "Si discute e si vota" })).toBeVisible();
});

test("transizione: con «No» nelle impostazioni del gioco non compare", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 8);
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();
});
