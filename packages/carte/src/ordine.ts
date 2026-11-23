import { SEMI_ITALIANI, type Carta, type Seme } from "./tipi";

/** Rossi e neri alternati (cuori, fiori, picche, quadri). Non è `SEMI_FRANCESI`, che genera gli id delle carte. */
const SEMI_FRANCESI_ALTERNATI: readonly Seme[] = ["cuori", "fiori", "picche", "quadri"];
const ORDINE_SEMI: readonly Seme[] = [...SEMI_FRANCESI_ALTERNATI, ...SEMI_ITALIANI];
const rangoSeme = (c: Carta): number => (c.seme === null ? ORDINE_SEMI.length : ORDINE_SEMI.indexOf(c.seme));
/** I jolly (valore 0) vanno sempre in fondo. */
const rangoValore = (c: Carta): number => (c.seme === null ? Number.POSITIVE_INFINITY : c.valore);

/** Per seme (cuori, fiori, picche, quadri, poi gli italiani), poi per valore, poi per id; i jolly in fondo. Per `Array.sort`. */
export function confrontaPerSeme(a: Carta, b: Carta): number {
  return rangoSeme(a) - rangoSeme(b) || a.valore - b.valore || a.id - b.id;
}

/** Per valore (asso = 1), poi per seme, poi per id; i jolly in fondo. Per `Array.sort`. */
export function confrontaPerValore(a: Carta, b: Carta): number {
  const va = rangoValore(a);
  const vb = rangoValore(b);
  if (va !== vb) return va < vb ? -1 : 1;
  return rangoSeme(a) - rangoSeme(b) || a.id - b.id;
}

/** Il gruppo di una carta nella mano ordinata per seme: il seme, o «jolly». */
export const chiaveSeme = (c: Carta): Seme | "jolly" => c.seme ?? "jolly";

/** Copia ordinata per seme, poi per valore, poi per id; i jolly in fondo. */
export function ordinaPerSeme(carte: readonly Carta[]): Carta[] {
  return [...carte].sort(confrontaPerSeme);
}

/** Copia ordinata per valore (asso = 1), poi per seme, poi per id; i jolly in fondo. */
export function ordinaPerValore(carte: readonly Carta[]): Carta[] {
  return [...carte].sort(confrontaPerValore);
}
