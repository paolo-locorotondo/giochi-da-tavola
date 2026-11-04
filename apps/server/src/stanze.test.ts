import { describe, expect, it } from "vitest";
import { creaStanza, eseguiAzione, vistaDi } from "./stanze";

const cfg = { numImpostori: 1, categoria: "cibi" as const, votiVisibili: false };

describe("permessi", () => {
  it("solo l'organizzatore avvia; ognuno vota per sé", () => {
    const s = creaStanza("ABCDE", ["A", "B", "C"], cfg, "host");
    s.telefoni.set("t2", null);
    s.telefoni.set("t3", null);
    eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
    eseguiAzione(s, "t2", { tipo: "occupa", posto: 2 });
    eseguiAzione(s, "t3", { tipo: "occupa", posto: 3 });
    expect(() => eseguiAzione(s, "t2", { tipo: "avvia" })).toThrow();
    eseguiAzione(s, "host", { tipo: "avvia" });
    expect(vistaDi(s, "t2").carta).not.toBeNull();
    eseguiAzione(s, "host", { tipo: "avanti" });
    eseguiAzione(s, "host", { tipo: "avanti" });
    // Si vota solo per sé: un eventuale campo "per" viene ignorato.
    eseguiAzione(s, "t2", { tipo: "vota", posto: 3, per: 1 } as never);
    expect(s.stato.voti).toEqual({ 2: 3 });
    expect(() => eseguiAzione(s, "t2", { tipo: "escludi", posto: 3 })).toThrow();
    eseguiAzione(s, "host", { tipo: "escludi", posto: 3 });
    expect(s.stato.esclusi).toEqual([3]);
    expect(() => eseguiAzione(s, "t2", { tipo: "occupa", posto: 1 })).toThrow();
  });
});

describe("rientro e chiusura", () => {
  function partitaAvviata() {
    const s = creaStanza("ABCDE", ["A", "B", "C"], cfg, "host");
    s.telefoni.set("t2", null);
    s.telefoni.set("t3", null);
    eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
    eseguiAzione(s, "t2", { tipo: "occupa", posto: 2 });
    eseguiAzione(s, "t3", { tipo: "occupa", posto: 3 });
    eseguiAzione(s, "host", { tipo: "avvia" });
    return s;
  }

  it("un telefono nuovo riprende il posto di un giocatore scollegato", () => {
    const s = partitaAvviata();
    s.telefoni.set("nuovo", null);
    const connessi = new Set(["host", "t3", "nuovo"]); // t2 è caduto
    const connesso = (t: string) => connessi.has(t);
    const assenti = (t: string) => vistaDi(s, t, connesso).nomi.filter((n) => n.inGioco && !n.collegato).map((n) => n.posto);
    expect(assenti("nuovo")).toEqual([2]);
    eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, connesso);
    expect(vistaDi(s, "nuovo", connesso).carta).not.toBeNull();
    expect(assenti("nuovo")).toEqual([]);
    expect(s.telefoni.get("t2")).toBeNull();
  });

  it("non si può prendere il posto di chi è ancora collegato", () => {
    const s = partitaAvviata();
    s.telefoni.set("nuovo", null);
    const tutti = () => true;
    expect(() => eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, tutti)).toThrow();
  });

  it("durante la partita libera il telefono ma il giocatore resta in gioco", () => {
    const s = partitaAvviata();
    eseguiAzione(s, "host", { tipo: "libera", posto: 2 });
    expect(s.telefoni.get("t2")).toBeNull();
    expect(s.stato.inGioco).toContain(2);
    expect(() => eseguiAzione(s, "t3", { tipo: "libera", posto: 3 })).toThrow();
  });
});

