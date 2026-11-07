import { describe, expect, it } from "vitest";
import { MIN_GIOCATORI, validaConfigurazione } from "./validazione";

describe("validaConfigurazione (Lupus)", () => {
  it("accetta da 4 giocatori in su", () => {
    expect(validaConfigurazione(["A", "B", "C", "D"])).toBeNull();
    expect(validaConfigurazione(Array.from({ length: 20 }, (_, i) => `G${i}`))).toBeNull();
  });

  it.each([[0], [1], [2], [3]])("rifiuta %i giocatori", (n) => {
    const nomi = Array.from({ length: n }, (_, i) => `G${i}`);
    expect(validaConfigurazione(nomi)).toBe(`Servono almeno ${MIN_GIOCATORI} giocatori`);
  });

  it("rifiuta i nomi duplicati, anche con maiuscole diverse", () => {
    expect(validaConfigurazione(["Anna", "Luca", "anna", "Sara"])).not.toBeNull();
  });

  it("rifiuta un nome vuoto", () => {
    expect(validaConfigurazione(["Anna", "Luca", "  ", "Sara"])).not.toBeNull();
  });

  it("i nomi sbagliati hanno la precedenza sul numero minimo", () => {
    expect(validaConfigurazione(["A", "a"])).not.toBe(`Servono almeno ${MIN_GIOCATORI} giocatori`);
  });
});
