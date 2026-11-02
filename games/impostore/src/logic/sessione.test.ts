import { describe, expect, it } from "vitest";
import { paroleDi } from "../parole";
import { esitoSessione, riduci, sessioneIniziale, type Sessione } from "./sessione";

const nomi = ["Anna", "Luca", "Marco"];

function avviata(seme = 7): Sessione {
  return riduci(sessioneIniziale(), {
    tipo: "avvia",
    nomi,
    numImpostori: 1,
    parole: paroleDi("cibi"),
    escluse: [],
    seme,
  });
}

/** Fa vedere la carta a tutti i giocatori, portando la sessione agli indizi. */
function distribuisci(s: Sessione): Sessione {
  let r = s;
  for (let i = 0; i < nomi.length; i++) {
    r = riduci(r, { tipo: "mostraCarta" });
    r = riduci(r, { tipo: "prossimaCarta" });
  }
  return r;
}

describe("sessione di Impostore", () => {
  it("avvia crea la partita nella fase di distribuzione", () => {
    const s = avviata();
    expect(s.partita).not.toBeNull();
    expect(s.macchina.fase).toBe("distribuzione");
    expect(s.partita?.giocatori).toHaveLength(3);
  });

  it("dopo la carta di tutti si passa agli indizi", () => {
    const s = distribuisci(avviata());
    expect(s.macchina.fase).toBe("indizi");
  });

  it("le carte si girano una alla volta: prima va mostrata, poi si passa al successivo", () => {
    const s1 = riduci(avviata(), { tipo: "mostraCarta" });
    expect(s1.cartaMostrata).toBe(true);
    const s2 = riduci(s1, { tipo: "prossimaCarta" });
    expect(s2.indiceCarta).toBe(1);
    expect(s2.cartaMostrata).toBe(false);
  });

  it("se l'impostore viene scoperto e indovina la parola, vincono gli impostori", () => {
    let s = riduci(distribuisci(avviata()), { tipo: "indiziFatti" });
    const impostore = s.partita!.impostori[0]!;
    s = riduci(s, { tipo: "elimina", posto: impostore });
    expect(s.macchina.fase).toBe("tentativo");
    s = riduci(s, { tipo: "tenta", testo: s.partita!.parola });
    expect(s.macchina.fase).toBe("fine");
    expect(esitoSessione(s)).toEqual({ scoperto: true, vincitore: "impostori" });
  });

  it("se l'impostore scoperto sbaglia la parola, vincono i civili", () => {
    let s = riduci(distribuisci(avviata()), { tipo: "indiziFatti" });
    s = riduci(s, { tipo: "elimina", posto: s.partita!.impostori[0]! });
    s = riduci(s, { tipo: "tenta", testo: "parola sbagliata" });
    expect(esitoSessione(s)).toEqual({ scoperto: true, vincitore: "civili" });
  });

  it("se si elimina un civile, vincono gli impostori senza tentativo", () => {
    let s = riduci(distribuisci(avviata()), { tipo: "indiziFatti" });
    const civile = [1, 2, 3].find((p) => !s.partita!.impostori.includes(p))!;
    s = riduci(s, { tipo: "elimina", posto: civile });
    expect(s.macchina.fase).toBe("fine");
    expect(esitoSessione(s)).toEqual({ scoperto: false, vincitore: "impostori" });
  });

  it("l'esito è null finché la partita non è finita", () => {
    expect(esitoSessione(avviata())).toBeNull();
  });

  it("azioni fuori fase lanciano errore", () => {
    expect(() => riduci(avviata(), { tipo: "elimina", posto: 1 })).toThrow();
  });

  it("nuova riporta alla configurazione", () => {
    const s = riduci(distribuisci(avviata()), { tipo: "nuova" });
    expect(s.partita).toBeNull();
    expect(s.macchina.fase).toBe("distribuzione");
  });
});
