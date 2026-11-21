import { PRESA_SINGOLA_OBBLIGATORIA } from "./regole";

/** Il minimo che serve a una presa: valore e id (stabile). */
interface ConValore {
  id: number;
  valore: number;
}

/**
 * Le prese possibili calando `carta` su `tavolo`. Funzione pura.
 * - Se sul tavolo c'è una carta di pari valore, si prende solo quella: una combinazione per ognuna
 *   (due solo se la distribuzione iniziale ne ha scoperte due).
 * - Altrimenti tutte le combinazioni di carte del tavolo con somma uguale al valore della carta
 *   (almeno due carte), in ordine stabile: per id crescente dentro la combinazione, e le combinazioni
 *   nell'ordine in cui le trova la ricerca sugli id.
 * - Vuoto: nessuna presa, la carta resta sul tavolo.
 */
export function combinazioniPresa<C extends ConValore>(tavolo: readonly C[], carta: ConValore): C[][] {
  const ordinate = [...tavolo].sort((a, b) => a.id - b.id);
  const pari = ordinate.filter((c) => c.valore === carta.valore);
  if (pari.length > 0 && PRESA_SINGOLA_OBBLIGATORIA) return pari.map((c) => [c]);

  const trovate: C[][] = [];
  const scelte: C[] = [];
  // Ricerca in profondità con potatura: le carte valgono almeno 1, quindi si smette appena la somma supera.
  const cerca = (da: number, resto: number) => {
    if (resto === 0) {
      if (scelte.length >= 2) trovate.push([...scelte]);
      return;
    }
    for (let i = da; i < ordinate.length; i++) {
      const c = ordinate[i]!;
      if (c.valore > resto) continue;
      scelte.push(c);
      cerca(i + 1, resto - c.valore);
      scelte.pop();
    }
  };
  cerca(0, carta.valore);
  if (!PRESA_SINGOLA_OBBLIGATORIA && pari.length > 0) return [...pari.map((c) => [c]), ...trovate];
  return trovate;
}

/** Stesso insieme di id (in qualsiasi ordine). */
export function stessaPresa(a: readonly ConValore[], ids: readonly number[]): boolean {
  if (a.length !== ids.length) return false;
  const set = new Set(ids);
  return set.size === ids.length && a.every((c) => set.has(c.id));
}
