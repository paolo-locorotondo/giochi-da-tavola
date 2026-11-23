import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Carta } from "../tipi";
import { ZonaCarte, alternaSelezione } from "./ZonaCarte";

const c = (id: number, valore: number, seme: Carta["seme"] = "cuori"): Carta => ({ id, seme, valore, mazzo: "francese" } as Carta);

describe("alternaSelezione", () => {
  it("aggiunge e toglie con selezione multipla", () => {
    expect(alternaSelezione([], 3, true)).toEqual([3]);
    expect(alternaSelezione([3], 5, true)).toEqual([3, 5]);
    expect(alternaSelezione([3, 5], 3, true)).toEqual([5]);
  });

  it("con selezione singola sostituisce la scelta", () => {
    expect(alternaSelezione([3], 5, false)).toEqual([5]);
    expect(alternaSelezione([5], 5, false)).toEqual([]);
  });
});

describe("ZonaCarte", () => {
  it("fila: mostra tutte le carte nell'ordine ricevuto", () => {
    const html = renderToStaticMarkup(<ZonaCarte titolo="A terra" carte={[c(1, 2), c(2, 3)]} />);
    expect(html).toContain("cg-zona-fila");
    expect(html.indexOf("Due di cuori")).toBeLessThan(html.indexOf("Tre di cuori"));
  });

  it("pila: mostra solo la cima e il numero di carte", () => {
    const html = renderToStaticMarkup(<ZonaCarte titolo="Scarti" disposizione="pila" carte={[c(1, 2), c(2, 9)]} />);
    expect(html).toContain("cg-zona-pila");
    expect(html).toContain("Nove di cuori");
    expect(html).not.toContain("Due di cuori");
    expect(html).toContain("2 carte");
  });

  it("mazzo coperto: dorso e numero", () => {
    const html = renderToStaticMarkup(<ZonaCarte titolo="Mazzo" disposizione="pila" coperte={41} />);
    expect(html).toContain("cg-dorso");
    expect(html).toContain("41 carte");
  });

  it("colonne: un gruppo per colonna, con passo", () => {
    const html = renderToStaticMarkup(
      <ZonaCarte titolo="Loro" disposizione="colonne" gruppi={[[c(1, 5), c(2, 6)], [c(3, 9)]]} />,
    );
    expect(html.match(/cg-zona-colonna /g)).toHaveLength(2);
    expect(html).toContain("cg-passo-mini");
  });

  it("vuota: mostra il testo indicato o quello predefinito", () => {
    expect(renderToStaticMarkup(<ZonaCarte titolo="Loro" disposizione="colonne" gruppi={[]} vuota="Nessuna combinazione" />)).toContain(
      "Nessuna combinazione",
    );
    expect(renderToStaticMarkup(<ZonaCarte titolo="Scarti" carte={[]} />)).toContain("Nessuna carta");
  });

  it("selezionabile: le carte diventano pulsanti con lo stato di selezione", () => {
    const html = renderToStaticMarkup(<ZonaCarte titolo="A terra" carte={[c(1, 2)]} selezione={[1]} onSeleziona={() => {}} />);
    expect(html).toContain("<button");
    expect(html).toContain('aria-pressed="true"');
  });
});
