import { creaGiocatori } from "@gdt/engine";
import { describe, expect, it } from "vitest";
import { categorie, paroleDi } from "../parole";
import {
  carta,
  creaPartita,
  normalizza,
  risultatoVoto,
  verificaTentativo,
  type ConfigPartita,
} from "./partita";

const giocatori = creaGiocatori(["Anna", "Luca", "Marco", "Sara", "Piero", "Giulia"]);
const parole = paroleDi("cibi");
const config: ConfigPartita = { giocatori, numImpostori: 1, parole };

describe("creaPartita", () => {
  it("è deterministica: stesso seme, stessa partita", () => {
    expect(creaPartita(config, "K7F2M9QX")).toEqual(creaPartita(config, "K7F2M9QX"));
  });

  it("semi diversi producono partite diverse (su molti semi)", () => {
    const parolePrima = new Set<string>();
    for (let s = 0; s < 50; s++) parolePrima.add(creaPartita(config, s).parola);
    expect(parolePrima.size).toBeGreaterThan(10);
  });

  it("assegna il numero di impostori richiesto, a posti validi e distinti", () => {
    for (let s = 0; s < 100; s++) {
      const p = creaPartita({ ...config, numImpostori: 2 }, s);
      expect(p.impostori).toHaveLength(2);
      expect(new Set(p.impostori).size).toBe(2);
      for (const posto of p.impostori) expect(posto).toBeGreaterThanOrEqual(1);
      expect(p.impostori.every((x) => x >= 1 && x <= 6)).toBe(true);
    }
  });

  it("il primo di turno è un giocatore della partita", () => {
    for (let s = 0; s < 50; s++) {
      const p = creaPartita(config, s);
      expect(giocatori.map((g) => g.posto)).toContain(p.primoDiTurno);
    }
  });

  it("la parola viene dalla lista e si può escludere quella già uscita", () => {
    for (let s = 0; s < 200; s++) {
      const p = creaPartita({ ...config, escluse: [parole[0] as string] }, s);
      expect(parole).toContain(p.parola);
      expect(p.parola).not.toBe(parole[0]);
    }
  });

  it("se tutte le parole sono escluse, ne sceglie una lo stesso", () => {
    const p = creaPartita({ ...config, escluse: parole }, 1);
    expect(parole).toContain(p.parola);
  });

  it("rifiuta configurazioni non valide", () => {
    expect(() => creaPartita({ ...config, giocatori: giocatori.slice(0, 2) }, 1)).toThrow(/3 giocatori/);
    expect(() => creaPartita({ ...config, numImpostori: 0 }, 1)).toThrow(/impostori/);
    expect(() => creaPartita({ ...config, numImpostori: 3 }, 1)).toThrow(/impostori/);
    expect(() => creaPartita({ ...config, parole: [] }, 1)).toThrow(/parole/);
  });
});

describe("carta", () => {
  it("l'impostore non vede la parola, i civili sì", () => {
    const p = creaPartita(config, 42);
    const [imp] = p.impostori as [number];
    expect(carta(p, imp)).toEqual({ ruolo: "impostore" });
    const civile = giocatori.find((g) => !p.impostori.includes(g.posto))!;
    expect(carta(p, civile.posto)).toEqual({ ruolo: "civile", parola: p.parola });
  });

  it("rifiuta un posto inesistente", () => {
    expect(() => carta(creaPartita(config, 1), 99)).toThrow(/posto 99/);
  });
});

describe("verificaTentativo", () => {
  it("accetta maiuscole, accenti e spazi diversi", () => {
    const p = { ...creaPartita(config, 1), parola: "tiramisù" };
    expect(verificaTentativo(p, "TIRAMISU")).toBe(true);
    expect(verificaTentativo(p, "  tira misù ")).toBe(true);
    expect(verificaTentativo(p, "gelato")).toBe(false);
    expect(verificaTentativo(p, "   ")).toBe(false);
  });

  it("normalizza parole con spazi", () => {
    expect(normalizza("Luna Park!")).toBe("lunapark");
  });
});

describe("risultatoVoto", () => {
  it("elimina chi ha più voti", () => {
    expect(risultatoVoto({ 1: 3, 2: 3, 3: 4, 4: 1 })).toEqual({ tipo: "eliminato", posto: 3 });
  });

  it("segnala il pareggio con tutti i posti in parità", () => {
    // 1 e 3 votano il 2; 2 e 4 votano il 3
    expect(risultatoVoto({ 1: 2, 2: 3, 3: 2, 4: 3 })).toEqual({ tipo: "pareggio", posti: [2, 3] });
  });

  it("rifiuta un voto vuoto", () => {
    expect(() => risultatoVoto({})).toThrow(/Nessun voto/);
  });
});

describe("dati", () => {
  it("ogni categoria ha almeno 20 parole senza duplicati", () => {
    for (const c of categorie) {
      const lista = paroleDi(c);
      expect(lista.length).toBeGreaterThanOrEqual(20);
      expect(new Set(lista).size).toBe(lista.length);
    }
  });
});
