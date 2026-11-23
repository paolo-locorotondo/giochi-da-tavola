import { dizionariCarte, mazzoItaliano, type Carta } from "@gdt/carte";
import { traduttore } from "@gdt/i18n";
import { describe, expect, it } from "vitest";
import { dizionari } from "../locales";
import type { Evento } from "../logica";
import { testoEvento } from "./testoEvento";

const M = mazzoItaliano();
const k = (seme: string, valore: number): Carta => M.find((c) => c.seme === seme && c.valore === valore)!;
const nome = (p: number) => `Bot ${p}`;
const riga = (lingua: "it" | "en", e: Evento) => testoEvento(traduttore(dizionari, lingua), traduttore(dizionariCarte, lingua), e, nome);

describe("testo del registro: carte prese", () => {
  const gioca = (carte?: Carta[], prese = carte?.length ?? 2): Evento => ({ tipo: "gioca", posto: 1, carta: k("spade", 7), prese, ...(carte ? { carte } : {}) });
  it("italiano: 1, 2 e 3 carte", () => {
    expect(riga("it", gioca([k("bastoni", 7)]))).toBe("Bot 1 gioca Sette di spade e prende Sette di bastoni");
    expect(riga("it", gioca([k("coppe", 4), k("denari", 3)]))).toBe("Bot 1 gioca Sette di spade e prende Quattro di coppe e Tre di denari");
    expect(riga("it", gioca([k("coppe", 1), k("coppe", 2), k("denari", 4)]))).toBe("Bot 1 gioca Sette di spade e prende Asso di coppe, Due di coppe e Quattro di denari");
  });
  it("inglese: 1, 2 e 3 carte", () => {
    expect(riga("en", gioca([k("coppe", 4)]))).toMatch(/^Bot 1 plays .* and takes [^,]* of cups$/);
    const due = riga("en", gioca([k("coppe", 4), k("denari", 3)]));
    expect(due).toMatch(/ and takes .* of cups and .* of coins$/);
    expect(due).not.toContain(",");
    const tre = riga("en", gioca([k("coppe", 1), k("coppe", 2), k("denari", 4)]));
    expect(tre).toMatch(/ takes .* of cups, .* of cups and .* of coins$/);
  });
  it("evento senza carte (vecchio): il testo col numero", () => {
    expect(riga("it", gioca(undefined, 1))).toBe("Bot 1 gioca Sette di spade e prende 1 carta");
    expect(riga("it", gioca(undefined, 3))).toBe("Bot 1 gioca Sette di spade e prende 3 carte");
    expect(riga("en", gioca(undefined, 2))).toMatch(/and takes 2 cards$/);
  });
  it("carta calata senza presa", () => {
    expect(riga("it", { tipo: "gioca", posto: 2, carta: k("spade", 7), prese: 0, carte: [] })).toBe("Bot 2 cala Sette di spade");
  });
  it("ultima presa: con elenco e senza", () => {
    const e: Evento = { tipo: "ultimaPresa", posto: 1, carte: 2, elenco: [k("spade", 8), k("bastoni", 1)] };
    expect(riga("it", e)).toBe("Bot 1 prende le ultime 2 carte del tavolo: Fante di spade e Asso di bastoni");
    expect(riga("it", { tipo: "ultimaPresa", posto: 1, carte: 1, elenco: [k("spade", 8)] })).toBe("Bot 1 prende l'ultima carta del tavolo: Fante di spade");
    expect(riga("it", { tipo: "ultimaPresa", posto: 1, carte: 2 })).toBe("Bot 1 prende le ultime 2 carte del tavolo");
    expect(riga("en", e)).toMatch(/takes the last 2 cards on the table: .* and .*/);
    expect(riga("en", { tipo: "ultimaPresa", posto: 1, carte: 0 })).toBe("Table empty at the end of the round");
  });
});
