import { describe, expect, it } from "vitest";
import { creaMacchina, type DefinizioneFasi } from "./fasi";

type Fase = "distribuzione" | "indizi" | "voto" | "fine";
type Evento = "avanti" | "indietro";

const definizione: DefinizioneFasi<Fase, Evento> = {
  iniziale: "distribuzione",
  transizioni: {
    distribuzione: { avanti: "indizi" },
    indizi: { avanti: "voto" },
    voto: { avanti: "fine", indietro: "indizi" },
    fine: {},
  },
};

describe("creaMacchina", () => {
  it("parte dalla fase iniziale", () => {
    const m = creaMacchina(definizione);
    expect(m.fase).toBe("distribuzione");
    expect(m.storia).toEqual(["distribuzione"]);
    expect(m.finita).toBe(false);
  });

  it("segue le transizioni e tiene la storia", () => {
    const m = creaMacchina(definizione).invia("avanti").invia("avanti");
    expect(m.fase).toBe("voto");
    expect(m.storia).toEqual(["distribuzione", "indizi", "voto"]);
  });

  it("è immutabile: invia non modifica la macchina di partenza", () => {
    const m = creaMacchina(definizione);
    m.invia("avanti");
    expect(m.fase).toBe("distribuzione");
    expect(m.storia).toEqual(["distribuzione"]);
  });

  it("permette di tornare a una fase precedente se la definizione lo prevede", () => {
    const m = creaMacchina(definizione).invia("avanti").invia("avanti").invia("indietro");
    expect(m.fase).toBe("indizi");
  });

  it("rifiuta eventi non ammessi", () => {
    const m = creaMacchina(definizione);
    expect(m.puoInviare("indietro")).toBe(false);
    expect(() => m.invia("indietro")).toThrow(/non ammesso/);
  });

  it("elenca gli eventi ammessi", () => {
    const m = creaMacchina(definizione).invia("avanti").invia("avanti");
    expect(m.eventiAmmessi().sort()).toEqual(["avanti", "indietro"]);
  });

  it("una fase senza uscite è finale", () => {
    const m = creaMacchina(definizione).invia("avanti").invia("avanti").invia("avanti");
    expect(m.fase).toBe("fine");
    expect(m.finita).toBe(true);
    expect(m.eventiAmmessi()).toEqual([]);
    expect(() => m.invia("avanti")).toThrow();
  });
});
