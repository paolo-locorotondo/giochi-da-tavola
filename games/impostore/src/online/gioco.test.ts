import { describe, expect, it } from "vitest";
import { applica, mancanti, nuovoStato, ordineIndizi, turnoIndizio, vistaPer, type StatoOnline } from "./gioco";

const nomi = ["Anna", "Bruno", "Carla", "Dario"];
const cfg = { numImpostori: 1, categoria: "cibi" as const, lingua: "it" as const, votiVisibili: true };

function pronta(): StatoOnline {
  let s = nuovoStato(nomi, cfg);
  for (const p of [1, 2, 3, 4]) s = applica(s, { tipo: "occupa", posto: p });
  s = applica(s, { tipo: "avvia", seme: 42 });
  s = vistiTutti(s);
  s = applica(s, { tipo: "avanti" });
  return applica(s, { tipo: "avanti" });
}

function vistiTutti(s: StatoOnline): StatoOnline {
  for (const p of s.inGioco) s = applica(s, { tipo: "visto", posto: p });
  return s;
}

describe("impostore online", () => {
  it("non si passa agli indizi finché non hanno visto tutti", () => {
    let s = nuovoStato(nomi, cfg);
    for (const p of [1, 2, 3, 4]) s = applica(s, { tipo: "occupa", posto: p });
    s = applica(s, { tipo: "avvia", seme: 5 });
    s = applica(s, { tipo: "visto", posto: 1 });
    expect(() => applica(s, { tipo: "avanti" })).toThrow();
    expect(applica(vistiTutti(s), { tipo: "avanti" }).fase).toBe("indizi");
  });

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

  it("voti nascosti: nessun contatore durante il voto", () => {
    let s = nuovoStato(nomi, { ...cfg, votiVisibili: false });
    for (const p of [1, 2, 3, 4]) s = applica(s, { tipo: "occupa", posto: p });
    s = applica(applica(vistiTutti(applica(s, { tipo: "avvia", seme: 3 })), { tipo: "avanti" }), { tipo: "avanti" });
    s = applica(s, { tipo: "vota", chi: 1, posto: 2 });
    expect(vistaPer(s, 1, false).voto?.conteggi).toBeNull();
  });

  describe("indizi scritti", () => {
    function aIndizi(): StatoOnline {
      let s = nuovoStato(nomi, { ...cfg, indiziScritti: true });
      for (const p of [1, 2, 3, 4]) s = applica(s, { tipo: "occupa", posto: p });
      s = applica(s, { tipo: "avvia", seme: 42 });
      return applica(vistiTutti(s), { tipo: "avanti" });
    }

    it("si scrive uno alla volta, nell'ordine che parte dal primo di turno", () => {
      let s = aIndizi();
      const ordine = ordineIndizi(s);
      expect(ordine).toHaveLength(4);
      expect(ordine[0]).toBe(s.partita!.primoDiTurno);
      expect(() => applica(s, { tipo: "indizio", chi: ordine[1]!, testo: "x" })).toThrow();
      expect(() => applica(s, { tipo: "avanti" })).toThrow(); // non hanno scritto tutti
      for (const [i, p] of ordine.entries()) {
        expect(turnoIndizio(s)).toBe(p);
        expect(mancanti(s)).toEqual([p]);
        s = applica(s, { tipo: "indizio", chi: p, testo: ` indizio ${i} ` });
      }
      expect(turnoIndizio(s)).toBeNull();
      expect(s.indizi.map((i) => i.testo)).toEqual(["indizio 0", "indizio 1", "indizio 2", "indizio 3"]);
      expect(vistaPer(s, 1, false).indizi?.scritti).toHaveLength(4);
      s = applica(s, { tipo: "avanti" });
      expect(s.fase).toBe("voto");
    });

    it("rifiuta indizi vuoti", () => {
      const s = aIndizi();
      expect(() => applica(s, { tipo: "indizio", chi: turnoIndizio(s)!, testo: "  " })).toThrow();
    });

    it("a voce: nessuna vista degli indizi", () => {
      const s = pronta();
      expect(vistaPer(s, 1, false).indizi).toBeNull();
    });
  });
});
