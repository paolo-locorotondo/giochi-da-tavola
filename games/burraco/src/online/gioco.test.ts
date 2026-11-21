import { describe, expect, it } from "vitest";
import { creaRng } from "@gdt/engine";
import { applica, burracoOnline, leggiConfig, nuovoStato, vistaPer, type StatoOnline } from "./gioco";
import { agisci, botDiTurno, muoviBot, nuovaPartitaLocale, vistaLocale } from "../offline";

const NOMI4 = ["Anna", "Bruno", "Carla", "Dario"];
const ctx = (posto: number | null, host = false) => ({ posto, host, seme: () => 42, ora: () => 0 });

function avviata(nomi = NOMI4, config: unknown = {}): StatoOnline {
  let s = nuovoStato(nomi, config);
  for (let p = 1; p <= nomi.length; p++) s = applica(s, { tipo: "occupa", posto: p });
  return applica(s, { tipo: "avvia", seme: 7 });
}

describe("stanza", () => {
  it("2 o 4 nomi, distinti; 3 no", () => {
    expect(() => nuovoStato(["A", "B", "C"], {})).toThrow("numeroGiocatori");
    expect(() => nuovoStato(["A"], {})).toThrow("numeroGiocatori");
    expect(() => nuovoStato(["A", "a"], {})).toThrow("nomiNonValidi");
    expect(() => nuovoStato(["A", "B"], {})).not.toThrow();
  });
  it("config: valori di base 2005 e monte libero; il resto è controllato", () => {
    expect(leggiConfig(undefined)).toEqual({ obiettivo: 2005, pila: "libera" });
    expect(leggiConfig({ obiettivo: 0, pila: "bloccata" })).toEqual({ obiettivo: 0, pila: "bloccata" });
    for (const brutta of [{ obiettivo: 999 }, { pila: "boh" }, { obiettivo: "2005" }]) expect(() => leggiConfig(brutta)).toThrow("configNonValida");
  });
  it("solo l'organizzatore avvia, e solo con tutti i posti", () => {
    let s = nuovoStato(["A", "B"], {});
    expect(() => applica(s, { tipo: "avvia", seme: 1 })).toThrow("pochiHannoScelto");
    s = applica(applica(s, { tipo: "occupa", posto: 1 }), { tipo: "occupa", posto: 2 });
    expect(() => burracoOnline.traduci(s, ctx(2), { tipo: "avvia" })).toThrow("soloHost");
    expect(burracoOnline.traduci(s, ctx(1, true), { tipo: "avvia" })).toEqual({ tipo: "avvia", seme: 42 });
    expect(() => applica(s, { tipo: "occupa", posto: 2 })).toThrow("nomeOccupato");
  });
  it("«Simula mossa col bot» e il resto solo per chi ha i permessi", () => {
    const s = avviata();
    expect(() => burracoOnline.traduci(s, ctx(2), { tipo: "mossaBot", posto: 1 })).toThrow("soloHost");
    expect(() => burracoOnline.traduci(s, ctx(null), { tipo: "pesca" })).toThrow("nonPartecipa");
    expect(() => burracoOnline.traduci(s, ctx(1, true), { tipo: "boh" })).toThrow("azioneNonValida");
  });
});

describe("viste: mai un segreto altrui", () => {
  it("ognuno vede la propria mano; delle altre solo il numero; i pozzetti mai", () => {
    const s = avviata();
    const p = s.partita!;
    const segrete = new Set<number>([...p.mani.flat().map((c) => c.id), ...p.pozzetti.flat().map((c) => c.id), ...p.mazzo.map((c) => c.id)]);
    for (let posto = 1; posto <= 4; posto++) {
      const v = vistaPer(s, posto, posto === 1);
      expect(v.carte.map((c) => c.id)).toEqual(p.mani[posto - 1]!.map((c) => c.id));
      const nelJson = new Set([...JSON.stringify(v).matchAll(/"id":(\d+)/g)].map((m) => Number(m[1])));
      const proprie = new Set(v.carte.map((c) => c.id));
      const pubbliche = new Set([...v.scarti.map((c) => c.id), ...v.combinazioni.flatMap((c) => c.posate.map((x) => x.carta.id))]);
      for (const id of segrete) if (!proprie.has(id) && !pubbliche.has(id)) expect(nelJson.has(id), `carta ${id} visibile al posto ${posto}`).toBe(false);
      expect(v.nomi.map((n) => n.carte)).toEqual(p.mani.map((m) => m.length));
      expect(v.squadre.map((q) => q.pozzettoPreso)).toEqual([false, false]);
    }
    const guarda = vistaPer(s, null, false);
    expect(guarda.carte).toEqual([]);
    expect(guarda.io).toBeNull();
  });
  it("il monte degli scarti è pubblico per intero", () => {
    const s = avviata();
    expect(vistaPer(s, 2, false).scarti).toEqual(s.partita!.scarti);
  });
});

describe("partita", () => {
  it("si agisce solo al proprio turno; un «chi» mandato dal telefono non conta", () => {
    const s = avviata();
    const t = s.partita!.turno;
    const altro = t === 1 ? 2 : 1;
    const a = burracoOnline.traduci(s, ctx(altro), { tipo: "pesca", chi: t });
    expect(a).toEqual({ tipo: "pesca", chi: altro });
    expect(() => applica(s, a!)).toThrow("nonTocca");
    expect(burracoOnline.mancanti!(s)).toEqual([t]);
  });
  it("gruppi malformati dalla rete sono rifiutati", () => {
    let s = avviata();
    s = applica(s, { tipo: "pesca", chi: s.partita!.turno });
    const chi = s.partita!.turno;
    for (const brutti of [null, [], [{}], [{ carte: "x" }], [{ carte: [1.5] }], [{ carte: [1, 2, 3], su: "a" }]]) {
      expect(() => applica(s, { tipo: "cala", chi, gruppi: brutti })).toThrow();
    }
  });
  it("lo stesso seme dà la stessa partita (bot compresi)", () => {
    const gioca = () => {
      let p = nuovaPartitaLocale({ nomi: ["Io", "Bot"], livello: "medio", config: { obiettivo: 0 } }, 99);
      for (let i = 0; i < 3000 && p.stato.fase === "partita"; i++) {
        if (botDiTurno(p) === null) {
          // Il mio turno: gioco col bot difficile al mio posto.
          p = { ...p, stato: applica(p.stato, { tipo: "bot", posto: 1, livello: "difficile" }) };
        } else p = muoviBot(p);
      }
      return p.stato;
    };
    const a = gioca();
    const b = gioca();
    expect(a.fase).toBe("fine");
    expect(a.punti).toEqual(b.punti);
    expect(a.partita!.eventi).toEqual(b.partita!.eventi);
  });
  it("a punti: la partita continua finché una squadra raggiunge l'obiettivo, poi si può ricominciare", () => {
    let s = avviata(["A", "B"], { obiettivo: 1505 });
    const rng = creaRng(1);
    let mani = 0;
    for (let i = 0; i < 20000 && s.fase !== "fine"; i++) {
      if (s.fase === "fineMano") {
        mani++;
        expect(s.ultima).not.toBeNull();
        s = applica(s, { tipo: "prossimaMano", seme: rng.intero(1e6) });
      } else s = applica(s, { tipo: "bot", posto: s.partita!.turno, livello: "difficile" });
    }
    expect(s.fase).toBe("fine");
    expect(Math.max(...s.punti)).toBeGreaterThanOrEqual(1505);
    expect(s.vincitore).toBe(s.punti[0] > s.punti[1] ? 1 : 2);
    const r = applica(s, { tipo: "ricomincia", seme: 5 });
    expect(r.punti).toEqual([0, 0]);
    expect(() => applica(r, { tipo: "ricomincia", seme: 5 })).toThrow("nonFinita");
  }, 60_000);
});

describe("contro i bot (offline)", () => {
  it("io sono il posto 1; a 4 il compagno è il posto 3; la vista mostra solo la mia mano", () => {
    const p = nuovaPartitaLocale({ nomi: NOMI4, livello: "facile", config: {} }, 5);
    const v = vistaLocale(p);
    expect(v.io).toBe(1);
    expect(v.nomi.map((n) => n.squadra)).toEqual([1, 2, 1, 2]);
    expect(v.nomi.every((n) => n.collegato)).toBe(true);
    expect(v.carte).toHaveLength(11);
    expect(() => agisci(p, { tipo: "mossaBot", posto: 2 }, () => 1)).toThrow("azioneNonValida");
  });
  it("i bot giocano finché tocca a me", () => {
    let p = nuovaPartitaLocale({ nomi: NOMI4, livello: "medio", config: {} }, 11);
    p = { ...p, stato: { ...p.stato, partita: { ...p.stato.partita!, turno: 2 } } };
    let passi = 0;
    while (botDiTurno(p) !== null && passi++ < 50) p = muoviBot(p);
    expect(p.stato.partita!.turno).toBe(1);
  });
});
