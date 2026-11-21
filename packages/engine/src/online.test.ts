import { describe, expect, it } from "vitest";
import {
  ATTESA_VELOCE_PREDEFINITA_MS,
  ATTESE_VELOCE_MS,
  CONTO_VELOCE_MS,
  CONTO_VELOCE_SCELTE_MS,
  intervalloPosti,
} from "./index";

describe("intervalloPosti", () => {
  it("elenca i numeri da min a max inclusi", () => {
    expect(intervalloPosti(2, 5)).toEqual([2, 3, 4, 5]);
    expect(intervalloPosti(2, 10)).toHaveLength(9);
  });
  it("con min uguale a max ha un solo valore", () => {
    expect(intervalloPosti(4, 4)).toEqual([4]);
  });
  it("con min maggiore di max è vuoto", () => {
    expect(intervalloPosti(5, 2)).toEqual([]);
  });
});

describe("costanti della partita veloce", () => {
  it("le attese sono 1, 2, 3 e 5 minuti", () => {
    expect(ATTESE_VELOCE_MS).toEqual([60_000, 120_000, 180_000, 300_000]);
  });
  it("l'attesa predefinita è tra quelle scelte (2 minuti)", () => {
    expect(ATTESE_VELOCE_MS).toContain(ATTESA_VELOCE_PREDEFINITA_MS);
    expect(ATTESA_VELOCE_PREDEFINITA_MS).toBe(120_000);
  });
  it("il conto è di 10 secondi, 30 con le squadre scelte in sala", () => {
    expect(CONTO_VELOCE_MS).toBe(10_000);
    expect(CONTO_VELOCE_SCELTE_MS).toBe(30_000);
  });
});
