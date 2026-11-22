import { describe, expect, it } from "vitest";
import { carteDiPresa, toccaTavolo } from "./composizione";

describe("toccaTavolo", () => {
  it("una sola presa: il primo tocco su una sua carta la fa partire intera", () => {
    expect(toccaTavolo([[3, 4]], [], 3)).toEqual({ tipo: "presa", presa: [3, 4] });
  });

  it("carte di pari valore: tocchi quella che vuoi", () => {
    expect(toccaTavolo([[7], [9]], [], 9)).toEqual({ tipo: "presa", presa: [9] });
  });

  it("più somme: si compone con i tocchi fino a una presa sola", () => {
    const comb = [[1, 2, 4], [3, 4], [2, 5]];
    const a = toccaTavolo(comb, [], 4);
    expect(a).toEqual({ tipo: "parziale", toccate: [4] });
    expect(toccaTavolo(comb, [4], 3)).toEqual({ tipo: "presa", presa: [3, 4] });
    expect(toccaTavolo(comb, [4], 1)).toEqual({ tipo: "presa", presa: [1, 2, 4] });
  });

  it("una carta fuori da ogni presa non fa niente", () => {
    expect(toccaTavolo([[3, 4]], [], 9)).toEqual({ tipo: "rifiutato" });
  });

  it("toccare di nuovo una carta la toglie; una carta incompatibile fa ripartire", () => {
    const comb = [[1, 2, 4], [3, 4], [2, 5], [6, 8]];
    expect(toccaTavolo(comb, [4], 4)).toEqual({ tipo: "parziale", toccate: [] });
    expect(toccaTavolo(comb, [4], 5)).toEqual({ tipo: "presa", presa: [2, 5] });
    expect(toccaTavolo(comb, [4, 2], 6)).toEqual({ tipo: "presa", presa: [6, 8] });
  });

  it("carteDiPresa unisce tutte le combinazioni", () => {
    expect([...carteDiPresa([[1, 2], [2, 3]])].sort()).toEqual([1, 2, 3]);
  });
});
