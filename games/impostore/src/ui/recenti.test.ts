import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leggiRecenti, ricordaParola } from "./recenti";

const CHIAVE = "gdt.impostore.recenti";

function storageFinto(iniziale: Record<string, string> = {}) {
  const dati = new Map(Object.entries(iniziale));
  return {
    dati,
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: (k: string, v: string) => void dati.set(k, v),
    removeItem: (k: string) => void dati.delete(k),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("parole recenti", () => {
  let storage: ReturnType<typeof storageFinto>;
  beforeEach(() => {
    storage = storageFinto();
    vi.stubGlobal("localStorage", storage);
  });

  it("all'inizio non ce ne sono", () => {
    expect(leggiRecenti("cibi")).toEqual([]);
  });

  it("ricorda le parole in ordine di uscita", () => {
    ricordaParola("cibi", "pizza");
    ricordaParola("cibi", "pasta");
    expect(leggiRecenti("cibi")).toEqual(["pizza", "pasta"]);
  });

  it("le categorie sono indipendenti", () => {
    ricordaParola("cibi", "pizza");
    ricordaParola("sport", "calcio");
    expect(leggiRecenti("cibi")).toEqual(["pizza"]);
    expect(leggiRecenti("sport")).toEqual(["calcio"]);
  });

  it("una parola ripetuta passa in fondo senza duplicarsi", () => {
    for (const p of ["a", "b", "c", "a"]) ricordaParola("cibi", p);
    expect(leggiRecenti("cibi")).toEqual(["b", "c", "a"]);
  });

  it("tiene solo le ultime 10", () => {
    for (let i = 1; i <= 15; i++) ricordaParola("cibi", `p${i}`);
    const r = leggiRecenti("cibi");
    expect(r).toHaveLength(10);
    expect(r[0]).toBe("p6");
    expect(r[9]).toBe("p15");
  });

  it("dati rovinati nello storage: si riparte da vuoto", () => {
    storage.dati.set(CHIAVE, "{non json");
    expect(leggiRecenti("cibi")).toEqual([]);
    expect(() => ricordaParola("cibi", "pizza")).not.toThrow();
    expect(leggiRecenti("cibi")).toEqual(["pizza"]);
  });

  it("valore non array per la categoria: ignorato", () => {
    storage.dati.set(CHIAVE, JSON.stringify({ cibi: "pizza" }));
    expect(leggiRecenti("cibi")).toEqual([]);
  });
});

describe("storage bloccato", () => {
  it("non lancia errori e non ricorda nulla", () => {
    const bloccato = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    vi.stubGlobal("localStorage", bloccato);
    expect(leggiRecenti("cibi")).toEqual([]);
    expect(() => ricordaParola("cibi", "pizza")).not.toThrow();
  });
});
