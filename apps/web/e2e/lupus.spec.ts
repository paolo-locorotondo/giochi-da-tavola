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
const NOMI_9 = NOMI + "\nChiara";
const NOMI_11 = NOMI + "\nChiara\nDavide\nIrene";
const NOMI_12 = NOMI_11 + "\nFabio";
const NOMI_13 = NOMI_12 + "\nNadia";
const NOMI_20 = NOMI_13 + "\nOlga\nPino\nRita\nSilvia\nTeo\nUgo\nVera";

async function avvia(page: Page, nomi = NOMI) {
  await page.goto("/lupus");
  await page.getByLabel(/Giocatori/).fill(nomi);
  await page.getByRole("button", { name: "Inizia" }).click();
}

/** Dal racconto dell'alba al linciaggio: discussione, primo turno, arringhe, secondo turno. */
async function votaTutto(page: Page, quale: "primo" | "terzo" = "primo") {
  const bottone = () => {
    const piu = page.getByRole("button", { name: "+" });
    return quale === "primo" ? piu.first() : piu.nth(3);
  };
  await page.getByRole("button", { name: "Si discute e si vota" }).click();
  await page.getByRole("button", { name: "Al primo turno di voto" }).click();
  while (await bottone().isEnabled()) await bottone().click();
  await page.getByRole("button", { name: "Scopri gli indiziati" }).click();
  await page.getByRole("button", { name: "Al secondo turno di voto" }).click();
  // Al secondo turno restano solo i due indiziati: il primo è il più votato.
  const primo = page.getByRole("button", { name: "+" }).first();
  while (await primo.isEnabled()) await primo.click();
  await page.getByRole("button", { name: "Chiudi la votazione" }).click();
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
  await expect(page.getByText("Ruoli: 2 lupi, 1 veggente, 1 medium, 1 indemoniato, 1 medico, 5 contadini.")).toBeVisible();
  await schermata(page, "configurazione-composizione");
  await page.getByLabel("Con il Medico").uncheck();
  await expect(page.getByText("Ruoli: 2 lupi, 1 veggente, 1 medium, 1 indemoniato, 6 contadini.")).toBeVisible();
  await campo.fill(NOMI_13);
  await expect(page.getByText(/2 massoni/)).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Si discute" })).toBeVisible();
  await schermata(page, "discussione");
  await page.getByRole("button", { name: "Al primo turno di voto" }).click();

  await expect(page.getByRole("heading", { name: "Primo turno" })).toBeVisible();
  const scopri = page.getByRole("button", { name: "Scopri gli indiziati" });
  await expect(scopri).toBeDisabled();
  await schermata(page, "voto-primo-turno");
  const piu = page.getByRole("button", { name: "+" }).first();
  while (await piu.isEnabled()) await piu.click();
  await expect(scopri).toBeEnabled();
  await schermata(page, "voto-primo-turno-compilato");
  await scopri.click();

  await expect(page.getByRole("heading", { name: "Gli indiziati" })).toBeVisible();
  await schermata(page, "arringhe");
  await page.getByRole("button", { name: "Al secondo turno di voto" }).click();

  await expect(page.getByRole("heading", { name: "Secondo turno" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+" })).toHaveCount(2);
  await schermata(page, "voto-secondo-turno");
  const piu2 = page.getByRole("button", { name: "+" }).first();
  while (await piu2.isEnabled()) await piu2.click();
  await page.getByRole("button", { name: "Chiudi la votazione" }).click();
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
  await votaTutto(page, "terzo");
  await page.getByRole("button", { name: "Scende la notte" }).click();
  // Dalla seconda notte il medium ascolta lo spirito dell'ultimo linciato, poi il medico.
  await expect(page.getByRole("heading", { name: "Il medium ascolta lo spirito" })).toBeVisible();
  await expect(page.getByText(/Lo spirito di .* (non )?era un lupo\./)).toBeVisible();
  await schermata(page, "notte-medium");
  await page.getByRole("button", { name: "Ho capito, torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il medico protegge" })).toBeVisible();
  expect(await page.locator("div.giocatori button").count()).toBeLessThanOrEqual(10);
  await schermata(page, "notte-medico");
});

test("la prima notte i massoni (13 giocatori) si riconoscono, prima del veggente", async ({ page }) => {
  await avvia(page, NOMI_13);
  await giraLeCarte(page, 13);
  await expect(page.getByRole("heading", { name: "I massoni si riconoscono" })).toBeVisible();
  await expect(page.getByText(/I massoni sono: .+, .+\./)).toBeVisible();
  await expect(page.locator("div.giocatori button")).toHaveCount(0);
  await schermata(page, "notte-massoni");
  await page.getByRole("button", { name: "Ho visto, tornate a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il gufo indica" })).toBeVisible();
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();
});

test("con 12 giocatori il gufo indica uno; non è letale", async ({ page }) => {
  await avvia(page, NOMI_12);
  await giraLeCarte(page, 12);
  await expect(page.getByRole("heading", { name: "Il gufo indica" })).toBeVisible();
  await expect(page.getByText("Chi indichi sarà tra gli indiziati del primo turno.")).toBeVisible();
  await schermata(page, "notte-gufo");
  await expect(page.getByRole("button", { name: "Conferma e torna a dormire" })).toBeDisabled();
  await page.locator("div.giocatori button").last().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();
});

test("con 20 giocatori il gufo è letale", async ({ page }) => {
  await avvia(page, NOMI_20);
  await giraLeCarte(page, 20);
  await page.getByRole("button", { name: "Ho visto, tornate a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il gufo indica" })).toBeVisible();
  await expect(page.getByText(/Gufo Letale: chi indichi muore all'alba/)).toBeVisible();
  await schermata(page, "notte-gufo-letale");
});

test("con 9 giocatori il medium non c'è la prima notte", async ({ page }) => {
  await avvia(page, NOMI_9);
  await giraLeCarte(page, 9);
  await expect(page.getByRole("heading", { name: "Il medium ascolta lo spirito" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Il veggente indaga" })).toBeVisible();
});

test("con 15 giocatori c'è il criceto mannaro: il veggente lo guarda e all'alba muore con lo sbranato", async ({ page }) => {
  const NOMI_15 = NOMI_13 + "\nOlga\nPino";
  await page.goto("/lupus");
  await page.getByLabel(/Giocatori/).fill(NOMI_15);
  await expect(page.getByText(/1 criceto mannaro/)).toBeVisible();
  await page.getByRole("button", { name: "Inizia" }).click();
  await giraLeCarte(page, 15);
  // Notte 1 (massoni, gufo, poi veggente): il nome del criceto si legge dall'elenco del narratore.
  await page.getByRole("button", { name: "Ho visto, tornate a dormire" }).click();
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await page.locator("summary", { hasText: "Giocatori e ruoli" }).click();
  const riga = page.locator("ul.ruoli-narratore li", { hasText: "Criceto mannaro" });
  const nomeCriceto = (await riga.locator(".nome-g").innerText()).trim();
  await page.locator("summary", { hasText: "Giocatori e ruoli" }).click();
  await page.locator("div.giocatori button", { hasText: new RegExp(`^${nomeCriceto}$`) }).click();
  await expect(page.getByText("È un criceto mannaro: morirà insieme allo sbranato dai lupi.")).toBeVisible();
  await schermata(page, "notte-veggente-criceto");
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  // La prima notte nessuno muore (i lupi si riconoscono): si vota, poi alla seconda notte i lupi sbranano.
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await votaTutto(page, "terzo");
  await page.getByRole("button", { name: "Scende la notte" }).click();
  // Seconda notte: medium, gufo, medico, veggente (guarda di nuovo il criceto), lupi.
  await page.getByRole("button", { name: "Ho capito, torna a dormire" }).click();
  await page.locator("div.giocatori button").first().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await page.locator("div.giocatori button").last().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await page.locator("div.giocatori button", { hasText: new RegExp(`^${nomeCriceto}$`) }).click();
  await page.getByRole("button", { name: "Ho visto, torna a dormire" }).click();
  // I lupi sbranano il primo che non è il criceto (e non è il protetto dal medico, che è l'ultimo).
  await page.locator("div.giocatori button", { hasNotText: new RegExp(`^${nomeCriceto}$`) }).first().click();
  await page.getByRole("button", { name: "Conferma e torna a dormire" }).click();
  await expect(page.getByRole("heading", { name: "Il villaggio si risveglia" })).toBeVisible();
  await expect(page.getByText(/Questa notte sono morti/)).toBeVisible();
  await expect(page.locator("section strong")).toHaveCount(2);
  await schermata(page, "alba-due-morti");
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
