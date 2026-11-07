import { describe, expect, it } from "vitest";
import { MAX_CARATTERI_NOME, limitaRighe, limitaTesto } from "./testo";

describe("limitaTesto", () => {
  it("non tocca il testo corto", () => {
    expect(limitaTesto("Anna", 20)).toBe("Anna");
  });
  it("taglia a max caratteri", () => {
    expect(limitaTesto("abcdef", 3)).toBe("abc");
  });
  it("conta i simboli interi, non le unità UTF-16", () => {
    expect(Array.from(limitaTesto("😀".repeat(30), 20))).toHaveLength(20);
  });
});

describe("limitaRighe", () => {
  it("taglia ogni riga e lascia le altre", () => {
    expect(limitaRighe("abcdef\nxy", 3)).toBe("abc\nxy");
  });
});

it("il massimo dei nomi è 20", () => {
  expect(MAX_CARATTERI_NOME).toBe(20);
});
