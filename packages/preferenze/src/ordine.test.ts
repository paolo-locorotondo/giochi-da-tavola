import { describe, expect, it } from "vitest";
import { applicaOrdine, decodificaOrdine, spostaVoce } from "./ordine";

const voci = ["dadi", "duello", "impostore", "tris"];
const io = (v: string) => v;

describe("applicaOrdine", () => {
  it("senza salvataggio resta l'ordine naturale", () => {
    expect(applicaOrdine(voci, io, null)).toEqual(voci);
  });

  it("segue l'ordine salvato", () => {
    expect(applicaOrdine(voci, io, ["tris", "dadi", "impostore", "duello"])).toEqual(["tris", "dadi", "impostore", "duello"]);
  });

  it("mette in fondo, nell'ordine naturale, le voci nuove che il salvataggio non conosceva", () => {
    expect(applicaOrdine(voci, io, ["tris", "dadi"])).toEqual(["tris", "dadi", "duello", "impostore"]);
  });

  it("ignora le voci salvate che non esistono più e i doppioni", () => {
    expect(applicaOrdine(voci, io, ["vecchio", "tris", "tris", "dadi"])).toEqual(["tris", "dadi", "duello", "impostore"]);
  });

  it("funziona con oggetti, tramite la funzione id", () => {
    const giochi = voci.map((id) => ({ id }));
    expect(applicaOrdine(giochi, (g) => g.id, ["impostore"]).map((g) => g.id)).toEqual(["impostore", "dadi", "duello", "tris"]);
  });
});

describe("spostaVoce", () => {
  it("sposta di un posto su o giù", () => {
    expect(spostaVoce(voci, "impostore", -1)).toEqual(["dadi", "impostore", "duello", "tris"]);
    expect(spostaVoce(voci, "dadi", 1)).toEqual(["duello", "dadi", "impostore", "tris"]);
  });

  it("il primo non sale, l'ultimo non scende, una voce sconosciuta non cambia nulla", () => {
    expect(spostaVoce(voci, "dadi", -1)).toEqual(voci);
    expect(spostaVoce(voci, "tris", 1)).toEqual(voci);
    expect(spostaVoce(voci, "boh", 1)).toEqual(voci);
  });

  it("non modifica l'elenco ricevuto", () => {
    const copia = [...voci];
    spostaVoce(copia, "dadi", 1);
    expect(copia).toEqual(voci);
  });
});

describe("decodificaOrdine", () => {
  it("legge un elenco di stringhe", () => {
    expect(decodificaOrdine('["tris","dadi"]')).toEqual(["tris", "dadi"]);
  });

  it("dati assenti o non validi = nessun ordine", () => {
    expect(decodificaOrdine(null)).toBeNull();
    expect(decodificaOrdine("")).toBeNull();
    expect(decodificaOrdine("non json")).toBeNull();
    expect(decodificaOrdine('{"a":1}')).toBeNull();
    expect(decodificaOrdine('["tris", 3]')).toBeNull();
  });
});
