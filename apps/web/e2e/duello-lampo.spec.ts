import { expect, test, type Page } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

const basso = (page: Page) => page.locator(".dl-meta--basso");
const alto = (page: Page) => page.locator(".dl-meta--alto");

/** Entrambi toccano «Sono pronto»: poi parte il conto alla rovescia. */
async function pronti(page: Page) {
  await basso(page).getByRole("button", { name: "Sono pronto" }).click();
  await alto(page).getByRole("button", { name: "Sono pronto" }).click();
}

const NOMI = { via: "Via!", raffica: "Raffica", stop: "Stop al centro", colore: "Colore giusto", panda: "Trova il panda", memoria: "Memoria lampo" } as const;
type Id = keyof typeof NOMI;

/** Imposta le mani di ogni mini gioco (le altre a 0) usando i pulsanti + e −. */
async function impostaMani(page: Page, mani: Partial<Record<Id, number>>) {
  for (const id of Object.keys(NOMI) as Id[]) {
    const nome = NOMI[id];
    const voluto = mani[id] ?? 0;
    const numero = page.getByRole("group", { name: `Mani di ${nome}` }).locator("output");
    while (Number(await numero.textContent()) > voluto) await page.getByRole("button", { name: `Una mano in meno di ${nome}` }).click();
    while (Number(await numero.textContent()) < voluto) await page.getByRole("button", { name: `Una mano in più di ${nome}` }).click();
  }
}

/** Apre il gioco, imposta le mani e inizia. */
async function iniziaCon(page: Page, mani: Partial<Record<Id, number>>) {
  await page.goto("/duello-lampo");
  await impostaMani(page, mani);
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
}

const punti = (page: Page, lato: "basso" | "alto") => page.locator(`.dl-meta--${lato} .dl-punti-numero`);

test("duello lampo: preparazione con le mani di ogni mini gioco", async ({ page }) => {
  await page.goto("/duello-lampo");
  // Predefinito: 2 mani per mini gioco.
  await expect(page.locator(".dl-mani output")).toHaveText(["2", "2", "2", "2", "2", "2"]);
  await expect(page.locator(".dl-totale")).toHaveText("In tutto 12 round");
  await schermata(page, "preparazione");

  await impostaMani(page, { via: 2, stop: 3 });
  await expect(page.locator(".dl-mani output")).toHaveText(["2", "0", "3", "0", "0", "0"]);
  await expect(page.locator(".dl-totale")).toHaveText("In tutto 5 round");
  await expect(page.getByRole("button", { name: "Una mano in meno di Raffica" })).toBeDisabled();

  // Il massimo è 9.
  for (let i = 0; i < 12; i++) {
    const piu = page.getByRole("button", { name: "Una mano in più di Via!" });
    if (await piu.isEnabled()) await piu.click();
  }
  await expect(page.getByRole("button", { name: "Una mano in più di Via!" })).toBeDisabled();
  await expect(page.locator(".dl-mani output").first()).toHaveText("9");

  // Con tutto a zero non si parte.
  await impostaMani(page, {});
  await expect(page.getByRole("alert")).toContainText("Scegli almeno una mano");
  await expect(page.getByRole("button", { name: "Inizia la sfida" })).toBeDisabled();

  await page.getByRole("button", { name: "Tutti" }).click();
  await expect(page.locator(".dl-mani output")).toHaveText(["2", "2", "2", "2", "2", "2"]);
  await page.getByRole("button", { name: "A caso" }).click();
  await expect(page.getByRole("button", { name: "Inizia la sfida" })).toBeEnabled();
});

test("duello lampo: la scelta si ricorda sul telefono", async ({ page }) => {
  await page.goto("/duello-lampo");
  await page.getByLabel("Chi sta in basso").fill("Anna");
  await impostaMani(page, { via: 1, stop: 3 });
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 4");
  await expect(basso(page).locator(".dl-punti-nome")).toHaveText("Anna");
  await page.reload();
  await expect(page.getByLabel("Chi sta in basso")).toHaveValue("Anna");
  await expect(page.locator(".dl-mani output")).toHaveText(["1", "0", "3", "0", "0", "0"]);
});

test("duello lampo: le mani di un mini gioco escono di fila, nell'ordine dell'elenco", async ({ page }) => {
  await iniziaCon(page, { via: 1, raffica: 1, stop: 1 });
  const titolo = basso(page).getByRole("heading");
  await expect(titolo).toHaveText("Via!");
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 3");
  await pronti(page);
  await basso(page).getByRole("button", { name: "Aspetta…" }).dispatchEvent("pointerdown");
  await basso(page).getByRole("button", { name: "Avanti" }).click({ timeout: 5_000 });
  await expect(titolo).toHaveText("Raffica");
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 2 di 3");
});

test("duello lampo: Via! tocco anticipato; la metà in alto è ruotata", async ({ page }) => {
  await iniziaCon(page, { via: 3 });

  await expect(basso(page).getByRole("heading", { name: "Via!" })).toBeVisible();
  // La metà in alto è a testa in giù per chi le sta di fronte.
  await expect(alto(page)).toHaveCSS("transform", /matrix\(-1, .*-1/);
  await schermata(page, "regola");

  await basso(page).getByRole("button", { name: "Sono pronto" }).click();
  await expect(basso(page).getByText("Aspetto l'altro giocatore…")).toBeVisible();
  await alto(page).getByRole("button", { name: "Sono pronto" }).click();

  // Prima del via: chi tocca perde il round.
  await expect(basso(page).getByRole("button", { name: "Aspetta…" })).toBeVisible({ timeout: 10_000 });
  await basso(page).getByRole("button", { name: "Aspetta…" }).dispatchEvent("pointerdown");
  await expect(basso(page).getByRole("status")).toHaveText("Punto per Giocatore 2");
  await expect(alto(page).getByRole("status")).toHaveText("Punto per te!");
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 3");
  // Contatore dei punti: ogni metà mostra il punteggio del suo giocatore.
  await expect(punti(page, "basso")).toHaveText("0");
  await expect(punti(page, "alto")).toHaveText("1");
  await expect(basso(page).getByRole("img", { name: "Punti di Giocatore 1: 0" })).toBeVisible();
  await expect(alto(page).getByRole("img", { name: "Punti di Giocatore 2: 1" })).toBeVisible();
  // Con «Avanti» ancora spento l'immagine cambierebbe da una prova all'altra.
  await expect(basso(page).getByRole("button", { name: "Avanti" })).toBeEnabled();
  await schermata(page, "esito");
});

test("duello lampo: una sfida intera fino alla rivincita", async ({ page }) => {
  await iniziaCon(page, { via: 3 });

  // Il giocatore in basso vince i primi due round toccando all'ORA.
  for (let i = 0; i < 2; i++) {
    await pronti(page);
    await expect(basso(page).getByRole("button", { name: "ORA!" })).toBeVisible({ timeout: 15_000 });
    if (i === 0) await schermata(page, "ora");
    await basso(page).getByRole("button", { name: "ORA!" }).dispatchEvent("pointerdown");
    await expect(basso(page).getByRole("status")).toHaveText("Punto per te!");
    await expect(punti(page, "basso")).toHaveText(String(i + 1));
    await expect(punti(page, "alto")).toHaveText("0");
    const avanti = basso(page).getByRole("button", { name: "Avanti" });
    await expect(avanti).toBeEnabled();
    await avanti.click();
  }
  // Il terzo round (i round sono fissi) lo vince chi sta in alto: 2 a 1 per chi sta in basso.
  await pronti(page);
  await expect(alto(page).getByRole("button", { name: "ORA!" })).toBeVisible({ timeout: 15_000 });
  await alto(page).getByRole("button", { name: "ORA!" }).dispatchEvent("pointerdown");
  await expect(alto(page).getByRole("status")).toHaveText("Punto per te!");
  const finale = basso(page).getByRole("button", { name: "Risultato finale" });
  await expect(finale).toBeEnabled();
  await finale.click();

  await expect(basso(page).getByRole("status")).toHaveText("Hai vinto la sfida!");
  await expect(alto(page).getByRole("status")).toHaveText("Giocatore 1 ha vinto la sfida");
  await schermata(page, "fine");

  await basso(page).getByRole("button", { name: "Rivincita" }).click();
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 3");
  await expect(punti(page, "basso")).toHaveText("0");
  await expect(punti(page, "alto")).toHaveText("0");
});

test("duello lampo: Raffica conta i tocchi e chiude da sola", async ({ page }) => {
  await iniziaCon(page, { raffica: 1 });
  await pronti(page);
  const zonaBasso = basso(page).locator(".dl-raffica");
  await expect(zonaBasso).toBeVisible({ timeout: 10_000 });
  for (let i = 0; i < 5; i++) await zonaBasso.dispatchEvent("pointerdown");
  for (let i = 0; i < 2; i++) await alto(page).locator(".dl-raffica").dispatchEvent("pointerdown");
  await schermata(page, "raffica", { maschera: [".dl-raffica-info"] });
  // Dopo 5 secondi il round si chiude da solo: 5 tocchi contro 2.
  await expect(basso(page).getByRole("status")).toHaveText("Punto per te!", { timeout: 15_000 });
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Tu: 5 tocchi");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Giocatore 2: 2 tocchi");
});

test("duello lampo: Stop al centro si ferma e dà lo scarto", async ({ page }) => {
  await iniziaCon(page, { stop: 1 });
  await pronti(page);
  await expect(basso(page).locator(".dl-stop")).toBeVisible({ timeout: 10_000 });
  await schermata(page, "stop", { maschera: [".dl-pista"] });
  await basso(page).locator(".dl-stop").dispatchEvent("pointerdown");
  await alto(page).locator(".dl-stop").dispatchEvent("pointerdown");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("scarto");
});

test("duello lampo: l'uscita chiede conferma", async ({ page }) => {
  await page.goto("/duello-lampo");
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await page.getByRole("button", { name: "Esci dalla sfida" }).click();
  await page.getByRole("button", { name: "Resta" }).click();
  await expect(basso(page).getByRole("heading")).toBeVisible();
  await page.getByRole("button", { name: "Esci dalla sfida" }).click();
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByText("Chi sta in basso")).toBeVisible();
});

test("duello lampo: Colore giusto, vince chi tocca il colore della scritta", async ({ page }) => {
  await iniziaCon(page, { colore: 1 });
  await expect(basso(page).getByRole("heading", { name: "Colore giusto" })).toBeVisible();
  await pronti(page);
  const parola = basso(page).locator(".dl-colore-parola");
  await expect(parola).toBeVisible({ timeout: 10_000 });
  await schermata(page, "colore");
  const inchiostro = await parola.getAttribute("data-inchiostro");
  // In alto si sbaglia apposta (un colore diverso dall'inchiostro), in basso si risponde giusto.
  const sbagliato = ["rosso", "blu", "verde", "giallo"].find((c) => c !== inchiostro)!;
  await alto(page).locator(`.dl-colore-tasto[data-colore="${sbagliato}"]`).dispatchEvent("pointerdown");
  await basso(page).locator(`.dl-colore-tasto[data-colore="${inchiostro}"]`).dispatchEvent("pointerdown");
  await expect(basso(page).getByRole("status")).toHaveText("Punto per te!");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Giocatore 2: sbagliato");
});

test("duello lampo: Trova il panda, vince chi lo tocca per primo", async ({ page }) => {
  await iniziaCon(page, { panda: 1 });
  await expect(basso(page).getByRole("heading", { name: "Trova il panda" })).toBeVisible();
  await pronti(page);
  await expect(basso(page).locator(".dl-panda-casella")).toHaveCount(16, { timeout: 10_000 });
  await expect(basso(page).getByText("Aspetta il panda…")).toBeVisible();
  await schermata(page, "panda-attesa");
  const pandaAlto = alto(page).locator('.dl-panda-casella[data-panda="true"]');
  await expect(pandaAlto).toBeVisible({ timeout: 10_000 });
  await schermata(page, "panda");
  // In basso si tocca un animale qualsiasi che non è il panda: perde.
  await basso(page).locator(".dl-panda-casella:not([data-panda])").first().dispatchEvent("pointerdown");
  await pandaAlto.dispatchEvent("pointerdown");
  await expect(alto(page).getByRole("status")).toHaveText("Punto per te!");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Tu: sbagliato");
});

test("duello lampo: Memoria lampo, si ripete la sequenza", async ({ page }) => {
  await iniziaCon(page, { memoria: 1 });
  await expect(basso(page).getByRole("heading", { name: "Memoria lampo" })).toBeVisible();
  await pronti(page);
  const griglia = basso(page).locator(".dl-memoria-griglia");
  await expect(griglia).toBeVisible({ timeout: 10_000 });
  await expect(basso(page).getByText("Guarda…")).toBeVisible();
  await expect(basso(page).locator(".dl-memoria-casella--accesa")).toHaveCount(1, { timeout: 5_000 });
  await schermata(page, "memoria");
  const sequenza = (await griglia.getAttribute("data-sequenza"))!.split(",");
  await expect(basso(page).getByText(/^Ripeti! 0 di 4$/)).toBeVisible({ timeout: 10_000 });
  // In basso la sequenza giusta; in alto si sbaglia la prima casella.
  for (const k of sequenza) await basso(page).locator(`.dl-memoria-casella[data-casella="${k}"]`).dispatchEvent("pointerdown");
  const prima = Number(sequenza[0]);
  await alto(page).locator(`.dl-memoria-casella[data-casella="${(prima + 1) % 4}"]`).dispatchEvent("pointerdown");
  await expect(basso(page).locator(".dl-esito-titolo")).toHaveText("Punto per te!");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Giocatore 2: sbagliato");
});
