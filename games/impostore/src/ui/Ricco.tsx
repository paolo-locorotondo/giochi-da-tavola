import type { ReactNode } from "react";

const INIZIO = "\u0001";
const FINE = "\u0002";

/** Marca un valore da mostrare in grassetto dentro una frase tradotta: `t("x", { nome: g(nome) })` + `<Ricco>`. */
export const g = (valore: string | number): string => `${INIZIO}${valore}${FINE}`;

/** Mostra una frase tradotta mettendo in grassetto i valori marcati con `g()`. */
export function Ricco({ testo }: { testo: string }): ReactNode {
  const pezzi = testo.split(new RegExp(`${INIZIO}([^${FINE}]*)${FINE}`));
  return (
    <>
      {pezzi.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))}
    </>
  );
}
