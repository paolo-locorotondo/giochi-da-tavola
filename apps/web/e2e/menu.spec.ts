import { expect, test } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

test("menu: elenca i sette giochi", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Giochi da tavola" })).toBeVisible();
  // Il titolo sta su una riga anche con i tre tasti accanto.
  const titolo = page.getByRole("heading", { name: "Giochi da tavola" });
  const altezza = await titolo.evaluate((h) => h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight));
  expect(altezza).toBeLessThan(1.5);
  await expect(page.locator("a.gioco")).toHaveCount(7);
  // Tutti si giocano offline; Impostore, Tris e Ultima! anche online.
  await expect(page.getByRole("img", { name: "Si gioca offline, con un solo telefono" })).toHaveCount(7);
  await expect(page.getByRole("img", { name: "Si gioca anche online, ognuno col suo telefono" })).toHaveCount(3);
  await expect(page.locator("a.gioco", { hasText: "Impostore" }).getByRole("img", { name: /online/ })).toHaveCount(1);
  await schermata(page, "menu");
});

test("menu: giochi in ordine alfabetico e ricerca con la lente", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".gioco-nome")).toHaveText(["Dadi", "Duello Lampo", "Impostore", "Lupus in fabula", "Tabù", "Tris", "Ultima!"]);
  await expect(page.getByRole("searchbox")).toHaveCount(0);

  await page.getByRole("button", { name: "Cerca un gioco" }).click();
  const ricerca = page.getByRole("searchbox", { name: "Cerca un gioco" });
  await expect(ricerca).toBeFocused();
  await ricerca.fill("TABU");
  await expect(page.locator("a.gioco")).toHaveCount(1);
  await expect(page.locator(".gioco-nome")).toHaveText("Tabù");
  await schermata(page, "ricerca");

  await ricerca.fill("zzz");
  await expect(page.getByText("Nessun gioco trovato.")).toBeVisible();

  await page.getByRole("button", { name: "Cerca un gioco" }).click();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.locator("a.gioco")).toHaveCount(7);
});

test("ogni gioco si apre dal suo indirizzo", async ({ page }) => {
  for (const [percorso, testo] of [
    ["/impostore", "Come giocate?"],
    ["/lupus", "Giocatori (uno per riga, da 8 a 24)"],
    ["/tabu", "Prima squadra"],
    ["/dadi", "Che cosa lanci?"],
    ["/duello-lampo", "Chi sta in basso"],
  ] as const) {
    await page.goto(percorso);
    await expect(page.getByText(testo)).toBeVisible();
  }
});

test("tema: segue il sistema; l'interruttore lo inverte e lo ricorda", async ({ page }, info) => {
  await page.goto("/");
  const atteso = info.project.name === "chiaro" ? "light" : "dark";
  await expect(page.locator("html")).toHaveAttribute("data-tema", atteso);

  const opposto = atteso === "light" ? "dark" : "light";
  await page.getByRole("button", { name: "Impostazioni" }).click();
  // L'etichetta dice il tema in uso e cambia insieme a lui.
  const nomeAttuale = atteso === "light" ? "Tema chiaro" : "Tema scuro";
  const nomeOpposto = atteso === "light" ? "Tema scuro" : "Tema chiaro";
  await page.getByRole("switch", { name: nomeAttuale }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tema", opposto);
  await expect(page.getByRole("switch", { name: nomeOpposto })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-tema", opposto);
});

test("audio: spento di default; l'interruttore lo accende, lo ricorda e lo spegne", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-audio", "off");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  const audio = page.getByRole("switch", { name: "Audio" });
  await expect(audio).not.toBeChecked();
  await audio.click();
  await expect(page.locator("html")).toHaveAttribute("data-audio", "on");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-audio", "on");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("switch", { name: "Audio" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-audio", "off");
});

test("audio: spegnerlo interrompe subito la voce del narratore e acceso la fa ripartire", async ({ page }) => {
  // Sintesi vocale finta: registra cosa viene detto e quante volte viene interrotta.
  await page.addInitScript(() => {
    const w = window as unknown as { __detto: string[]; __stop: number };
    w.__detto = [];
    w.__stop = 0;
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak: (u: { text: string }) => w.__detto.push(u.text), cancel: () => w.__stop++ },
    });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      rate = 1;
      constructor(t: string) {
        this.text = t;
      }
    };
    localStorage.setItem("gdt-audio", "on");
  });
  await page.goto("/lupus");
  await page.getByLabel(/Giocatori/).fill(["Anna", "Luca", "Marco", "Sara", "Elena", "Paolo", "Giulia", "Matteo"].join("\n"));
  await page.getByRole("button", { name: "Inizia" }).click();
  // Il narratore parla dalla prima notte: prima si guardano le 8 carte.
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Mostra il mio ruolo" }).click();
    await page.getByRole("button", { name: "Ho visto, passa il telefono" }).click();
  }
  const detto = () => page.evaluate(() => (window as unknown as { __detto: string[] }).__detto.length);
  // Durante la transizione (5 s) il narratore tace: parla solo dopo.
  expect(await detto()).toBe(0);
  await expect.poll(detto, { timeout: 15000 }).toBeGreaterThan(0);

  const stopPrima = await page.evaluate(() => (window as unknown as { __stop: number }).__stop);
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("switch", { name: "Audio" }).click();
  expect(await page.evaluate(() => (window as unknown as { __stop: number }).__stop)).toBeGreaterThan(stopPrima);
  const dopoSpento = await detto();

  await page.getByRole("switch", { name: "Audio" }).click();
  await expect.poll(detto).toBeGreaterThan(dopoSpento);
});

test("menu: il libro accanto a ogni gioco apre il suo regolamento", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await schermata(page, "impostazioni-menu");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Regolamento di Lupus in fabula" }).click();
  await expect(page.getByRole("heading", { name: "Regolamento · Lupus in fabula" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "I personaggi" })).toBeVisible();
  await schermata(page, "regolamento-menu");
  await page.getByRole("button", { name: "Chiudi" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("impostazioni dentro un gioco: tema, audio e regolamento di quel gioco", async ({ page }) => {
  await page.goto("/tabu");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("button", { name: "Regolamento di gioco" }).click();
  await expect(page.getByText("cinque parole vietate")).toBeVisible();
  await schermata(page, "regolamento-tabu");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("impostazioni: nell'elenco solo quelle dell'app, dentro Lupus anche quelle del gioco (modificabili)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await expect(page.getByRole("switch", { name: "Audio" })).toBeVisible();
  await expect(page.getByText("Schermata di transizione")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.goto("/lupus");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await expect(page.getByRole("switch", { name: "Audio" })).toBeVisible();
  // Transizione: da 1 a 60 secondi, predefinito 5 (solo minuti e secondi); timer della discussione: ore, minuti, secondi.
  const gruppi = page.locator("fieldset.scelta");
  const transizione = gruppi.filter({ hasText: "Schermata di transizione" });
  const discussione = gruppi.filter({ hasText: "Timer della discussione" });
  await expect(transizione.getByLabel("Secondi", { exact: true })).toHaveText("05");
  await expect(transizione.getByLabel("Ore", { exact: true })).toHaveCount(0);
  await schermata(page, "impostazioni-lupus");
  await transizione.getByRole("button", { name: "Aumenta: Secondi" }).click();
  await transizione.getByRole("button", { name: "Aumenta: Secondi" }).click();
  await transizione.getByRole("button", { name: "Aumenta: Secondi" }).click();
  await expect(transizione.getByLabel("Secondi", { exact: true })).toHaveText("08");
  // Il massimo è un minuto: da 0:59 salendo di un minuto si ferma a 1:00.
  await transizione.getByRole("button", { name: "Aumenta: Minuti" }).click();
  await expect(transizione.getByLabel("Minuti", { exact: true })).toHaveText("01");
  await expect(transizione.getByLabel("Secondi", { exact: true })).toHaveText("00");
  // Il minimo è 1 secondo: scendendo di un minuto da 1:00 si arriva a 0:01, non a 0:00.
  await transizione.getByRole("button", { name: "Diminuisci: Minuti" }).click();
  await expect(transizione.getByLabel("Minuti", { exact: true })).toHaveText("00");
  await expect(transizione.getByLabel("Secondi", { exact: true })).toHaveText("01");
  for (let i = 0; i < 7; i++) await transizione.getByRole("button", { name: "Aumenta: Secondi" }).click();
  await expect(transizione.getByLabel("Secondi", { exact: true })).toHaveText("08");

  await expect(discussione.getByLabel("Minuti", { exact: true })).toHaveText("03");
  await discussione.getByRole("button", { name: "Diminuisci: Secondi" }).click();
  await expect(discussione.getByLabel("Minuti", { exact: true })).toHaveText("03");
  await expect(discussione.getByLabel("Secondi", { exact: true })).toHaveText("59");
  // Il massimo è un'ora: salendo di un'ora si ferma a 01:00:00.
  await discussione.getByRole("button", { name: "Aumenta: Ore" }).click();
  await expect(discussione.getByLabel("Ore", { exact: true })).toHaveText("01");
  await expect(discussione.getByLabel("Minuti", { exact: true })).toHaveText("00");
  await expect(discussione.getByLabel("Secondi", { exact: true })).toHaveText("00");
  await discussione.getByRole("button", { name: "Aumenta: Ore" }).click();
  // Il minimo è 1 secondo: a zero ore e zero minuti il timer non scende a 00:00:00.
  await expect(discussione.getByLabel("Secondi", { exact: true })).toHaveText("01");
  await schermata(page, "impostazioni-lupus-timer");
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await expect(page.locator("fieldset.scelta").filter({ hasText: "Schermata di transizione" }).getByLabel("Secondi", { exact: true })).toHaveText("08");
});

test("impostore: indietro dalla modalità torna a «Come giocate?» e solo da lì al menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Impostore/ }).click();
  await page.getByRole("button", { name: /Un solo telefono/ }).click();
  await schermata(page, "impostore-locale");
  await page.getByRole("link", { name: "Indietro" }).click();
  await expect(page.getByText("Come giocate?")).toBeVisible();
  await page.getByRole("link", { name: "Indietro" }).click();
  await expect(page.getByRole("heading", { name: "Giochi da tavola" })).toBeVisible();

  // Anche il tasto indietro del telefono fa un passo solo.
  await page.getByRole("link", { name: /Impostore/ }).click();
  await page.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  await page.goBack();
  await expect(page.getByText("Come giocate?")).toBeVisible();
});

test("barra di gioco: torna ai giochi", async ({ page }) => {
  await page.goto("/tabu");
  await page.getByRole("link", { name: "Indietro" }).click();
  await expect(page.getByRole("heading", { name: "Giochi da tavola" })).toBeVisible();
});

const nomi = (page: import("@playwright/test").Page) => page.locator(".gioco-nome").allTextContents();

test("menu: ordinamento dei giochi con le frecce, salvato sul telefono", async ({ page }) => {
  await page.goto("/");
  const ordina = page.getByRole("button", { name: "Ordina i giochi" });
  await expect(ordina).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".ordina-riga")).toHaveCount(0);

  await ordina.click();
  await expect(ordina).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ordina-riga")).toHaveCount(7);
  await expect(page.getByText("Sposta i giochi con le frecce")).toBeVisible();
  // Durante l'ordinamento la ricerca è spenta e i giochi non si aprono.
  await expect(page.getByRole("button", { name: "Cerca un gioco" })).toBeDisabled();
  await page.locator("a.gioco", { hasText: "Tris" }).click({ force: true });
  await expect(page).toHaveURL(/\/$/);
  // Il primo non sale e l'ultimo non scende; «Ordine alfabetico» è spento finché non c'è un ordine salvato.
  await expect(page.getByRole("button", { name: "Sposta su Dadi" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sposta giù Ultima!" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Ordine alfabetico" })).toBeDisabled();

  // Tris sale in cima con cinque tocchi; il fuoco resta sulla freccia.
  const su = page.getByRole("button", { name: "Sposta su Tris" });
  await su.click();
  await expect(su).toBeFocused();
  for (let i = 0; i < 4; i++) await su.click();
  // In cima la freccia «su» si spegne e il fuoco passa alla freccia «giù» dello stesso gioco.
  await expect(su).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sposta giù Tris" })).toBeFocused();
  expect(await nomi(page)).toEqual(["Tris", "Dadi", "Duello Lampo", "Impostore", "Lupus in fabula", "Tabù", "Ultima!"]);
  // I pulsanti stanno fissi in fondo e la pagina lascia spazio sotto: scorrendo fino in fondo l'ultimo
  // gioco resta tutto sopra la barra. Schermata della finestra, non della pagina intera (la barra è fissa).
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const ultimo = await page.locator(".riga-gioco").last().boundingBox();
  const azioni = await page.locator(".ordina-azioni").boundingBox();
  expect(ultimo!.y + ultimo!.height).toBeLessThanOrEqual(azioni!.y);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot("ordinamento.png", { fullPage: false });

  await page.getByRole("button", { name: "Salva l'ordinamento" }).click();
  await expect(page.locator(".ordina-riga")).toHaveCount(0);
  expect(await nomi(page)).toEqual(["Tris", "Dadi", "Duello Lampo", "Impostore", "Lupus in fabula", "Tabù", "Ultima!"]);

  // Resta dopo un ricaricamento.
  await page.reload();
  expect(await nomi(page)).toEqual(["Tris", "Dadi", "Duello Lampo", "Impostore", "Lupus in fabula", "Tabù", "Ultima!"]);

  // «Annulla» non salva.
  await page.getByRole("button", { name: "Ordina i giochi" }).click();
  await page.getByRole("button", { name: "Sposta giù Tris" }).click();
  expect((await nomi(page))[0]).toBe("Dadi");
  await page.getByRole("button", { name: "Annulla" }).click();
  expect((await nomi(page))[0]).toBe("Tris");

  // «Ordine alfabetico» torna all'ordine di base, anche dopo un ricaricamento.
  await page.getByRole("button", { name: "Ordina i giochi" }).click();
  await page.getByRole("button", { name: "Ordine alfabetico" }).click();
  expect(await nomi(page)).toEqual(["Dadi", "Duello Lampo", "Impostore", "Lupus in fabula", "Tabù", "Tris", "Ultima!"]);
  await page.reload();
  expect(await nomi(page)).toEqual(["Dadi", "Duello Lampo", "Impostore", "Lupus in fabula", "Tabù", "Tris", "Ultima!"]);
});

test("menu: l'ordinamento chiude la ricerca aperta e la ricerca filtra nell'ordine salvato", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Cerca un gioco" }).click();
  await page.getByRole("searchbox", { name: "Cerca un gioco" }).fill("tr");
  await page.getByRole("button", { name: "Ordina i giochi" }).click();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.locator("a.gioco")).toHaveCount(7);
});

test("barra in alto: resta visibile scorrendo, nella home e dentro un gioco", async ({ page }) => {
  for (const [percorso, selettore] of [
    ["/", ".app-testata"],
    ["/duello-lampo", ".barra-gioco"],
  ] as const) {
    await page.goto(percorso);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    const barra = await page.locator(selettore).boundingBox();
    expect(barra, selettore).not.toBeNull();
    expect(Math.round(barra!.y), `${selettore} in cima`).toBeLessThanOrEqual(1);
  }
  // In fondo alla home la versione si legge (il piè di pagina non è fisso).
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(".versione")).toBeInViewport();
});
