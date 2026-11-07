import type { Lingua } from "@gdt/i18n";
import it from "../data/it/modelli.json";
import en from "../data/en/modelli.json";

/**
 * Un dado (o una moneta) con le sue facce. Si modifica in `data/<lingua>/modelli.json`, vedi il README del gioco.
 * Le facce sono testi: un dado con elenco libero (es. «Sì», «No», «Forse») ha lo stesso formato.
 */
export interface Modello {
  id: string;
  nome: string;
  facce: string[];
}

const MODELLI: Record<Lingua, Modello[]> = { it, en };

/** I modelli della lingua, nell'ordine del file. */
export function modelliDi(lingua: Lingua): Modello[] {
  return MODELLI[lingua];
}
