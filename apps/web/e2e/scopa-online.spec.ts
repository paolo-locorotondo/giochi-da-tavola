import { expect, test, type Browser, type Page } from "@playwright/test";
import { fissaCaso, schermata, controllaMobile } from "./aiuti";

test.beforeEach(({ page }) => fissaCaso(page));

const telefono = { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true };

/** Stanza a 2 (Anna organizzatrice, Bruno) oppure a 4 a coppie (Anna, Bruno, Carla, Dino). */
async function stanza(browser: Browser, posti: 2 | 4) {
  const nomi = ["Anna", "Bruno", "Carla", "Dino"].slice(0, posti);
  const contesti = await Promise.all(nomi.map(() => browser.newContext(telefono)));
  const pagine = await Promise.all(contesti.map((c) => c.newPage()));
  const [host] = pagine;
  await host!.goto("/scopa");
  await host!.getByRole("button", { name: /Ognuno col suo telefono/ }).click();
  if (posti === 4) await host!.getByRole("radio", { name: /In 4/ }).check();
  for (const [i, n] of nomi.entries()) await host!.getByLabel(`Nome del giocatore ${i + 1}`).fill(n);
  await host!.getByRole("button", { name: "Crea la partita" }).click();
  await host!.getByRole("button", { name: "Anna", exact: true }).click();
  await expect(host!).toHaveURL(/\/scopa\/[A-Z0-9]{5}$/);
  const codice = host!.url().split("/").pop()!;
  for (const [i, n] of nomi.entries()) {
    if (i === 0) continue;
    await pagine[i]!.goto(`/scopa/${codice}`);
    await pagine[i]!.getByRole("button", { name: n, exact: true }).click();
  }
  return { pagine, contesti };
}

/** Un telefono gioca la sua prima carta lecita quando tocca a lui, fino alla fine del round. */
async function giocaRound(pagine: Page[], finale: RegExp) {
  for (let i = 0; i < 600; i++) {
    for (const p of pagine) {
      if (await p.getByText(finale).first().isVisible()) return;
      if (await p.locator(".sc-presa").isVisible()) await p.locator(".sc-combinazione").first().click().catch(() => {});
      const carta = p.locator(".sc-mano button:not(:disabled)").first();
      if (await carta.isVisible()) await carta.click({ timeout: 300 }).catch(() => {});
    }
    await pagine[0]!.waitForTimeout(80);
  }
  throw new Error("il round non è finito");
}

test("scopa online a 2: creazione, sala e mano segreta", async ({ browser }) => {
  const { pagine, contesti } = await stanza(browser, 2);
  try {
    const [host, bruno] = pagine as [Page, Page];
    await expect(host.getByRole("button", { name: "Inizia la partita" })).toBeEnabled();
    await expect(bruno.getByText("L'organizzatore avvierà la partita.")).toBeVisible();
    await host.getByRole("button", { name: "Inizia la partita" }).click();
    await expect(host.getByRole("heading", { name: "La tua mano" })).toBeVisible();
    await expect(bruno.getByRole("heading", { name: "La tua mano" })).toBeVisible();
    await controllaMobile(host);
    // La carta di Bruno non è nel DOM di Anna: le mani sono due liste disgiunte.
    const mano = await host.locator(".sc-mano img, .sc-mano [role=img]").count();
    expect(mano).toBe(3);
  } finally {
    await Promise.all(contesti.map((c) => c.close()));
  }
});

test("scopa online a 4: coppie in sala, scambio e partita fino al riepilogo", async ({ browser }) => {
  test.setTimeout(180_000);
  const { pagine, contesti } = await stanza(browser, 4);
  try {
    const host = pagine[0]!;
    await expect(host.getByText("Anna e Carla")).toBeVisible();
    await host.getByRole("button", { name: "Scambia Bruno" }).click();
    await host.getByRole("button", { name: "Scambia Carla" }).click();
    await expect(host.getByText("Anna e Bruno")).toBeVisible();
    await schermata(host, "online-sala-4");
    await host.getByRole("button", { name: "Inizia la partita" }).click();
    await giocaRound(pagine, /Round finito|Partita finita/);
    await expect(host.getByText(/Prossimo round|Ricomincia/)).toBeVisible();
    await controllaMobile(host);
  } finally {
    await Promise.all(contesti.map((c) => c.close()));
  }
});

test("scopa online: «Simula mossa col bot» solo per l'organizzatore; rientro dopo il refresh", async ({ browser }) => {
  const { pagine, contesti } = await stanza(browser, 2);
  try {
    const [host, bruno] = pagine as [Page, Page];
    await host.getByRole("button", { name: "Inizia la partita" }).click();
    await expect(host.getByRole("button", { name: /Simula mossa col bot/ })).toBeVisible();
    await expect(bruno.getByRole("button", { name: /Simula mossa col bot/ })).toHaveCount(0);
    await bruno.reload();
    await expect(bruno.getByRole("heading", { name: "La tua mano" })).toBeVisible();
  } finally {
    await Promise.all(contesti.map((c) => c.close()));
  }
});
