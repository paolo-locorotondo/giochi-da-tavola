import { describe, expect, it } from "vitest";
import { LINGUE } from "@gdt/i18n";
import { carteDi } from "./carte";

const chiave = (s: string) => s.toLocaleLowerCase();

describe.each(LINGUE)("mazzo di carte (%s)", (lingua) => {
  const CARTE = carteDi(lingua);

  it("ha abbastanza carte per una partita lunga", () => {
    // 10 turni a testa da 120 secondi: servono ben più di un centinaio di carte prima di ripetersi.
    expect(CARTE.length).toBeGreaterThanOrEqual(120);
  });

  it("nessuna parola da indovinare è ripetuta", () => {
    const parole = CARTE.map((c) => chiave(c.parola));
    const doppie = parole.filter((p, i) => parole.indexOf(p) !== i);
    expect(doppie).toEqual([]);
  });

  it.each(CARTE.map((c) => [c.parola, c] as const))("%s: carta ben formata", (_, c) => {
    expect(c.parola).not.toBe("");
    expect(c.parola).toBe(c.parola.trim());
    expect(c.vietate).toHaveLength(5);
    for (const v of c.vietate) {
      expect(v).not.toBe("");
      expect(v).toBe(v.trim());
      expect(chiave(v)).not.toBe(chiave(c.parola));
    }
    expect(new Set(c.vietate.map(chiave)).size).toBe(5);
  });
});
