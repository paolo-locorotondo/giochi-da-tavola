/**
 * Composizione della presa: dopo aver scelto una carta della mano, si toccano una a una le carte del tavolo
 * e poi si preme «Conferma». Funzioni pure: ricevono le prese lecite di quella carta (id delle carte del
 * tavolo) e dicono cosa fare con il tocco. Non fanno mai una mossa: la mossa parte solo da «Conferma», e solo
 * se le carte toccate sono esattamente una presa lecita.
 */
export type EsitoTocco =
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
  return { tipo: "parziale", toccate: prossime };
}

/** La presa lecita fatta esattamente dalle carte toccate (si può confermare), o null. */
export function presaPronta(combinazioni: readonly (readonly number[])[], toccate: readonly number[]): number[] | null {
  if (toccate.length === 0) return null;
  const esatta = combinazioni.find((c) => c.length === toccate.length && toccate.every((x) => c.includes(x)));
  return esatta ? [...esatta] : null;
}
