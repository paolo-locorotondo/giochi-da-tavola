import { describe, expect, it } from "vitest";
import {
  ALFABETO,
  codificaCodice,
  decodificaCodice,
  formattaCodice,
  generaCodice,
  normalizzaCodice,
} from "./codice";

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
