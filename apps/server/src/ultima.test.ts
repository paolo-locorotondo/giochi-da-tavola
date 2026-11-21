import { describe, expect, it } from "vitest";
import type { Vista } from "@gdt/ultima/online";
import { creaStanza, eseguiAzione, mancantiDi, vistaDi as vistaGenerica, type Stanza } from "./stanze";

const vistaDi = (s: Stanza, token: string, connesso?: (t: string) => boolean): Vista => vistaGenerica(s, token, connesso);

/** Stanza di Ultima! con l'organizzatore al posto 1 e due telefoni ai posti 2 e 3. */
function inSala(config: unknown = {}): Stanza {
  const s = creaStanza("ABCDE", ["Anna", "Bruno", "Carla"], config, "host", "ultima");
  s.telefoni.set("t2", null);
  s.telefoni.set("t3", null);
  eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
  eseguiAzione(s, "t2", { tipo: "occupa", posto: 2 });
  eseguiAzione(s, "t3", { tipo: "occupa", posto: 3 });
  return s;
}
const avviata = (config: unknown = {}) => {
  const s = inSala(config);
  eseguiAzione(s, "host", { tipo: "avvia" });
  return s;
};
const tokenDi = (s: Stanza, posto: number) => [...s.telefoni].find(([, p]) => p === posto)![0];

describe("stanza di Ultima! sul server", () => {
  it("si crea con 2-10 nomi e la configurazione viene controllata", () => {
    expect(() => creaStanza("ABCDE", ["A"], {}, "h", "ultima")).toThrow("numeroGiocatori");
    expect(() => creaStanza("ABCDE", ["A", "B"], { modo: "boh" }, "h", "ultima")).toThrow("configNonValida");
    expect(() => creaStanza("ABCDE", ["A", "B"], { modo: "punti", soglia: 300 }, "h", "ultima")).not.toThrow();
  });

  it("solo l'organizzatore avvia, e solo con tutti i posti scelti", () => {
    const s = creaStanza("ABCDE", ["Anna", "Bruno"], {}, "host", "ultima");
    s.telefoni.set("t2", null);
    eseguiAzione(s, "host", { tipo: "occupa", posto: 1 });
    expect(() => eseguiAzione(s, "host", { tipo: "avvia" })).toThrow("pochiHannoScelto");
    eseguiAzione(s, "t2", { tipo: "occupa", posto: 2 });
    expect(() => eseguiAzione(s, "t2", { tipo: "avvia" })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "avvia" });
    expect(vistaDi(s, "host").fase).toBe("partita");
  });

  it("ognuno vede solo la propria mano: le carte altrui non passano dalla rete", () => {
    const s = avviata();
    const viste = [1, 2, 3].map((p) => vistaDi(s, tokenDi(s, p)));
    const mani = s.stato.partita.mani as { id: number }[][];
    viste.forEach((v, i) => {
      expect(v.mano.map((c) => c.id)).toEqual(mani[i]!.map((c) => c.id));
      const testo = JSON.stringify(v);
      const altre = mani.filter((_, j) => j !== i).flat();
      const nelJson = new Set([...testo.matchAll(/"id":(\d+)/g)].map((m) => Number(m[1])));
      // Una carta altrui può comparire solo se è anche la scoperta o negli eventi (pubblici).
      const pubbliche = new Set([v.scoperta?.id, ...v.eventi.flatMap((e) => ("carta" in e ? [e.carta.id] : []))]);
      for (const c of altre) if (!pubbliche.has(c.id)) expect(nelJson.has(c.id)).toBe(false);
    });
    expect(vistaDi(s, "host").nomi.map((n) => n.carte)).toEqual(mani.map((m) => m.length));
  });

  it("un telefono che guarda non vede nessuna mano e non può agire", () => {
    const s = avviata();
    s.telefoni.set("spett", null);
    expect(vistaDi(s, "spett").mano).toEqual([]);
    expect(vistaDi(s, "spett").io).toBeNull();
    expect(() => eseguiAzione(s, "spett", { tipo: "pesca" })).toThrow("nonPartecipa");
    expect(() => eseguiAzione(s, "spett", { tipo: "occupa", posto: 1 })).toThrow("giaIniziata");
  });

  it("si agisce solo al proprio turno e per il proprio posto", () => {
    const s = avviata();
    const turno = s.stato.partita.turno as number;
    const altro = tokenDi(s, turno === 1 ? 2 : 1);
    expect(() => eseguiAzione(s, altro, { tipo: "pesca" })).toThrow("nonTocca");
    // Un campo «chi» mandato dal telefono viene ignorato.
    expect(() => eseguiAzione(s, altro, { tipo: "pesca", chi: turno })).toThrow("nonTocca");
    expect(mancantiDi(s)).toEqual([turno]);
    eseguiAzione(s, tokenDi(s, turno), { tipo: "pesca" });
    expect(vistaDi(s, tokenDi(s, turno)).haPescato).toBe(true);
  });

  it("«Simula mossa col bot» solo l'organizzatore, e muove per il giocatore di turno", () => {
    const s = avviata();
    const turno = s.stato.partita.turno as number;
    const prima = s.stato.mosse as number;
    expect(() => eseguiAzione(s, "t2", { tipo: "mossaBot", posto: turno })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "mossaBot", posto: turno });
    expect(s.stato.mosse).toBe(prima + 1);
    expect(vistaDi(s, "t2").eventi.some((e) => e.tipo === "bot" && e.posto === turno)).toBe(true);
  });

  it("una partita intera simulata dall'organizzatore arriva alla fine", () => {
    const s = avviata();
    for (let i = 0; i < 4000 && vistaDi(s, "host").fase === "partita"; i++) {
      const p = s.stato.partita;
      const chi = p.ultime.find((u: { dichiarata: boolean }) => !u.dichiarata)?.posto ?? p.turno;
      eseguiAzione(s, "host", { tipo: "mossaBot", posto: chi });
    }
    expect(vistaDi(s, "host").fase).toBe("fine");
    expect(vistaDi(s, "t2").vincitore).not.toBeNull();
  });

  it("round a punti: «prossimo round» solo l'organizzatore", () => {
    const s = avviata({ modo: "punti", soglia: 2000 });
    for (let i = 0; i < 4000 && vistaDi(s, "host").fase === "partita"; i++) {
      const p = s.stato.partita;
      eseguiAzione(s, "host", { tipo: "mossaBot", posto: p.ultime.find((u: { dichiarata: boolean }) => !u.dichiarata)?.posto ?? p.turno });
    }
    expect(vistaDi(s, "host").fase).toBe("fineRound");
    expect(() => eseguiAzione(s, "t2", { tipo: "prossimoRound" })).toThrow("soloHost");
    eseguiAzione(s, "host", { tipo: "prossimoRound" });
    expect(vistaDi(s, "host").fase).toBe("partita");
    expect(vistaDi(s, "host").round).toBe(2);
  });

  it("il telefono caduto si riprende il posto da un altro, con la sua mano", () => {
    const s = avviata();
    const miaMano = vistaDi(s, "t2").mano.map((c) => c.id);
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, (t) => t === "t2")).toThrow("altroTelefono");
    eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 2 }, () => false);
    expect(vistaDi(s, "nuovo").io).toBe(2);
    expect(vistaDi(s, "nuovo").mano.map((c) => c.id)).toEqual(miaMano);
  });

  it("la vista segna chi è collegato e chi organizza", () => {
    const s = inSala();
    const v = vistaDi(s, "t2", (t) => t === "host");
    expect(v.nomi.map((n) => [n.collegato, n.organizzatore])).toEqual([[true, true], [false, false], [false, false]]);
  });

  it("senza partita veloce: il gioco non la offre", () => {
    expect(() => creaStanza("ABCDE", ["A", "B"], {}, "h", "ultima")).not.toThrow();
  });
});

describe("varianti sul server", () => {
  it("la configurazione con le varianti viene controllata alla creazione", () => {
    expect(() => creaStanza("ABCDE", ["A", "B"], { varianti: { sommaPiu2: true } }, "h", "ultima")).not.toThrow();
    expect(() => creaStanza("ABCDE", ["A", "B"], { varianti: { sommaPiu2: "boh" } }, "h", "ultima")).toThrow("configNonValida");
  });
  it("la vista porta le varianti scelte e una partita simulata arriva alla fine", () => {
    const s = avviata({ varianti: { sommaPiu2: true } });
    expect(vistaDi(s, "host").config.varianti.sommaPiu2).toBe(true);
    for (let i = 0; i < 4000 && vistaDi(s, "host").fase === "partita"; i++) {
      const p = s.stato.partita;
      const chi = p.ultime.find((u: { dichiarata: boolean }) => !u.dichiarata)?.posto ?? p.turno;
      eseguiAzione(s, "host", { tipo: "mossaBot", posto: chi });
    }
    expect(vistaDi(s, "host").fase).toBe("fine");
  });
});

describe("taglio sul server", () => {
  /** Porta la stanza a una finestra di taglio con un telefono che ha la carta identica. */
  function conFinestra() {
    for (let i = 0; i < 400; i++) {
      const s = avviata({ varianti: { taglio: true } });
      for (let k = 0; k < 300 && vistaDi(s, "host").fase === "partita"; k++) {
        const p = s.stato.partita;
        const ap = p.apertaTaglio as { posto: number; carta: unknown } | null;
        if (ap) {
          for (const posto of [1, 2, 3]) {
            const v = vistaDi(s, tokenDi(s, posto));
            if (v.puoTagliare.length > 0) return { s, posto, carta: v.puoTagliare[0]! };
          }
        }
        eseguiAzione(s, "host", { tipo: "mossaBot", posto: p.ultime.find((u: { dichiarata: boolean }) => !u.dichiarata)?.posto ?? p.turno });
      }
    }
    throw new Error("nessuna finestra di taglio");
  }

  it("la finestra si apre con l'ora del server e chi ha la carta taglia", () => {
    const { s, posto, carta } = conFinestra();
    const fino = s.stato.partita.apertaTaglio.fino as number;
    expect(Math.abs(fino - 3000 - Date.now())).toBeLessThan(60_000);
    eseguiAzione(s, tokenDi(s, posto), { tipo: "taglia", carta });
    expect(vistaDi(s, "host").taglio).toBeNull();
    expect(vistaDi(s, "host").eventi.some((e) => e.tipo === "taglio" && e.posto === posto)).toBe(true);
  });
  it("gara: il secondo taglio arriva a finestra chiusa e riceve un messaggio neutro", () => {
    const { s, posto, carta } = conFinestra();
    eseguiAzione(s, tokenDi(s, posto), { tipo: "taglia", carta });
    expect(() => eseguiAzione(s, tokenDi(s, posto), { tipo: "taglia", carta })).toThrow("tagliTardi");
  });
  it("chi guarda non taglia e «Simula mossa» non è un taglio", () => {
    const { s, carta } = conFinestra();
    s.telefoni.set("spett", null);
    expect(() => eseguiAzione(s, "spett", { tipo: "taglia", carta })).toThrow("nonPartecipa");
  });
  it("chi non ha la carta o è di turno non taglia", () => {
    const { s } = conFinestra();
    const turno = s.stato.partita.turno as number;
    expect(() => eseguiAzione(s, tokenDi(s, turno), { tipo: "taglia", carta: 999999 })).toThrow("nonTagliabile");
  });
});
