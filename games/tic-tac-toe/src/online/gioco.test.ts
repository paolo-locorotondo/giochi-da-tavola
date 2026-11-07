import { describe, expect, it } from "vitest";
import { ErroreTris } from "../logica";
import { applica, mancanti, nuovoStato, trisOnline, vistaPer, type AzioneOnline, type StatoOnline } from "./gioco";

const codice = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroreTris ? e.codice : "altro";
  }
  return null;
};
const esegui = (s: StatoOnline, ...azioni: AzioneOnline[]) => azioni.reduce(applica, s);
const inSala = () => esegui(nuovoStato(["Anna", "Bruno"]), { tipo: "occupa", posto: 1 }, { tipo: "occupa", posto: 2 });
const avviata = () => applica(inSala(), { tipo: "avvia" });
const muovi = (chi: number, casella: number): AzioneOnline => ({ tipo: "muovi", chi, casella });
/** X (posto 1) vince in alto: 0, 1, 2 con O che gioca 3, 4. */
const vintaDaX = () => esegui(avviata(), muovi(1, 0), muovi(2, 3), muovi(1, 1), muovi(2, 4), muovi(1, 2));
/** Pareggio. */
const pari = () =>
  esegui(avviata(), muovi(1, 0), muovi(2, 1), muovi(1, 2), muovi(2, 4), muovi(1, 3), muovi(2, 5), muovi(1, 7), muovi(2, 6), muovi(1, 8));

describe("nuovoStato", () => {
  it("vuole due nomi diversi e non vuoti", () => {
    expect(codice(() => nuovoStato(["Anna"]))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato(["Anna", "  "]))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato(["Anna", "anna"]))).toBe("nomiNonValidi");
    expect(codice(() => nuovoStato("x" as never))).toBe("nomiNonValidi");
  });
  it("parte in sala, senza partita", () => {
    const s = nuovoStato([" Anna ", "Bruno"]);
    expect(s.nomi).toEqual(["Anna", "Bruno"]);
    expect(s.fase).toBe("sala");
    expect(s.partita).toBeNull();
  });
});

describe("posti e avvio", () => {
  it("un posto non si prende due volte e solo 1 e 2 esistono", () => {
    const s = applica(nuovoStato(["A", "B"]), { tipo: "occupa", posto: 1 });
    expect(codice(() => applica(s, { tipo: "occupa", posto: 1 }))).toBe("nomeOccupato");
    expect(codice(() => applica(s, { tipo: "occupa", posto: 3 }))).toBe("nomeInesistente");
  });
  it("libera il posto solo in sala", () => {
    expect(applica(inSala(), { tipo: "libera", posto: 2 }).occupati).toEqual([1]);
    expect(applica(avviata(), { tipo: "libera", posto: 2 }).occupati).toEqual([1, 2]);
  });
  it("si avvia solo con entrambi i posti e una volta sola; X inizia", () => {
    const uno = applica(nuovoStato(["A", "B"]), { tipo: "occupa", posto: 1 });
    expect(codice(() => applica(uno, { tipo: "avvia" }))).toBe("pochiHannoScelto");
    const s = avviata();
    expect(s.fase).toBe("partita");
    expect(s.partita!.turno).toBe("X");
    expect(codice(() => applica(s, { tipo: "avvia" }))).toBe("giaIniziata");
  });
});

describe("mosse", () => {
  it("muove solo chi ha il turno", () => {
    const s = avviata();
    expect(codice(() => applica(s, muovi(2, 0)))).toBe("nonTocca");
    const dopo = applica(s, muovi(1, 4));
    expect(dopo.partita!.griglia[4]).toBe("X");
    expect(mancanti(dopo)).toEqual([2]);
    expect(codice(() => applica(dopo, muovi(1, 0)))).toBe("nonTocca");
  });
  it("rifiuta caselle occupate o fuori griglia, senza cambiare lo stato", () => {
    const s = applica(avviata(), muovi(1, 4));
    expect(codice(() => applica(s, muovi(2, 4)))).toBe("casellaOccupata");
    expect(codice(() => applica(s, muovi(2, 9)))).toBe("casellaNonValida");
    expect(codice(() => applica(s, muovi(2, 1.5)))).toBe("casellaNonValida");
    expect(codice(() => applica(s, muovi(2, NaN)))).toBe("casellaNonValida");
    expect(s.partita!.griglia[1]).toBeNull();
  });
  it("non si muove in sala né a partita finita", () => {
    expect(codice(() => applica(inSala(), muovi(1, 0)))).toBe("nonInCorso");
    expect(codice(() => applica(vintaDaX(), muovi(2, 8)))).toBe("nonInCorso");
  });
  it("una partita vinta chiude, assegna il punto e dice chi ha vinto", () => {
    const s = vintaDaX();
    expect(s.fase).toBe("fine");
    expect(s.punteggio).toEqual({ X: 1, O: 0, pareggi: 0 });
    const v = vistaPer(s, 2, false);
    expect(v.vincitore).toBe(1);
    expect(v.esito!.linea).toEqual([0, 1, 2]);
    expect(v.mioTurno).toBe(false);
  });
  it("un pareggio conta come pareggio, senza vincitore", () => {
    const s = pari();
    expect(s.fase).toBe("fine");
    expect(s.punteggio).toEqual({ X: 0, O: 0, pareggi: 1 });
    expect(vistaPer(s, 1, true).vincitore).toBeNull();
  });
});

describe("rivincita", () => {
  it("parte solo quando la chiedono entrambi; chi inizia alterna", () => {
    const s = vintaDaX();
    expect(mancanti(s)).toEqual([1, 2]);
    const uno = applica(s, { tipo: "rivincita", chi: 2 });
    expect(uno.fase).toBe("fine");
    expect(vistaPer(uno, 2, false).rivincita).toEqual({ io: true, altro: false });
    expect(vistaPer(uno, 1, true).rivincita).toEqual({ io: false, altro: true });
    // Chiederla due volte dallo stesso posto non basta.
    expect(applica(uno, { tipo: "rivincita", chi: 2 }).fase).toBe("fine");
    const due = applica(uno, { tipo: "rivincita", chi: 1 });
    expect(due.fase).toBe("partita");
    expect(due.partita!.turno).toBe("O");
    expect(due.partita!.griglia.every((c) => c === null)).toBe(true);
    expect(due.punteggio.X).toBe(1); // la serie continua
    // E alla successiva torna a iniziare X.
    const terza = esegui(due, muovi(2, 0), muovi(1, 3), muovi(2, 1), muovi(1, 4), muovi(2, 2), { tipo: "rivincita", chi: 1 }, { tipo: "rivincita", chi: 2 });
    expect(terza.partita!.turno).toBe("X");
  });
  it("si chiede solo a partita finita", () => {
    expect(codice(() => applica(avviata(), { tipo: "rivincita", chi: 1 }))).toBe("nonFinita");
  });
});

describe("vista", () => {
  it("mostra a chi guarda la partita senza dargli il turno", () => {
    const s = applica(avviata(), muovi(1, 4));
    const spettatore = vistaPer(s, null, false);
    expect(spettatore.io).toBeNull();
    expect(spettatore.mioTurno).toBe(false);
    expect(spettatore.rivincita).toEqual({ io: false, altro: false });
    expect(spettatore.griglia[4]).toBe("X");
    expect(vistaPer(s, 2, false).mioTurno).toBe(true);
    expect(vistaPer(s, 1, true).mioTurno).toBe(false);
  });
});

describe("traduci (permessi)", () => {
  const ctx = (posto: number | null, host = false) => ({ posto, host, seme: () => 0 });
  const s = avviata();
  it("solo l'organizzatore avvia", () => {
    expect(() => trisOnline.traduci(inSala(), ctx(2), { tipo: "avvia" })).toThrow();
    expect(trisOnline.traduci(inSala(), ctx(1, true), { tipo: "avvia" })).toEqual({ tipo: "avvia" });
  });
  it("muove sempre per il proprio posto, mai per un altro", () => {
    expect(trisOnline.traduci(s, ctx(1), { tipo: "muovi", casella: 4, chi: 2 })).toEqual({ tipo: "muovi", chi: 1, casella: 4 });
    expect(codice(() => trisOnline.traduci(s, ctx(null), { tipo: "muovi", casella: 4 }))).toBe("nonPartecipa");
  });
  it("chi guarda non può chiedere la rivincita e le azioni sconosciute si rifiutano", () => {
    expect(codice(() => trisOnline.traduci(s, ctx(null), { tipo: "rivincita" }))).toBe("nonPartecipa");
    expect(codice(() => trisOnline.traduci(s, ctx(1, true), { tipo: "nuova" }))).toBe("azioneNonValida");
  });
});
