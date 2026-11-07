import { describe, expect, it } from "vitest";
import { nomiSquadre } from "./validazione";

describe("nomiSquadre", () => {
  it("tiene i nomi scritti, senza spazi ai lati", () => {
    expect(nomiSquadre("  Rossi ", "Blu")).toEqual(["Rossi", "Blu"]);
  });

  it.each([
    ["", ""],
    ["   ", "\t"],
  ])("nomi vuoti (%j, %j) diventano quelli di default", (a, b) => {
    expect(nomiSquadre(a, b)).toEqual(["Squadra 1", "Squadra 2"]);
  });

  it("il default vale per ciascuna squadra separatamente", () => {
    expect(nomiSquadre("", "Blu")).toEqual(["Squadra 1", "Blu"]);
    expect(nomiSquadre("Rossi", " ")).toEqual(["Rossi", "Squadra 2"]);
  });
});
