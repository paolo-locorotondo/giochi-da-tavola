import { beforeEach, describe, expect, it, vi } from "vitest";
import { leggiPreferenza, scriviPreferenza, type ImpostazioneDurata, type ImpostazioneScelta } from "./index";

const IMP: ImpostazioneScelta = {
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

const DURATA: ImpostazioneDurata = {
  tipo: "durata",
  chiave: "timer",
  testo: "Timer",
  min: 1,
  max: 3600,
  predefinito: 180,
  unita: ["Ore", "Minuti", "Secondi"],
};

describe("preferenze dei giochi", () => {
  it("una durata vale il predefinito se manca o è fuori dai limiti", () => {
    expect(leggiPreferenza("lupus", DURATA)).toBe(180);
    scriviPreferenza("lupus", "timer", 90);
    expect(leggiPreferenza("lupus", DURATA)).toBe(90);
    for (const fuori of [0, 3601, -5]) {
      scriviPreferenza("lupus", "timer", fuori);
      expect(leggiPreferenza("lupus", DURATA)).toBe(180);
    }
    localStorage.setItem("gdt-pref-lupus-timer", "abc");
    expect(leggiPreferenza("lupus", DURATA)).toBe(180);
  });

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
