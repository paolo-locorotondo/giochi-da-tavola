import { SEMI_FRANCESI, SEMI_ITALIANI, type Carta, type Seme } from "./tipi";

const ORDINE_SEMI: readonly Seme[] = [...SEMI_FRANCESI, ...SEMI_ITALIANI];
const rangoSeme = (c: Carta): number => (c.seme === null ? ORDINE_SEMI.length : ORDINE_SEMI.indexOf(c.seme));
/** I jolly (valore 0) vanno sempre in fondo. */
const rangoValore = (c: Carta): number => (c.seme === null ? Number.POSITIVE_INFINITY : c.valore);

/** Copia ordinata per seme, poi per valore, poi per id; i jolly in fondo. */
export function ordinaPerSeme(carte: readonly Carta[]): Carta[] {
  return [...carte].sort((a, b) => rangoSeme(a) - rangoSeme(b) || a.valore - b.valore || a.id - b.id);
}

/** Copia ordinata per valore (asso = 1), poi per seme, poi per id; i jolly in fondo. */
export function ordinaPerValore(carte: readonly Carta[]): Carta[] {
  return [...carte].sort((a, b) => {
    const va = rangoValore(a);
    const vb = rangoValore(b);
    if (va !== vb) return va < vb ? -1 : 1;
    return rangoSeme(a) - rangoSeme(b) || a.id - b.id;
  });
}
