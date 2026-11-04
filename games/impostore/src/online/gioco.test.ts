import { describe, expect, it } from "vitest";
import { applica, nuovoStato, vistaPer, type StatoOnline } from "./gioco";

const nomi = ["Anna", "Bruno", "Carla", "Dario"];
const cfg = { numImpostori: 1, categoria: "cibi" as const, votiVisibili: true };

function pronta(): StatoOnline {
  let s = nuovoStato(nomi, cfg);
  for (const p of [1, 2, 3, 4]) s = applica(s, { tipo: "occupa", posto: p });
  s = applica(s, { tipo: "avvia", seme: 42 });
  s = applica(s, { tipo: "avanti" });
  return applica(s, { tipo: "avanti" });
}

describe("impostore online", () => {
  it("un nome si sceglie una volta sola", () => {
    const s = applica(nuovoStato(nomi, cfg), { tipo: "occupa", posto: 1 });
    expect(() => applica(s, { tipo: "occupa", posto: 1 })).toThrow();
  });

  it("ognuno vede solo la propria carta", () => {
    let s = nuovoStato(nomi, cfg);
    for (const p of [1, 2, 3, 4]) s = applica(s, { tipo: "occupa", posto: p });
    s = applica(s, { tipo: "avvia", seme: 1 });
    const v = vistaPer(s, 2, false);
    expect(v.carta).not.toBeNull();
    const testo = JSON.stringify(v);
    const imp = s.partita!.impostori[0]!;
    // La vista di un civile non dice chi è l'impostore.
    if (imp !== 2) expect(testo).not.toContain(`"impostori"`);
    expect(vistaPer(s, null, false).carta).toBeNull();
  });

  it("il voto si chiude quando votano tutti, il più votato è eliminato", () => {
    let s = pronta();
    s = applica(s, { tipo: "vota", chi: 1, posto: 2 });
    s = applica(s, { tipo: "vota", chi: 2, posto: 3 });
    s = applica(s, { tipo: "vota", chi: 3, posto: 2 });
    expect(s.fase).toBe("voto");
    s = applica(s, { tipo: "vota", chi: 4, posto: 2 });
    expect(s.eliminato).toBe(2);
    expect(["tentativo", "fine"]).toContain(s.fase);
  });

  it("pareggio: ballottaggio tra i pari, poi al secondo pari vince l'impostore", () => {
    let s = pronta();
    s = applica(s, { tipo: "vota", chi: 1, posto: 2 });
    s = applica(s, { tipo: "vota", chi: 2, posto: 1 });
    s = applica(s, { tipo: "vota", chi: 3, posto: 1 });
    s = applica(s, { tipo: "vota", chi: 4, posto: 2 });
    expect(s.candidati).toEqual([1, 2]);
    expect(() => applica(s, { tipo: "vota", chi: 3, posto: 4 })).toThrow();
    s = applica(s, { tipo: "vota", chi: 1, posto: 2 });
    s = applica(s, { tipo: "vota", chi: 2, posto: 1 });
    s = applica(s, { tipo: "vota", chi: 3, posto: 1 });
    s = applica(s, { tipo: "vota", chi: 4, posto: 2 });
    expect(s.fase).toBe("fine");
    expect(vistaPer(s, 1, false).fine?.vincitore).toBe("impostori");
  });

  it("l'organizzatore può escludere dal voto chi non ha votato: il voto si chiude senza di lui", () => {
    let s = pronta();
    s = applica(s, { tipo: "vota", chi: 1, posto: 2 });
    s = applica(s, { tipo: "vota", chi: 2, posto: 3 });
    s = applica(s, { tipo: "vota", chi: 3, posto: 2 });
    expect(() => applica(s, { tipo: "escludi", posto: 1 })).toThrow(); // ha già votato
    expect(vistaPer(s, 1, true).voto?.mancanti).toEqual([4]);
    s = applica(s, { tipo: "escludi", posto: 4 });
    expect(s.fase).not.toBe("voto");
    expect(s.eliminato).toBe(2);
  });

  it("non si può restare con meno di 2 votanti; l'escluso che rientra può votare", () => {
    let s = pronta();
    s = applica(s, { tipo: "escludi", posto: 4 });
    s = applica(s, { tipo: "escludi", posto: 3 });
    expect(() => applica(s, { tipo: "escludi", posto: 2 })).toThrow();
    expect(vistaPer(s, 1, true).voto?.totale).toBe(2);
    s = applica(s, { tipo: "vota", chi: 3, posto: 2 });
    expect(s.esclusi).toEqual([4]);
    expect(vistaPer(s, 1, true).voto?.mancanti).toEqual([1, 2]);
  });

  it("voti nascosti: nessun contatore durante il voto", () => {
    let s = nuovoStato(nomi, { ...cfg, votiVisibili: false });
    for (const p of [1, 2, 3, 4]) s = applica(s, { tipo: "occupa", posto: p });
    s = applica(applica(applica(s, { tipo: "avvia", seme: 3 }), { tipo: "avanti" }), { tipo: "avanti" });
    s = applica(s, { tipo: "vota", chi: 1, posto: 2 });
    expect(vistaPer(s, 1, false).voto?.conteggi).toBeNull();
  });
});
