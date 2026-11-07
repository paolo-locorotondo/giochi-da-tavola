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

describe("creaGiocatori: altri casi", () => {
  it("elenco vuoto: nessun giocatore", () => {
    expect(creaGiocatori([])).toEqual([]);
  });

  it("accetta gli accenti e accorcia i nomi troppo lunghi", () => {
    const lungo = "Giovanna".repeat(10);
    expect(creaGiocatori(["Niccolò", lungo]).map((g) => g.nome)).toEqual(["Niccolò", lungo.slice(0, 20)]);
  });

  it("il duplicato vale anche con spazi e accenti maiuscoli", () => {
    expect(() => creaGiocatori(["Èva", " èva "])).toThrow(/duplicato/);
  });

  it("nomi che differiscono per l'accento sono diversi", () => {
    expect(creaGiocatori(["Eva", "Èva"])).toHaveLength(2);
  });

  it("il messaggio del nome vuoto indica il posto giusto", () => {
    expect(() => creaGiocatori(["", "B"])).toThrow(/posto 1/);
  });

  it("non modifica l'elenco ricevuto", () => {
    const nomi = [" Anna "];
    creaGiocatori(nomi);
    expect(nomi).toEqual([" Anna "]);
  });
});
