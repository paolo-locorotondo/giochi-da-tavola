import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import { mossaBot } from "../bot";
import { ErroreUltima, VARIANTI_BASE, gruppiDellaMano, type Carta } from "../logica";
import { applica, mancanti, nuovoStato, ultimaOnline, vistaPer, type StatoOnline } from "./gioco";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreUltima ? e.codice : "altro";
  }
  return null;
};
const NOMI = ["Anna", "Bruno", "Carla"];
const inSala = (nomi = NOMI, config: unknown = {}) => {
  let s = nuovoStato(nomi, config);
  nomi.forEach((_, i) => (s = applica(s, { tipo: "occupa", posto: i + 1 })));
  return s;
};
const avviata = (seme = 5, nomi = NOMI, config: unknown = {}) => applica(inSala(nomi, config), { tipo: "avvia", seme });
const ctx = (posto: number | null, host = false) => ({ posto, host, seme: () => 42, ora: () => 0 });
const traduci = (s: StatoOnline, posto: number | null, host: boolean, richiesta: { tipo: string; [k: string]: unknown }) =>
  ultimaOnline.traduci(s, ctx(posto, host), richiesta);

describe("nuovoStato", () => {
  it("vuole da 2 a 10 nomi diversi e non vuoti", () => {
    expect(codice(() => nuovoStato(["Anna"], {}))).toBe("numeroGiocatori");
    expect(codice(() => nuovoStato(Array.from({ length: 11 }, (_, i) => `G${i}`), {}))).toBe("numeroGiocatori");
    expect(codice(() => nuovoStato(["Anna", "  "], {}))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato(["Anna", "anna"], {}))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato("x" as never, {}))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato(Array.from({ length: 10 }, (_, i) => `G${i}`), {}))).toBeNull();
  });
  it("di base è un round singolo con soglia 500", () => {
    expect(nuovoStato(NOMI, {}).config).toEqual({ modo: "singolo", soglia: 500, varianti: VARIANTI_BASE });
    expect(nuovoStato(NOMI, undefined).config).toEqual({ modo: "singolo", soglia: 500, varianti: VARIANTI_BASE });
  });
  it("controlla la configurazione che arriva dalla rete", () => {
    expect(nuovoStato(NOMI, { modo: "punti", soglia: 300 }).config).toEqual({ modo: "punti", soglia: 300, varianti: VARIANTI_BASE });
    expect(codice(() => nuovoStato(NOMI, { modo: "altro" }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { modo: "punti", soglia: "x" }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { modo: "punti", soglia: 10 }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { modo: "punti", soglia: 99999 }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { modo: "punti", soglia: 1.5 }))).toBe("configNonValida");
  });
});

describe("posti e avvio", () => {
  it("un posto non si prende due volte e deve esistere", () => {
    const s = applica(nuovoStato(NOMI, {}), { tipo: "occupa", posto: 1 });
    expect(codice(() => applica(s, { tipo: "occupa", posto: 1 }))).toBe("nomeOccupato");
    expect(codice(() => applica(s, { tipo: "occupa", posto: 9 }))).toBe("nomeInesistente");
    expect(codice(() => applica(s, { tipo: "occupa", posto: 1.5 }))).toBe("nomeInesistente");
  });
  it("si avvia solo con tutti i posti scelti, e una volta sola", () => {
    const parziale = applica(nuovoStato(NOMI, {}), { tipo: "occupa", posto: 1 });
    expect(codice(() => applica(parziale, { tipo: "avvia", seme: 1 }))).toBe("pochiHannoScelto");
    expect(codice(() => applica(avviata(), { tipo: "avvia", seme: 1 }))).toBe("giaIniziata");
  });
  it("liberare un posto vale solo in sala", () => {
    expect(applica(inSala(), { tipo: "libera", posto: 2 }).occupati).toEqual([1, 3]);
    expect(applica(avviata(), { tipo: "libera", posto: 2 }).occupati).toEqual([1, 2, 3]);
  });
  it("l'avvio dà 7 carte a testa", () => {
    const s = avviata();
    expect(s.fase).toBe("partita");
    expect(s.partita!.mani.every((m) => m.length === 7 || m.length === 9)).toBe(true);
  });
});

describe("vistaPer: nessuna carta altrui sulla rete", () => {
  it("la propria mano intera, degli altri solo il numero di carte", () => {
    const s = avviata();
    const v = vistaPer(s, 1, false);
    expect(v.mano).toEqual(s.partita!.mani[0]);
    expect(v.nomi.map((n) => n.carte)).toEqual(s.partita!.mani.map((m) => m.length));
  });
  it("chi guarda non vede nessuna mano", () => {
    const v = vistaPer(avviata(), null, false);
    expect(v.mano).toEqual([]);
    expect(v.giocabili).toEqual([]);
  });
  it("nel JSON della vista di un giocatore non compare nessuna carta altrui né il mazzo", () => {
    const s = avviata(11);
    const mani = s.partita!.mani;
    const v = vistaPer(s, 1, false);
    const testo = JSON.stringify(v);
    const mieIds = new Set(mani[0]!.map((c) => c.id));
    const sopra = s.partita!.scarto.at(-1)!.id;
    // Gli id delle carte altrui e del mazzo non compaiono come carte: cerco `"id":N` nel JSON.
    const idNelJson = new Set([...testo.matchAll(/"id":(\d+)/g)].map((m) => Number(m[1])));
    for (const id of idNelJson) expect(mieIds.has(id) || id === sopra || eventiIds(v).has(id)).toBe(true);
    expect(testo).not.toContain("mazzo\":[");
  });
  it("la vista del +4 non rivela se era illegale", () => {
    let s = avviata(3);
    // Cerco un seme in cui il primo giocatore ha un +4 e lo gioca: la sfida compare senza il campo segreto.
    for (let seme = 0; seme < 400; seme++) {
      s = avviata(seme);
      const p = s.partita!;
      const j = p.mani[p.turno - 1]!.find((c) => c.tipo === "piu4");
      if (!j || p.colore === null || p.sfida) continue;
      const dopo = applica(s, { tipo: "gioca", chi: p.turno, carta: j.id, colore: "blu" });
      const v = vistaPer(dopo, dopo.partita!.turno, false);
      expect(v.sfida).not.toBeNull();
      expect(JSON.stringify(v)).not.toContain("illegale");
      return;
    }
    throw new Error("nessun seme con un +4 in mano al primo");
  });
  it("gli eventi non contengono mai mani", () => {
    const s = avviata();
    // Gli eventi dicono cosa è successo, mai cosa c'è in mano: solo la carta calata (pubblica) o un posto.
    const permessi = new Set(["nuovoRound", "salta", "inverti", "piu2", "gioca", "pesca", "passa", "bot"]);
    for (const e of vistaPer(s, 1, false).eventi) expect(permessi.has(e.tipo)).toBe(true);
    expect(JSON.stringify(vistaPer(s, 1, false).eventi)).not.toContain("mani");
  });
});

function eventiIds(v: ReturnType<typeof vistaPer>): Set<number> {
  const ids = new Set<number>();
  for (const e of v.eventi) if (e.tipo === "gioca") ids.add(e.carta.id);
  return ids;
}

describe("traduci: permessi", () => {
  it("avvia e prossimo round solo l'organizzatore", () => {
    const s = inSala();
    expect(() => traduci(s, 2, false, { tipo: "avvia" })).toThrow("soloHost");
    expect(traduci(s, 1, true, { tipo: "avvia" })).toEqual({ tipo: "avvia", seme: 42 });
  });
  it("chi guarda non può giocare", () => {
    const s = avviata();
    for (const tipo of ["pesca", "passa", "sfida", "accetta", "ultima"]) {
      expect(codice(() => traduci(s, null, false, { tipo }))).toBe("nonPartecipa");
    }
    expect(codice(() => traduci(s, null, false, { tipo: "gioca", carta: 1 }))).toBe("nonPartecipa");
  });
  it("una azione sconosciuta è rifiutata", () => {
    expect(codice(() => traduci(avviata(), 1, true, { tipo: "boh" }))).toBe("azioneNonValida");
  });
  it("«Simula mossa col bot» solo per l'organizzatore", () => {
    const s = avviata();
    expect(() => traduci(s, 2, false, { tipo: "mossaBot", posto: s.partita!.turno })).toThrow("soloHost");
    expect(traduci(s, 1, true, { tipo: "mossaBot", posto: 2 })).toEqual({ tipo: "bot", posto: 2, ora: 0 });
  });
  it("il giocatore non può dichiararsi un altro posto: chi è il suo", () => {
    const s = avviata();
    const a = traduci(s, 2, false, { tipo: "pesca", chi: 1 });
    expect(a).toEqual({ tipo: "pesca", chi: 2 });
  });
});

describe("mosse nel modulo online", () => {
  it("fuori turno e carte non in mano sono rifiutate", () => {
    const s = avviata();
    const turno = s.partita!.turno;
    const altro = turno === 1 ? 2 : 1;
    expect(codice(() => applica(s, { tipo: "pesca", chi: altro }))).toBe("nonTocca");
    expect(codice(() => applica(s, { tipo: "gioca", chi: turno, carta: 99999 }))).toBe("cartaNonInMano");
  });
  it("niente mosse in sala", () => {
    expect(codice(() => applica(inSala(), { tipo: "pesca", chi: 1 }))).toBe("nonInCorso");
  });
  it("mancanti: chi deve agire", () => {
    const s = avviata();
    expect(mancanti(s)).toEqual([s.partita!.turno]);
    expect(mancanti(inSala())).toEqual([]);
  });
});

/** Gioca finché il round ha un vincitore: ogni mossa è quella del bot, passando dal modulo online. */
function giocaConBot(s0: StatoOnline, tetto = 4000): StatoOnline {
  let s = s0;
  for (let i = 0; i < tetto && s.fase === "partita"; i++) {
    const p = s.partita!;
    const chi = p.ultime.find((u: { dichiarata: boolean }) => !u.dichiarata)?.posto ?? p.turno;
    s = applica(s, { tipo: "bot", posto: chi });
  }
  return s;
}

describe("«Simula mossa col bot»", () => {
  it("fa una mossa per il giocatore di turno e lo scrive negli eventi", () => {
    const s = avviata(8);
    const chi = s.partita!.turno;
    const dopo = applica(s, { tipo: "bot", posto: chi });
    expect(dopo.partita!.eventi.some((e) => e.tipo === "bot" && e.posto === chi)).toBe(true);
    expect(dopo.mosse).toBe(s.mosse + 1);
  });
  it("non si può simulare chi non deve agire", () => {
    const s = avviata(8);
    const altro = s.partita!.turno === 1 ? 2 : 1;
    expect(codice(() => applica(s, { tipo: "bot", posto: altro }))).toBe("nullaDaFare");
  });
  it("la mossa del bot è quella che calcola mossaBot", () => {
    const s = avviata(21);
    const chi = s.partita!.turno;
    const m = mossaBot(s.partita!, 3, chi);
    const dopo = applica(s, { tipo: "bot", posto: chi });
    if (m.tipo === "gioca") expect(dopo.partita!.scarto.at(-1)!.id).toBe(m.carta);
    if (m.tipo === "pesca") expect(dopo.partita!.mani[chi - 1]!.length).toBe(s.partita!.mani[chi - 1]!.length + 1);
  });
});

describe("partita completa con seme fisso", () => {
  it("un round singolo finisce con un vincitore, e si ripete identico", () => {
    const a = giocaConBot(avviata(77));
    const b = giocaConBot(avviata(77));
    expect(a.fase).toBe("fine");
    expect(a.vincitore).not.toBeNull();
    expect(a).toEqual(b);
    expect(a.punti[a.vincitore! - 1]).toBe(a.partita!.fine!.punti);
  });
  it("molti semi e molti giocatori: finiscono sempre", () => {
    for (const n of [2, 3, 5, 10]) {
      const nomi = Array.from({ length: n }, (_, i) => `G${i + 1}`);
      for (let seme = 0; seme < 15; seme++) {
        const fine = giocaConBot(avviata(seme, nomi));
        expect(fine.fase).toBe("fine");
      }
    }
  });
  it("a punti il round finito aspetta il prossimo e la partita finisce alla soglia", () => {
    let s = avviata(5, NOMI, { modo: "punti", soglia: 100 });
    let rounds = 0;
    while (s.fase !== "fine" && rounds < 60) {
      s = giocaConBot(s);
      if (s.fase === "fineRound") {
        expect(s.vincitore).toBeNull();
        s = applica(s, { tipo: "prossimoRound", seme: 1000 + rounds });
      }
      rounds++;
    }
    expect(s.fase).toBe("fine");
    expect(s.punti[s.vincitore! - 1]).toBeGreaterThanOrEqual(100);
    expect(s.round).toBeGreaterThan(1);
  });
  it("il primo di mano ruota a ogni round", () => {
    let s = avviata(5, NOMI, { modo: "punti", soglia: 2000 });
    expect(s.primo).toBe(1);
    s = giocaConBot(s);
    expect(s.fase).toBe("fineRound");
    s = applica(s, { tipo: "prossimoRound", seme: 9 });
    expect(s.primo).toBe(2);
    expect(s.round).toBe(2);
  });
  it("«prossimo round» e «ricomincia» solo nella fase giusta", () => {
    expect(codice(() => applica(avviata(), { tipo: "prossimoRound", seme: 1 }))).toBe("nonFinitoRound");
    expect(codice(() => applica(avviata(), { tipo: "ricomincia", seme: 1 }))).toBe("nonFinita");
  });
  it("ricomincia azzera i punti e riparte", () => {
    const fine = giocaConBot(avviata(5));
    const di_nuovo = applica(fine, { tipo: "ricomincia", seme: 3 });
    expect(di_nuovo.fase).toBe("partita");
    expect(di_nuovo.punti).toEqual([0, 0, 0]);
    expect(di_nuovo.vincitore).toBeNull();
  });
  it("a fine round la vista mostra i punti rimasti in mano a ognuno", () => {
    const fine = giocaConBot(avviata(5));
    const v = vistaPer(fine, 1, false);
    expect(v.fineRound?.vincitore).toBe(fine.vincitore);
    const somma = v.nomi.filter((n) => n.posto !== fine.vincitore).reduce((t, n) => t + (n.puntiInMano ?? 0), 0);
    expect(somma).toBe(fine.partita!.fine!.punti);
  });
});

describe("Ultima! e Beccato! online", () => {
  /** Porta una partita al punto in cui qualcuno ha appena calato la penultima carta. */
  function conUltima(): StatoOnline | null {
    for (let seme = 0; seme < 600; seme++) {
      let s = avviata(seme);
      for (let i = 0; i < 400 && s.fase === "partita"; i++) {
        const p = s.partita!;
        if (p.ultime.some((u) => !u.dichiarata)) return s;
        s = applica(s, { tipo: "bot", posto: p.turno });
        // Il bot dichiara sempre: per forzare la dimenticanza uso `gioca` diretto sul turno di chi ha 2 carte.
        const q = s.partita!;
        if (q.fine) break;
        const mano = q.mani[q.turno - 1]!;
        if (mano.length === 2 && !q.sfida && q.colore !== null) {
          const giocabile = mano.find((c: Carta) => ultimaOnline.vistaPer(s, q.turno, false, { collegati: new Set(), organizzatore: null }).giocabili.includes(c.id));
          if (giocabile && giocabile.tipo !== "piu4" && giocabile.tipo !== "jolly") {
            const dopo = applica(s, { tipo: "gioca", chi: q.turno, carta: giocabile.id });
            if (dopo.partita!.ultime.length > 0 && !dopo.partita!.fine) return dopo;
          }
        }
      }
    }
    return null;
  }
  it("chi dimentica «Ultima!» viene beccato da un altro e pesca 2", () => {
    const s = conUltima();
    expect(s).not.toBeNull();
    const dimentico = s!.partita!.ultime[0]!.posto;
    const beccatore = dimentico === 1 ? 2 : 1;
    const dopo = applica(s!, { tipo: "beccato", chi: beccatore, bersaglio: dimentico });
    expect(dopo.partita!.mani[dimentico - 1]).toHaveLength(3);
    expect(codice(() => applica(s!, { tipo: "beccato", chi: dimentico, bersaglio: dimentico }))).toBe("nonBeccabile");
  });
  it("chi la dichiara non si può più beccare", () => {
    const s = conUltima()!;
    const dimentico = s.partita!.ultime[0]!.posto;
    const detto = applica(s, { tipo: "ultima", chi: dimentico });
    const altro = dimentico === 1 ? 2 : 1;
    expect(codice(() => applica(detto, { tipo: "beccato", chi: altro, bersaglio: dimentico }))).toBe("nonBeccabile");
  });
});

describe("il bot becca chi dimentica «Ultima!»", () => {
  it("«Simula mossa» per l'avversario becca l'umano che non ha dichiarato", () => {
    for (let seme = 0; seme < 600; seme++) {
      let s = avviata(seme, ["Anna", "Bruno"]);
      for (let i = 0; i < 400 && s.fase === "partita"; i++) {
        const p = s.partita!;
        const mano = p.mani[p.turno - 1]!;
        if (mano.length === 2 && !p.sfida && p.colore !== null) {
          const v = vistaPer(s, p.turno, false);
          const c = mano.find((x) => v.giocabili.includes(x.id) && x.tipo === "numero");
          if (c) {
            const dopo = applica(s, { tipo: "gioca", chi: p.turno, carta: c.id });
            if (dopo.partita!.ultime.length > 0 && !dopo.partita!.fine) {
              const umano = p.turno;
              const finale = applica(dopo, { tipo: "bot", posto: dopo.partita!.turno });
              expect(finale.partita!.mani[umano - 1]).toHaveLength(3);
              expect(finale.partita!.eventi.some((e) => e.tipo === "beccato" && e.posto === umano)).toBe(true);
              return;
            }
          }
        }
        s = applica(s, { tipo: "bot", posto: p.ultime.find((u: { dichiarata: boolean }) => !u.dichiarata)?.posto ?? p.turno });
      }
    }
    throw new Error("situazione non trovata");
  });
});

describe("determinismo", () => {
  it("lo stesso seme dà lo stesso round", () => {
    expect(avviata(33)).toEqual(avviata(33));
    expect(creaRng(1).next()).toBe(creaRng(1).next());
  });
});

describe("varianti nella configurazione", () => {
  it("assenti = spente; una config vecchia resta valida", () => {
    expect(nuovoStato(NOMI, { modo: "punti", soglia: 100 }).config.varianti).toEqual(VARIANTI_BASE);
    expect(nuovoStato(NOMI, { varianti: {} }).config.varianti).toEqual(VARIANTI_BASE);
  });
  it("legge i booleani noti e ignora le chiavi sconosciute", () => {
    expect(nuovoStato(NOMI, { varianti: { sommaPiu2: true, taglio: false, boh: 1 } }).config.varianti).toEqual({ ...VARIANTI_BASE, sommaPiu2: true });
  });
  it("rifiuta valori non booleani o non oggetto", () => {
    expect(codice(() => nuovoStato(NOMI, { varianti: { sommaPiu2: "si" } }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { varianti: { piuUguali: 1 } }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { varianti: true }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { varianti: [] }))).toBe("configNonValida");
    expect(codice(() => nuovoStato(NOMI, { varianti: null }))).toBe("configNonValida");
  });
  it("il round parte con le varianti della stanza", () => {
    const s = avviata(5, NOMI, { varianti: { sommaPiu2: true } });
    expect(s.partita!.varianti.sommaPiu2).toBe(true);
    expect(vistaPer(s, 1, true).config.varianti.sommaPiu2).toBe(true);
  });
});

describe("somma dei +2 online", () => {
  const conCumulo = () => {
    for (let seme = 0; seme < 4000; seme++) {
      let s = avviata(seme, NOMI, { varianti: { sommaPiu2: true } });
      for (let i = 0; i < 300 && s.fase === "partita" && !s.partita!.fine; i++) {
        if (s.partita!.cumulo) return s;
        const p = s.partita!;
        s = applica(s, { tipo: "bot", posto: p.ultime.find((u) => !u.dichiarata)?.posto ?? p.turno });
      }
    }
    throw new Error("nessun cumulo trovato");
  };
  it("il cumulo è pubblico e solo chi lo ha lo paga", () => {
    const s = conCumulo();
    const { posto, quante } = s.partita!.cumulo!;
    const altro = posto === 1 ? 2 : 1;
    expect(vistaPer(s, altro, false).cumulo).toMatchObject({ posto, quante });
    expect(traduci(s, posto, false, { tipo: "pescaCumulo" })).toEqual({ tipo: "pescaCumulo", chi: posto });
    expect(codice(() => applica(s, { tipo: "pescaCumulo", chi: altro }))).toBe("nonTocca");
    expect(codice(() => traduci(s, null, false, { tipo: "pescaCumulo" }))).toBe("nonPartecipa");
    const dopo = applica(s, { tipo: "pescaCumulo", chi: posto });
    expect(dopo.partita!.cumulo).toBeNull();
    expect(dopo.partita!.mani[posto - 1]!.length).toBeGreaterThanOrEqual(s.partita!.mani[posto - 1]!.length + quante - 1);
  });
  it("la pesca singola è rifiutata e giocabili sono solo i +2", () => {
    const s = conCumulo();
    const { posto } = s.partita!.cumulo!;
    expect(codice(() => applica(s, { tipo: "pesca", chi: posto }))).toBe("rispondiCumulo");
    const v = vistaPer(s, posto, false);
    const mano = new Map(v.mano.map((c) => [c.id, c.tipo]));
    expect(v.giocabili.every((id) => mano.get(id) === "piu2")).toBe(true);
  });
  it("una partita intera con il bot arriva alla fine", () => {
    for (let seme = 0; seme < 15; seme++) expect(giocaConBot(avviata(seme, NOMI, { varianti: { sommaPiu2: true } })).fase).toBe("fine");
  });
});

describe("Scambio e Rotazione online", () => {
  const cfg = { varianti: { scambioRotazione: true } };
  it("il mazzo ha 112 carte e le mani altrui restano segrete dopo uno scambio", () => {
    let trovato = false;
    for (let seme = 0; seme < 60 && !trovato; seme++) {
      let s = avviata(seme, NOMI, cfg);
      expect(s.partita!.mazzo.length + s.partita!.scarto.length + s.partita!.mani.flat().length).toBe(112);
      for (let i = 0; i < 400 && s.fase === "partita"; i++) {
        const p = s.partita!;
        if (p.eventi.some((e) => e.tipo === "scambio" || e.tipo === "rotazione")) {
          trovato = true;
          for (const posto of [1, 2, 3]) {
            const v = vistaPer(s, posto, false);
            const testo = JSON.stringify(v);
            const altre = p.mani.filter((_, j) => j !== posto - 1).flat();
            const pubbliche = new Set([v.scoperta?.id, ...v.eventi.flatMap((e) => (e.tipo === "gioca" ? [e.carta.id] : []))]);
            for (const c of altre) if (!pubbliche.has(c.id)) expect(testo).not.toContain(`"id":${c.id},`);
            expect(v.mano.map((c) => c.id)).toEqual(p.mani[posto - 1]!.map((c) => c.id));
          }
          break;
        }
        s = applica(s, { tipo: "bot", posto: p.ultime.find((u) => !u.dichiarata)?.posto ?? p.turno });
      }
    }
    expect(trovato).toBe(true);
  });
  it("traduci inoltra scambiaCon e la logica rifiuta un posto non valido", () => {
    const s = avviata(3, NOMI, cfg);
    const p = s.partita!;
    const turno = p.turno;
    const sc = { id: 9999, tipo: "scambio" as const };
    const mani = p.mani.map((m, i) => (i + 1 === turno ? [sc, ...m] : m));
    const s2 = { ...s, partita: { ...p, mani, colore: "rosso" as const } };
    const a = traduci(s2, turno, false, { tipo: "gioca", carta: 9999, colore: "blu", scambiaCon: 2 });
    expect(a).toMatchObject({ tipo: "gioca", chi: turno, carta: 9999, colore: "blu", scambiaCon: 2 });
    expect(codice(() => applica(s2, { tipo: "gioca", chi: turno, carta: 9999, colore: "blu", scambiaCon: turno }))).toBe("scambioNonValido");
    const dopo = applica(s2, { tipo: "gioca", chi: turno, carta: 9999, colore: "blu", scambiaCon: turno === 1 ? 2 : 1 });
    expect(dopo.partita!.mani.flat()).toHaveLength(p.mani.flat().length + 1 - 1);
  });
  it("partite intere con il bot arrivano alla fine con tutte le varianti attive", () => {
    for (let seme = 0; seme < 10; seme++) {
      const s = giocaConBot(avviata(seme, NOMI, { varianti: { sommaPiu2: true, scambioRotazione: true } }));
      expect(s.fase).toBe("fine");
    }
  });
});

describe("Più carte uguali online", () => {
  const cfg = { varianti: { piuUguali: true } };
  it("traduci inoltra `insieme` come lista di numeri; la logica lo controlla", () => {
    const s = avviata(3, NOMI, cfg);
    const turno = s.partita!.turno;
    const a = traduci(s, turno, false, { tipo: "gioca", carta: 1, insieme: ["2", 3] });
    expect(a).toMatchObject({ tipo: "gioca", insieme: [2, 3] });
    expect(codice(() => applica(s, { tipo: "gioca", chi: turno, carta: s.partita!.mani[turno - 1]![0]!.id, insieme: [s.partita!.mani[turno - 1]![0]!.id] }))).toBe("gruppoNonValido");
  });
  it("con la variante spenta `insieme` è rifiutato", () => {
    const s = avviata(3);
    const turno = s.partita!.turno;
    const mano = s.partita!.mani[turno - 1]!;
    expect(codice(() => applica(s, { tipo: "gioca", chi: turno, carta: mano[0]!.id, insieme: [mano[1]!.id] }))).toBe("variantaSpenta");
  });
  it("un gruppo calato da un telefono finisce nello scarto e negli eventi", () => {
    for (let seme = 0; seme < 400; seme++) {
      const s = avviata(seme, NOMI, cfg);
      const p = s.partita!;
      const turno = p.turno;
      const v = vistaPer(s, turno, false);
      const gruppi = gruppiDellaMano(v.mano, v.giocabili);
      if (gruppi.length === 0) continue;
      const g = gruppi[0]!;
      const cima = g.find((c) => v.giocabili.includes(c.id))!;
      const dopo = applica(s, { tipo: "gioca", chi: turno, carta: cima.id, colore: undefined, insieme: g.filter((c) => c.id !== cima.id).map((c) => c.id) });
      expect(dopo.partita!.scarto.slice(-g.length).map((c) => c.id)).toContain(cima.id);
      expect(dopo.partita!.mani[turno - 1]!.length).toBe(p.mani[turno - 1]!.length - g.length);
      expect(dopo.partita!.eventi.some((e) => e.tipo === "gioca" && e.quante === g.length)).toBe(true);
      return;
    }
    throw new Error("nessun gruppo trovato");
  });
  it("partite intere con il bot, con tutte le varianti insieme", () => {
    for (let seme = 0; seme < 10; seme++) {
      const s = giocaConBot(avviata(seme, NOMI, { varianti: { sommaPiu2: true, piuUguali: true, scambioRotazione: true } }));
      expect(s.fase).toBe("fine");
    }
  });
});

describe("Taglio online", () => {
  const cfg = { varianti: { taglio: true } };
  /** Una giocata del bot con `ora` finta: apre la finestra. Ritorna lo stato e chi può tagliare (se qualcuno). */
  function conFinestra(seme0 = 0): { s: StatoOnline; posto: number; carta: Carta } | null {
    for (let seme = seme0; seme < seme0 + 4000; seme++) {
      let s = avviata(seme, NOMI, cfg);
      for (let i = 0; i < 300 && s.fase === "partita" && !s.partita!.fine; i++) {
        const p = s.partita!;
        if (p.apertaTaglio) {
          const posto = [1, 2, 3].find((x) => x !== p.apertaTaglio!.posto && x !== p.turno && p.mani[x - 1]!.some((c) => c.id !== undefined && identicaA(c, p.apertaTaglio!.carta)));
          if (posto !== undefined) return { s, posto, carta: p.mani[posto - 1]!.find((c) => identicaA(c, p.apertaTaglio!.carta))! };
        }
        s = applica(s, { tipo: "bot", posto: p.ultime.find((u) => !u.dichiarata)?.posto ?? p.turno, ora: 1 } as never);
      }
    }
    return null;
  }
  const identicaA = (a: Carta, b: Carta) => a.tipo !== "numero" ? a.tipo === b.tipo && "colore" in a && "colore" in b && a.colore === b.colore : b.tipo === "numero" && a.tipo === "numero" && a.colore === b.colore && a.valore === b.valore;

  it("la giocata apre la finestra con l'ora del server; `vistaPer` la mostra a tutti", () => {
    const r = conFinestra();
    expect(r).not.toBeNull();
    const { s, posto } = r!;
    const ap = s.partita!.apertaTaglio!;
    // Il bot ha giocato con ora = 1 (orologio finto): la finestra dura 3 s da lì.
    expect(ap.fino).toBe(1 + 3000);
    const vista = vistaPer(s, posto, false);
    expect(vista.taglio).toEqual({ posto: ap.posto, carta: ap.carta });
    expect(vista.puoTagliare.length).toBeGreaterThan(0);
    expect(vistaPer(s, s.partita!.turno, false).puoTagliare).toEqual([]);
  });
  it("solo chi ha un posto e la carta può tagliare; chi guarda no; «Simula mossa» non taglia", () => {
    const r = conFinestra();
    const { s, posto, carta } = r!;
    expect(traduci(s, posto, false, { tipo: "taglia", carta: carta.id })).toEqual({ tipo: "taglia", chi: posto, carta: carta.id, ora: 0 });
    expect(codice(() => traduci(s, null, false, { tipo: "taglia", carta: carta.id }))).toBe("nonPartecipa");
    expect(traduci(s, 1, true, { tipo: "mossaBot", posto: s.partita!.turno })).toMatchObject({ tipo: "bot" });
  });
  it("una gara: il primo taglio arriva, il secondo riceve «tagliTardi»", () => {
    const r = conFinestra(100);
    const { s, posto, carta } = r!;
    const altro = [1, 2, 3].find((x) => x !== posto && x !== s.partita!.apertaTaglio!.posto && x !== s.partita!.turno && s.partita!.mani[x - 1]!.some((c) => identicaA(c, carta)));
    const primo = applica(s, { tipo: "taglia", chi: posto, carta: carta.id, ora: s.partita!.apertaTaglio!.fino - 100 });
    expect(primo.partita!.eventi.some((e) => e.tipo === "taglio" && e.posto === posto)).toBe(true);
    expect(primo.partita!.apertaTaglio).toBeNull();
    // Il secondo arriva a finestra chiusa (anche se ha la stessa carta): messaggio neutro.
    const c2 = altro !== undefined ? s.partita!.mani[altro - 1]!.find((c) => identicaA(c, carta))! : carta;
    expect(codice(() => applica(primo, { tipo: "taglia", chi: altro ?? posto, carta: c2.id, ora: 0 }))).toBe("tagliTardi");
    expect(codice(() => applica(s, { tipo: "taglia", chi: posto, carta: carta.id, ora: s.partita!.apertaTaglio!.fino + 5000 }))).toBe("tagliTardi");
  });
  it("i telefoni non vedono le mani altrui dopo un taglio", () => {
    const r = conFinestra(200);
    const { s, posto, carta } = r!;
    const dopo = applica(s, { tipo: "taglia", chi: posto, carta: carta.id, ora: s.partita!.apertaTaglio!.fino - 1 });
    for (const q of [1, 2, 3]) {
      const v = vistaPer(dopo, q, false);
      expect(v.taglio).toBeNull();
      expect(v.mano.map((c) => c.id)).toEqual(dopo.partita!.mani[q - 1]!.map((c) => c.id));
    }
  });
  it("partite intere con il taglio attivo finiscono", () => {
    for (let seme = 0; seme < 8; seme++) expect(giocaConBot(avviata(seme, NOMI, cfg)).fase).toBe("fine");
  });
});

describe("mazzo vuoto online", () => {
  it("il server rifiuta la pesca e la vista disattiva «Pesca»; si può passare", () => {
    const s = avviata(3);
    const p = s.partita!;
    const turno = p.turno;
    const vuoto: StatoOnline = { ...s, partita: { ...p, mazzo: [], scarto: [p.scarto[p.scarto.length - 1]!], haPescato: false, pescata: null } };
    expect(vistaPer(vuoto, turno, false).puoPescare).toBe(false);
    expect(codice(() => applica(vuoto, { tipo: "pesca", chi: turno }))).toBe("mazzoVuoto");
    const dopo = applica(vuoto, { tipo: "passa", chi: turno });
    expect(dopo.partita!.turno).not.toBe(turno);
    const rimescolabile: StatoOnline = { ...vuoto, partita: { ...vuoto.partita!, scarto: [p.scarto[0]!, p.scarto[p.scarto.length - 1]!] } };
    expect(vistaPer(rimescolabile, turno, false).puoPescare).toBe(true);
  });
});
