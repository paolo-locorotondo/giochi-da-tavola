import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Mano } from "../ui/Mano";
import { BarraAzioni } from "./BarraAzioni";
import { PannelloInfo } from "./PannelloInfo";
import { RegistroEventi } from "./RegistroEventi";
import { SegnapostoPosa } from "./SegnapostoPosa";

const niente = () => {};

describe("SegnapostoPosa", () => {
  it("è un pulsante col testo di base «Posa qui»", () => {
    const html = renderToStaticMarkup(<SegnapostoPosa onTocca={niente} />);
    expect(html).toContain("<button");
    expect(html).toContain("Posa qui");
  });

  it("accetta un altro testo e può essere disabilitato", () => {
    const html = renderToStaticMarkup(<SegnapostoPosa onTocca={niente} testo="Posa a terra" disabilitato />);
    expect(html).toContain("Posa a terra");
    expect(html).toContain("disabled");
  });
});

describe("BarraAzioni", () => {
  it("non disegna nulla senza azioni", () => {
    expect(renderToStaticMarkup(<BarraAzioni azioni={[]} />)).toBe("");
  });

  it("una classe per variante, secondaria di base", () => {
    const html = renderToStaticMarkup(
      <BarraAzioni
        azioni={[
          { id: "cala", etichetta: "Cala", variante: "primaria", onTocca: niente },
          { id: "scarta", etichetta: "Scarta", onTocca: niente },
          { id: "bot", etichetta: "Simula col bot", onTocca: niente, disabilitata: true },
        ]}
      />,
    );
    expect(html).toContain("cg-azione-primaria");
    expect(html.match(/cg-azione-secondaria/g)).toHaveLength(2);
    expect(html).toContain("disabled");
  });
});

describe("RegistroEventi", () => {
  it("mette le voci più recenti in cima e limita il numero", () => {
    const html = renderToStaticMarkup(<RegistroEventi voci={["uno", "due", "tre"]} massimo={2} />);
    expect(html.indexOf("tre")).toBeLessThan(html.indexOf("due"));
    expect(html).not.toContain("uno");
  });

  it("senza voci dice che non è successo ancora niente", () => {
    expect(renderToStaticMarkup(<RegistroEventi voci={[]} />)).toContain("Ancora niente.");
  });

  it("titolo di base «Cosa è successo»", () => {
    expect(renderToStaticMarkup(<RegistroEventi voci={[]} />)).toContain("Cosa è successo");
  });
});

describe("PannelloInfo", () => {
  it("è chiuso all'inizio, con il pulsante che dice cosa apre", () => {
    const html = renderToStaticMarkup(<PannelloInfo titolo="Scarti">contenuto</PannelloInfo>);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Dettagli: Scarti"');
    expect(html).not.toContain("contenuto");
  });
});

describe("Mano in turno", () => {
  const carte = [{ id: 1, seme: "cuori", valore: 2, mazzo: "francese" }] as never;

  it("di turno: titolo «tocca a te» e bordo", () => {
    const html = renderToStaticMarkup(<Mano carte={carte} selezione={[]} onSeleziona={niente} diTurno riordino={false} />);
    expect(html).toContain("La tua mano (tocca a te): 1 carta");
    expect(html).toContain("cg-mano-turno");
  });

  it("non di turno: titolo di sempre, nessun bordo", () => {
    const html = renderToStaticMarkup(<Mano carte={carte} selezione={[]} onSeleziona={niente} riordino={false} />);
    expect(html).toContain("La tua mano: 1 carta");
    expect(html).not.toContain("cg-mano-turno");
  });

  it("mostra il riepilogo sotto la mano", () => {
    const html = renderToStaticMarkup(
      <Mano carte={carte} selezione={[]} onSeleziona={niente} riordino={false} riepilogo="Mazzo: 18 carte" />,
    );
    expect(html).toContain("Mazzo: 18 carte");
  });
});
