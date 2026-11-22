import { describe, expect, it } from "vitest";
import { CONTO_VELOCE_MS, CONTO_VELOCE_SCELTE_MS, intervalloPosti, type PartitaVeloceOnline } from "@gdt/engine";
import { GIOCHI_ONLINE } from "./giochi";
import { anteprimaDi, avviaSala, creaStanza, entraVeloce, eseguiAzione, vistaDi, vistaSalaDi, type Stanza } from "./stanze";
import {
  GRAZIA_SALA_MS,
  SCADUTA_MS,
  VITA_SALA_MS,
  aggancia,
  apriSala,
  comando,
  esci,
  leggiApertura,
  nomeDistinto,
  pianoAvvio,
  tick,
} from "./veloce";

/** Gioco finto a squadre (come Scopa/Burraco): 4 posti, coppie 1-3 e 2-4. */
const aSquadre: PartitaVeloceOnline = {
  posti: [2, 4],
  squadre: (n) => (n === 4 ? [[1, 3], [2, 4]] : null),
  configVeloce: (g, n) => ({ ...(g as object), n }),
};
const ultima = GIOCHI_ONLINE.ultima!.veloce!;
const tutti = () => true;

const sala = (v: PartitaVeloceOnline, apertura: Record<string, unknown>, nome = "Anna", ora = 0) =>
  apriSala("x", v, leggiApertura(v, apertura), "t-" + nome, nome, ora);
const arriva = (s: ReturnType<typeof sala>, v: PartitaVeloceOnline, nome: string, ora = 0) => aggancia(s, v, "t-" + nome, nome, ora);

describe("nomi", () => {
  it("«Anna», «anna», «ANNA» diventano distinti; vuoto rifiutato; lungo tagliato", () => {
    const nomi: string[] = [];
    for (const n of [" Anna", "anna", "ANNA"]) nomi.push(nomeDistinto(n, nomi));
    expect(nomi).toEqual(["Anna", "anna (2)", "ANNA (3)"]);
    expect(() => nomeDistinto("   ", [])).toThrow("nomiNonValidi");
    expect(nomeDistinto("x".repeat(200), []).length).toBeLessThan(40);
  });
});

describe("validazione dell'apertura", () => {
  it("posti, attesa, squadre e config sono controllati", () => {
    expect(() => leggiApertura(aSquadre, { posti: 3 })).toThrow("postiNonValidi");
    expect(() => leggiApertura(aSquadre, { posti: 2, attesaMs: 1234 })).toThrow("attesaNonValida");
    expect(() => leggiApertura(aSquadre, { posti: 4, squadre: "boh" })).toThrow("squadreNonValide");
    // Senza squadre per quei posti il campo è ignorato.
    expect(leggiApertura(aSquadre, { posti: 2, squadre: "caso" }).squadre).toBeUndefined();
    expect(leggiApertura(aSquadre, { posti: 4 }).squadre).toBe("arrivo");
    expect(leggiApertura(aSquadre, { posti: 4 }).attesaMs).toBe(120_000);
    expect(() => leggiApertura(ultima, { posti: 4, config: { modo: "strano" } })).toThrow("configNonValida");
    expect(leggiApertura(ultima, { posti: 4, config: { modo: "punti", soglia: 200 } }).config).toMatchObject({ modo: "punti", soglia: 200 });
  });
});

describe("tempo: attesa, conto, scaduta", () => {
  const apertura = { posti: 6, attesaMs: 60_000 };
  it("attesa → conto (con il minimo) → avvio dopo 10 s", () => {
    const s = sala(ultima, apertura);
    arriva(s, ultima, "Bruno");
    expect(tick(s, ultima, 59_000, tutti).t).toBe("niente");
    expect(tick(s, ultima, 60_000, tutti).t).toBe("aggiorna");
    expect(s.momento).toBe("conto");
    expect(s.scade).toBe(60_000 + CONTO_VELOCE_MS);
    expect(tick(s, ultima, 69_000, tutti).t).toBe("niente");
    expect(tick(s, ultima, 70_000, tutti).t).toBe("avvia");
  });

  it("annullaAvvio riparte da un'attesa piena; un arrivo che riempie durante il conto avvia subito", () => {
    const s = sala(ultima, { posti: 3, attesaMs: 60_000 });
    arriva(s, ultima, "Bruno");
    tick(s, ultima, 60_000, tutti);
    expect(() => comando(s, ultima, "t-Bruno", { comando: "annullaAvvio" }, 61_000)).toThrow("soloHostSala");
    comando(s, ultima, "t-Anna", { comando: "annullaAvvio" }, 61_000);
    expect(s.momento).toBe("attesa");
    expect(s.scade).toBe(121_000);
    tick(s, ultima, 121_000, tutti);
    expect(s.momento).toBe("conto");
    expect(arriva(s, ultima, "Carla", 122_000).t).toBe("avvia");
  });

  it("sotto il minimo: scaduta, aspettaAncora, arrivo che raggiunge il minimo → conto, tempo → chiusa", () => {
    const s = sala(ultima, apertura);
    expect(tick(s, ultima, 60_000, tutti).t).toBe("aggiorna");
    expect(s.momento).toBe("scaduta");
    expect(() => comando(s, ultima, "t-Anna", { comando: "apriAdesso" }, 61_000)).toThrow("pochiPerAprire");
    comando(s, ultima, "t-Anna", { comando: "aspettaAncora" }, 61_000);
    expect(s.momento).toBe("attesa");
    tick(s, ultima, 121_000, tutti);
    expect(s.momento).toBe("scaduta");
    arriva(s, ultima, "Bruno", 130_000);
    expect(s.momento).toBe("conto");
    // Senza risposta di nessuno: scaduta di nuovo e poi chiusa.
    const t = sala(ultima, apertura);
    tick(t, ultima, 60_000, tutti);
    expect(tick(t, ultima, 60_000 + SCADUTA_MS, tutti)).toEqual({ t: "chiudi", motivo: "scaduta" });
  });

  it("dopo 15 minuti di vita non si rinnova più l'attesa", () => {
    const s = sala(ultima, apertura);
    tick(s, ultima, 60_000, tutti);
    expect(() => comando(s, ultima, "t-Anna", { comando: "aspettaAncora" }, VITA_SALA_MS + 1)).toThrow("salaTroppoVecchia");
  });

  it("uscita durante il conto sotto il minimo → scaduta", () => {
    const s = sala(ultima, apertura);
    arriva(s, ultima, "Bruno");
    tick(s, ultima, 60_000, tutti);
    esci(s, ultima, "t-Bruno", 61_000);
    expect(s.momento).toBe("scaduta");
  });
});

describe("avvio anticipato", () => {
  it("apriAdesso con 3 su 6 avvia con 3; con 1 no; solo l'organizzatore", () => {
    const s = sala(ultima, { posti: 6 });
    expect(() => comando(s, ultima, "t-Anna", { comando: "apriAdesso" }, 1)).toThrow("pochiPerAprire");
    arriva(s, ultima, "Bruno");
    arriva(s, ultima, "Carla");
    expect(() => comando(s, ultima, "t-Bruno", { comando: "apriAdesso" }, 1)).toThrow("soloHostSala");
    expect(comando(s, ultima, "t-Anna", { comando: "apriAdesso" }, 1).t).toBe("avvia");
    expect(pianoAvvio(s, ultima, () => 0).nomi).toEqual(["Anna", "Bruno", "Carla"]);
  });

  it("senza avvio anticipato (Tris) si parte solo a sala piena", () => {
    const tris = GIOCHI_ONLINE.tris!.veloce!;
    const s = sala(tris, {});
    expect(() => comando(s, tris, "t-Anna", { comando: "apriAdesso" }, 1)).toThrow("pochiPerAprire");
    expect(arriva(s, tris, "Bruno").t).toBe("avvia");
  });
});

describe("organizzatore e grazia", () => {
  it("se esce l'organizzatore lo diventa il secondo; il conto riparte; l'ultimo che esce chiude", () => {
    const s = sala(ultima, { posti: 6, attesaMs: 60_000 });
    arriva(s, ultima, "Bruno");
    arriva(s, ultima, "Carla");
    tick(s, ultima, 60_000, tutti);
    esci(s, ultima, "t-Anna", 65_000);
    expect(s.arrivati[0]!.nome).toBe("Bruno");
    expect(s.scade).toBe(65_000 + CONTO_VELOCE_MS);
    expect(esci(s, ultima, "t-Bruno", 66_000).t).toBe("aggiorna");
    expect(esci(s, ultima, "t-Carla", 67_000)).toEqual({ t: "chiudi", motivo: "vuota" });
  });

  it("socket chiuso 29 s: posto tenuto e rientro; 31 s: posto libero", () => {
    const s = sala(ultima, { posti: 6, attesaMs: 300_000 });
    arriva(s, ultima, "Bruno");
    const senzaBruno = (t: string) => t !== "t-Bruno";
    tick(s, ultima, 1_000, senzaBruno);
    tick(s, ultima, 1_000 + GRAZIA_SALA_MS - 1_000, senzaBruno);
    expect(s.arrivati).toHaveLength(2);
    tick(s, ultima, 20_000, tutti);
    expect(s.arrivati[1]!.assenteDal).toBeNull();
    tick(s, ultima, 21_000, senzaBruno);
    expect(tick(s, ultima, 21_000 + GRAZIA_SALA_MS, senzaBruno).t).toBe("aggiorna");
    expect(s.arrivati.map((a) => a.nome)).toEqual(["Anna"]);
  });
});

describe("squadre", () => {
  it("«arrivo»: 1° e 3° compagni, 2° e 4° compagni (posti nell'ordine di arrivo)", () => {
    const s = sala(aSquadre, { posti: 4, squadre: "arrivo" });
    for (const n of ["B", "C"]) arriva(s, aSquadre, n);
    expect(arriva(s, aSquadre, "D").t).toBe("avvia");
    const p = pianoAvvio(s, aSquadre, () => 0);
    expect(p.nomi).toEqual(["Anna", "B", "C", "D"]);
    expect(p.config).toMatchObject({ n: 4 });
  });

  it("«caso»: ognuno in un solo posto, dipende dal caso e non dall'arrivo", () => {
    const s = sala(aSquadre, { posti: 4, squadre: "caso" });
    for (const n of ["B", "C", "D"]) arriva(s, aSquadre, n);
    // Con un caso che scambia sempre con il primo posto: [Anna,B,C,D] → [B,C,D,Anna].
    const p = pianoAvvio(s, aSquadre, () => 0);
    expect(p.nomi).toEqual(["B", "C", "D", "Anna"]);
    expect(p.organizzatore).toBe("t-Anna");
    expect(pianoAvvio(s, aSquadre, (n) => n - 1).nomi).toEqual(["Anna", "B", "C", "D"]);
  });

  it("«scelte»: assegnazione equilibrata, spostamento solo con posto, a sala piena parte il conto da 30 s", () => {
    const s = sala(aSquadre, { posti: 4, squadre: "scelte" });
    arriva(s, aSquadre, "B");
    arriva(s, aSquadre, "C");
    expect(s.arrivati.map((a) => a.squadra)).toEqual([0, 1, 0]);
    expect(() => comando(s, aSquadre, "t-C", { comando: "squadra", id: s.arrivati[2]!.id, squadra: 1 }, 1)).not.toThrow();
    // Ora squadra 1 ha B e C, la 0 solo Anna: nessuno può entrare in 1 oltre i 2 posti.
    expect(() => comando(s, aSquadre, "t-Anna", { comando: "squadra", id: s.arrivati[0]!.id, squadra: 1 }, 1)).toThrow("squadraPiena");
    // Solo l'organizzatore sposta altri.
    expect(() => comando(s, aSquadre, "t-B", { comando: "squadra", id: s.arrivati[0]!.id, squadra: 0 }, 1)).toThrow("soloHostSala");
    comando(s, aSquadre, "t-Anna", { comando: "squadra", id: s.arrivati[2]!.id, squadra: 0 }, 1);
    expect(arriva(s, aSquadre, "D", 5_000).t).toBe("aggiorna");
    expect(s.momento).toBe("conto");
    expect(s.scade).toBe(5_000 + CONTO_VELOCE_SCELTE_MS);
    // Squadra 0 = Anna e C (posti 1 e 3), squadra 1 = B e D (posti 2 e 4).
    expect(pianoAvvio(s, aSquadre, () => 0).nomi).toEqual(["Anna", "B", "C", "D"]);
    expect(comando(s, aSquadre, "t-Anna", { comando: "apriAdesso" }, 6_000).t).toBe("avvia");
    expect(tick(s, aSquadre, 5_000 + CONTO_VELOCE_SCELTE_MS, tutti).t).toBe("avvia");
  });
});

describe("stanze veloci sul server", () => {
  const nuove = () => new Map<string, Stanza>();
  const entra = (m: Map<string, Stanza>, gioco: string, token: string, nome: string, opz = {}, ora = 0) => entraVeloce(m, gioco, token, nome, opz, ora, 300);

  it("aggancio alla prima sala aperta; giochi diversi non si mescolano; sala piena → nuova", () => {
    const m = nuove();
    const a = entra(m, "ultima", "ta", "Anna", { apri: { posti: 3, config: {} } });
    expect(anteprimaDi(m, "ultima")).toMatchObject({ organizzatore: "Anna", posti: 3, occupati: 1 });
    expect(anteprimaDi(m, "tris")).toBeNull();
    const b = entra(m, "ultima", "tb", "Bruno", { codice: a.stanza.codice });
    expect(b.stanza).toBe(a.stanza);
    entra(m, "tris", "tc", "Carla");
    expect(m.size).toBe(2);
    const d = entra(m, "ultima", "td", "Dario");
    expect(d.effetto.t).toBe("avvia");
    avviaSala(a.stanza);
    expect(a.stanza.sala).toBeNull();
    expect(entra(m, "ultima", "te", "Elia", { apri: {} }).stanza).not.toBe(a.stanza);
  });

  it("corse: stanza piena/chiusa → salaCambiata; sala apparsa nel frattempo → salaApertaNelFrattempo", () => {
    const m = nuove();
    expect(() => entra(m, "ultima", "ta", "Anna", { codice: "ZZZZZ" })).toThrow("salaCambiata");
    entra(m, "ultima", "ta", "Anna", { apri: { posti: 3 } });
    expect(() => entra(m, "ultima", "tb", "Bruno", { apri: { posti: 4 } })).toThrow("salaApertaNelFrattempo");
  });

  it("Tris: due arrivi → partita avviata, posto 1 al primo che è organizzatore; senza veloce è rifiutato", () => {
    const m = nuove();
    const a = entra(m, "tris", "ta", "Anna");
    const b = entra(m, "tris", "tb", "ANNA");
    expect(b.stanza).toBe(a.stanza);
    expect(b.effetto.t).toBe("avvia");
    avviaSala(a.stanza);
    expect(a.stanza.tokenHost).toBe("ta");
    const v = vistaDi(a.stanza, "tb");
    expect(v.fase).toBe("partita");
    expect(v.io).toBe(2);
    expect(v.nomi.map((n: { nome: string }) => n.nome)).toEqual(["Anna", "ANNA (2)"]);
    expect(vistaDi(a.stanza, "ta").mioTurno).toBe(true);
    expect(() => entra(m, "impostore", "tc", "Carla")).toThrow("noPartitaVeloce");
    expect(() => entra(m, "tris", "tc", "  ")).toThrow("nomiNonValidi");
  });

  it("Ultima!: 3 in sala di 6, apriAdesso → partita a 3 con la config dell'apertura, 7 carte ciascuno", () => {
    const m = nuove();
    const a = entra(m, "ultima", "ta", "Anna", { apri: { posti: 6, config: { modo: "punti", soglia: 200, varianti: { sommaPiu2: true } } } });
    entra(m, "ultima", "tb", "Bruno");
    entra(m, "ultima", "tc", "Carla");
    expect(vistaSalaDi(a.stanza, "ta", 0).host).toBe(true);
    expect(vistaSalaDi(a.stanza, "tb", 0).giocatori.map((g) => g.io)).toEqual([false, true, false]);
    expect(() => eseguiAzione(a.stanza, "ta", { tipo: "avvia" })).toThrow("stanzaInSala");
    expect(() => vistaDi(a.stanza, "ta")).toThrow();
    avviaSala(a.stanza);
    const v = vistaDi(a.stanza, "tb");
    expect(v.mano).toHaveLength(7);
    // Le varianti scelte da chi apre arrivano alla partita; quelle non dette restano spente.
    expect(a.stanza.stato.config).toEqual({
      modo: "punti",
      soglia: 200,
      varianti: { sommaPiu2: true, piuUguali: false, taglio: false, scambioRotazione: false },
    });
    expect(a.stanza.stato.nomi).toEqual(["Anna", "Bruno", "Carla"]);
    // Dopo l'avvio chi arriva col codice è uno spettatore, come per ogni stanza.
    const spett = vistaDi(a.stanza, "nuovo");
    expect(spett.io).toBeNull();
  });

  it("Scopa: 4 a coppie, config completata con i posti, coppie 1+3 e 2+4 nell'ordine d'arrivo", () => {
    const m = nuove();
    const a = entra(m, "scopa", "ta", "Anna", { apri: { posti: 4, config: { soglia: 21 }, squadre: "arrivo" } });
    expect(anteprimaDi(m, "scopa")).toMatchObject({ posti: 4, config: { posti: 4, soglia: 21 }, squadre: "arrivo" });
    entra(m, "scopa", "tb", "Bruno");
    entra(m, "scopa", "tc", "Carla");
    expect(() => eseguiAzione(a.stanza, "ta", { tipo: "occupa", posto: 1 })).toThrow();
    const ultimo = entra(m, "scopa", "td", "Dario");
    expect(ultimo.effetto.t).toBe("avvia");
    avviaSala(a.stanza);
    expect(a.stanza.stato.config).toEqual({ posti: 4, soglia: 21 });
    expect(a.stanza.stato.nomi).toEqual(["Anna", "Bruno", "Carla", "Dario"]);
    expect(a.stanza.stato.squadre).toEqual([0, 1, 0, 1]);
    expect(vistaDi(a.stanza, "tc").io).toBe(3);
    expect(vistaDi(a.stanza, "tc").mano).toHaveLength(3);
  });

  it("Scopa: da 2 niente squadre; le impostazioni non valide sono rifiutate all'apertura", () => {
    const m = nuove();
    expect(() => entra(m, "scopa", "ta", "Anna", { apri: { posti: 3 } })).toThrow("postiNonValidi");
    expect(() => entra(m, "scopa", "ta", "Anna", { apri: { posti: 2, config: { soglia: 15 } } })).toThrow("configNonValida");
    const a = entra(m, "scopa", "ta", "Anna", { apri: { posti: 2, squadre: "caso" } });
    expect(a.stanza.sala!.apertura.squadre).toBeUndefined();
    expect(entra(m, "scopa", "tb", "Bruno").effetto.t).toBe("avvia");
    avviaSala(a.stanza);
    expect(a.stanza.stato.config).toEqual({ posti: 2, soglia: 11 });
  });

  it("Burraco: 4 a coppie con obiettivo e scarti scelti da chi apre; da 2 senza squadre; sala non anticipata", () => {
    const m = nuove();
    const a = entra(m, "burraco", "ta", "Anna", { apri: { posti: 4, config: { obiettivo: 1505, pila: "bloccata" }, attesaMs: 300_000 } });
    entra(m, "burraco", "tb", "Bruno");
    entra(m, "burraco", "tc", "Carla");
    // Senza avvio anticipato nessuno può aprire con 3 su 4.
    expect(() => comando(a.stanza.sala!, GIOCHI_ONLINE.burraco!.veloce!, "ta", { comando: "apriAdesso" }, 0)).toThrow("pochiPerAprire");
    entra(m, "burraco", "td", "Dario");
    avviaSala(a.stanza);
    expect(a.stanza.stato.config).toEqual({ obiettivo: 1505, pila: "bloccata" });
    expect(a.stanza.stato.nomi).toHaveLength(4);
    expect(vistaDi(a.stanza, "ta").fase).toBe("partita");
    expect(() => entra(m, "burraco", "te", "Elia", { apri: { posti: 4, config: { obiettivo: 7 } } })).toThrow("configNonValida");
    const due = entra(m, "burraco", "tf", "Fulvio", { apri: { posti: 2 } });
    expect(due.stanza.sala!.apertura.squadre).toBeUndefined();
    expect(entra(m, "burraco", "tg", "Gina").effetto.t).toBe("avvia");
  });

  it("Scopa e Burraco con le squadre «scelte in sala»: ogni squadra riempie i suoi posti", () => {
    for (const gioco of ["scopa", "burraco"]) {
      const m = nuove();
      const a = entra(m, gioco, "ta", "Anna", { apri: { posti: 4, squadre: "scelte" } });
      for (const [t, n] of [["tb", "Bruno"], ["tc", "Carla"], ["td", "Dario"]]) entra(m, gioco, t!, n!);
      const sala = a.stanza.sala!;
      // Anna (squadra A) e Bruno (B) per default; Carla va in A, Dario in B: compagni 1+3 e 2+4.
      expect(sala.arrivati.map((x) => x.squadra)).toEqual([0, 1, 0, 1]);
      avviaSala(a.stanza);
      expect(a.stanza.stato.nomi).toEqual(["Anna", "Bruno", "Carla", "Dario"]);
    }
  });
});

describe("moduli dei giochi", () => {
  it.each(Object.entries(GIOCHI_ONLINE).filter(([, g]) => g.veloce))("%s: veloce coerente", (id, g) => {
    const v = g.veloce!;
    expect(v.posti.length).toBeGreaterThan(0);
    expect([...v.posti]).toEqual([...new Set(v.posti)].sort((x, y) => x - y));
    for (const n of v.posti) {
      const config = v.configVeloce({}, n);
      const stato = g.nuovoStato(Array.from({ length: n }, (_, i) => `G${i + 1}`), config);
      expect(stato).toBeTruthy();
      const sq = v.squadre?.(n) ?? null;
      if (sq) {
        expect(v.anticipato, `${id}: anticipato con squadre`).toBeFalsy();
        expect(sq.flat().sort()).toEqual(Array.from({ length: n }, (_, i) => i + 1));
      }
    }
  });

  it("intervalloPosti", () => {
    expect(intervalloPosti(2, 5)).toEqual([2, 3, 4, 5]);
    expect(GIOCHI_ONLINE.ultima!.veloce!.posti).toEqual(intervalloPosti(2, 10));
  });

  it("una stanza normale non ha sala", () => {
    expect(creaStanza("ABCDE", ["A", "B"], {}, "h", "tris").sala).toBeNull();
  });
});
