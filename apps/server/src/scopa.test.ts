import { describe, expect, it } from "vitest";
import type { Vista } from "@gdt/scopa/online";
import { creaStanza, eseguiAzione, mancantiDi, vistaDi as vistaGenerica, type Stanza } from "./stanze";

const vistaDi = (s: Stanza, token: string): Vista => vistaGenerica(s, token);
const NOMI4 = ["Anna", "Bruno", "Carla", "Dino"];

/** Stanza di Scopa con l'organizzatore al posto 1 e gli altri telefoni ai posti seguenti. */
function inSala(nomi: string[], config: unknown = {}): Stanza {
  const s = creaStanza("ABCDE", nomi, config, "host", "scopa");
  eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
  for (let p = 2; p <= nomi.length; p++) {
    s.telefoni.set(`t${p}`, null);
    eseguiAzione(s, `t${p}`, { tipo: "occupa", posto: p });
  }
  return s;
}
const token = (s: Stanza, posto: number) => [...s.telefoni].find(([, p]) => p === posto)![0];

describe("stanza di Scopa sul server", () => {
  it("si crea a 2 o a 4; 3 e configurazioni strane no", () => {
    expect(() => creaStanza("ABCDE", ["A", "B"], {}, "h", "scopa")).not.toThrow();
    expect(() => creaStanza("ABCDE", NOMI4, { soglia: 21 }, "h", "scopa")).not.toThrow();
    expect(() => creaStanza("ABCDE", ["A", "B", "C"], {}, "h", "scopa")).toThrow("numeroGiocatori");
    expect(() => creaStanza("ABCDE", ["A", "B"], { soglia: 5 }, "h", "scopa")).toThrow("configNonValida");
  });

  it("solo l'organizzatore avvia, e solo con tutti i posti scelti", () => {
    const s = creaStanza("ABCDE", ["Anna", "Bruno"], {}, "host", "scopa");
    s.telefoni.set("t2", null);
    eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
    expect(() => eseguiAzione(s, "host", { tipo: "avvia" })).toThrow("pochiHannoScelto");
    eseguiAzione(s, "t2", { tipo: "occupa", posto: 2 });
    expect(() => eseguiAzione(s, "t2", { tipo: "avvia" })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "avvia" });
    expect(vistaDi(s, "host").fase).toBe("partita");
  });

  it("a 4 l'organizzatore scambia le coppie in sala e la vista le mostra", () => {
    const s = inSala(NOMI4);
    expect(vistaDi(s, "host").squadre).toEqual([0, 1, 0, 1]);
    expect(() => eseguiAzione(s, "t2", { tipo: "squadre", a: 3, b: 2 })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "squadre", a: 3, b: 2 });
    expect(vistaDi(s, token(s, 2)).squadre).toEqual([0, 0, 1, 1]);
    eseguiAzione(s, "host", { tipo: "avvia" });
    expect(() => eseguiAzione(s, "host", { tipo: "squadre", a: 1, b: 3 })).toThrow("giaIniziata");
  });

  it("ognuno vede solo la propria mano, a 2 e a 4", () => {
    for (const nomi of [["Anna", "Bruno"], NOMI4]) {
      const s = inSala(nomi);
      eseguiAzione(s, "host", { tipo: "avvia" });
      const mani = s.stato.partita.mani as { id: number }[][];
      nomi.forEach((_, i) => {
        const v = vistaDi(s, token(s, i + 1));
        expect(v.mano.map((c) => c.id)).toEqual(mani[i]!.map((c) => c.id));
        const nelJson = new Set([...JSON.stringify(v).matchAll(/"id":(\d+)/g)].map((m) => Number(m[1])));
        const pubbliche = new Set([...v.mano, ...v.tavolo].map((c) => c.id));
        for (const c of mani.filter((_, j) => j !== i).flat()) if (!pubbliche.has(c.id)) expect(nelJson.has(c.id)).toBe(false);
      });
    }
  });

  it("si gioca solo al proprio turno; chi guarda non agisce; «Simula mossa» solo l'organizzatore", () => {
    const s = inSala(["Anna", "Bruno"]);
    eseguiAzione(s, "host", { tipo: "avvia" });
    const turno = s.stato.partita.turno as number;
    const altro = token(s, turno === 1 ? 2 : 1);
    const carta = (s.stato.partita.mani as { id: number }[][])[turno === 1 ? 1 : 0]![0]!.id;
    expect(() => eseguiAzione(s, altro, { tipo: "gioca", carta })).toThrow("nonTocca");
    s.telefoni.set("spett", null);
    expect(() => eseguiAzione(s, "spett", { tipo: "gioca", carta })).toThrow("nonPartecipa");
    expect(mancantiDi(s)).toEqual([turno]);
    expect(() => eseguiAzione(s, altro, { tipo: "mossaBot", posto: turno })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "mossaBot", posto: turno });
    expect(vistaDi(s, "host").eventi.some((e) => e.tipo === "bot")).toBe(true);
  });

  it("una partita intera a 4 si gioca fino al riepilogo", () => {
    const s = inSala(NOMI4);
    eseguiAzione(s, "host", { tipo: "avvia" });
    for (let i = 0; i < 100 && s.stato.fase === "partita"; i++) eseguiAzione(s, "host", { tipo: "mossaBot", posto: s.stato.partita.turno });
    const v = vistaDi(s, token(s, 2));
    expect(["fineRound", "fine"]).toContain(v.fase);
    expect(v.riepilogo?.prese.flat()).toHaveLength(40);
  });
});
