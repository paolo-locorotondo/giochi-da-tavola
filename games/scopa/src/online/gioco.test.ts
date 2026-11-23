import { describe, expect, it } from "vitest";
import { ErroreScopa } from "../logica";
import { applica, mancanti, nuovoStato, scopaOnline, vistaPer, type StatoOnline } from "./gioco";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreScopa ? e.codice : "altro";
  }
  return null;
};
const DUE = ["Anna", "Bruno"];
const QUATTRO = ["Anna", "Bruno", "Carla", "Dino"];
const inSala = (nomi = DUE, config: unknown = {}) => {
  let s = nuovoStato(nomi, config);
  nomi.forEach((_, i) => (s = applica(s, { tipo: "occupa", posto: i + 1 })));
  return s;
};
const avviata = (nomi = DUE, seme = 5, config: unknown = {}) => applica(inSala(nomi, config), { tipo: "avvia", seme });
const ctx = (posto: number | null, host = false) => ({ posto, host, seme: () => 42, ora: () => 0 });
const traduci = (s: StatoOnline, posto: number | null, host: boolean, r: { tipo: string; [k: string]: unknown }) => scopaOnline.traduci(s, ctx(posto, host), r);

/** Chi è di turno gioca la prima carta con la prima presa, fino alla fine del round. */
function giocaRound(s0: StatoOnline): StatoOnline {
  let s = s0;
  for (let i = 0; i < 100 && s.fase === "partita"; i++) {
    const posto = s.partita!.turno;
    const v = vistaPer(s, posto, posto === 1);
    const carta = v.mano[0]!;
    const prese = v.prese[carta.id]!;
    s = applica(s, { tipo: "gioca", chi: posto, carta: carta.id, presa: prese.length > 1 ? prese[0] : undefined });
  }
  return s;
}

describe("nuovoStato", () => {
  it("2 o 4 nomi diversi e non vuoti; 3 rifiutato in questa versione", () => {
    expect(codice(() => nuovoStato(["Anna"], {}))).toBe("numeroGiocatori");
    expect(codice(() => nuovoStato(["A", "B", "C"], {}))).toBe("numeroGiocatori");
    expect(codice(() => nuovoStato(["Anna", "  "], {}))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato(["Anna", "anna"], {}))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato("x" as never, {}))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato(QUATTRO, {}))).toBeNull();
  });
  it("config: soglia 11 di base o 21; il resto rifiutato; posti coerenti con i nomi", () => {
    expect(nuovoStato(DUE, {}).config).toEqual({ posti: 2, soglia: 11 });
    expect(nuovoStato(QUATTRO, { soglia: 21 }).config).toEqual({ posti: 4, soglia: 21 });
    expect(codice(() => nuovoStato(DUE, { soglia: 15 }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(DUE, { posti: 3 }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(DUE, { posti: 4 }))).toBe("configNonValida");
  });
  it("coppie di base: posti 1+3 contro 2+4", () => {
    expect(nuovoStato(QUATTRO, {}).squadre).toEqual([0, 1, 0, 1]);
    expect(nuovoStato(DUE, {}).squadre).toEqual([0, 1]);
  });
});

describe("permessi", () => {
  it("solo l'organizzatore avvia, fa prossimoRound, ricomincia, squadre, mossaBot", () => {
    const s = inSala();
    expect(codice(() => traduci(s, 2, false, { tipo: "avvia" }))).toBe("soloHost");
    expect(traduci(s, 1, true, { tipo: "avvia" })).toEqual({ tipo: "avvia", seme: 42 });
    for (const tipo of ["prossimoRound", "ricomincia", "squadre", "mossaBot"]) expect(codice(() => traduci(s, 2, false, { tipo }))).toBe("soloHost");
    expect(codice(() => traduci(s, 1, true, { tipo: "boh" }))).toBe("azioneNonValida");
  });
  it("non si avvia senza tutti i posti", () => {
    const s = applica(nuovoStato(DUE, {}), { tipo: "occupa", posto: 1 });
    expect(codice(() => applica(s, { tipo: "avvia", seme: 1 }))).toBe("pochiHannoScelto");
  });
  it("«squadre» solo in sala e solo a 4; scambia due posti di squadre diverse", () => {
    expect(codice(() => applica(inSala(DUE), { tipo: "squadre", a: 1, b: 2 }))).toBe("soloQuattro");
    const s = inSala(QUATTRO);
    expect(codice(() => applica(s, { tipo: "squadre", a: 1, b: 3 }))).toBe("stessaSquadra");
    expect(applica(s, { tipo: "squadre", a: 3, b: 2 }).squadre).toEqual([0, 0, 1, 1]);
    expect(codice(() => applica(applica(s, { tipo: "avvia", seme: 1 }), { tipo: "squadre", a: 1, b: 2 }))).toBe("giaIniziata");
  });
  it("le coppie cambiate valgono nel round (e il turno non cambia)", () => {
    const s = applica(applica(inSala(QUATTRO), { tipo: "squadre", a: 3, b: 2 }), { tipo: "avvia", seme: 1 });
    expect(s.partita!.squadre).toEqual([0, 0, 1, 1]);
    expect(s.partita!.turno).toBe(1);
  });
  it("chi guarda non può giocare; fuori turno no; una presa malformata è rifiutata", () => {
    const s = avviata();
    expect(codice(() => traduci(s, null, false, { tipo: "gioca", carta: 0 }))).toBe("nonPartecipa");
    const fuori = s.partita!.turno === 1 ? 2 : 1;
    const carta = s.partita!.mani[fuori - 1]![0]!.id;
    expect(codice(() => applica(s, traduci(s, fuori, false, { tipo: "gioca", carta })!))).toBe("nonTocca");
    expect(codice(() => traduci(s, 1, false, { tipo: "gioca", carta, presa: "x" }))).toBe("presaNonValida");
  });
  it("il campo «chi» mandato dal telefono è ignorato", () => {
    const s = avviata();
    expect(traduci(s, 2, false, { tipo: "gioca", carta: 3, chi: 1 })).toMatchObject({ chi: 2 });
  });
});

describe("vista", () => {
  it("nessuna carta altrui né del mazzo: solo i numeri", () => {
    for (const nomi of [DUE, QUATTRO]) {
      const s = avviata(nomi);
      const p = s.partita!;
      nomi.forEach((_, i) => {
        const v = vistaPer(s, i + 1, false);
        expect(v.mano.map((c) => c.id)).toEqual(p.mani[i]!.map((c) => c.id));
        const json = JSON.stringify(v);
        const ids = new Set([...json.matchAll(/"id":(\d+)/g)].map((m) => Number(m[1])));
        const pubbliche = new Set([...p.tavolo, ...v.mano].map((c) => c.id));
        const segrete = [...p.mani.filter((_, j) => j !== i).flat(), ...p.mazzo];
        for (const c of segrete) if (!pubbliche.has(c.id)) expect(ids.has(c.id), `carta ${c.id}`).toBe(false);
        expect(v.nomi.map((x) => x.carte)).toEqual(p.mani.map((m) => m.length));
      });
    }
  });
  it("le prese in corso sono solo un numero; a fine round il riepilogo le mostra", () => {
    const s = avviata();
    const v = vistaPer(s, 2, false);
    expect(v.riepilogo).toBeNull();
    expect(typeof v.nomi[0]!.prese).toBe("number");
    const vf = vistaPer(giocaRound(s), 2, false);
    expect(vf.riepilogo?.prese.flat()).toHaveLength(40);
  });
  it("gli eventi elencano le carte prese (pubbliche) e sono uguali per tutti i posti", () => {
    const fine = giocaRound(avviata());
    const ev = vistaPer(fine, 1, true).eventi;
    expect(vistaPer(fine, 2, false).eventi).toEqual(ev);
    expect(vistaPer(fine, null, false).eventi).toEqual(ev);
    for (const e of ev) if (e.tipo === "gioca") expect(e.carte?.length).toBe(e.prese);
    expect(ev.some((e) => e.tipo === "ultimaPresa" && e.elenco?.length === e.carte)).toBe(true);
  });
  it("le prese possibili si vedono solo nel mio turno", () => {
    const s = avviata();
    const turno = s.partita!.turno;
    expect(Object.keys(vistaPer(s, turno, false).prese)).toHaveLength(3);
    expect(Object.keys(vistaPer(s, turno === 1 ? 2 : 1, false).prese)).toHaveLength(0);
    expect(mancanti(s)).toEqual([turno]);
  });
  it("chi guarda non vede mani", () => {
    const v = vistaPer(avviata(), null, false);
    expect(v.mano).toEqual([]);
    expect(v.miaSquadra).toBeNull();
  });
});

describe("partita", () => {
  it("round completo a 2 e a 4, riproducibile con lo stesso seme", () => {
    for (const nomi of [DUE, QUATTRO]) {
      const a = giocaRound(avviata(nomi, 11));
      const b = giocaRound(avviata(nomi, 11));
      expect(a).toEqual(b);
      expect(["fineRound", "fine"]).toContain(a.fase);
      expect(a.punti[0] + a.punti[1]).toBeGreaterThan(0);
    }
  });
  it("si vince alla soglia con più punti; a pari si gioca un altro round", () => {
    for (let seme = 0; seme < 20; seme++) {
      const fine = giocaRound({ ...avviata(DUE, seme), punti: [10, 10] });
      if (fine.punti[0] === fine.punti[1]) {
        expect(fine.fase).toBe("fineRound");
        expect(fine.vincitore).toBeNull();
      } else {
        expect(fine.fase).toBe("fine");
        expect(fine.vincitore).toBe(fine.punti[0] > fine.punti[1] ? 0 : 1);
      }
    }
  });
  it("sotto soglia: prossimo round, con il primo che ruota; ricomincia azzera", () => {
    const p = giocaRound(avviata(DUE, 4));
    expect(p.fase).toBe("fineRound");
    expect(codice(() => applica(p, { tipo: "ricomincia", seme: 1 }))).toBe("nonFinita");
    const r2 = applica(p, { tipo: "prossimoRound", seme: 9 });
    expect(r2.round).toBe(2);
    expect(r2.primo).toBe(2);
    expect(r2.partita!.turno).toBe(2);
    const fine = giocaRound({ ...avviata(DUE, 3), punti: [20, 0] });
    expect(fine.fase).toBe("fine");
    expect(codice(() => applica(fine, { tipo: "prossimoRound", seme: 1 }))).toBe("nonFinitoRound");
    expect(applica(fine, { tipo: "ricomincia", seme: 2 }).punti).toEqual([0, 0]);
  });
  it("«Simula mossa col bot»: una mossa per il giocatore di turno, con evento visibile", () => {
    const s = avviata();
    const turno = s.partita!.turno;
    const d = applica(s, traduci(s, 1, true, { tipo: "mossaBot", posto: turno })!);
    expect(d.partita!.eventi.some((e) => e.tipo === "bot")).toBe(true);
    expect(d.mosse).toBe(1);
    const fuori = turno === 1 ? 2 : 1;
    expect(codice(() => applica(s, { tipo: "bot", posto: fuori }))).toBe("nullaDaFare");
  });
  it("in sala non si gioca", () => {
    expect(codice(() => applica(inSala(), { tipo: "gioca", chi: 1, carta: 0 }))).toBe("nonInCorso");
  });
});
