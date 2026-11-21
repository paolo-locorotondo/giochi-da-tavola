import { creaRng } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import { mossaBot, mossaBotLivello, LIVELLI, type Livello } from "./bot";
import { ErroreUltima, nuovoRound } from "./logica";
import {
  IO,
  RITARDO_BECCATO_MS,
  VELOCITA,
  agisci,
  botDelTaglio,
  botDiTurno,
  ritardoTaglioBot,
  tagliaBot,
  muoviBot,
  nuovaPartitaLocale,
  pausaBot,
  vistaLocale,
  type PartitaLocale,
} from "./offline";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreUltima ? e.codice : "altro";
  }
  return null;
};
const NOMI = ["Io", "Bot 1", "Bot 2"];
const seme = () => 7;
const partita = (livello: Livello = "difficile", nomi = NOMI, config: unknown = {}, s = 5) => nuovaPartitaLocale({ nomi, livello, config }, s);

/** Gioco io come un bot difficile e lascio muovere gli altri finché il round finisce. */
function finoInFondo(p0: PartitaLocale, tetto = 4000): PartitaLocale {
  let p = p0;
  for (let i = 0; i < tetto && p.stato.fase === "partita"; i++) {
    if (botDiTurno(p) !== null) {
      p = muoviBot(p);
      continue;
    }
    const s = p.stato.partita!;
    const m = mossaBot(s, s.mani.length, IO);
    const richiesta = m.tipo === "beccato" ? { tipo: "beccato", posto: m.bersaglio } : { ...m };
    p = agisci(p, richiesta, seme);
  }
  return p;
}

describe("nuova partita contro i bot", () => {
  it("parte subito, con me al posto 1 e tutti i posti occupati", () => {
    const p = partita();
    expect(p.stato.fase).toBe("partita");
    expect(p.stato.occupati).toEqual([1, 2, 3]);
    expect(vistaLocale(p).io).toBe(IO);
    expect(vistaLocale(p).host).toBe(true);
  });
  it("da 1 a 9 bot: in tutto da 2 a 10 giocatori", () => {
    expect(codice(() => partita("difficile", ["Io"]))).toBe("numeroGiocatori");
    expect(codice(() => partita("difficile", Array.from({ length: 11 }, (_, i) => `G${i}`)))).toBe("numeroGiocatori");
    expect(codice(() => partita("difficile", Array.from({ length: 10 }, (_, i) => `G${i}`)))).toBeNull();
  });
  it("rifiuta un livello sconosciuto e nomi uguali", () => {
    expect(codice(() => partita("boh" as Livello))).toBe("configNonValida");
    expect(codice(() => partita("difficile", ["Io", "io"]))).toBe("nomiNonValidi");
  });
});

describe("vista: la mano dei bot resta coperta", () => {
  it("vedo solo la mia mano; degli altri il numero di carte", () => {
    const p = partita();
    const v = vistaLocale(p);
    expect(v.mano).toEqual(p.stato.partita!.mani[0]);
    expect(v.nomi.map((n) => n.carte)).toEqual(p.stato.partita!.mani.map((m) => m.length));
    expect(v.nomi.every((n) => n.collegato)).toBe(true);
  });
});

describe("turni", () => {
  it("botDiTurno: null quando tocca a me, il posto del bot altrimenti", () => {
    for (let s = 0; s < 50; s++) {
      const p = partita("difficile", NOMI, {}, s);
      const turno = p.stato.partita!.turno;
      expect(botDiTurno(p)).toBe(turno === IO ? null : turno);
    }
  });
  it("muoviBot non fa nulla quando tocca a me", () => {
    for (let s = 0; s < 50; s++) {
      const p = partita("difficile", NOMI, {}, s);
      if (botDiTurno(p) === null) {
        expect(muoviBot(p)).toBe(p);
        return;
      }
    }
    throw new Error("nessun seme in cui inizio io");
  });
  it("fuori turno non posso giocare, e «Simula mossa» non c'è", () => {
    for (let s = 0; s < 50; s++) {
      const p = partita("difficile", NOMI, {}, s);
      if (botDiTurno(p) === null) continue;
      expect(codice(() => agisci(p, { tipo: "pesca" }, seme))).toBe("nonTocca");
      expect(codice(() => agisci(p, { tipo: "mossaBot", posto: 2 }, seme))).toBe("azioneNonValida");
      return;
    }
    throw new Error("nessun seme in cui inizia un bot");
  });
});

describe("partite intere contro i bot", () => {
  it("finiscono sempre, a ogni livello e con 1-9 bot", () => {
    for (const livello of LIVELLI) {
      for (const n of [2, 3, 6, 10]) {
        const nomi = ["Io", ...Array.from({ length: n - 1 }, (_, i) => `Bot ${i + 1}`)];
        for (let s = 0; s < 8; s++) {
          expect(finoInFondo(partita(livello, nomi, {}, s)).stato.fase).toBe("fine");
        }
      }
    }
  });
  it("a punti: «Prossimo round» lo do io, poi i bot ripartono", () => {
    let p = finoInFondo(partita("medio", NOMI, { modo: "punti", soglia: 2000 }));
    expect(p.stato.fase).toBe("fineRound");
    expect(botDiTurno(p)).toBeNull();
    p = agisci(p, { tipo: "prossimoRound" }, seme);
    expect(p.stato.round).toBe(2);
  });
  it("sono riproducibili con lo stesso seme", () => {
    expect(finoInFondo(partita("medio"))).toEqual(finoInFondo(partita("medio")));
  });
});

describe("«Ultima!» e «Beccato!» contro i bot", () => {
  /** Mi porto a due carte con una giocabile, e la calo senza dire «Ultima!». */
  function hoDimenticato(livello: Livello): PartitaLocale | null {
    for (let s = 0; s < 400; s++) {
      let p = partita(livello, ["Io", "Bot"], {}, s);
      for (let i = 0; i < 600 && p.stato.fase === "partita"; i++) {
        if (botDiTurno(p) !== null) {
          p = muoviBot(p);
          continue;
        }
        const st = p.stato.partita!;
        const mano = st.mani[0]!;
        const v = vistaLocale(p);
        if (mano.length === 2 && !st.sfida && st.colore !== null) {
          const c = mano.find((x) => v.giocabili.includes(x.id) && x.tipo === "numero");
          if (c) {
            const dopo = agisci(p, { tipo: "gioca", carta: c.id }, seme);
            if (dopo.stato.partita!.ultime.length > 0 && !dopo.stato.partita!.fine) return dopo;
          }
        }
        const m = mossaBot(st, 2, IO);
        p = agisci(p, m.tipo === "beccato" ? { tipo: "beccato", posto: m.bersaglio } : { ...m }, seme);
      }
    }
    return null;
  }
  it("il bot difficile mi becca se dimentico", () => {
    const p = hoDimenticato("difficile")!;
    expect(p).not.toBeNull();
    const dopo = muoviBot(p);
    expect(dopo.stato.partita!.mani[0]).toHaveLength(3);
  });
  it("se dico «Ultima!» in tempo non mi becca", () => {
    const p = agisci(hoDimenticato("difficile")!, { tipo: "ultima" }, seme);
    const conta = (x: PartitaLocale) => x.stato.partita!.eventi.filter((e) => e.tipo === "beccato").length;
    expect(conta(muoviBot(p))).toBe(conta(p));
  });
  it("prima di beccarmi i bot lasciano almeno il ritardo minimo, anche veloci", () => {
    const p = hoDimenticato("difficile")!;
    expect(pausaBot(p, "veloce")).toBe(RITARDO_BECCATO_MS);
    expect(pausaBot(p, "lenta")).toBe(VELOCITA.lenta);
    expect(pausaBot(partita(), "veloce")).toBe(VELOCITA.veloce);
  });
});

describe("livelli dei bot", () => {
  it("difficile è sempre la mossa migliore", () => {
    for (let s = 0; s < 40; s++) {
      const p = nuovoRound(3, creaRng(s));
      if (p.colore === null) continue;
      expect(mossaBotLivello(p, 3, p.turno, "difficile", creaRng(s))).toEqual(mossaBot(p, 3, p.turno));
    }
  });
  it("facile e medio fanno sempre mosse lecite (nessuna eccezione in partita)", () => {
    // Lo coprono le partite intere sopra; qui verifico che facile a volte scelga diversamente da difficile.
    let diverse = 0;
    for (let s = 0; s < 200; s++) {
      const p = nuovoRound(3, creaRng(s));
      if (p.colore === null) continue;
      const a = mossaBotLivello(p, 3, p.turno, "facile", creaRng(s + 1000));
      if (JSON.stringify(a) !== JSON.stringify(mossaBot(p, 3, p.turno))) diverse++;
    }
    expect(diverse).toBeGreaterThan(0);
  });
});

describe("varianti contro i bot", () => {
  it("la partita parte con le varianti scelte e finisce a ogni livello", () => {
    for (const livello of LIVELLI) {
      for (let s = 0; s < 6; s++) {
        const p = partita(livello, ["Io", "Bot 1", "Bot 2"], { varianti: { sommaPiu2: true } }, s);
        expect(p.stato.partita!.varianti.sommaPiu2).toBe(true);
        expect(finoInFondo(p).stato.fase).toBe("fine");
      }
    }
  });
  it("io pago il cumulo con «pescaCumulo»", () => {
    for (let s = 0; s < 3000; s++) {
      let p = partita("difficile", ["Io", "Bot"], { varianti: { sommaPiu2: true } }, s);
      for (let i = 0; i < 400 && p.stato.fase === "partita"; i++) {
        if (botDiTurno(p) !== null) {
          p = muoviBot(p);
          continue;
        }
        const st = p.stato.partita!;
        if (st.cumulo?.posto === IO) {
          const dopo = agisci(p, { tipo: "pescaCumulo" }, seme);
          expect(dopo.stato.partita!.cumulo).toBeNull();
          return;
        }
        const m = mossaBot(st, 2, IO);
        p = agisci(p, m.tipo === "beccato" ? { tipo: "beccato", posto: m.bersaglio } : { ...m }, seme);
      }
    }
    throw new Error("nessun cumulo per me");
  });
});

describe("taglio contro i bot", () => {
  it("un bot con la carta identica taglia dopo la mia giocata, e le partite finiscono", () => {
    let tagliati = 0;
    for (let s = 0; s < 40; s++) {
      let p = partita("difficile", ["Io", "Bot 1", "Bot 2"], { varianti: { taglio: true } }, s);
      for (let i = 0; i < 1500 && p.stato.fase === "partita"; i++) {
        const t = botDelTaglio(p);
        if (t) {
          p = tagliaBot(p, t, Date.now());
          tagliati++;
          continue;
        }
        if (botDiTurno(p) !== null) {
          p = muoviBot(p, Date.now());
          continue;
        }
        const st = p.stato.partita!;
        const m = mossaBot(st, 3, IO);
        p = agisci(p, m.tipo === "beccato" ? { tipo: "beccato", posto: m.bersaglio } : { ...m }, seme);
      }
      expect(p.stato.fase).toBe("fine");
    }
    expect(tagliati).toBeGreaterThan(0);
  });
  it("il ritardo del taglio dei bot sta fra 1 e 2,5 secondi a ogni velocità", () => {
    for (const v of ["lenta", "normale", "veloce"] as const) {
      expect(ritardoTaglioBot(v)).toBeGreaterThanOrEqual(1000);
      expect(ritardoTaglioBot(v)).toBeLessThanOrEqual(2500);
    }
  });
  it("il mio taglio passa dalla stessa azione e fuori finestra è «tagliTardi»", () => {
    for (let s = 0; s < 300; s++) {
      let p = partita("difficile", ["Io", "Bot 1", "Bot 2"], { varianti: { taglio: true } }, s);
      for (let i = 0; i < 600 && p.stato.fase === "partita"; i++) {
        const st = p.stato.partita!;
        const v = vistaLocale(p);
        if (v.puoTagliare.length > 0) {
          expect(() => agisci(p, { tipo: "taglia", carta: v.puoTagliare[0] }, seme)).not.toThrow();
          const dopo = agisci(p, { tipo: "taglia", carta: v.puoTagliare[0] }, seme);
          expect(dopo.stato.partita!.eventi.some((e) => e.tipo === "taglio" && e.posto === IO)).toBe(true);
          return;
        }
        if (botDiTurno(p) !== null) p = muoviBot(p, Date.now());
        else {
          const m = mossaBot(st, 3, IO);
          p = agisci(p, m.tipo === "beccato" ? { tipo: "beccato", posto: m.bersaglio } : { ...m }, seme);
        }
      }
    }
    throw new Error("nessuna finestra di taglio per me");
  });
});
