import { describe, expect, it } from "vitest";
import {
  applica,
  mancanti,
  nuovoStato,
  ordineIndizi,
  turnoIndizio,
  vistaPer,
  type AzioneOnline,
  type ConfigOnline,
  type StatoOnline,
} from "./gioco";

const nomi = ["Anna", "Bruno", "Carla", "Dario", "Elena"];
const cfg: ConfigOnline = { numImpostori: 1, categoria: "cibi", lingua: "it", votiVisibili: true };

const occupa = (s: StatoOnline, posti: number[]) => posti.reduce((x, p) => applica(x, { tipo: "occupa", posto: p }), s);
const visti = (s: StatoOnline) => s.inGioco.reduce((x, p) => applica(x, { tipo: "visto", posto: p }), s);

function inSala(n = 5, config: Partial<ConfigOnline> = {}): StatoOnline {
  return occupa(nuovoStato(nomi.slice(0, n), { ...cfg, ...config }), Array.from({ length: n }, (_, i) => i + 1));
}
function aCarte(n = 5, config: Partial<ConfigOnline> = {}, seme = 42): StatoOnline {
  return applica(inSala(n, config), { tipo: "avvia", seme });
}
function aIndizi(n = 5, config: Partial<ConfigOnline> = {}): StatoOnline {
  return applica(visti(aCarte(n, config)), { tipo: "avanti" });
}
function aVoto(n = 5, config: Partial<ConfigOnline> = {}): StatoOnline {
  return applica(aIndizi(n, { ...config, indiziScritti: false }), { tipo: "avanti" });
}
const impostore = (s: StatoOnline) => s.partita!.impostori[0]!;
const civile = (s: StatoOnline) => s.inGioco.find((p) => !s.partita!.impostori.includes(p))!;

/** Tutti votano `bersaglio`; il bersaglio vota chi vuole (non può votare sé stesso). */
function votaTutti(s: StatoOnline, bersaglio: number, ilBersaglioVota: number): StatoOnline {
  for (const chi of s.inGioco) {
    s = applica(s, { tipo: "vota", chi, posto: chi === bersaglio ? ilBersaglioVota : bersaglio });
  }
  return s;
}
const altroDi = (s: StatoOnline, posto: number) => s.inGioco.find((p) => p !== posto)!;

describe("nuovoStato: validazione", () => {
  it("parte in sala, senza nessuno seduto", () => {
    const s = nuovoStato(nomi, cfg);
    expect(s.fase).toBe("sala");
    expect(s.occupati).toEqual([]);
    expect(s.partita).toBeNull();
    expect(s.usate).toEqual([]);
  });

  it("toglie gli spazi dai nomi e ignora quelli vuoti", () => {
    expect(nuovoStato(["  Anna ", "", "Bruno", "   ", "Carla"], cfg).nomi).toEqual(["Anna", "Bruno", "Carla"]);
  });

  it("taglia i nomi lunghi a 40 caratteri", () => {
    const s = nuovoStato(["a".repeat(80), "Bruno", "Carla"], cfg);
    expect(s.nomi[0]).toHaveLength(40);
  });

  it("rifiuta i nomi uguali, senza badare a maiuscole e spazi", () => {
    expect(() => nuovoStato(["Anna", "anna ", "Carla"], cfg)).toThrow("nomiUguali");
  });

  it("rifiuta meno di 3 giocatori (contando solo i nomi non vuoti)", () => {
    expect(() => nuovoStato(["Anna", "Bruno"], cfg)).toThrow("pochiGiocatori");
    expect(() => nuovoStato(["Anna", "Bruno", " "], cfg)).toThrow("pochiGiocatori");
  });

  it("rifiuta una categoria che non esiste", () => {
    expect(() => nuovoStato(nomi, { ...cfg, categoria: "marziani" as never })).toThrow("categoriaNonValida");
  });

  it.each([[0], [-1], [3], [10]])("rifiuta %i impostori con 5 giocatori", (n) => {
    expect(() => nuovoStato(nomi, { ...cfg, numImpostori: n })).toThrow("troppiImpostori:2");
  });

  it("accetta il massimo di impostori consentito", () => {
    expect(() => nuovoStato(nomi, { ...cfg, numImpostori: 2 })).not.toThrow();
    expect(() => nuovoStato(nomi.slice(0, 3), { ...cfg, numImpostori: 1 })).not.toThrow();
    expect(() => nuovoStato(nomi.slice(0, 3), { ...cfg, numImpostori: 2 })).toThrow("troppiImpostori:1");
  });

  it("gli indizi scritti sono spenti se non richiesti", () => {
    expect(nuovoStato(nomi, cfg).config.indiziScritti).toBe(false);
    expect(nuovoStato(nomi, { ...cfg, indiziScritti: true }).config.indiziScritti).toBe(true);
  });
});

describe("sala: occupa e libera", () => {
  it("rifiuta posti inesistenti", () => {
    const s = nuovoStato(nomi, cfg);
    for (const posto of [0, -1, 6, 99]) {
      expect(() => applica(s, { tipo: "occupa", posto })).toThrow("nomeInesistente");
    }
  });

  it("un nome occupato non si può prendere", () => {
    const s = occupa(nuovoStato(nomi, cfg), [2]);
    expect(() => applica(s, { tipo: "occupa", posto: 2 })).toThrow("nomeOccupato");
  });

  it("libera rimette il nome a disposizione", () => {
    let s = occupa(nuovoStato(nomi, cfg), [2, 3]);
    s = applica(s, { tipo: "libera", posto: 2 });
    expect(s.occupati).toEqual([3]);
    expect(applica(s, { tipo: "occupa", posto: 2 }).occupati).toEqual([3, 2]);
  });

  it("liberare un nome non occupato è innocuo", () => {
    const s = nuovoStato(nomi, cfg);
    expect(applica(s, { tipo: "libera", posto: 1 }).occupati).toEqual([]);
  });

  it("le azioni non modificano lo stato di partenza", () => {
    const s = nuovoStato(nomi, cfg);
    const copia = structuredClone(s);
    applica(s, { tipo: "occupa", posto: 1 });
    expect(s).toEqual(copia);
  });
});

describe("avvia", () => {
  it("servono almeno 3 giocatori seduti", () => {
    const s = occupa(nuovoStato(nomi, cfg), [1, 2]);
    expect(() => applica(s, { tipo: "avvia", seme: 1 })).toThrow("pochiHannoScelto");
  });

  it("gli impostori restano meno della metà di chi è seduto davvero", () => {
    const s = occupa(nuovoStato(nomi, { ...cfg, numImpostori: 2 }), [1, 2, 3]);
    expect(() => applica(s, { tipo: "avvia", seme: 1 })).toThrow("troppiImpostori:1");
  });

  it("gioca solo chi è seduto, in ordine di posto", () => {
    const s = applica(occupa(nuovoStato(nomi, cfg), [5, 2, 3]), { tipo: "avvia", seme: 1 });
    expect(s.inGioco).toEqual([2, 3, 5]);
    expect(s.partita!.giocatori.map((g) => g.nome)).toEqual(["Bruno", "Carla", "Elena"]);
    expect(s.fase).toBe("carte");
    expect(s.viste).toEqual([]);
  });

  it("non si avvia due volte", () => {
    expect(() => applica(aCarte(), { tipo: "avvia", seme: 2 })).toThrow("giaIniziata");
  });

  it("stesso seme, stessa partita", () => {
    expect(aCarte(5, {}, 9).partita).toEqual(aCarte(5, {}, 9).partita);
  });

  it("il numero di impostori è quello scelto", () => {
    expect(aCarte(5, { numImpostori: 2 }).partita!.impostori).toHaveLength(2);
  });

  it("ricorda le parole uscite per non ripeterle subito", () => {
    let s = aCarte();
    const prima = s.partita!.parola;
    expect(s.usate).toEqual([prima]);
    s = nuovaDaCapo(s);
    s = applica(s, { tipo: "avvia", seme: 43 });
    expect(s.usate).toHaveLength(2);
    expect(s.partita!.parola).not.toBe(prima);
  });

  it("tiene al massimo le ultime 30 parole", () => {
    let s = inSala();
    for (let i = 0; i < 40; i++) {
      s = applica(s, { tipo: "avvia", seme: i });
      s = { ...s, fase: "fine" };
      s = applica(s, { tipo: "nuova" });
    }
    expect(s.usate.length).toBeLessThanOrEqual(30);
  });
});

/** Porta una partita qualunque alla fine e poi alla sala. */
function nuovaDaCapo(s: StatoOnline): StatoOnline {
  return applica({ ...s, fase: "fine" }, { tipo: "nuova" });
}

describe("carte", () => {
  it("visto segnala una sola volta ogni giocatore", () => {
    let s = aCarte();
    s = applica(applica(s, { tipo: "visto", posto: 1 }), { tipo: "visto", posto: 1 });
    expect(s.viste).toEqual([1]);
  });

  it("visto di chi non gioca o fuori fase viene ignorato", () => {
    const s = applica(occupa(nuovoStato(nomi, cfg), [1, 2, 3]), { tipo: "avvia", seme: 1 });
    expect(applica(s, { tipo: "visto", posto: 5 }).viste).toEqual([]);
    expect(applica(inSala(), { tipo: "visto", posto: 1 }).viste).toEqual([]);
    const indizi = aIndizi();
    expect(applica(indizi, { tipo: "visto", posto: 1 })).toBe(indizi);
  });

  it("avanti in carte richiede che abbiano visto tutti", () => {
    const s = applica(aCarte(), { tipo: "visto", posto: 1 });
    expect(() => applica(s, { tipo: "avanti" })).toThrow("nonTuttiVisto");
    expect(applica(visti(s), { tipo: "avanti" }).fase).toBe("indizi");
  });
});

describe("avanti e fasi sbagliate", () => {
  it("in sala, voto, tentativo e fine non si avanza", () => {
    const voto = aVoto();
    const tentativo = votaTutti(voto, impostore(voto), altroDi(voto, impostore(voto)));
    expect(tentativo.fase).toBe("tentativo");
    const fine = applica(tentativo, { tipo: "tenta", testo: "x" });
    for (const s of [inSala(), voto, tentativo, fine]) {
      expect(() => applica(s, { tipo: "avanti" })).toThrow("nonSiAvanza");
    }
  });

  it("avanti dagli indizi a voce porta al voto con voti puliti", () => {
    const s = aVoto();
    expect(s.fase).toBe("voto");
    expect(s.voti).toEqual({});
    expect(s.candidati).toBeNull();
  });
});

describe("indizi scritti", () => {
  const scritti = () => aIndizi(5, { indiziScritti: true });

  it("l'ordine parte dal primo di turno e fa il giro dei giocatori", () => {
    const s = scritti();
    const primo = s.partita!.primoDiTurno;
    // Rotazione di [1..5] che comincia dal primo di turno.
    const atteso = [1, 2, 3, 4, 5].map((_, k) => ((primo - 1 + k) % 5) + 1);
    expect(ordineIndizi(s)).toEqual(atteso);
  });

  it("con posti non consecutivi il giro salta chi non gioca", () => {
    let s = applica(occupa(nuovoStato(nomi, { ...cfg, indiziScritti: true }), [1, 3, 5]), { tipo: "avvia", seme: 3 });
    s = applica(visti(s), { tipo: "avanti" });
    const ordine = ordineIndizi(s);
    expect([...ordine].sort()).toEqual([1, 3, 5]);
    expect(ordine[0]).toBe(s.partita!.primoDiTurno);
  });

  it("fuori dalla partita l'ordine è vuoto", () => {
    expect(ordineIndizi(inSala())).toEqual([]);
  });

  it("solo chi ha il turno può scrivere", () => {
    const s = scritti();
    const altro = ordineIndizi(s)[1]!;
    expect(() => applica(s, { tipo: "indizio", chi: altro, testo: "x" })).toThrow("nonTocca");
  });

  it("l'indizio vuoto o di soli spazi è respinto", () => {
    const s = scritti();
    for (const testo of ["", "   ", "\n"]) {
      expect(() => applica(s, { tipo: "indizio", chi: turnoIndizio(s)!, testo })).toThrow("indizioVuoto");
    }
  });

  it("l'indizio lungo viene tagliato a 60 caratteri", () => {
    const s = applica(scritti(), { tipo: "indizio", chi: turnoIndizio(scritti())!, testo: "x".repeat(200) });
    expect(s.indizi[0]!.testo).toHaveLength(60);
  });

  it("non si scrive quando gli indizi sono a voce", () => {
    const s = aIndizi(5, { indiziScritti: false });
    expect(() => applica(s, { tipo: "indizio", chi: 1, testo: "x" })).toThrow("indiziNonOra");
  });

  it("non si scrive fuori dalla fase indizi", () => {
    expect(() => applica(aCarte(5, { indiziScritti: true }), { tipo: "indizio", chi: 1, testo: "x" })).toThrow(
      "indiziNonOra",
    );
  });

  it("mancanti indica solo chi deve scrivere, turnoIndizio è null a giro finito", () => {
    let s = scritti();
    for (const p of ordineIndizi(s)) {
      expect(mancanti(s)).toEqual([p]);
      s = applica(s, { tipo: "indizio", chi: p, testo: "ok" });
    }
    expect(turnoIndizio(s)).toBeNull();
    expect(mancanti(s)).toEqual([]);
  });

  it("turnoIndizio è null se gli indizi sono a voce", () => {
    expect(turnoIndizio(aIndizi(5, { indiziScritti: false }))).toBeNull();
  });

  it("gli indizi restano visibili nel voto e a fine partita", () => {
    let s = scritti();
    for (const p of ordineIndizi(s)) s = applica(s, { tipo: "indizio", chi: p, testo: "ok" });
    s = applica(s, { tipo: "avanti" });
    expect(vistaPer(s, 1, false).indizi?.scritti).toHaveLength(5);
  });
});

describe("voto: validazioni", () => {
  it("si vota solo nella fase di voto", () => {
    expect(() => applica(aIndizi(), { tipo: "vota", chi: 1, posto: 2 })).toThrow("nonSiVota");
    expect(() => applica(inSala(), { tipo: "vota", chi: 1, posto: 2 })).toThrow("nonSiVota");
  });

  it("vota solo chi partecipa", () => {
    const s = applica(visti(applica(occupa(nuovoStato(nomi, cfg), [1, 2, 3]), { tipo: "avvia", seme: 1 })), { tipo: "avanti" });
    const voto = applica(s, { tipo: "avanti" });
    expect(() => applica(voto, { tipo: "vota", chi: 5, posto: 1 })).toThrow("nonPartecipa");
  });

  it("non si vota chi non partecipa", () => {
    const s = applica(visti(applica(occupa(nuovoStato(nomi, cfg), [1, 2, 3]), { tipo: "avvia", seme: 1 })), { tipo: "avanti" });
    const voto = applica(s, { tipo: "avanti" });
    expect(() => applica(voto, { tipo: "vota", chi: 1, posto: 5 })).toThrow("votoNonValido");
  });

  it("non si vota sé stessi", () => {
    expect(() => applica(aVoto(), { tipo: "vota", chi: 2, posto: 2 })).toThrow("votoTeStesso");
  });

  it("si può cambiare voto finché il round non si chiude", () => {
    let s = aVoto();
    s = applica(applica(s, { tipo: "vota", chi: 1, posto: 2 }), { tipo: "vota", chi: 1, posto: 3 });
    expect(s.voti).toEqual({ 1: 3 });
    expect(mancanti(s)).toEqual([2, 3, 4, 5]);
  });

  it("finché manca un voto il round resta aperto", () => {
    let s = aVoto();
    for (const chi of [1, 2, 3, 4]) s = applica(s, { tipo: "vota", chi, posto: chi === 5 ? 1 : 5 });
    expect(s.fase).toBe("voto");
    expect(mancanti(s)).toEqual([5]);
  });
});

describe("voto: esiti", () => {
  it("eliminato un civile vince l'impostore", () => {
    const base = aVoto();
    const c = civile(base);
    const s = votaTutti(base, c, altroDi(base, c));
    expect(s.fase).toBe("fine");
    expect(s.eliminato).toBe(c);
    const fine = vistaPer(s, 1, false).fine!;
    expect(fine.scoperto).toBe(false);
    expect(fine.vincitore).toBe("impostori");
    expect(fine.impostori).toEqual(base.partita!.impostori);
    expect(fine.parola).toBe(base.partita!.parola);
  });

  it("eliminato l'impostore si passa al tentativo", () => {
    const base = aVoto();
    const i = impostore(base);
    const s = votaTutti(base, i, altroDi(base, i));
    expect(s.fase).toBe("tentativo");
    expect(s.eliminato).toBe(i);
  });

  it("il tentativo giusto fa vincere l'impostore, ignorando maiuscole e accenti", () => {
    const base = aVoto();
    const i = impostore(base);
    const s = votaTutti(base, i, altroDi(base, i));
    const parola = base.partita!.parola.toUpperCase();
    const dopo = applica(s, { tipo: "tenta", testo: `  ${parola} ` });
    expect(dopo.fase).toBe("fine");
    expect(dopo.indovinato).toBe(true);
    expect(vistaPer(dopo, 1, false).fine!.vincitore).toBe("impostori");
    expect(vistaPer(dopo, 1, false).fine!.scoperto).toBe(true);
  });

  it("il tentativo sbagliato o vuoto fa vincere i civili", () => {
    const base = aVoto();
    const i = impostore(base);
    const s = votaTutti(base, i, altroDi(base, i));
    for (const testo of ["", "   ", "parola-sbagliata-xyz"]) {
      const dopo = applica(s, { tipo: "tenta", testo });
      expect(dopo.indovinato).toBe(false);
      expect(vistaPer(dopo, 1, false).fine!.vincitore).toBe("civili");
    }
  });

  it("non si tenta fuori dalla fase di tentativo", () => {
    for (const s of [inSala(), aCarte(), aVoto()]) {
      expect(() => applica(s, { tipo: "tenta", testo: "x" })).toThrow("nessunTentativo");
    }
  });

  it("pareggio: ballottaggio solo tra i pari merito; gli altri non sono votabili", () => {
    let s = aVoto(4);
    // 1→2, 2→1, 3→1, 4→2: pari tra 1 e 2
    for (const [chi, posto] of [[1, 2], [2, 1], [3, 1], [4, 2]] as const) s = applica(s, { tipo: "vota", chi, posto });
    expect(s.fase).toBe("voto");
    expect(s.candidati).toEqual([1, 2]);
    expect(s.voti).toEqual({});
    expect(s.ultimoEsito).toMatchObject({ eliminato: null, ballottaggio: true });
    expect(() => applica(s, { tipo: "vota", chi: 3, posto: 4 })).toThrow("votoNonValido");
  });

  it("nel ballottaggio chi è candidato non può votare sé stesso ma vota l'altro", () => {
    let s = aVoto(4);
    for (const [chi, posto] of [[1, 2], [2, 1], [3, 1], [4, 2]] as const) s = applica(s, { tipo: "vota", chi, posto });
    expect(() => applica(s, { tipo: "vota", chi: 1, posto: 1 })).toThrow("votoTeStesso");
    for (const [chi, posto] of [[1, 2], [2, 1], [3, 2], [4, 2]] as const) s = applica(s, { tipo: "vota", chi, posto });
    expect(s.eliminato).toBe(2);
    expect(s.candidati).toEqual([1, 2]);
    expect(["tentativo", "fine"]).toContain(s.fase);
  });

  it("secondo pareggio: nessun eliminato e vincono gli impostori", () => {
    let s = aVoto(4);
    for (const [chi, posto] of [[1, 2], [2, 1], [3, 1], [4, 2]] as const) s = applica(s, { tipo: "vota", chi, posto });
    for (const [chi, posto] of [[1, 2], [2, 1], [3, 1], [4, 2]] as const) s = applica(s, { tipo: "vota", chi, posto });
    expect(s.fase).toBe("fine");
    expect(s.eliminato).toBeNull();
    const fine = vistaPer(s, 1, false).fine!;
    expect(fine.scoperto).toBe(false);
    expect(fine.vincitore).toBe("impostori");
  });

  it("i conteggi dell'ultimo round sono disponibili a round chiuso", () => {
    const base = aVoto();
    const c = civile(base);
    const s = votaTutti(base, c, altroDi(base, c));
    expect(s.ultimoEsito!.conteggi[c]).toBe(4);
    expect(s.ultimoEsito!.eliminato).toBe(c);
  });
});

describe("nuova partita", () => {
  it("solo a partita finita", () => {
    for (const s of [inSala(), aCarte(), aIndizi(), aVoto()]) {
      expect(() => applica(s, { tipo: "nuova" })).toThrow("nonFinita");
    }
  });

  it("torna in sala tenendo i nomi scelti e le parole già uscite", () => {
    const fine = { ...aVoto(), fase: "fine" as const, eliminato: 1 };
    const s = applica(fine, { tipo: "nuova" });
    expect(s.fase).toBe("sala");
    expect(s.partita).toBeNull();
    expect(s.occupati).toEqual([1, 2, 3, 4, 5]);
    expect(s.usate).toEqual(fine.usate);
    expect(s.inGioco).toEqual([]);
    expect(s.viste).toEqual([]);
    expect(s.indizi).toEqual([]);
    expect(s.eliminato).toBeNull();
    expect(s.indovinato).toBe(false);
    expect(s.ultimoEsito).toBeNull();
  });

  it("si può rigiocare subito", () => {
    const s = applica(nuovaDaCapo(aVoto()), { tipo: "avvia", seme: 77 });
    expect(s.fase).toBe("carte");
    expect(s.viste).toEqual([]);
  });
});

describe("vistaPer: cosa vede ciascuno", () => {
  it("in sala nessuno ha una carta e i nomi riportano chi è seduto", () => {
    const s = occupa(nuovoStato(nomi, cfg), [1, 3]);
    const v = vistaPer(s, 1, false);
    expect(v.carta).toBeNull();
    expect(v.nomi.map((n) => n.occupato)).toEqual([true, false, true, false, false]);
    expect(v.nomi.every((n) => !n.inGioco)).toBe(true);
    expect(v.primo).toBeNull();
    expect(v.voto).toBeNull();
    expect(v.fine).toBeNull();
  });

  it("ognuno ha solo la propria carta: impostore o parola", () => {
    const s = aCarte();
    for (const p of s.inGioco) {
      const c = vistaPer(s, p, false).carta!;
      if (p === impostore(s)) expect(c).toEqual({ ruolo: "impostore" });
      else expect(c).toEqual({ ruolo: "civile", parola: s.partita!.parola });
    }
  });

  it("la vista di un civile non contiene chi è l'impostore", () => {
    const s = aCarte();
    const v = JSON.stringify(vistaPer(s, civile(s), false));
    expect(v).not.toContain("impostori");
  });

  it("la vista dell'impostore non contiene la parola segreta", () => {
    const s = aCarte();
    const v = JSON.stringify(vistaPer(s, impostore(s), false));
    expect(v.toLowerCase()).not.toContain(`"${s.partita!.parola.toLowerCase()}"`);
  });

  it("chi non è in partita o non ha scelto il nome non vede carte", () => {
    const s = applica(occupa(nuovoStato(nomi, cfg), [1, 2, 3]), { tipo: "avvia", seme: 1 });
    expect(vistaPer(s, 5, false).carta).toBeNull();
    expect(vistaPer(s, null, false).carta).toBeNull();
    expect(vistaPer(s, null, false).io).toBeNull();
  });

  it("riporta io e host", () => {
    const s = inSala();
    expect(vistaPer(s, 2, true)).toMatchObject({ io: 2, host: true });
    expect(vistaPer(s, 2, false)).toMatchObject({ io: 2, host: false });
  });

  it("il voto mostra il mio voto e quanti hanno votato", () => {
    const s = applica(aVoto(), { tipo: "vota", chi: 1, posto: 2 });
    const v = vistaPer(s, 1, false).voto!;
    expect(v.mioVoto).toBe(2);
    expect(v.hannoVotato).toBe(1);
    expect(v.totale).toBe(5);
    expect(v.candidati).toEqual([1, 2, 3, 4, 5]);
    expect(v.ballottaggio).toBe(false);
    expect(vistaPer(s, 3, false).voto!.mioVoto).toBeNull();
    expect(vistaPer(s, null, false).voto!.mioVoto).toBeNull();
  });

  it("i contatori si vedono solo se i voti sono visibili", () => {
    const visibili = applica(aVoto(5, { votiVisibili: true }), { tipo: "vota", chi: 1, posto: 2 });
    const nascosti = applica(aVoto(5, { votiVisibili: false }), { tipo: "vota", chi: 1, posto: 2 });
    expect(vistaPer(visibili, 3, false).voto!.conteggi).toEqual({ 2: 1 });
    expect(vistaPer(nascosti, 3, false).voto!.conteggi).toBeNull();
  });

  it("chi manca al voto lo vede solo l'organizzatore", () => {
    const s = applica(aVoto(), { tipo: "vota", chi: 1, posto: 2 });
    expect(vistaPer(s, 2, true).voto!.mancanti).toEqual([2, 3, 4, 5]);
    expect(vistaPer(s, 2, false).voto!.mancanti).toBeNull();
  });

  it("nel ballottaggio la vista riporta solo i candidati", () => {
    let s = aVoto(4);
    for (const [chi, posto] of [[1, 2], [2, 1], [3, 1], [4, 2]] as const) s = applica(s, { tipo: "vota", chi, posto });
    const v = vistaPer(s, 3, false).voto!;
    expect(v.ballottaggio).toBe(true);
    expect(v.candidati).toEqual([1, 2]);
    expect(v.mioVoto).toBeNull();
  });

  it("l'esito finale compare solo a fine partita", () => {
    const base = aVoto();
    const c = civile(base);
    expect(vistaPer(base, 1, false).fine).toBeNull();
    expect(vistaPer(votaTutti(base, c, altroDi(base, c)), 1, false).fine).not.toBeNull();
  });

  it("il tentativo in corso non rivela ancora il vincitore", () => {
    const base = aVoto();
    const i = impostore(base);
    const s = votaTutti(base, i, altroDi(base, i));
    expect(vistaPer(s, 1, false).fine).toBeNull();
    expect(vistaPer(s, 1, false).eliminato).toBe(i);
  });

  it("il server riempie collegato e organizzatore: qui partono falsi", () => {
    const v = vistaPer(inSala(), 1, true);
    expect(v.nomi.every((n) => !n.collegato && !n.organizzatore)).toBe(true);
  });
});

describe("partite complete", () => {
  it("per ogni seme e ogni numero di giocatori si arriva alla fine", () => {
    for (const n of [3, 4, 5]) {
      for (let seme = 1; seme <= 25; seme++) {
        let s = applica(visti(applica(inSala(n), { tipo: "avvia", seme })), { tipo: "avanti" });
        s = applica(s, { tipo: "avanti" });
        const bersaglio = seme % 2 ? impostore(s) : civile(s);
        s = votaTutti(s, bersaglio, altroDi(s, bersaglio));
        if (s.fase === "tentativo") s = applica(s, { tipo: "tenta", testo: seme % 3 ? "boh" : s.partita!.parola });
        expect(s.fase, `n=${n} seme=${seme}`).toBe("fine");
        const fine = vistaPer(s, 1, false).fine!;
        expect(fine.vincitore).toBe(bersaglio === impostore(s) && !s.indovinato ? "civili" : "impostori");
      }
    }
  });
});

describe("tipi", () => {
  it("AzioneOnline copre tutte le azioni usate dal server", () => {
    const azioni: AzioneOnline["tipo"][] = ["occupa", "libera", "avvia", "avanti", "visto", "indizio", "vota", "tenta", "nuova"];
    expect(new Set(azioni).size).toBe(9);
  });
});
