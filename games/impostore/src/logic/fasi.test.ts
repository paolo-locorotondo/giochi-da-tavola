import { describe, expect, it } from "vitest";
import { nuovaMacchinaImpostore, vincitore } from "./fasi";

describe("fasi di Impostore", () => {
  it("se l'impostore non viene scoperto la partita finisce al voto", () => {
    const m = nuovaMacchinaImpostore().invia("avanti").invia("avanti").invia("impostoreNonScoperto");
    expect(m.fase).toBe("fine");
    expect(m.finita).toBe(true);
  });

  it("se viene scoperto passa al tentativo, poi alla fine", () => {
    const m = nuovaMacchinaImpostore()
      .invia("avanti")
      .invia("avanti")
      .invia("impostoreScoperto")
      .invia("tentativoEseguito");
    expect(m.storia).toEqual(["distribuzione", "indizi", "voto", "tentativo", "fine"]);
  });

  it("non si può tentare la parola senza essere stati scoperti", () => {
    const m = nuovaMacchinaImpostore().invia("avanti").invia("avanti");
    expect(m.puoInviare("tentativoEseguito")).toBe(false);
  });
});

describe("vincitore", () => {
  it("impostore non scoperto: vincono gli impostori", () => {
    expect(vincitore(false, false)).toBe("impostori");
  });
  it("scoperto e indovina: vincono gli impostori", () => {
    expect(vincitore(true, true)).toBe("impostori");
  });
  it("scoperto e non indovina: vincono i civili", () => {
    expect(vincitore(true, false)).toBe("civili");
  });
});
