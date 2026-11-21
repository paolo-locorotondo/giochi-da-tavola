import { describe, expect, it } from "vitest";
import { creaRng } from "@gdt/engine";
import { traduttore } from "@gdt/i18n";
import { dizionariCarte, eJolly, mazzoFrancese, mazzoItaliano, mescola, nomeCarta, ordinaPerSeme, ordinaPerValore } from "./index";

const ids = (c: { id: number }[]) => c.map((x) => x.id);

describe("mazzoFrancese", () => {
  it("52 carte di base, id 0..51", () => {
    const m = mazzoFrancese();
    expect(m).toHaveLength(52);
    expect(ids(m)).toEqual([...Array(52).keys()]);
  });
  it("due mazzi e 4 jolly: 108 carte con id unici da 0 a 107", () => {
    const m = mazzoFrancese({ mazzi: 2, jolly: 4 });
    expect(m).toHaveLength(108);
    expect(new Set(ids(m)).size).toBe(108);
    expect(m.filter(eJolly)).toHaveLength(4);
    expect(m[107]).toEqual({ id: 107, seme: null, valore: 0 });
  });
  it("ogni carta compare una volta per mazzo", () => {
    const m = mazzoFrancese({ mazzi: 2 });
    const cuori7 = m.filter((c) => c.seme === "cuori" && c.valore === 7);
    expect(cuori7).toHaveLength(2);
    expect(new Set(m.map((c) => `${c.seme}${c.valore}`)).size).toBe(52);
  });
  it("rifiuta parametri non validi", () => {
    expect(() => mazzoFrancese({ mazzi: 0 })).toThrow(RangeError);
    expect(() => mazzoFrancese({ jolly: -1 })).toThrow(RangeError);
  });
});

describe("mazzoItaliano", () => {
  it("40 carte, 10 per seme, id 0..39, valori da 1 a 10", () => {
    const m = mazzoItaliano();
    expect(m).toHaveLength(40);
    expect(ids(m)).toEqual([...Array(40).keys()]);
    for (const seme of ["denari", "coppe", "spade", "bastoni"]) {
      expect(m.filter((c) => c.seme === seme).map((c) => c.valore)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });
  it("è serializzabile così com'è", () => {
    const m = mazzoItaliano();
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});

describe("mescola", () => {
  it("stesso seme, stesso ordine; l'originale non cambia", () => {
    const m = mazzoFrancese({ mazzi: 2, jolly: 4 });
    const copia = [...m];
    const a = mescola(m, creaRng("prova"));
    const b = mescola(m, creaRng("prova"));
    expect(ids(a)).toEqual(ids(b));
    expect(m).toEqual(copia);
  });
  it("conserva le carte e con semi diversi cambia ordine", () => {
    const m = mazzoItaliano();
    const a = mescola(m, creaRng(1));
    const b = mescola(m, creaRng(2));
    expect([...ids(a)].sort((x, y) => x - y)).toEqual(ids(m));
    expect(ids(a)).not.toEqual(ids(b));
    expect(ids(a)).not.toEqual(ids(m));
  });
});

describe("ordinamenti", () => {
  const mano = mescola(mazzoFrancese({ jolly: 2 }), creaRng(5)).slice(0, 14);
  it("per seme: semi raggruppati, valori crescenti, jolly in fondo", () => {
    const o = ordinaPerSeme(mano);
    expect(o).toHaveLength(14);
    const semi = ["cuori", "quadri", "fiori", "picche"];
    const chiave = (c: { seme: string | null; valore: number }) => (c.seme === null ? 99 : semi.indexOf(c.seme) * 100 + c.valore);
    const k = o.map(chiave);
    expect(k).toEqual([...k].sort((x, y) => x - y));
  });
  it("per valore: asso = 1 e jolly in fondo", () => {
    const o = ordinaPerValore([
      { id: 1, seme: null, valore: 0 },
      { id: 2, seme: "picche", valore: 13 },
      { id: 3, seme: "cuori", valore: 1 },
      { id: 4, seme: "fiori", valore: 1 },
    ]);
    expect(ids(o)).toEqual([3, 4, 2, 1]);
  });
  it("non modificano l'originale", () => {
    const copia = [...mano];
    ordinaPerSeme(mano);
    ordinaPerValore(mano);
    expect(mano).toEqual(copia);
  });
});

describe("nomi e lingue", () => {
  const it_ = traduttore(dizionariCarte, "it");
  const en_ = traduttore(dizionariCarte, "en");
  it("nomi parlati italiani", () => {
    expect(nomeCarta(it_, { id: 0, seme: "cuori", valore: 7 })).toBe("Sette di cuori");
    expect(nomeCarta(it_, { id: 0, seme: "bastoni", valore: 9 })).toBe("Cavallo di bastoni");
    expect(nomeCarta(it_, { id: 0, seme: null, valore: 0 })).toBe("Jolly");
  });
  it("nomi inglesi", () => {
    expect(nomeCarta(en_, { id: 0, seme: "picche", valore: 12 })).toBe("Queen of spades");
    expect(nomeCarta(en_, { id: 0, seme: "denari", valore: 7 })).toBe("Seven of coins");
    expect(nomeCarta(en_, { id: 0, seme: null, valore: 0 })).toBe("Joker");
  });
  it("ogni carta di entrambi i mazzi ha un nome", () => {
    for (const c of [...mazzoFrancese({ jolly: 1 }), ...mazzoItaliano()]) {
      expect(nomeCarta(it_, c)).not.toMatch(/valore|seme_/);
      expect(nomeCarta(en_, c)).not.toMatch(/valore|seme_/);
    }
  });
});
