import { describe, expect, it } from "vitest";
import dati from "../data/it/personaggi.json";
import { DESCRIZIONE_RUOLO, NOME_RUOLO, PERSONAGGI_REGOLAMENTO } from "./personaggi";

describe("personaggi (data/it/personaggi.json)", () => {
  it("ci sono i quattro ruoli del gioco", () => {
    expect(Object.keys(dati).sort()).toEqual(["contadino", "lupo", "medico", "veggente"]);
  });

  it.each(Object.entries(dati))("%s: tutti i testi compilati e senza spazi ai bordi", (_, p) => {
    for (const testo of [p.nome, p.tuo, p.regolamento]) {
      expect(testo).not.toBe("");
      expect(testo).toBe(testo.trim());
    }
  });

  it("le esportazioni usano i testi del file", () => {
    expect(NOME_RUOLO.lupo).toBe(dati.lupo.nome);
    expect(DESCRIZIONE_RUOLO.medico).toBe(dati.medico.tuo);
    expect(PERSONAGGI_REGOLAMENTO).toHaveLength(4);
  });
});
