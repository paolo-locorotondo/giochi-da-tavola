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

const NOMI = { via: "Via!", raffica: "Raffica", stop: "Stop al centro", colore: "Colore giusto", nomi: "Colori e nomi", panda: "Trova il panda", smile: "Trova lo smile", memoria: "Memoria lampo" } as const;
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
  await expect(page.locator(".dl-mg-voce .dl-mani output")).toHaveText(["2", "2", "2", "2", "2", "2", "2", "2"]);
  await expect(page.locator(".dl-totale")).toHaveText("In tutto 16 round");
  await schermata(page, "preparazione");

  await impostaMani(page, { via: 2, stop: 3 });
  await expect(page.locator(".dl-mg-voce .dl-mani output")).toHaveText(["2", "0", "3", "0", "0", "0", "0", "0"]);
  await expect(page.locator(".dl-totale")).toHaveText("In tutto 5 round");
  await expect(page.getByRole("button", { name: "Una mano in meno di Raffica" })).toBeDisabled();

  // Il massimo è 9.
  for (let i = 0; i < 12; i++) {
    const piu = page.getByRole("button", { name: "Una mano in più di Via!" });
    if (await piu.isEnabled()) await piu.click();
  }
  await expect(page.getByRole("button", { name: "Una mano in più di Via!" })).toBeDisabled();
  await expect(page.locator(".dl-mg-voce .dl-mani output").first()).toHaveText("9");

  // Con tutto a zero non si parte.
  await impostaMani(page, {});
  await expect(page.getByRole("alert")).toContainText("Scegli almeno una mano");
  await expect(page.getByRole("button", { name: "Inizia la sfida" })).toBeDisabled();

  await page.getByRole("button", { name: "Tutti" }).click();
  await expect(page.locator(".dl-mg-voce .dl-mani output")).toHaveText(["2", "2", "2", "2", "2", "2", "2", "2"]);
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
  await expect(page.locator(".dl-mg-voce .dl-mani output")).toHaveText(["1", "0", "3", "0", "0", "0", "0", "0"]);
});

test("duello lampo: le mani di un mini gioco escono di fila, nell'ordine dell'elenco", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaMani(page, { via: 1, raffica: 1, stop: 1 });
  await page.getByRole("radio", { name: "Il mio ordine" }).check({ force: true });
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  const titolo = basso(page).getByRole("heading");
  await expect(titolo).toHaveText("Via!");
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 3");
  await pronti(page);
  await expect(basso(page).getByRole("button", { name: "Aspetta…" })).toBeVisible({ timeout: 10_000 });
  await basso(page).getByRole("button", { name: "Aspetta…" }).dispatchEvent("pointerdown");
  await basso(page).getByRole("button", { name: "Avanti" }).click({ timeout: 10_000 });
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

for (const [id, nome, attesa] of [
  ["panda", "Trova il panda", "Aspetta il panda…"],
  ["smile", "Trova lo smile", "Aspetta lo smile…"],
] as const) {
  test(`duello lampo: ${nome}, la griglia cambia e vince chi tocca il bersaglio per primo`, async ({ page }) => {
    await iniziaCon(page, { [id]: 1 });
    await expect(basso(page).getByRole("heading", { name: nome })).toBeVisible();
    await pronti(page);
    await expect(basso(page).locator(".dl-trova-casella")).toHaveCount(16, { timeout: 10_000 });
    await expect(basso(page).getByText(attesa)).toBeVisible();
    // La scritta sta sopra il riquadro della griglia (tra l'intestazione e le figure) e non copre le caselle.
    const sopra = await basso(page).evaluate((meta) => {
      const stato = meta.querySelector(".dl-trova-stato")!.getBoundingClientRect();
      const riquadro = meta.querySelector(".dl-trova")!.getBoundingClientRect();
      const testa = meta.querySelector(".dl-testa")!.getBoundingClientRect();
      const prima = meta.querySelector(".dl-trova-casella")!.getBoundingClientRect();
      return { sotto: stato.top >= testa.bottom, sopra: stato.bottom <= riquadro.top, libere: stato.bottom <= prima.top };
    });
    expect(sopra).toEqual({ sotto: true, sopra: true, libere: true });
    await schermata(page, `${id}-attesa`, { maschera: [".dl-trova-griglia"] });
    const bersaglioAlto = alto(page).locator('.dl-trova-casella[data-bersaglio="true"]');
    await expect(bersaglioAlto).toBeVisible({ timeout: 10_000 });
    await schermata(page, id);
    // Dopo la comparsa le figure continuano a cambiare (il fermo direbbe che il bersaglio è uscito),
    // mentre il bersaglio resta nella sua casella.
    const figure = () =>
      basso(page).locator(".dl-trova-casella svg").evaluateAll((l) => l.map((e) => `${e.getAttribute("class")}|${(e as SVGElement).style.transform}`).join(";"));
    const prima = await figure();
    const casellaBersaglio = await basso(page).locator(".dl-trova-casella").evaluateAll((l) => l.findIndex((e) => e.hasAttribute("data-bersaglio")));
    await expect.poll(figure, { timeout: 3_000 }).not.toBe(prima);
    await expect(basso(page).locator(".dl-trova-casella").nth(casellaBersaglio)).toHaveAttribute("data-bersaglio", "true");
    // In basso si tocca una figura che non è il bersaglio: perde.
    await basso(page).locator(".dl-trova-casella:not([data-bersaglio])").first().dispatchEvent("pointerdown");
    await bersaglioAlto.dispatchEvent("pointerdown");
    await expect(alto(page).locator(".dl-esito-titolo")).toHaveText("Punto per te!");
    await expect(basso(page).locator(".dl-dettagli")).toContainText("Tu: sbagliato");
  });
}

/** Le parole di «Colori e nomi» nella metà in basso: quella sullo schermo e se combacia. */
const parolaNomi = (page: Page) => basso(page).locator(".dl-nomi .dl-colore-parola");

/** Apre il pannello di «Colori e nomi» e imposta parole e parole giuste con i selettori − / +. */
async function impostaNomi(page: Page, parole: number, giuste: number) {
  const pann = page.locator(".dl-mg-riga", { hasText: "Colori e nomi" }).locator("details.dl-imp");
  if (!(await pann.evaluate((d) => (d as HTMLDetailsElement).open))) await pann.locator("summary").click();
  for (const [titolo, voluto] of [["Parole nel round", parole], ["Parole che combaciano", giuste]] as const) {
    const numero = pann.getByRole("group", { name: titolo }).locator("output");
    while (Number(await numero.textContent()) > voluto) await pann.getByRole("button", { name: `Diminuisci: ${titolo}` }).click();
    while (Number(await numero.textContent()) < voluto) await pann.getByRole("button", { name: `Aumenta: ${titolo}` }).click();
  }
}

test("duello lampo: Colori e nomi, impostazioni di parole e parole che combaciano", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaNomi(page, 2, 1);
  const pann = page.locator(".dl-mg-riga", { hasText: "Colori e nomi" }).locator("details.dl-imp");
  // Con 2 parole ne può combaciare al massimo una.
  await expect(pann.getByRole("button", { name: "Aumenta: Parole che combaciano" })).toBeDisabled();
  await expect(pann.getByRole("button", { name: "Diminuisci: Parole nel round" })).toBeDisabled();
  await impostaNomi(page, 10, 9);
  await expect(pann.getByRole("button", { name: "Aumenta: Parole nel round" })).toBeDisabled();
  await expect(pann.getByRole("button", { name: "Aumenta: Parole che combaciano" })).toBeDisabled();
  // Riducendo le parole, quelle giuste scendono da sole al massimo possibile.
  await impostaNomi(page, 4, 3);
  await expect(pann.getByRole("group", { name: "Parole che combaciano" }).locator("output")).toHaveText("3");
  await schermata(page, "impostazioni-nomi");
});

test("duello lampo: Colori e nomi, chi tocca quando non combaciano perde", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaMani(page, { nomi: 1 });
  await impostaNomi(page, 6, 1);
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await expect(basso(page).getByRole("heading", { name: "Colori e nomi" })).toBeVisible();
  await pronti(page);
  // In alto si tocca su una parola che non combacia (con 6 parole e 1 giusta ce n'è sempre una).
  const sbagliata = alto(page).locator(".dl-nomi .dl-colore-parola:not([data-giusta])");
  await expect(sbagliata).toBeVisible({ timeout: 15_000 });
  await schermata(page, "nomi", { maschera: [".dl-colore-parola"] });
  await alto(page).locator(".dl-nomi").dispatchEvent("pointerdown");
  await expect(basso(page).locator(".dl-esito-titolo")).toHaveText("Punto per te!");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Giocatore 2: sbagliato");
});

test("duello lampo: Colori e nomi, vince chi tocca mentre la parola combacia, e lo scorrimento non si ferma", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaMani(page, { nomi: 1 });
  await impostaNomi(page, 8, 2);
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await pronti(page);
  const parola = parolaNomi(page);
  // Durante il round compaiono parole che combaciano e parole che no, in un ordine che cambia.
  await expect(basso(page).locator('.dl-nomi .dl-colore-parola[data-giusta="true"]')).toBeVisible({ timeout: 15_000 });
  expect(await parola.getAttribute("data-parola")).toBe(await parola.getAttribute("data-inchiostro"));
  await basso(page).locator(".dl-nomi").dispatchEvent("pointerdown");
  await expect(basso(page).locator(".dl-esito-titolo")).toHaveText("Punto per te!");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Giocatore 2: nessun tocco");
});

test("duello lampo: con «gli errori contano −1» chi sbaglia perde un punto", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaMani(page, { via: 2 });
  const pannelloVia = page.locator(".dl-mg-riga", { hasText: "Via!" }).locator("details.dl-imp");
  await pannelloVia.locator("summary").click();
  const errori = pannelloVia.getByRole("switch", { name: "Gli errori contano −1" });
  await expect(errori).not.toBeChecked();
  await expect(pannelloVia.getByText("Chi sbaglia perde anche un punto")).toBeVisible();
  await errori.check();
  await page.getByRole("button", { name: "Inizia la sfida" }).click();

  // Round 1: chi sta in basso tocca prima del via. Punto all'altro e −1 a lui.
  await pronti(page);
  await expect(basso(page).getByRole("button", { name: "Aspetta…" })).toBeVisible({ timeout: 10_000 });
  await basso(page).getByRole("button", { name: "Aspetta…" }).dispatchEvent("pointerdown");
  await expect(basso(page).locator(".dl-esito-titolo")).toHaveText("Punto per Giocatore 2");
  await expect(basso(page).locator(".dl-dettagli")).toContainText("Tu: troppo presto (−1)");
  await expect(punti(page, "basso")).toHaveText("-1");
  await expect(punti(page, "alto")).toHaveText("1");
  await expect(basso(page).getByRole("button", { name: "Avanti" })).toBeEnabled();
  await schermata(page, "errore-meno-uno");
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

const pannello = (page: Page, nome: string) => page.locator(".dl-mg-riga", { hasText: nome }).locator("details.dl-imp");

test("duello lampo: impostazioni di ogni mini gioco, in un pannello a scomparsa", async ({ page }) => {
  await page.goto("/duello-lampo");
  // Solo i mini giochi con impostazioni hanno il pannello: tutti e otto ne hanno almeno una.
  await expect(page.locator("details.dl-imp")).toHaveCount(8);
  await expect(page.locator("details.dl-imp[open]")).toHaveCount(0);

  const memoria = pannello(page, "Memoria lampo");
  await memoria.locator("summary").click();
  await expect(memoria.getByRole("radio", { name: "6" }).first()).toBeVisible();
  await memoria.getByRole("group", { name: "Impostazioni di Memoria lampo" }).getByRole("radio", { name: "9" }).first().check({ force: true });
  await expect(memoria.locator("summary")).toContainText("1 modificate");
  await schermata(page, "impostazioni-memoria");

  await memoria.getByRole("button", { name: "Valori di base" }).click();
  await expect(memoria.locator("summary")).not.toContainText("modificate");
  await expect(memoria.getByRole("button", { name: "Valori di base" })).toBeDisabled();
});

test("duello lampo: impostazioni di Trova il panda, griglia, cambi e figure dritte", async ({ page }) => {
  await page.goto("/duello-lampo");
  const panda = pannello(page, "Trova il panda");
  await panda.locator("summary").click();
  const gruppo = panda.getByRole("group", { name: "Impostazioni di Trova il panda" });
  await schermata(page, "impostazioni-panda");

  // Griglia 3×3: i cambi possibili arrivano al massimo a 9.
  await gruppo.getByRole("radio", { name: "3×3" }).check({ force: true });
  await expect(gruppo.getByRole("radio", { name: "9", exact: true })).toBeVisible();
  await expect(gruppo.getByRole("radio", { name: "10", exact: true })).toHaveCount(0);
  // Con griglia 6×6 si arriva a 36.
  await gruppo.getByRole("radio", { name: "6×6" }).check({ force: true });
  await expect(gruppo.getByRole("radio", { name: "36", exact: true })).toBeVisible();
  await gruppo.getByRole("radio", { name: "36", exact: true }).check({ force: true });
  // Restringere la griglia riporta i cambi al massimo permesso.
  await gruppo.getByRole("radio", { name: "3×3" }).check({ force: true });
  await expect(gruppo.getByRole("radio", { name: "9", exact: true })).toBeChecked();

  // «Tutte dritte» spegne «ruotano».
  const ruotano = gruppo.getByRole("switch", { name: /ruotano/ });
  await expect(ruotano).toBeChecked();
  await gruppo.getByRole("switch", { name: /Tutte dritte/ }).check();
  await expect(ruotano).toBeDisabled();
  await expect(ruotano).not.toBeChecked();
  await expect(gruppo.getByText("Spento perché le figure sono tutte dritte")).toBeVisible();
});

test("duello lampo: le impostazioni cambiano il round e si ricordano sul telefono", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaMani(page, { memoria: 1 });
  const memoria = pannello(page, "Memoria lampo");
  await memoria.locator("summary").click();
  const gruppo = memoria.getByRole("group", { name: "Impostazioni di Memoria lampo" });
  await gruppo.getByRole("radio", { name: "6" }).first().check({ force: true });
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await pronti(page);
  await expect(basso(page).locator(".dl-memoria-casella")).toHaveCount(6, { timeout: 10_000 });
  await expect(basso(page).locator(".dl-memoria-griglia")).toHaveCSS("grid-template-columns", /px .*px .*px$/);
  await schermata(page, "memoria-6", { maschera: [".dl-memoria-casella"] });

  // Dopo un ricaricamento la scelta c'è ancora e il pannello mostra «modificate».
  await page.reload();
  await expect(pannello(page, "Memoria lampo").locator("summary")).toContainText("1 modificate");
});

test("duello lampo: Trova il panda 6×6 con cambi diversi", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaMani(page, { panda: 1 });
  const panda = pannello(page, "Trova il panda");
  await panda.locator("summary").click();
  const gruppo = panda.getByRole("group", { name: "Impostazioni di Trova il panda" });
  await gruppo.getByRole("radio", { name: "6×6" }).check({ force: true });
  await gruppo.getByRole("radio", { name: "0,5 s" }).check({ force: true });
  await gruppo.getByRole("switch", { name: /Tutte dritte/ }).check();
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await pronti(page);
  await expect(basso(page).locator(".dl-trova-casella")).toHaveCount(36, { timeout: 10_000 });
  const bersaglio = alto(page).locator('.dl-trova-casella[data-bersaglio="true"]');
  await expect(bersaglio).toBeVisible({ timeout: 15_000 });
  await schermata(page, "panda-6x6");
  await bersaglio.dispatchEvent("pointerdown");
  // Il round si chiude quando hanno risposto tutti e due: in basso si sbaglia.
  await basso(page).locator(".dl-trova-casella:not([data-bersaglio])").first().dispatchEvent("pointerdown");
  await expect(alto(page).locator(".dl-esito-titolo")).toHaveText("Punto per te!");
});

/** I nomi dei mini giochi nell'ordine in cui sono mostrati nella preparazione. */
const elencoMostrato = (page: Page) => page.locator(".dl-mg-riga .dl-mg-nome").allTextContents();

test("duello lampo: ordine a caso di base; con «Il mio ordine» si spostano i mini giochi con le frecce", async ({ page }) => {
  await page.goto("/duello-lampo");
  await expect(page.getByRole("radio", { name: "A caso" })).toBeChecked();
  await expect(page.locator(".dl-sposta")).toHaveCount(0);
  await expect(page.locator(".dl-sequenza")).toHaveText("Ordine casuale, nuovo a ogni sfida");

  await page.getByRole("radio", { name: "Il mio ordine" }).check({ force: true });
  await expect(page.locator(".dl-sposta")).toHaveCount(8);
  // Il primo non sale e l'ultimo non scende.
  await expect(page.getByRole("button", { name: "Sposta su Via!" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sposta giù Memoria lampo" })).toBeDisabled();

  // Stop al centro sale di due posti e diventa il primo; il fuoco resta sulla sua freccia.
  await page.getByRole("button", { name: "Sposta su Stop al centro" }).click();
  await expect(page.getByRole("button", { name: "Sposta su Stop al centro" })).toBeFocused();
  await page.getByRole("button", { name: "Sposta su Stop al centro" }).click();
  expect((await elencoMostrato(page)).slice(0, 3)).toEqual(["Stop al centro", "Via!", "Raffica"]);
  await expect(page.getByRole("button", { name: "Sposta su Stop al centro" })).toBeDisabled();

  await impostaMani(page, { stop: 3, via: 2 });
  await expect(page.locator(".dl-sequenza")).toHaveText("Stop al centro ×3 · Via! ×2");
  await schermata(page, "ordine-mio");

  // L'ordine scelto vale in partita: prima le 3 mani di Stop, poi Via!.
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await expect(basso(page).getByRole("heading")).toHaveText("Stop al centro");
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 1 di 5");
});

test("duello lampo: il proprio ordine resta salvato sul telefono", async ({ page }) => {
  await page.goto("/duello-lampo");
  await page.getByRole("radio", { name: "Il mio ordine" }).check({ force: true });
  await page.getByRole("button", { name: "Sposta giù Via!" }).click();
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Il mio ordine" })).toBeChecked();
  expect((await elencoMostrato(page)).slice(0, 2)).toEqual(["Raffica", "Via!"]);
  // Tornando a «A caso» la scelta resta (ma l'ordine non si usa): rimettendo «Il mio ordine» lo si ritrova.
  await page.getByRole("radio", { name: "A caso" }).check({ force: true });
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await page.reload();
  await expect(page.getByRole("radio", { name: "A caso" })).toBeChecked();
  await page.getByRole("radio", { name: "Il mio ordine" }).check({ force: true });
  expect((await elencoMostrato(page)).slice(0, 2)).toEqual(["Raffica", "Via!"]);
});

test("duello lampo: con l'ordine a caso le mani restano di fila", async ({ page }) => {
  await page.goto("/duello-lampo");
  await impostaMani(page, { via: 2, colore: 2 });
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  const primo = await basso(page).getByRole("heading").textContent();
  expect(["Via!", "Colore giusto"]).toContain(primo);
  // Il secondo round è lo stesso mini gioco del primo (le mani sono di fila).
  await pronti(page);
  if (primo === "Via!") {
    await expect(basso(page).getByRole("button", { name: "Aspetta…" })).toBeVisible({ timeout: 10_000 });
    await basso(page).getByRole("button", { name: "Aspetta…" }).dispatchEvent("pointerdown");
  } else {
    await expect(basso(page).locator(".dl-colore-tasto").first()).toBeVisible({ timeout: 10_000 });
    await basso(page).locator(".dl-colore-tasto").first().dispatchEvent("pointerdown");
    await alto(page).locator(".dl-colore-tasto").first().dispatchEvent("pointerdown");
  }
  await basso(page).getByRole("button", { name: "Avanti" }).click({ timeout: 10_000 });
  await expect(basso(page).getByRole("heading")).toHaveText(primo!);
  await expect(basso(page).locator(".dl-testa")).toContainText("Round 2 di 4");
});
