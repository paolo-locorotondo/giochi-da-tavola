import { describe, expect, it } from "vitest";
import type { Vista } from "@gdt/burraco/online";
import { creaStanza, eseguiAzione, mancantiDi, vistaDi as vistaGenerica, type Stanza } from "./stanze";

const vistaDi = (s: Stanza, token: string): Vista => vistaGenerica(s, token);
const NOMI = ["Anna", "Bruno", "Carla", "Dario"];

/** Stanza di Burraco a 4: l'organizzatore al posto 1 e tre telefoni ai posti 2-4, tutti seduti. */
function inSala(nomi = NOMI, config: unknown = {}): Stanza {
  const s = creaStanza("ABCDE", nomi, config, "host", "burraco");
  nomi.slice(1).forEach((_, i) => s.telefoni.set(`t${i + 2}`, null));
  eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
  nomi.slice(1).forEach((_, i) => eseguiAzione(s, `t${i + 2}`, { tipo: "occupa", posto: i + 2 }));
  return s;
}
const avviata = (nomi = NOMI, config: unknown = {}) => {
  const s = inSala(nomi, config);
  eseguiAzione(s, "host", { tipo: "avvia" });
  return s;
};
const tokenDi = (s: Stanza, posto: number) => [...s.telefoni].find(([, p]) => p === posto)![0];

describe("stanza di Burraco sul server", () => {
  it("si crea con 2 o 4 nomi; 3 no; la configurazione viene controllata", () => {
    expect(() => creaStanza("ABCDE", ["A", "B", "C"], {}, "h", "burraco")).toThrow("numeroGiocatori");
    expect(() => creaStanza("ABCDE", ["A", "B"], {}, "h", "burraco")).not.toThrow();
    expect(() => creaStanza("ABCDE", NOMI, { obiettivo: 7 }, "h", "burraco")).toThrow("configNonValida");
    expect(() => creaStanza("ABCDE", NOMI, { obiettivo: 1505, pila: "bloccata" }, "h", "burraco")).not.toThrow();
  });

  it("solo l'organizzatore avvia, e solo con tutti i posti scelti", () => {
    const s = creaStanza("ABCDE", ["Anna", "Bruno"], {}, "host", "burraco");
    s.telefoni.set("t2", null);
    eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
    expect(() => eseguiAzione(s, "host", { tipo: "avvia" })).toThrow("pochiHannoScelto");
    eseguiAzione(s, "t2", { tipo: "occupa", posto: 2 });
    expect(() => eseguiAzione(s, "t2", { tipo: "avvia" })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "avvia" });
    expect(vistaDi(s, "host").fase).toBe("partita");
  });

  it("ognuno vede solo la propria mano e mai i pozzetti", () => {
    const s = avviata();
    const mani = s.stato.partita.mani as { id: number }[][];
    const pozzetti = (s.stato.partita.pozzetti as { id: number }[][]).flat();
    for (let posto = 1; posto <= 4; posto++) {
      const v = vistaDi(s, tokenDi(s, posto));
      expect(v.carte.map((c) => c.id)).toEqual(mani[posto - 1]!.map((c) => c.id));
      const nelJson = new Set([...JSON.stringify(v).matchAll(/"id":(\d+)/g)].map((m) => Number(m[1])));
      for (const c of pozzetti) expect(nelJson.has(c.id)).toBe(false);
      for (const c of mani.filter((_, j) => j !== posto - 1).flat()) {
        if (!v.scarti.some((x) => x.id === c.id)) expect(nelJson.has(c.id)).toBe(false);
      }
    }
  });

  it("si agisce solo al proprio turno e per il proprio posto", () => {
    const s = avviata();
    const turno = s.stato.partita.turno as number;
    const altro = tokenDi(s, turno === 1 ? 2 : 1);
    expect(() => eseguiAzione(s, altro, { tipo: "pesca" })).toThrow("nonTocca");
    expect(() => eseguiAzione(s, altro, { tipo: "pesca", chi: turno })).toThrow("nonTocca");
    expect(mancantiDi(s)).toEqual([turno]);
    eseguiAzione(s, tokenDi(s, turno), { tipo: "pesca" });
    expect(vistaDi(s, tokenDi(s, turno)).fasePasso).toBe("giocare");
    expect(() => eseguiAzione(s, tokenDi(s, turno), { tipo: "cala", gruppi: "no" })).toThrow("combinazioneNonValida");
  });

  it("«Simula mossa col bot» solo l'organizzatore, un passo alla volta", () => {
    const s = avviata();
    const turno = s.stato.partita.turno as number;
    const prima = s.stato.mosse as number;
    expect(() => eseguiAzione(s, "t2", { tipo: "mossaBot", posto: turno })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "mossaBot", posto: turno });
    expect(s.stato.mosse).toBe(prima + 1);
    expect(vistaDi(s, "t2").eventi.some((e) => e.tipo === "bot" && e.posto === turno)).toBe(true);
  });

  it("una mano intera simulata dall'organizzatore (2 e 4 giocatori) arriva alla fine", () => {
    for (const nomi of [NOMI, ["Anna", "Bruno"]]) {
      const s = avviata(nomi, { obiettivo: 0 });
      for (let i = 0; i < 4000 && vistaDi(s, "host").fase === "partita"; i++) {
        eseguiAzione(s, "host", { tipo: "mossaBot", posto: s.stato.partita.turno });
      }
      const v = vistaDi(s, "host");
      expect(v.fase).toBe("fine");
      expect(v.ultima).not.toBeNull();
      expect(() => eseguiAzione(s, "t2", { tipo: "ricomincia" })).toThrow("soloHost");
      eseguiAzione(s, "host", { tipo: "ricomincia" });
      expect(vistaDi(s, "host").fase).toBe("partita");
    }
  });

  it("il telefono caduto si riprende il posto, con la sua mano", () => {
    const s = avviata();
    const miaMano = vistaDi(s, "t2").carte.map((c) => c.id);
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, (t) => t === "t2")).toThrow("altroTelefono");
    eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, () => false);
    expect(vistaDi(s, "nuovo").io).toBe(2);
    expect(vistaDi(s, "nuovo").carte.map((c) => c.id)).toEqual(miaMano);
  });
});
