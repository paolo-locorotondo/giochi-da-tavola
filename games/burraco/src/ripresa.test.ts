import { describe, expect, it } from "vitest";
import { botDiTurno, eSalvataggio, muoviBot, nuovaPartitaLocale, riprendi, type PartitaLocale } from "./offline";

/** Andata e ritorno dallo storage: quello che resta dopo un refresh. */
const json = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Muove i bot finché tocca a me (o finisce la mano). */
function finoAMe(p0: PartitaLocale): PartitaLocale {
  let p = p0;
  for (let i = 0; i < 200 && botDiTurno(p) !== null; i++) p = muoviBot(p);
  return p;
}

describe("ripresa dopo un refresh", () => {
  const p = nuovaPartitaLocale({ nomi: ["Io", "Bot 1"], livello: "medio", config: {} }, 42);

  it("il salvataggio passa dal JSON intatto e supera il controllo", () => {
    const s = json({ partita: p, velocita: "veloce" });
    expect(eSalvataggio(s)).toBe(true);
    expect(riprendi(s.partita)).toEqual(p);
  });

  it("le mosse dei bot dopo la ripresa sono le stesse di prima: niente carte ridistribuite", () => {
    const prima = finoAMe(p);
    const dopo = finoAMe(riprendi(json(p)));
    expect(dopo).toEqual(prima);
  });

  it("scarta salvataggi rotti o di forma diversa", () => {
    expect(eSalvataggio(null)).toBe(false);
    expect(eSalvataggio({})).toBe(false);
    expect(eSalvataggio({ partita: p, velocita: "lampo" })).toBe(false);
    expect(eSalvataggio({ partita: { ...p, livello: "boh" }, velocita: "normale" })).toBe(false);
    expect(eSalvataggio({ partita: { ...p, stato: { ...p.stato, fase: "fine" } }, velocita: "normale" })).toBe(false);
  });
});
