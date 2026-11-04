import { describe, expect, it } from "vitest";
import { creaGiocatori } from "./giocatori";

describe("creaGiocatori", () => {
  it("assegna i posti a partire da 1, nell'ordine dato", () => {
    expect(creaGiocatori(["Anna", "Luca", "Marco"])).toEqual([
      { posto: 1, nome: "Anna" },
      { posto: 2, nome: "Luca" },
      { posto: 3, nome: "Marco" },
    ]);
  });

  it("toglie gli spazi ai bordi del nome", () => {
    expect(creaGiocatori(["  Anna  "])).toEqual([{ posto: 1, nome: "Anna" }]);
  });

  it("rifiuta nomi vuoti", () => {
    expect(() => creaGiocatori(["Anna", "   "])).toThrow(/posto 2/);
  });

  it("rifiuta nomi duplicati, anche con maiuscole diverse", () => {
    expect(() => creaGiocatori(["Anna", "anna"])).toThrow(/duplicato/);
  });
});
