import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostoGiocatore } from "./PostoGiocatore";

const etichetta = (html: string) => /aria-label="([^"]*)"/.exec(html)?.[1];

describe("PostoGiocatore", () => {
  it("riassume il posto in una sola frase", () => {
    const html = renderToStaticMarkup(<PostoGiocatore nome="Carla" carte={11} squadra="Squadra 1" diTurno />);
    expect(etichetta(html)).toBe("Carla, Squadra 1, 11 carte, Di turno");
  });

  it("dice il turno anche a parole, non solo col colore", () => {
    const html = renderToStaticMarkup(<PostoGiocatore nome="Dina" carte={1} diTurno />);
    expect(html).toContain("cg-posto-turno");
    expect(html).toContain("Di turno");
  });

  it("segnala solo il collegamento perso, non quello presente", () => {
    expect(etichetta(renderToStaticMarkup(<PostoGiocatore nome="Elia" carte={4} collegato />))).toBe("Elia, 4 carte");
    expect(etichetta(renderToStaticMarkup(<PostoGiocatore nome="Elia" carte={4} collegato={false} />))).toBe("Elia, 4 carte, Non collegato");
    expect(etichetta(renderToStaticMarkup(<PostoGiocatore nome="Elia" carte={4} />))).toBe("Elia, 4 carte");
  });

  it("usa il singolare e lo zero", () => {
    expect(etichetta(renderToStaticMarkup(<PostoGiocatore nome="Bea" carte={1} />))).toBe("Bea, 1 carta");
    expect(etichetta(renderToStaticMarkup(<PostoGiocatore nome="Bea" carte={0} />))).toBe("Bea, nessuna carta");
  });

  it("include i punti nella frase", () => {
    const html = renderToStaticMarkup(<PostoGiocatore nome="Bruno" carte={11} punti="12 punti" />);
    expect(etichetta(html)).toBe("Bruno, 11 carte, 12 punti");
  });
});
