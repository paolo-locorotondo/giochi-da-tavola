import { describe, expect, it } from "vitest";
import { carteDiPresa, presaPronta, toccaTavolo } from "./composizione";

describe("toccaTavolo", () => {
  it("il tocco su una carta di una presa la mette tra le toccate, senza far partire la mossa", () => {
    expect(toccaTavolo([[3, 4]], [], 3)).toEqual({ tipo: "parziale", toccate: [3] });
    expect(toccaTavolo([[3, 4]], [3], 4)).toEqual({ tipo: "parziale", toccate: [3, 4] });
  });

  it("carte di pari valore: tocchi quella che vuoi", () => {
    expect(toccaTavolo([[7], [9]], [], 9)).toEqual({ tipo: "parziale", toccate: [9] });
  });

  it("una carta fuori da ogni presa non fa niente", () => {
    expect(toccaTavolo([[3, 4]], [], 9)).toEqual({ tipo: "rifiutato" });
  });

  it("toccare di nuovo una carta la toglie; una carta incompatibile fa ripartire", () => {
    const comb = [[1, 2, 4], [3, 4], [2, 5], [6, 8]];
    expect(toccaTavolo(comb, [4], 4)).toEqual({ tipo: "parziale", toccate: [] });
    expect(toccaTavolo(comb, [4], 5)).toEqual({ tipo: "parziale", toccate: [5] });
    expect(toccaTavolo(comb, [4, 2], 6)).toEqual({ tipo: "parziale", toccate: [6] });
  });

  it("carteDiPresa unisce tutte le combinazioni", () => {
    expect([...carteDiPresa([[1, 2], [2, 3]])].sort()).toEqual([1, 2, 3]);
  });
});

describe("presaPronta", () => {
  const comb = [[1, 2, 4], [3, 4], [2, 5]];

  it("senza carte toccate non c'è niente da confermare", () => {
    expect(presaPronta(comb, [])).toBeNull();
  });

  it("le carte toccate sono ancora solo una parte di una presa: non si conferma", () => {
    expect(presaPronta(comb, [4])).toBeNull();
    expect(presaPronta(comb, [1, 2])).toBeNull();
  });

  it("le carte toccate sono esattamente una presa: si conferma, in qualunque ordine", () => {
    expect(presaPronta(comb, [4, 3])).toEqual([3, 4]);
    expect(presaPronta(comb, [4, 1, 2])).toEqual([1, 2, 4]);
  });

  it("una presa di una carta sola si conferma con quella carta", () => {
    expect(presaPronta([[7], [9]], [9])).toEqual([9]);
  });
});
