import { LINGUE } from "@gdt/i18n";
import { describe, expect, it } from "vitest";
import { PERSONAGGI, descrizioneRuolo, nomeRuolo, personaggiRegolamento } from "./personaggi";

describe.each(LINGUE)("personaggi (data/%s/personaggi.json)", (lingua) => {
  const dati = PERSONAGGI[lingua];

  it("ci sono i nove ruoli del gioco", () => {
    expect(Object.keys(dati).sort()).toEqual(["contadino", "criceto", "gufo", "indemoniato", "lupo", "massone", "medico", "medium", "mitomane", "veggente"]);
  });

  it.each(Object.entries(dati))("%s: tutti i testi compilati e senza spazi ai bordi", (_, p) => {
    for (const testo of [p.nome, p.plurale, p.tuo, p.regolamento]) {
      expect(testo).not.toBe("");
      expect(testo).toBe(testo.trim());
    }
  });

  it("le funzioni usano i testi del file", () => {
    expect(nomeRuolo("lupo", lingua)).toBe(dati.lupo.nome);
    expect(descrizioneRuolo("medico", lingua)).toBe(dati.medico.tuo);
    expect(personaggiRegolamento(lingua)).toHaveLength(10);
  });
});

describe("personaggi: le lingue sono davvero diverse", () => {
  it("il nome del lupo cambia con la lingua", () => {
    expect(nomeRuolo("lupo", "it")).not.toBe(nomeRuolo("lupo", "en"));
  });
});
