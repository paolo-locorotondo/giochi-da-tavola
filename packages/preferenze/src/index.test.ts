import { beforeEach, describe, expect, it, vi } from "vitest";
import { leggiPreferenza, scriviPreferenza, type ImpostazioneGioco } from "./index";

const IMP: ImpostazioneGioco = {
  chiave: "durata",
  testo: "Durata",
  opzioni: [
    { valore: 0, testo: "No" },
    { valore: 5, testo: "5 s" },
  ],
  predefinito: 5,
};

beforeEach(() => {
  const dati = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: (k: string, v: string) => void dati.set(k, v),
  });
  vi.stubGlobal("window", new EventTarget());
});

describe("preferenze dei giochi", () => {
  it("senza nulla salvato vale il predefinito", () => {
    expect(leggiPreferenza("lupus", IMP)).toBe(5);
  });

  it("salva e rilegge il valore con il suo tipo", () => {
    scriviPreferenza("lupus", "durata", 0);
    expect(leggiPreferenza("lupus", IMP)).toBe(0);
    expect(localStorage.getItem("gdt-pref-lupus-durata")).toBe("0");
  });

  it("un valore non previsto torna al predefinito", () => {
    localStorage.setItem("gdt-pref-lupus-durata", "99");
    expect(leggiPreferenza("lupus", IMP)).toBe(5);
  });

  it("le preferenze di giochi diversi non si mescolano", () => {
    scriviPreferenza("tabu", "durata", 0);
    expect(leggiPreferenza("lupus", IMP)).toBe(5);
  });

  it("avvisa chi ascolta quando cambia", () => {
    const f = vi.fn();
    window.addEventListener("gdt-preferenza", f);
    scriviPreferenza("lupus", "durata", 0);
    expect(f).toHaveBeenCalledOnce();
  });

  it("senza archivio non lancia errori", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloccato");
      },
      setItem: () => {
        throw new Error("bloccato");
      },
    });
    expect(() => scriviPreferenza("lupus", "durata", 0)).not.toThrow();
    expect(leggiPreferenza("lupus", IMP)).toBe(5);
  });
});
