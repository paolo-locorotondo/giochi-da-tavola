import { describe, expect, it } from "vitest";
import { MAX_CARATTERI_NOME, contaRighe, limitaRighe, limitaTesto, superaRighe } from "./testo";

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
  it("con un massimo di nomi scarta i nomi in più, ma lascia libere le righe vuote", () => {
    expect(limitaRighe("a\nb\nc", 20, 2)).toBe("a\nb\n");
    expect(limitaRighe("a\n\nb\n\n", 20, 2)).toBe("a\n\nb\n\n");
    expect(limitaRighe("a\nb\n\n\n", 20, 2)).toBe("a\nb\n\n\n");
  });
  it("superaRighe dice se i nomi sono più del massimo", () => {
    expect(superaRighe("a\n\nb", 2)).toBe(false);
    expect(superaRighe("a\nb\nc", 2)).toBe(true);
  });
});

describe("contaRighe", () => {
  it("conta solo le righe con un nome", () => {
    expect(contaRighe("Anna\n\n  \nBruno\n")).toBe(2);
    expect(contaRighe("")).toBe(0);
  });
});

it("il massimo dei nomi è 20", () => {
  expect(MAX_CARATTERI_NOME).toBe(20);
});
