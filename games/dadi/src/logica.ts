import { limitaRighe as limitaRigheMotore, limitaTesto, type Rng } from "@gdt/engine";

/**
 * Lancio di un dado con `facce` facce equiprobabili: restituisce l'indice della faccia uscita.
 * Il generatore è iniettato: in gioco è `generaCasuale` (crypto), nei test un seme fisso.
 */
export function lancia(facce: readonly string[], rng: Rng): number {
  if (facce.length < 2) throw new RangeError(`lancia: servono almeno 2 facce, ricevute ${facce.length}`);
  return rng.intero(facce.length);
}

/** Massimo di caratteri per ogni valore di un dado personalizzato. */
export const MAX_CARATTERI_FACCIA = 20;

/** Massimo di caratteri della spiegazione facoltativa del dado (`info`). */
export const MAX_CARATTERI_INFO = 1000;

/** Accorcia la spiegazione a `MAX_CARATTERI_INFO` caratteri (simboli interi); le righe vanno a capo come scritte. */
export function limitaInfo(testo: string): string {
  return limitaTesto(testo, MAX_CARATTERI_INFO);
}

/** Accorcia ogni riga a `MAX_CARATTERI_FACCIA` caratteri (contando i simboli, non le unità UTF-16), lasciando intatte le altre. */
export function limitaRighe(testo: string): string {
  return limitaRigheMotore(testo, MAX_CARATTERI_FACCIA);
}

/** Valori di un dado personalizzato scritti uno per riga. Ignora righe vuote e spazi ai bordi; i doppioni restano un solo valore. */
export function facceDaTesto(testo: string): string[] {
  const viste = new Set<string>();
  const facce: string[] = [];
  for (const riga of limitaRighe(testo).split("\n")) {
    const f = riga.trim();
    if (f === "" || viste.has(f)) continue;
    viste.add(f);
    facce.push(f);
  }
  return facce;
}

/** Con due sole facce il dado si mostra come una moneta (il lancio non cambia). */
export function eMoneta(facce: readonly string[]): boolean {
  return facce.length === 2;
}
