import { beforeEach, describe, expect, it } from "vitest";
import { leggiLingua, linguaDelTelefono, scriviLingua, traduttore, type Dizionari } from "./index";

const it_ = {
  "saluto": "Ciao {nome}",
  "giocatori": { one: "{n} giocatore", other: "{n} giocatori" },
  "nessuno": { zero: "nessun giocatore", one: "{n} giocatore", other: "{n} giocatori" },
} as const;
type D = typeof it_;
const dizionari: Dizionari<D> = {
  it: it_,
  en: { saluto: "Hello {nome}", giocatori: { one: "{n} player", other: "{n} players" }, nessuno: { zero: "no players", one: "{n} player", other: "{n} players" } },
};

beforeEach(() => {
  const memoria = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => memoria.get(k) ?? null,
    setItem: (k: string, v: string) => void memoria.set(k, v),
  };
  (globalThis as { window?: unknown }).window = { dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} };
  (globalThis as { document?: unknown }).document = { documentElement: { lang: "" } };
});

describe("traduttore", () => {
  it("sostituisce i segnaposto", () => {
    expect(traduttore(dizionari, "it")("saluto", { nome: "Anna" })).toBe("Ciao Anna");
    expect(traduttore(dizionari, "en")("saluto", { nome: "Anna" })).toBe("Hello Anna");
  });

  it("lascia intatto un segnaposto senza valore", () => {
    expect(traduttore(dizionari, "it")("saluto")).toBe("Ciao {nome}");
  });

  it("sceglie la forma del plurale", () => {
    const t = traduttore(dizionari, "it");
    expect(t("giocatori", { n: 1 })).toBe("1 giocatore");
    expect(t("giocatori", { n: 5 })).toBe("5 giocatori");
    expect(traduttore(dizionari, "en")("giocatori", { n: 1 })).toBe("1 player");
  });

  it("usa la forma «zero» se c'è", () => {
    expect(traduttore(dizionari, "it")("nessuno", { n: 0 })).toBe("nessun giocatore");
    expect(traduttore(dizionari, "it")("giocatori", { n: 0 })).toBe("0 giocatori");
  });
});

describe("lingua scelta", () => {
  it("senza scelta segue il telefono, e se non la conosce usa l'italiano", () => {
    Object.defineProperty(globalThis, "navigator", { value: { language: "en-GB" }, configurable: true });
    expect(linguaDelTelefono()).toBe("en");
    Object.defineProperty(globalThis, "navigator", { value: { language: "de-DE" }, configurable: true });
    expect(linguaDelTelefono()).toBe("it");
  });

  it("la scelta dell'utente vince e imposta lang", () => {
    scriviLingua("en");
    expect(leggiLingua()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("ignora un valore salvato non valido", () => {
    localStorage.setItem("gdt-lingua", "fr");
    Object.defineProperty(globalThis, "navigator", { value: { language: "it-IT" }, configurable: true });
    expect(leggiLingua()).toBe("it");
  });
});
