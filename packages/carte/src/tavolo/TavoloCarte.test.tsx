import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TavoloCarte, disponiPosti } from "./TavoloCarte";

const posto = (nome: string) => ({ nome, carte: 3 });
const posti = (n: number) => Array.from({ length: n }, (_, i) => posto(`G${i + 1}`));

describe("disponiPosti", () => {
  it("fino a 2 avversari tutti sopra", () => {
    expect(disponiPosti(1)).toEqual({ sinistra: 0, sopra: 1, destra: 0 });
    expect(disponiPosti(2)).toEqual({ sinistra: 0, sopra: 2, destra: 0 });
  });

  it("da 3 a 5 uno per lato", () => {
    expect(disponiPosti(3)).toEqual({ sinistra: 1, sopra: 1, destra: 1 });
    expect(disponiPosti(5)).toEqual({ sinistra: 1, sopra: 3, destra: 1 });
  });

  it("da 6 a 9 due per lato (10 giocatori: 9 avversari, 2-5-2)", () => {
    expect(disponiPosti(6)).toEqual({ sinistra: 2, sopra: 2, destra: 2 });
    expect(disponiPosti(9)).toEqual({ sinistra: 2, sopra: 5, destra: 2 });
  });

  it("i posti si sommano sempre al totale", () => {
    for (let n = 0; n <= 9; n++) {
      const d = disponiPosti(n);
      expect(d.sinistra + d.sopra + d.destra).toBe(n);
    }
  });
});

describe("TavoloCarte", () => {
  it("in senso orario: prima la sinistra, poi sopra, poi la destra", () => {
    const html = renderToStaticMarkup(<TavoloCarte posti={posti(3)} />);
    const sx = html.indexOf("cg-tavolo-sinistra");
    const su = html.indexOf("cg-tavolo-sopra");
    const dx = html.indexOf("cg-tavolo-destra");
    expect(sx).toBeGreaterThan(-1);
    expect(sx).toBeLessThan(su);
    expect(su).toBeLessThan(dx);
    expect(html.indexOf(">G1<")).toBeGreaterThan(sx);
    expect(html.indexOf(">G1<")).toBeLessThan(su);
    expect(html.indexOf(">G3<")).toBeGreaterThan(dx);
  });

  it("con 1 o 2 avversari non ci sono lati", () => {
    const html = renderToStaticMarkup(<TavoloCarte posti={posti(1)} />);
    expect(html).toContain("cg-tavolo-senza-lati");
    expect(html).not.toContain("cg-tavolo-sinistra");
  });

  it("disposizione «sopra»: tutti in una riga, nessun lato, ordine invariato", () => {
    const html = renderToStaticMarkup(<TavoloCarte posti={posti(3)} disposizione="sopra" />);
    expect(html).toContain("cg-tavolo-senza-lati");
    expect(html).not.toContain("cg-tavolo-sinistra");
    expect(html).not.toContain("cg-tavolo-destra");
    expect(html.indexOf(">G1<")).toBeLessThan(html.indexOf(">G2<"));
    expect(html.indexOf(">G2<")).toBeLessThan(html.indexOf(">G3<"));
  });

  it("titolo con il numero di giocatori", () => {
    expect(renderToStaticMarkup(<TavoloCarte posti={posti(4)} />)).toContain('aria-label="Tavolo con 4 giocatori"');
  });

  it("mette le zone del gioco al centro solo se ci sono", () => {
    expect(renderToStaticMarkup(<TavoloCarte posti={posti(1)} />)).not.toContain("cg-tavolo-centro");
    expect(renderToStaticMarkup(<TavoloCarte posti={posti(1)}><span>mazzo</span></TavoloCarte>)).toContain(
      '<div class="cg-tavolo-centro"><span>mazzo</span></div>',
    );
  });
});
