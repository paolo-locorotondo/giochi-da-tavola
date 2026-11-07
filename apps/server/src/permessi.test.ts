import { ALFABETO } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import { creaStanza, eseguiAzione, nuovoCodice, nuovoToken, type Stanza } from "./stanze";
import { vistaDi as vistaGenerica } from "./stanze";
import type { Vista } from "@gdt/impostore/online";

/** La vista con il tipo di Impostore (il server la tratta senza tipo). */
const vistaDi = (...a: Parameters<typeof vistaGenerica>): Vista => vistaGenerica(...a);

const cfg = { numImpostori: 1, categoria: "cibi" as const, votiVisibili: false, lingua: "it" as const };
const TEL = ["host", "t2", "t3", "t4"];

/** Stanza con i telefoni indicati, già seduti (posto = indice + 1). */
function inSala(n = 4): Stanza {
  const s = creaStanza("ABCDE", ["A", "B", "C", "D"], cfg, "host");
  TEL.slice(0, n).forEach((t, i) => {
    s.telefoni.set(t, null);
    eseguiAzione(s, t, { tipo: "occupa", posto: i + 1 });
  });
  return s;
}
function avviata(n = 4): Stanza {
  const s = inSala(n);
  eseguiAzione(s, "host", { tipo: "avvia" });
  return s;
}
function inVoto(n = 4): Stanza {
  const s = avviata(n);
  for (const t of TEL.slice(0, n)) eseguiAzione(s, t, { tipo: "visto" });
  eseguiAzione(s, "host", { tipo: "avanti" });
  eseguiAzione(s, "host", { tipo: "avanti" });
  return s;
}
const telefonoDi = (s: Stanza, posto: number) => [...s.telefoni].find(([, p]) => p === posto)![0];

describe("nuovoToken", () => {
  it("è esadecimale di 32 caratteri e diverso ogni volta", () => {
    const token = Array.from({ length: 50 }, nuovoToken);
    for (const t of token) expect(t).toMatch(/^[0-9a-f]{32}$/);
    expect(new Set(token).size).toBe(50);
  });
});

describe("nuovoCodice", () => {
  it("ha 5 caratteri dell'alfabeto senza simboli ambigui", () => {
    for (let i = 0; i < 200; i++) {
      const c = nuovoCodice(new Set());
      expect(c).toHaveLength(5);
      for (const ch of c) expect(ALFABETO).toContain(ch);
      expect(c).not.toMatch(/[01ILO]/);
    }
  });

  it("non ripete un codice già in uso", () => {
    const usati = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const c = nuovoCodice(usati);
      expect(usati.has(c)).toBe(false);
      usati.add(c);
    }
  });

  it("riprova finché non trova un codice libero", () => {
    let tentativi = 0;
    const quasiTutti = {
      has: () => ++tentativi < 5,
    };
    expect(nuovoCodice(quasiTutti)).toHaveLength(5);
    expect(tentativi).toBe(5);
  });
});

describe("creaStanza", () => {
  it("l'organizzatore parte tra i telefoni, senza posto", () => {
    const s = creaStanza("ABCDE", ["A", "B", "C"], cfg, "host");
    expect(s.codice).toBe("ABCDE");
    expect(s.tokenHost).toBe("host");
    expect([...s.telefoni]).toEqual([["host", null]]);
    expect(s.stato.fase).toBe("sala");
  });

  it("segna l'ora dell'ultima attività", () => {
    const prima = Date.now();
    expect(creaStanza("ABCDE", ["A", "B", "C"], cfg, "host").ultimaAttivita).toBeGreaterThanOrEqual(prima);
  });

  it("rifiuta configurazioni non valide", () => {
    expect(() => creaStanza("ABCDE", ["A", "B"], cfg, "h")).toThrow("pochiGiocatori");
    expect(() => creaStanza("ABCDE", ["A", "a", "C"], cfg, "h")).toThrow("nomiUguali");
    expect(() => creaStanza("ABCDE", ["A", "B", "C"], { ...cfg, numImpostori: 2 }, "h")).toThrow("troppiImpostori:1");
    expect(() => creaStanza("ABCDE", ["A", "B", "C"], { ...cfg, categoria: "x" as never }, "h")).toThrow("categoriaNonValida");
  });
});

describe("occupa", () => {
  it("assegna il posto al telefono", () => {
    const s = inSala(2);
    expect(s.telefoni.get("host")).toBe(1);
    expect(s.telefoni.get("t2")).toBe(2);
    expect(s.stato.occupati).toEqual([1, 2]);
  });

  it("un telefono sceglie un solo nome", () => {
    const s = inSala(2);
    expect(() => eseguiAzione(s, "host", { tipo: "occupa", posto: 3 })).toThrow("Hai già scelto il tuo nome");
  });

  it("un nome già preso non si prende", () => {
    const s = inSala(2);
    s.telefoni.set("t3", null);
    expect(() => eseguiAzione(s, "t3", { tipo: "occupa", posto: 1 })).toThrow("nomeOccupato");
    expect(s.telefoni.get("t3")).toBeNull();
  });

  it("un nome inesistente è respinto e non cambia nulla", () => {
    const s = creaStanza("ABCDE", ["A", "B", "C"], cfg, "host");
    expect(() => eseguiAzione(s, "host", { tipo: "occupa", posto: 9 })).toThrow("nomeInesistente");
    expect(s.telefoni.get("host")).toBeNull();
  });

  it("a partita iniziata non si sceglie più il nome", () => {
    const s = avviata(3);
    s.telefoni.set("t4", null);
    expect(() => eseguiAzione(s, "t4", { tipo: "occupa", posto: 4 })).toThrow("La partita è già iniziata: aspetta la prossima");
  });
});

describe("libera", () => {
  it("in sala ognuno libera il proprio nome", () => {
    const s = inSala(3);
    eseguiAzione(s, "t2", { tipo: "libera", posto: 2 });
    expect(s.telefoni.get("t2")).toBeNull();
    expect(s.stato.occupati).toEqual([1, 3]);
  });

  it("in sala non si libera il nome di un altro", () => {
    const s = inSala(3);
    expect(() => eseguiAzione(s, "t2", { tipo: "libera", posto: 3 })).toThrow("Puoi liberare solo il tuo nome");
  });

  it("in sala l'organizzatore libera il nome di chiunque", () => {
    const s = inSala(3);
    eseguiAzione(s, "host", { tipo: "libera", posto: 3 });
    expect(s.telefoni.get("t3")).toBeNull();
    expect(s.stato.occupati).toEqual([1, 2]);
  });

  it("dopo aver liberato il nome si può sceglierne un altro", () => {
    const s = inSala(2);
    eseguiAzione(s, "t2", { tipo: "libera", posto: 2 });
    eseguiAzione(s, "t2", { tipo: "occupa", posto: 3 });
    expect(s.telefoni.get("t2")).toBe(3);
  });

  it("in partita solo l'organizzatore libera, e il giocatore resta in gioco", () => {
    const s = avviata(4);
    expect(() => eseguiAzione(s, "t2", { tipo: "libera", posto: 2 })).toThrow(
      "Durante la partita solo l'organizzatore può liberare un posto",
    );
    eseguiAzione(s, "host", { tipo: "libera", posto: 2 });
    expect(s.telefoni.get("t2")).toBeNull();
    expect(s.stato.inGioco).toEqual([1, 2, 3, 4]);
    expect(s.stato.occupati).toContain(2);
  });

  it("a fine partita ognuno torna a liberare il proprio nome", () => {
    const s = inSala(3);
    s.stato = { ...s.stato, fase: "fine" };
    eseguiAzione(s, "t2", { tipo: "libera", posto: 2 });
    expect(s.telefoni.get("t2")).toBeNull();
  });
});

describe("riprendi", () => {
  it("chi ha già un posto non può riprenderne un altro", () => {
    const s = avviata(4);
    expect(() => eseguiAzione(s, "t2", { tipo: "riprendi", posto: 3 })).toThrow("Hai già un posto");
  });

  it("in sala si sceglie dalla lista, non si riprende", () => {
    const s = inSala(2);
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 1 })).toThrow("Scegli il tuo nome dalla lista");
  });

  it("non si riprende il posto di chi non gioca", () => {
    const s = avviata(3);
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 4 })).toThrow("Questo giocatore non partecipa");
  });

  it("senza connessioni note il posto risulta libero e si riprende", () => {
    const s = avviata(4);
    s.telefoni.set("nuovo", null);
    eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 3 });
    expect(s.telefoni.get("nuovo")).toBe(3);
    expect(s.telefoni.get("t3")).toBeNull();
  });

  it("il messaggio di rifiuto spiega cosa fare se il telefono è collegato", () => {
    const s = avviata(4);
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 3 }, () => true)).toThrow(/chiedi all'organizzatore/);
  });

  it("riprendere un posto qualunque non toglie l'organizzazione a chi la ha", () => {
    const s = avviata(4);
    s.telefoni.set("nuovo", null);
    eseguiAzione(s, "nuovo", { tipo: "riprendi", posto: 3 });
    expect(s.tokenHost).toBe("host");
  });
});

describe("azioni riservate all'organizzatore", () => {
  it.each(["avvia", "avanti", "nuova"] as const)("%s: gli altri telefoni sono respinti", (tipo) => {
    const s = inSala(3);
    expect(() => eseguiAzione(s, "t2", { tipo })).toThrow("Solo chi ha creato la partita può farlo");
  });

  it("anche un telefono sconosciuto è respinto", () => {
    expect(() => eseguiAzione(inSala(3), "intruso", { tipo: "avvia" })).toThrow("Solo chi ha creato la partita può farlo");
  });

  it("avvia con troppo pochi seduti dà l'errore del gioco", () => {
    const s = inSala(2);
    expect(() => eseguiAzione(s, "host", { tipo: "avvia" })).toThrow("pochiHannoScelto");
    expect(s.stato.fase).toBe("sala");
  });

  it("avvia usa un seme casuale: due stanze danno partite diverse (di norma)", () => {
    const semi = new Set(Array.from({ length: 10 }, () => avviata(4).stato.seme));
    expect(semi.size).toBeGreaterThan(1);
  });

  it("nuova funziona solo a fine partita", () => {
    const s = avviata(4);
    expect(() => eseguiAzione(s, "host", { tipo: "nuova" })).toThrow("nonFinita");
    s.stato = { ...s.stato, fase: "fine" };
    eseguiAzione(s, "host", { tipo: "nuova" });
    expect(s.stato.fase).toBe("sala");
    expect(s.telefoni.get("t2")).toBe(2);
  });
});

describe("visto", () => {
  it("segna chi ha guardato la carta, una volta sola", () => {
    const s = avviata(4);
    eseguiAzione(s, "t2", { tipo: "visto" });
    eseguiAzione(s, "t2", { tipo: "visto" });
    expect(s.stato.viste).toEqual([2]);
  });

  it("senza un posto viene ignorato senza errori", () => {
    const s = avviata(4);
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "visto" })).not.toThrow();
    expect(s.stato.viste).toEqual([]);
  });

  it("l'organizzatore non può avanzare finché non hanno visto tutti", () => {
    const s = avviata(4);
    eseguiAzione(s, "host", { tipo: "visto" });
    expect(() => eseguiAzione(s, "host", { tipo: "avanti" })).toThrow("nonTuttiVisto");
  });
});

describe("voto", () => {
  it("serve un posto per votare", () => {
    const s = inVoto();
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "vota", posto: 1 })).toThrow("Scegli prima il tuo nome");
  });

  it("ognuno vota dal proprio telefono, non per sé", () => {
    const s = inVoto();
    expect(() => eseguiAzione(s, "t2", { tipo: "vota", posto: 2 })).toThrow("votoTeStesso");
    eseguiAzione(s, "t2", { tipo: "vota", posto: 3 });
    expect(s.stato.voti).toEqual({ 2: 3 });
  });

  it("fuori dal voto è respinto", () => {
    expect(() => eseguiAzione(avviata(), "t2", { tipo: "vota", posto: 3 })).toThrow("nonSiVota");
  });

  it("la partita si chiude quando votano tutti", () => {
    const s = inVoto();
    const civile = [1, 2, 3, 4].find((p) => !s.stato.partita!.impostori.includes(p))!;
    for (const t of TEL) {
      const mio = s.telefoni.get(t)!;
      eseguiAzione(s, t, { tipo: "vota", posto: mio === civile ? (mio === 1 ? 2 : 1) : civile });
    }
    expect(s.stato.eliminato).toBe(civile);
    expect(s.stato.fase).toBe("fine");
  });
});

describe("tenta", () => {
  function aTentativo(): { s: Stanza; scoperto: number } {
    const s = inVoto();
    const imp = s.stato.partita!.impostori[0]!;
    for (const t of TEL) {
      const mio = s.telefoni.get(t)!;
      eseguiAzione(s, t, { tipo: "vota", posto: mio === imp ? (mio === 1 ? 2 : 1) : imp });
    }
    return { s, scoperto: imp };
  }

  it("tenta solo l'impostore scoperto", () => {
    const { s, scoperto } = aTentativo();
    expect(s.stato.fase).toBe("tentativo");
    const altro = TEL.find((t) => s.telefoni.get(t) !== scoperto)!;
    expect(() => eseguiAzione(s, altro, { tipo: "tenta", testo: "x" })).toThrow("Solo l'impostore scoperto può tentare");
    expect(() => eseguiAzione(s, telefonoDi(s, scoperto), { tipo: "tenta", testo: "x" })).not.toThrow();
    expect(s.stato.fase).toBe("fine");
  });

  it("senza un posto non si tenta", () => {
    const { s } = aTentativo();
    s.telefoni.set("nuovo", null);
    expect(() => eseguiAzione(s, "nuovo", { tipo: "tenta", testo: "x" })).toThrow("Solo l'impostore scoperto può tentare");
  });

  it("l'organizzatore non può tentare al posto dell'impostore", () => {
    const { s, scoperto } = aTentativo();
    if (s.telefoni.get("host") === scoperto) return;
    expect(() => eseguiAzione(s, "host", { tipo: "tenta", testo: "x" })).toThrow();
  });

  it("indovinare la parola fa vincere gli impostori", () => {
    const { s, scoperto } = aTentativo();
    eseguiAzione(s, telefonoDi(s, scoperto), { tipo: "tenta", testo: s.stato.partita!.parola });
    expect(vistaDi(s, "host").fine!.vincitore).toBe("impostori");
  });
});

describe("indizio", () => {
  it("serve un posto", () => {
    const s = creaStanza("ABCDE", ["A", "B", "C"], { ...cfg, indiziScritti: true }, "host");
    expect(() => eseguiAzione(s, "host", { tipo: "indizio", testo: "x" })).toThrow("Scegli prima il tuo nome");
  });

  it("un testo mancante diventa un indizio vuoto e viene respinto", () => {
    const s = creaStanza("ABCDE", ["A", "B", "C"], { ...cfg, indiziScritti: true }, "host");
    TEL.slice(0, 3).forEach((t, i) => {
      s.telefoni.set(t, null);
      eseguiAzione(s, t, { tipo: "occupa", posto: i + 1 });
    });
    eseguiAzione(s, "host", { tipo: "avvia" });
    for (const t of TEL.slice(0, 3)) eseguiAzione(s, t, { tipo: "visto" });
    eseguiAzione(s, "host", { tipo: "avanti" });
    const turno = vistaDi(s, "host").indizi!.turno!;
    expect(() => eseguiAzione(s, TEL[turno - 1]!, { tipo: "indizio", testo: undefined as never })).toThrow("indizioVuoto");
  });
});

describe("vistaDi: riservatezza e presenza", () => {
  it("ogni telefono vede solo la propria carta", () => {
    const s = avviata(4);
    const imp = s.stato.partita!.impostori[0]!;
    for (const t of TEL) {
      const v = vistaDi(s, t);
      const c = v.carta!;
      expect(c.ruolo).toBe(s.telefoni.get(t) === imp ? "impostore" : "civile");
      if (c.ruolo === "civile") expect(JSON.stringify(v)).not.toContain("impostori");
    }
  });

  it("un telefono sconosciuto non ha posto, carta o poteri", () => {
    const v = vistaDi(avviata(4), "sconosciuto");
    expect(v.io).toBeNull();
    expect(v.carta).toBeNull();
    expect(v.host).toBe(false);
  });

  it("host è vero solo per il token dell'organizzatore", () => {
    const s = inSala(3);
    expect(vistaDi(s, "host").host).toBe(true);
    expect(vistaDi(s, "t2").host).toBe(false);
  });

  it("collegato dipende dalle connessioni aperte", () => {
    const s = inSala(3);
    const connessi = new Set(["host", "t3"]);
    const v = vistaDi(s, "host", (t) => connessi.has(t));
    expect(v.nomi.map((n) => n.collegato)).toEqual([true, false, true, false]);
  });

  it("senza informazioni sulle connessioni nessuno risulta collegato", () => {
    expect(vistaDi(inSala(3), "host").nomi.every((n) => !n.collegato)).toBe(true);
  });

  it("organizzatore indica il posto di chi ha creato la partita", () => {
    const s = inSala(3);
    expect(vistaDi(s, "t2").nomi.map((n) => n.organizzatore)).toEqual([true, false, false, false]);
  });

  it("organizzatore senza posto: nessuno è segnato", () => {
    const s = creaStanza("ABCDE", ["A", "B", "C"], cfg, "host");
    expect(vistaDi(s, "host").nomi.some((n) => n.organizzatore)).toBe(false);
  });

  it("chi manca al voto lo vede solo l'organizzatore", () => {
    const s = inVoto();
    expect(vistaDi(s, "host").voto!.mancanti).toEqual([1, 2, 3, 4]);
    expect(vistaDi(s, "t2").voto!.mancanti).toBeNull();
  });
});

describe("attività della stanza", () => {
  it("ogni azione riuscita aggiorna l'ora dell'ultima attività", () => {
    const s = inSala(3);
    s.ultimaAttivita = 0;
    eseguiAzione(s, "host", { tipo: "libera", posto: 1 });
    expect(s.ultimaAttivita).toBeGreaterThan(0);
  });

  it("un'azione respinta non la aggiorna", () => {
    const s = inSala(3);
    s.ultimaAttivita = 0;
    expect(() => eseguiAzione(s, "t2", { tipo: "avvia" })).toThrow();
    expect(s.ultimaAttivita).toBe(0);
  });
});
