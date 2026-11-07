import { describe, expect, it } from "vitest";
import { nomiDaTesto, validaConfigurazione } from "./validazione";

describe("nomiDaTesto", () => {
  it("un nome per riga, senza spazi ai lati", () => {
    expect(nomiDaTesto("Anna\n  Luca \nMarco")).toEqual(["Anna", "Luca", "Marco"]);
  });

  it("scarta righe vuote e righe di soli spazi", () => {
    expect(nomiDaTesto("\n\nAnna\n   \n\t\nLuca\n")).toEqual(["Anna", "Luca"]);
  });

  it("testo vuoto → nessun nome", () => {
    expect(nomiDaTesto("")).toEqual([]);
    expect(nomiDaTesto(" \n ")).toEqual([]);
  });

  it("tiene i nomi con spazi interni e accenti", () => {
    expect(nomiDaTesto("Maria Rosa\nZoë")).toEqual(["Maria Rosa", "Zoë"]);
  });
});

describe("validaConfigurazione (Impostore)", () => {
  const nomi = (n: number) => Array.from({ length: n }, (_, i) => `G${i + 1}`);

  it("accetta configurazioni valide", () => {
    expect(validaConfigurazione(nomi(3), 1)).toBeNull();
    expect(validaConfigurazione(nomi(7), 3)).toBeNull();
    expect(validaConfigurazione(nomi(12), 5)).toBeNull();
  });

  it.each([[0], [1], [2]])("rifiuta %i giocatori", (n) => {
    expect(validaConfigurazione(nomi(n), 1)).toBe("Servono almeno 3 giocatori");
  });

  it.each([
    [3, 2, 1],
    [4, 2, 1],
    [5, 3, 2],
    [6, 3, 2],
    [10, 5, 4],
  ])("%i giocatori con %i impostori: massimo %i", (n, impostori, massimo) => {
    expect(validaConfigurazione(nomi(n), impostori)).toBe(
      `Con ${n} giocatori gli impostori possono essere al massimo ${massimo}`,
    );
  });

  it("i nomi doppi sono respinti, anche con maiuscole diverse", () => {
    expect(validaConfigurazione(["Anna", "anna", "Luca"], 1)).not.toBeNull();
  });

  it("un nome vuoto è respinto", () => {
    expect(validaConfigurazione(["Anna", " ", "Luca"], 1)).not.toBeNull();
  });

  it("i nomi sbagliati hanno la precedenza sugli altri errori", () => {
    expect(validaConfigurazione(["A", "a"], 5)).not.toBe("Servono almeno 3 giocatori");
  });
});
