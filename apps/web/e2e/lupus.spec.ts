import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(async ({ page }) => {
  await fissaCaso(page);
  // I test del giro di gioco partono senza transizione (si prova a parte); il valore predefinito è 5 s.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("prova-transizione")) localStorage.setItem("gdt-pref-lupus-transizione", "0");
  });
});

const NOMI = "Anna\nLuca\nMarco\nSara\nElena\nPaolo\nGiulia";

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
  await expect(page.locator("p.errore")).toHaveText("Servono almeno 4 giocatori");
  await schermata(page, "configurazione-errore");

  await page.getByLabel(/Giocatori/).fill("Anna\nLuca\nMarco\nanna");
  await page.getByRole("button", { name: "Inizia" }).click();
  await expect(page.locator("p.errore")).toBeVisible();
});

test("configurazione: il suggerimento sui ruoli cresce con i giocatori", async ({ page }) => {
  await page.goto("/lupus");
  const campo = page.getByLabel(/Giocatori/);
  await campo.fill("A\nB\nC\nD");
  await expect(page.getByText("Ruoli: 1 lupo/i, il resto contadini.")).toBeVisible();
  await campo.fill("A\nB\nC\nD\nE");
  await expect(page.getByText(/1 veggente/)).toBeVisible();
  await campo.fill(NOMI);
  await expect(page.getByText(/1 medico/)).toBeVisible();
});

test("distribuzione delle carte e prima notte", async ({ page }) => {
  await avvia(page);
  await expect(page.getByText("Carta 1 di 7")).toBeVisible();
  await schermata(page, "carta-coperta");
  await page.getByRole("button", { name: "Mostra il mio ruolo" }).click();
  await schermata(page, "carta-scoperta");
  await page.getByRole("button", { name: "Ho visto, passa il telefono" }).click();
  await giraLeCarte(page, 6);

  await expect(page.getByRole("heading", { name: "I lupi scelgono la vittima" })).toBeVisible();
  const conferma = page.getByRole("button", { name: "Conferma" });
  await expect(conferma).toBeDisabled();
  await schermata(page, "notte-lupi");
});

test("la notte non offre candidati vietati", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 7);
  // I lupi non possono sbranarsi tra loro: i candidati sono meno dei giocatori.
  expect(await page.locator("div.giocatori button").count()).toBeLessThan(7);
});

test("un giro completo: notte, alba, voto e nuova notte", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 7);

  // Lupi, veggente, medico: si sceglie il primo candidato e si conferma.
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Conferma" }).click();
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();
  await page.locator("div.giocatori button").first().click();
  await expect(page.getByText(/È un lupo!|Non è un lupo\./)).toBeVisible();
  await schermata(page, "notte-veggente");
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il medico protegge" })).toBeVisible();
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Conferma" }).click();

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

test("la partita sopravvive al refresh e si può chiudere", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 3);
  await page.reload();
  await expect(page.getByText("Carta 4 di 7")).toBeVisible();

  await page.getByRole("button", { name: "Chiudi la partita" }).click();
  await schermata(page, "chiudi-conferma");
  await page.getByRole("button", { name: "No, continua" }).click();
  await expect(page.getByText("Carta 4 di 7")).toBeVisible();
  await page.getByRole("button", { name: "Chiudi la partita" }).click();
  await page.getByRole("button", { name: "Sì, chiudi" }).click();
  await expect(page.getByLabel(/Giocatori/)).toBeVisible();
});

test("pulsanti di fine turno: lupi e medico «Conferma e torna a dormire», veggente «Ho visto, torna a dormire»", async ({ page }) => {
  await avvia(page);
  await giraLeCarte(page, 7);
  await expect(page.getByRole("button", { name: "Conferma e torna a dormire" })).toBeDisabled();
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await page.locator("div.giocatori button").first().click();
  await expect(page.getByRole("button", { name: "Ho visto, torna a dormire" })).toBeEnabled();
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il medico protegge" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Conferma e torna a dormire" })).toBeDisabled();
});

test("transizione: tra un ruolo e l'altro compare una schermata uguale, poi la schermata del ruolo", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("prova-transizione", "1");
    localStorage.setItem("gdt-pref-lupus-transizione", "3");
  });
  await page.clock.install();
  await avvia(page);
  await giraLeCarte(page, 7);

  // Dopo l'ultima carta: prima la transizione, la schermata dei lupi non c'è ancora.
  await expect(page.getByRole("heading", { name: "Occhi chiusi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "I lupi scelgono la vittima" })).toHaveCount(0);
  await schermata(page, "transizione");
  await page.clock.runFor(3500);
  await expect(page.getByRole("heading", { name: "I lupi scelgono la vittima" })).toBeVisible();

  // Dopo la conferma dei lupi: di nuovo la stessa schermata, non quella del veggente.
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Occhi chiusi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toHaveCount(0);
  await page.clock.runFor(3500);
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();
});

test("transizione dell'alba: sole e «Il villaggio si risveglia» prima del racconto della notte", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("prova-transizione", "1");
    localStorage.setItem("gdt-pref-lupus-transizione", "3");
  });
  await page.clock.install();
  await avvia(page);
  await giraLeCarte(page, 7);
  const scegliEConferma = async (pulsante: string) => {
    await page.locator("div.giocatori button").first().click();
    await page.getByRole("button", { name: pulsante }).click();
    await page.clock.runFor(3500);
  };
  await page.clock.runFor(3500); // dopo l'ultima carta
  await scegliEConferma("Conferma e torna a dormire"); // lupi
  await page.locator("div.giocatori button").first().click(); // veggente
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  await page.clock.runFor(3500);
  await page.locator("div.giocatori button").first().click(); // medico
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  // Dopo il medico: transizione del giorno (sole), il racconto della notte non c'è ancora.
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
  await giraLeCarte(page, 7);
  await expect(page.getByRole("heading", { name: "I lupi scelgono la vittima" })).toBeVisible();
});
