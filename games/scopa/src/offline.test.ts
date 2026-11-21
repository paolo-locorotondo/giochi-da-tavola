import { describe, expect, it } from "vitest";
import { LIVELLI, mossaBot, type Livello } from "./bot";
import { ErroreScopa } from "./logica";
import { IO, VELOCITA, agisci, botDiTurno, muoviBot, nuovaPartitaLocale, pausaBot, vistaLocale, type PartitaLocale, type Velocita } from "./offline";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreScopa ? e.codice : "altro";
  }
  return null;
};
const seme = () => 7;
const partita = (nomi = ["Io", "Bot 1"], livello: Livello = "difficile", config: unknown = {}) => nuovaPartitaLocale({ nomi, livello, config }, 5);

/** Gioco io come un bot difficile e lascio muovere gli altri finché il round finisce. */
function finoInFondo(p0: PartitaLocale): PartitaLocale {
  let p = p0;
  for (let i = 0; i < 200 && p.stato.fase === "partita"; i++) {
    if (botDiTurno(p) !== null) {
      p = muoviBot(p);
      continue;
    }
    const m = mossaBot(p.stato.partita!, IO);
    p = agisci(p, { tipo: "gioca", carta: m.carta, presa: m.presa }, seme);
  }
  return p;
}

describe("nuova partita contro i bot", () => {
  it("parte subito, io al posto 1 e organizzatore", () => {
    const p = partita();
    expect(p.stato.fase).toBe("partita");
    expect(p.stato.occupati).toEqual([1, 2]);
    expect(vistaLocale(p).io).toBe(IO);
    expect(vistaLocale(p).host).toBe(true);
  });
  it("2 o 4 posti; 1 e 3 no; livello sconosciuto e nomi uguali no", () => {
    expect(codice(() => partita(["Io"]))).toBe("numeroGiocatori");
    expect(codice(() => partita(["Io", "B1", "B2"]))).toBe("numeroGiocatori");
    expect(codice(() => partita(["Io", "B1", "B2", "B3"]))).toBeNull();
    expect(codice(() => partita(["Io", "B1"], "boh" as Livello))).toBe("configNonValida");
    expect(codice(() => partita(["Io", "io"]))).toBe("nomiNonValidi");
  });
  it("vista senza mani altrui, tutti collegati; a 4 il posto 3 è il compagno", () => {
    const v = vistaLocale(partita(["Io", "B1", "B2", "B3"]));
    expect(v.mano).toHaveLength(3);
    expect(v.nomi.every((n) => n.collegato)).toBe(true);
    expect(v.nomi.map((n) => n.carte)).toEqual([3, 3, 3, 3]);
    expect(v.nomi[2]!.squadra).toBe(v.miaSquadra);
  });
});

describe("turni", () => {
  it("nessun bot gioca per me; muoviBot non tocca lo stato se tocca a me", () => {
    const p = partita(["Io", "B1"]);
    expect(botDiTurno(p)).toBeNull(); // apro io
    expect(muoviBot(p)).toBe(p);
    expect(codice(() => agisci(p, { tipo: "mossaBot", posto: 2 }, seme))).toBe("azioneNonValida");
    expect(codice(() => agisci(p, { tipo: "squadre", a: 1, b: 2 }, seme))).toBe("azioneNonValida");
    const m = mossaBot(p.stato.partita!, IO);
    const dopo = agisci(p, { tipo: "gioca", carta: m.carta, presa: m.presa }, seme);
    expect(botDiTurno(dopo)).toBe(2);
    expect(muoviBot(dopo).stato.mosse).toBe(2);
  });
  it("la pausa dei bot segue la velocità", () => {
    for (const v of Object.keys(VELOCITA) as Velocita[]) expect(pausaBot(v)).toBe(VELOCITA[v]);
  });
  it("partita intera a ogni livello, a 2 e a 4 posti", () => {
    for (const livello of LIVELLI) {
      for (const nomi of [["Io", "B1"], ["Io", "B1", "B2", "B3"]]) {
        let p = partita(nomi, livello, { soglia: 11 });
        for (let r = 0; r < 20 && p.stato.fase !== "fine"; r++) {
          p = finoInFondo(p);
          if (p.stato.fase === "fineRound") p = agisci(p, { tipo: "prossimoRound" }, seme);
        }
        expect(p.stato.fase).toBe("fine");
        expect(p.stato.vincitore).not.toBeNull();
      }
    }
  });
});
