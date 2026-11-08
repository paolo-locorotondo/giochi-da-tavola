import type { Traduttore } from "@gdt/i18n";
import { it } from "./locales/it";

type D = typeof it;

/**
 * Traduce un messaggio d'errore ricevuto dal server: un codice (`nonTocca`) diventa la voce
 * `errore_<codice>`; le frasi scritte a mano dal server si mostrano così come sono.
 */
export function testoMessaggio(t: Traduttore<D>, messaggio: string): string {
  const [, codice, n] = /^([A-Za-z]+)(?::(\d+))?$/.exec(messaggio) ?? [];
  if (codice && `errore_${codice}` in it) return t(`errore_${codice}` as keyof D & string, { n: Number(n ?? 0) });
  return messaggio || t("errore_sconosciuto");
}
