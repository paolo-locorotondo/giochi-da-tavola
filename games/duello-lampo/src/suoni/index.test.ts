import { beforeEach, describe, expect, it, vi } from "vitest";

// I suoni passano da `suona` di @gdt/suoni: lo sostituiamo con un contatore per vedere cosa parte e quando.
const suona = vi.hoisted(() => vi.fn());
vi.mock("@gdt/suoni", () => ({ suona }));

import { FINESTRA_MS, MAX_SOVRAPPOSTI, consenti, suonoGiusto, suonoSbagliato } from "./index";

describe("consenti (limite alle sovrapposizioni)", () => {
  it("lascia passare al massimo MAX_SOVRAPPOSTI suoni nella finestra", () => {
    const recenti: number[] = [];
    const esiti = Array.from({ length: MAX_SOVRAPPOSTI + 2 }, () => consenti(recenti, 1000));
    expect(esiti.filter(Boolean)).toHaveLength(MAX_SOVRAPPOSTI);
  });

  it("riapre dopo la finestra", () => {
    const recenti: number[] = [];
    for (let i = 0; i < MAX_SOVRAPPOSTI; i++) consenti(recenti, 1000);
    expect(consenti(recenti, 1000 + FINESTRA_MS - 1)).toBe(false);
    expect(consenti(recenti, 1000 + FINESTRA_MS)).toBe(true);
  });
});

describe("suonoGiusto e suonoSbagliato", () => {
  beforeEach(() => {
    suona.mockClear();
    vi.spyOn(performance, "now").mockReturnValue(0);
  });

  it("suonano con il disegno di Tabù, uno diverso per giusto e sbagliato", () => {
    suonoGiusto();
    suonoSbagliato();
    expect(suona).toHaveBeenCalledTimes(2);
    const [giusto] = suona.mock.calls[0] as [{ onda: string; note: unknown[] }];
    const [sbagliato] = suona.mock.calls[1] as [{ onda: string; note: unknown[] }];
    expect(giusto).toEqual({ onda: "sine", volume: 0.2, note: [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.16]] });
    expect(sbagliato).toEqual({ onda: "square", volume: 0.12, note: [[165, 0, 0.14], [117, 0.15, 0.26]] });
  });

  it("in una raffica di tocchi il suono non parte per ogni tocco", () => {
    vi.spyOn(performance, "now").mockReturnValue(10_000); // fuori dalla finestra dei test precedenti
    for (let i = 0; i < 10; i++) suonoGiusto();
    expect(suona).toHaveBeenCalledTimes(MAX_SOVRAPPOSTI);
  });
});
