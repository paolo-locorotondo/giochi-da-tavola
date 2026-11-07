import { expect, test } from "@playwright/test";
import { fissaCaso, schermata } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

test("menu: elenca i quattro giochi", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Giochi da tavola" })).toBeVisible();
  await expect(page.locator("a.gioco")).toHaveCount(4);
  await schermata(page, "menu");
});

test("ogni gioco si apre dal suo indirizzo", async ({ page }) => {
  for (const [percorso, testo] of [
    ["/impostore", "Come giocate?"],
    ["/lupus", "Giocatori (uno per riga, almeno 4)"],
    ["/tabu", "Prima squadra"],
    ["/dadi", "Che cosa lanci?"],
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
  await page.getByLabel(/Giocatori/).fill(["Anna", "Luca", "Marco", "Sara"].join("\n"));
  await page.getByRole("button", { name: "Inizia" }).click();
  // Il narratore parla dalla prima notte: prima si guardano le 4 carte.
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Mostra il mio ruolo" }).click();
    await page.getByRole("button", { name: "Ho visto, passa il telefono" }).click();
  }
  const detto = () => page.evaluate(() => (window as unknown as { __detto: string[] }).__detto.length);
  await expect.poll(detto).toBeGreaterThan(0);

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
  const cinque = page.getByRole("radio", { name: "5 s" });
  await expect(cinque).toBeChecked();
  await schermata(page, "impostazioni-lupus");
  await page.getByRole("radio", { name: "8 s" }).click();
  await expect(page.getByRole("radio", { name: "8 s" })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await expect(page.getByRole("radio", { name: "8 s" })).toBeChecked();
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
