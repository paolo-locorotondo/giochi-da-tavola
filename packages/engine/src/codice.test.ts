import { describe, expect, it } from "vitest";
import {
  ALFABETO,
  codificaCodice,
  decodificaCodice,
  formattaCodice,
  generaCodice,
  normalizzaCodice,
  rngDaCodice,
} from "./codice";
import { creaRng } from "./rng";

const parametri = { giocatori: 6, impostori: 1, categoria: "cibi" };

describe("codice partita", () => {
  it("l'alfabeto ha 31 simboli univoci senza caratteri ambigui", () => {
    expect(ALFABETO).toHaveLength(31);
    expect(new Set(ALFABETO).size).toBe(31);
    for (const vietato of "01ILO") expect(ALFABETO).not.toContain(vietato);
  });

  it("codifica e decodifica restituiscono seme e versione", () => {
    const codice = codificaCodice({ seme: 123456789, versione: 3 }, parametri);
    expect(codice).toHaveLength(8);
    const esito = decodificaCodice(codice, parametri);
    expect(esito).toEqual({ ok: true, codice: { seme: 123456789, versione: 3 } });
  });

  it("generaCodice produce codici decodificabili", () => {
    for (let i = 0; i < 200; i++) {
      const codice = generaCodice(parametri, 1);
      const esito = decodificaCodice(codice, parametri);
      expect(esito.ok).toBe(true);
    }
  });

  it("accetta minuscole, spazi e trattino", () => {
    const codice = codificaCodice({ seme: 42, versione: 0 }, parametri);
    const scritto = formattaCodice(codice).toLowerCase().replace("-", " - ");
    expect(decodificaCodice(scritto, parametri).ok).toBe(true);
    expect(normalizzaCodice("k7f2-m9qx")).toBe("K7F2M9QX");
  });

  it("l'ordine delle chiavi dei parametri non conta", () => {
    const codice = codificaCodice({ seme: 99, versione: 2 }, parametri);
    const riordinati = { categoria: "cibi", impostori: 1, giocatori: 6 };
    expect(decodificaCodice(codice, riordinati).ok).toBe(true);
  });

  it("rifiuta parametri diversi (di norma: il controllo è di 1 carattere su 31)", () => {
    const codice = codificaCodice({ seme: 7, versione: 0 }, parametri);
    const diversi = [
      { ...parametri, giocatori: 7 },
      { ...parametri, impostori: 2 },
      { ...parametri, categoria: "luoghi" },
    ];
    const rifiutati = diversi.filter((p) => !decodificaCodice(codice, p).ok);
    expect(rifiutati.length).toBeGreaterThanOrEqual(2);
  });

  it("rifiuta un carattere sbagliato nel codice", () => {
    const codice = codificaCodice({ seme: 555, versione: 1 }, parametri);
    const sbagliato = (codice.charAt(0) === "A" ? "B" : "A") + codice.slice(1);
    expect(decodificaCodice(sbagliato, parametri)).toEqual({ ok: false, errore: "controllo" });
  });

  it("segnala formato non valido", () => {
    expect(decodificaCodice("ABC", parametri)).toEqual({ ok: false, errore: "formato" });
    expect(decodificaCodice("K7F2M9Q0", parametri)).toEqual({ ok: false, errore: "formato" });
  });

  it("rifiuta seme e versione fuori intervallo", () => {
    expect(() => codificaCodice({ seme: -1, versione: 0 }, parametri)).toThrow(RangeError);
    expect(() => codificaCodice({ seme: 31 ** 6, versione: 0 }, parametri)).toThrow(RangeError);
    expect(() => codificaCodice({ seme: 0, versione: 31 }, parametri)).toThrow(RangeError);
  });
});

describe("codice partita: altri casi", () => {
  it("formattaCodice mette il trattino a metà", () => {
    expect(formattaCodice("K7F2M9QX")).toBe("K7F2-M9QX");
  });

  it("generaCodice usa la funzione casuale ricevuta (deterministico)", () => {
    expect(generaCodice(parametri, 2, () => 0)).toBe(codificaCodice({ seme: 0, versione: 2 }, parametri));
    const quasiUno = generaCodice(parametri, 2, () => 0.999999999);
    const esito = decodificaCodice(quasiUno, parametri);
    expect(esito.ok).toBe(true);
  });

  it("i valori limite di seme e versione si codificano e decodificano", () => {
    for (const codice of [
      { seme: 0, versione: 0 },
      { seme: 31 ** 6 - 1, versione: 30 },
    ]) {
      expect(decodificaCodice(codificaCodice(codice, parametri), parametri)).toEqual({ ok: true, codice });
    }
  });

  it("rifiuta seme o versione non interi", () => {
    expect(() => codificaCodice({ seme: 1.5, versione: 0 }, parametri)).toThrow(RangeError);
    expect(() => codificaCodice({ seme: 1, versione: 0.5 }, parametri)).toThrow(RangeError);
  });

  it("segnala formato non valido per lunghezza sbagliata o caratteri ambigui", () => {
    expect(decodificaCodice("", parametri)).toEqual({ ok: false, errore: "formato" });
    expect(decodificaCodice("K7F2M9QXA", parametri)).toEqual({ ok: false, errore: "formato" });
    expect(decodificaCodice("K7F2-M9I1", parametri)).toEqual({ ok: false, errore: "formato" });
  });

  it("normalizzaCodice toglie ogni tipo di spazio e trattino", () => {
    expect(normalizzaCodice("  k7f2 \t- m9qx\n")).toBe("K7F2M9QX");
  });

  it("rngDaCodice dà la stessa sequenza di creaRng sul seme", () => {
    expect(rngDaCodice({ seme: 77, versione: 0 }).next()).toBe(creaRng(77).next());
  });

  it("andata e ritorno su molti semi casuali", () => {
    const rng = creaRng(1);
    for (let i = 0; i < 300; i++) {
      const codice = { seme: rng.intero(31 ** 6), versione: rng.intero(31) };
      expect(decodificaCodice(codificaCodice(codice, parametri), parametri)).toEqual({ ok: true, codice });
    }
  });
});
