import { describe, expect, it } from "vitest";
import { VERSIONE_DATI, categorie, lingueParole, nomeCategoria, paroleDi } from "./parole";
import { dizionari } from "./locales";

const norm = (p: string) =>
  p
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

describe("dati delle parole", () => {
  it("la versione dei dati è valida per il codice partita (0..30)", () => {
    expect(Number.isInteger(VERSIONE_DATI)).toBe(true);
    expect(VERSIONE_DATI).toBeGreaterThanOrEqual(0);
    expect(VERSIONE_DATI).toBeLessThanOrEqual(30);
  });

  it("le categorie previste ci sono tutte", () => {
    expect([...categorie].sort()).toEqual(["animali", "cibi", "luoghi", "mestieri", "oggetti", "sport", "trasporti"]);
  });

  it("le lingue delle parole sono quelle dei dizionari", () => {
    expect([...lingueParole].sort()).toEqual(Object.keys(dizionari).sort());
  });

  describe.each(lingueParole)("lingua %s", (lingua) => {
    it.each(categorie)("%s: abbastanza parole, ben formate e senza doppioni", (categoria) => {
      const parole = paroleDi(categoria, lingua);
      expect(parole.length).toBeGreaterThanOrEqual(30);
      for (const p of parole) {
        expect(typeof p).toBe("string");
        expect(p).toBe(p.trim());
        expect(p.length).toBeGreaterThan(1);
      }
      const chiavi = parole.map(norm);
      expect(new Set(chiavi).size).toBe(chiavi.length);
    });

    it.each(categorie)("%s: ha un nome da mostrare", (categoria) => {
      const nome = nomeCategoria(categoria, lingua);
      expect(nome).not.toBe("");
      expect(nome).toBe(nome.trim());
    });
  });
});
