import { describe, expect, it } from "vitest";
import { creaRng } from "@gdt/engine";
import { LINGUE } from "@gdt/i18n";
import { MAX_CARATTERI_FACCIA, MAX_CARATTERI_INFO, eMoneta, facceDaTesto, lancia, limitaInfo, limitaRighe } from "./logica";
import { generaCasuale } from "./casuale";
import { modelliDi } from "./modelli";

describe("lancia", () => {
  it("restituisce sempre un indice valido", () => {
    const rng = creaRng("prova");
    const facce = ["a", "b", "c", "d", "e"];
    for (let i = 0; i < 1000; i++) {
      const r = lancia(facce, rng);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(facce.length);
    }
  });

  it("con lo stesso seme dà la stessa sequenza", () => {
    const a = creaRng(7);
    const b = creaRng(7);
    const f = ["1", "2", "3"];
    expect(Array.from({ length: 20 }, () => lancia(f, a))).toEqual(Array.from({ length: 20 }, () => lancia(f, b)));
  });

  it("rifiuta meno di due facce", () => {
    expect(() => lancia(["solo"], creaRng(1))).toThrow(RangeError);
  });

  it("distribuzione vicina all'uniforme su un D6", () => {
    const rng = creaRng(42);
    const conteggi = [0, 0, 0, 0, 0, 0];
    const giri = 60000;
    const facce = ["1", "2", "3", "4", "5", "6"];
    for (let i = 0; i < giri; i++) {
      const r = lancia(facce, rng);
      conteggi[r] = (conteggi[r] ?? 0) + 1;
    }
    for (const c of conteggi) expect(Math.abs(c / giri - 1 / 6)).toBeLessThan(0.01);
  });
});

describe("generaCasuale", () => {
  it("dà indici validi e raggiunge tutte le facce", () => {
    const rng = generaCasuale();
    const viste = new Set<number>();
    for (let i = 0; i < 600; i++) viste.add(lancia(["a", "b", "c"], rng));
    expect([...viste].sort()).toEqual([0, 1, 2]);
  });

  it("distribuzione vicina all'uniforme", () => {
    const rng = generaCasuale();
    const conteggi = [0, 0, 0, 0, 0, 0];
    const giri = 60000;
    for (let i = 0; i < giri; i++) {
      const r = rng.intero(6);
      conteggi[r] = (conteggi[r] ?? 0) + 1;
    }
    for (const c of conteggi) expect(Math.abs(c / giri - 1 / 6)).toBeLessThan(0.01);
  });

  it("rifiuta n non valido", () => {
    expect(() => generaCasuale().intero(0)).toThrow(RangeError);
  });
});

describe("facceDaTesto", () => {
  it("una faccia per riga, senza righe vuote, spazi ai bordi e doppioni", () => {
    expect(facceDaTesto("  Sì \n\nNo\n   \n Forse \nNo")).toEqual(["Sì", "No", "Forse"]);
  });

  it("testo vuoto: nessuna faccia", () => {
    expect(facceDaTesto("  \n ")).toEqual([]);
  });
});

describe("eMoneta", () => {
  it("due valori sono una moneta, gli altri no", () => {
    expect(eMoneta(["Sì", "No"])).toBe(true);
    expect(eMoneta(["a", "b", "c"])).toBe(false);
  });
});

describe.each(LINGUE)("modelli (%s)", (lingua) => {
  const modelli = modelliDi(lingua);

  it("ci sono moneta e dadi D4…D20 nell'ordine del file", () => {
    expect(modelli.map((m) => m.id)).toEqual(["moneta", "d4", "d6", "d8", "d10", "d12", "d20", "t5"]);
  });

  it.each(modelli.map((m) => [m.id, m] as const))("%s: facce ben formate", (_, m) => {
    expect(m.facce.length).toBeGreaterThanOrEqual(2);
    expect(new Set(m.facce).size).toBe(m.facce.length);
    for (const f of m.facce) expect(f.trim()).toBe(f);
  });
});

describe.each(LINGUE)("spiegazione dei modelli (%s)", (lingua) => {
  it("se c'è, non è vuota e non supera il massimo", () => {
    for (const m of modelliDi(lingua)) {
      if (m.info === undefined) continue;
      expect(m.info.trim()).toBe(m.info);
      expect(m.info.length).toBeGreaterThan(0);
      expect(Array.from(m.info).length).toBeLessThanOrEqual(MAX_CARATTERI_INFO);
    }
  });

  it("il Taboo ha una spiegazione", () => {
    expect(modelliDi(lingua).find((m) => m.id === "t5")?.info).toBeTruthy();
  });
});

describe("spiegazione personalizzata", () => {
  it("limitaInfo taglia a 1000 simboli e conserva gli a capo", () => {
    expect(Array.from(limitaInfo("😀".repeat(MAX_CARATTERI_INFO + 7)))).toHaveLength(MAX_CARATTERI_INFO);
    expect(limitaInfo("a\nb")).toBe("a\nb");
  });
});

describe("limite di caratteri", () => {
  it("accorcia ogni riga, senza toccare le altre", () => {
    const lunga = "a".repeat(MAX_CARATTERI_FACCIA + 5);
    expect(limitaRighe(`${lunga}\nbreve`)).toBe(`${"a".repeat(MAX_CARATTERI_FACCIA)}\nbreve`);
  });

  it("conta i simboli, non le unità UTF-16", () => {
    const emoji = "😀".repeat(MAX_CARATTERI_FACCIA + 3);
    expect(Array.from(limitaRighe(emoji))).toHaveLength(MAX_CARATTERI_FACCIA);
  });

  it("le facce non superano mai il massimo", () => {
    const f = facceDaTesto(`${"x".repeat(50)}\n${"y".repeat(30)}`);
    expect(f).toHaveLength(2);
    for (const v of f) expect(Array.from(v).length).toBeLessThanOrEqual(MAX_CARATTERI_FACCIA);
  });
});
