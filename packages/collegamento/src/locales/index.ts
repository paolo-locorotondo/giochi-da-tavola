import type { Dizionari } from "@gdt/i18n";
import { en } from "./en";
import { it } from "./it";

export const dizionari: Dizionari<typeof it> = { it, en };

/** La chiave del testo di un errore della sala veloce, se `messaggio` ne è uno. */
export function chiaveErroreSala(messaggio: string): (keyof typeof it & string) | undefined {
  const chiave = `errore_${messaggio}`;
  return chiave in it ? (chiave as keyof typeof it & string) : undefined;
}
