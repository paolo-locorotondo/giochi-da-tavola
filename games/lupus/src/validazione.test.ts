import { describe, expect, it } from "vitest";
import { MIN_GIOCATORI, validaConfigurazione } from "./validazione";

describe("validaConfigurazione (Lupus)", () => {
  it("accetta da 8 a 24 giocatori", () => {
    expect(validaConfigurazione(Array.from({ length: 8 }, (_, i) => `G${i}`))).toBeNull();
    expect(validaConfigurazione(Array.from({ length: 24 }, (_, i) => `G${i}`))).toBeNull();
  });

  it("rifiuta più di 24 giocatori", () => {
    expect(validaConfigurazione(Array.from({ length: 25 }, (_, i) => `G${i}`))).toEqual({ codice: "tanti", massimo: 24 });
  });

  it.each([[0], [1], [4], [7]])("rifiuta %i giocatori", (n) => {
    const nomi = Array.from({ length: n }, (_, i) => `G${i}`);
    expect(validaConfigurazione(nomi)).toEqual({ codice: "pochi", minimo: MIN_GIOCATORI });
  });

  it("rifiuta i nomi duplicati, anche con maiuscole diverse", () => {
    expect(validaConfigurazione(["Anna", "Luca", "anna", "Sara"])).toEqual({ codice: "nome-duplicato", nome: "anna" });
  });

  it("rifiuta un nome vuoto e dice a che posto", () => {
    expect(validaConfigurazione(["Anna", "Luca", "  ", "Sara"])).toEqual({ codice: "nome-vuoto", posto: 3 });
  });

  it("i nomi sbagliati hanno la precedenza sul numero minimo", () => {
    expect(validaConfigurazione(["A", "a"])?.codice).toBe("nome-duplicato");
  });

  it("non produce frasi: solo codici uguali in ogni lingua", () => {
    for (const nomi of [["A"], ["A", "a"], ["A", ""]]) {
      expect(typeof validaConfigurazione(nomi)).toBe("object");
    }
  });
});
