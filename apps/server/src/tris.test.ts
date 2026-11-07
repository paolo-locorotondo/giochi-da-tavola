import { describe, expect, it } from "vitest";
import type { Vista } from "@gdt/tic-tac-toe/online";
import { creaStanza, eseguiAzione, mancantiDi, vistaDi as vistaGenerica, type Stanza } from "./stanze";

const vistaDi = (s: Stanza, token: string, connesso?: (t: string) => boolean): Vista => vistaGenerica(s, token, connesso);

/** Stanza di Tris con l'organizzatore al posto 1 e un secondo telefono al posto 2. */
function inSala(): Stanza {
  const s = creaStanza("ABCDE", ["Anna", "Bruno"], {}, "host", "tris");
  s.telefoni.set("t2", null);
  eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
  eseguiAzione(s, "t2", { tipo: "occupa", posto: 2 });
  return s;
}
const avviata = () => {
  const s = inSala();
  eseguiAzione(s, "host", { tipo: "avvia" });
  return s;
};

describe("stanza di Tris sul server", () => {
  it("un gioco sconosciuto non si crea; senza gioco è Impostore", () => {
    expect(() => creaStanza("ABCDE", ["A", "B"], {}, "h", "scacchi")).toThrow("Gioco non disponibile online");
    expect(() => creaStanza("ABCDE", ["A", "B"], {}, "h")).toThrow("pochiGiocatori"); // regole di Impostore
  });

  it("solo l'organizzatore avvia; ognuno muove solo dal suo telefono e al suo turno", () => {
    const s = inSala();
    expect(() => eseguiAzione(s, "t2", { tipo: "avvia" })).toThrow();
    eseguiAzione(s, "host", { tipo: "avvia" });
    expect(() => eseguiAzione(s, "t2", { tipo: "muovi", casella: 0 })).toThrow("nonTocca");
    // Un campo «chi» mandato dal telefono viene ignorato: si muove per il proprio posto.
    eseguiAzione(s, "host", { tipo: "muovi", casella: 4, chi: 2 });
    expect(vistaDi(s, "t2").griglia[4]).toBe("X");
    expect(vistaDi(s, "t2").mioTurno).toBe(true);
    expect(vistaDi(s, "host").mioTurno).toBe(false);
    expect(mancantiDi(s)).toEqual([2]);
  });

  it("un terzo telefono guarda ma non può muovere né sedersi", () => {
    const s = avviata();
    s.telefoni.set("t3", null);
    expect(() => eseguiAzione(s, "t3", { tipo: "occupa", posto: 1 })).toThrow("La partita è già iniziata");
    expect(() => eseguiAzione(s, "t3", { tipo: "muovi", casella: 0 })).toThrow("nonPartecipa");
    expect(vistaDi(s, "t3").io).toBeNull();
    expect(vistaDi(s, "t3").griglia).toEqual(vistaDi(s, "host").griglia);
  });

  it("rivincita a due, poi il telefono caduto si riprende il posto da un altro", () => {
    const s = avviata();
    for (const [t, c] of [["host", 0], ["t2", 3], ["host", 1], ["t2", 4], ["host", 2]] as const) {
      eseguiAzione(s, t, { tipo: "muovi", casella: c });
    }
    expect(vistaDi(s, "t2").vincitore).toBe(1);
    eseguiAzione(s, "host", { tipo: "rivincita" });
    expect(vistaDi(s, "t2").fase).toBe("fine");
    eseguiAzione(s, "t2", { tipo: "rivincita" });
    expect(vistaDi(s, "t2").fase).toBe("partita");
    expect(vistaDi(s, "t2").mioTurno).toBe(true); // ora inizia O

    // Il telefono di Bruno cade: un telefono nuovo ne riprende il posto, la partita continua.
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, (t) => t === "t2")).toThrow("collegato da un altro telefono");
    eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, () => false);
    expect(vistaDi(s, "nuovo").mioTurno).toBe(true);
    expect(vistaDi(s, "nuovo").io).toBe(2);
  });

  it("la vista segna chi è collegato e chi organizza", () => {
    const s = inSala();
    const v = vistaDi(s, "t2", (t) => t === "host");
    expect(v.nomi.map((n) => [n.collegato, n.organizzatore])).toEqual([[true, true], [false, false]]);
  });
});
