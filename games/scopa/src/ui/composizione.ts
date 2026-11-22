/**
 * Composizione della presa a due tocchi: dopo aver scelto una carta della mano, si toccano le carte
 * del tavolo. Funzione pura: riceve le prese lecite di quella carta (id delle carte del tavolo) e
 * dice cosa fare con il tocco. Non fa mai una mossa che non sia lecita.
 */
export type EsitoTocco =
  /** Le carte toccate individuano una presa lecita: la mossa si fa. */
  | { tipo: "presa"; presa: number[] }
  /** Presa in costruzione: queste sono le carte toccate finora. */
  | { tipo: "parziale"; toccate: number[] }
  /** La carta non fa parte di nessuna presa: non succede niente. */
  | { tipo: "rifiutato" };

/** Tutte le carte del tavolo che fanno parte di almeno una presa. */
export const carteDiPresa = (combinazioni: readonly (readonly number[])[]): Set<number> => new Set(combinazioni.flat());

export function toccaTavolo(combinazioni: readonly (readonly number[])[], toccate: readonly number[], id: number): EsitoTocco {
  // Toccata di nuovo: si toglie dalla presa in costruzione.
  if (toccate.includes(id)) return { tipo: "parziale", toccate: toccate.filter((x) => x !== id) };
  if (!combinazioni.some((c) => c.includes(id))) return { tipo: "rifiutato" };
  let prossime = [...toccate, id];
  // Con le carte già toccate non c'è nessuna presa: si riparte da questa carta.
  if (!combinazioni.some((c) => prossime.every((x) => c.includes(x)))) prossime = [id];
  const candidate = combinazioni.filter((c) => prossime.every((x) => c.includes(x)));
  const esatta = candidate.find((c) => c.length === prossime.length);
  // Una presa sola con queste carte: non c'è niente da scegliere, parte da sola.
  if (esatta) return { tipo: "presa", presa: [...esatta] };
  if (candidate.length === 1) return { tipo: "presa", presa: [...candidate[0]!] };
  return { tipo: "parziale", toccate: prossime };
}
