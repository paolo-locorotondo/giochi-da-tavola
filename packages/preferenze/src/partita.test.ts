import { beforeEach, describe, expect, it } from "vitest";
import { cancellaPartita, leggiPartita, scriviPartita } from "./partita";

// Un localStorage minimo: l'ambiente di test è Node.
const memoria = new Map<string, string>();
let rotto = false;
const finto = {
  getItem: (k: string) => {
    if (rotto) throw new Error("storage non disponibile");
    return memoria.get(k) ?? null;
  },
  setItem: (k: string, v: string) => {
    if (rotto) throw new Error("storage non disponibile");
    memoria.set(k, v);
  },
  removeItem: (k: string) => {
    if (rotto) throw new Error("storage non disponibile");
    memoria.delete(k);
  },
};
(globalThis as unknown as { localStorage: typeof finto }).localStorage = finto;

const CHIAVE = "gdt.prova.partitaInCorso";
const eNumero = (d: unknown): d is { n: number } => typeof d === "object" && d !== null && typeof (d as { n: unknown }).n === "number";

beforeEach(() => {
  memoria.clear();
  rotto = false;
});

describe("partita in corso", () => {
  it("scrive e rilegge con la chiave gdt.<gioco>.partitaInCorso", () => {
    scriviPartita("prova", 1, { n: 3 });
    expect(memoria.has(CHIAVE)).toBe(true);
    expect(leggiPartita("prova", 1, eNumero)).toEqual({ n: 3 });
  });

  it("senza salvataggio torna null", () => {
    expect(leggiPartita("prova", 1, eNumero)).toBeNull();
  });

  it("scarta (e cancella) un salvataggio di un'altra versione", () => {
    scriviPartita("prova", 1, { n: 3 });
    expect(leggiPartita("prova", 2, eNumero)).toBeNull();
    expect(memoria.has(CHIAVE)).toBe(false);
  });

  it("scarta un JSON non valido", () => {
    memoria.set(CHIAVE, "{non json");
    expect(leggiPartita("prova", 1, eNumero)).toBeNull();
    expect(memoria.has(CHIAVE)).toBe(false);
  });

  it("scarta un salvataggio che non passa il controllo del gioco", () => {
    scriviPartita("prova", 1, { n: "tre" });
    expect(leggiPartita("prova", 1, eNumero)).toBeNull();
    expect(memoria.has(CHIAVE)).toBe(false);
  });

  it("scarta un salvataggio se il controllo lancia", () => {
    scriviPartita("prova", 1, { n: 3 });
    const lancia = (_d: unknown): _d is never => {
      throw new Error("boom");
    };
    expect(leggiPartita("prova", 1, lancia)).toBeNull();
  });

  it("cancella", () => {
    scriviPartita("prova", 1, { n: 3 });
    cancellaPartita("prova");
    expect(leggiPartita("prova", 1, eNumero)).toBeNull();
  });

  it("senza storage non lancia mai", () => {
    rotto = true;
    expect(() => scriviPartita("prova", 1, { n: 3 })).not.toThrow();
    expect(leggiPartita("prova", 1, eNumero)).toBeNull();
    expect(() => cancellaPartita("prova")).not.toThrow();
  });
});
