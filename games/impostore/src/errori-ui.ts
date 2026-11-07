import type { Traduttore } from "@gdt/i18n";
import { leggiMessaggio, type ProblemaGioco } from "./errori";
import { it } from "./locales/it";

type D = typeof it;

const èErrore = (codice: string) => `errore_${codice}` in it;

/** Testo di un errore di regola già tradotto. */
export function testoProblema(t: Traduttore<D>, p: ProblemaGioco): string {
  return èErrore(p.codice) ? t(`errore_${p.codice}` as keyof D & string, { n: p.n ?? 0 }) : t("errore_sconosciuto");
}

/**
 * Traduce un messaggio d'errore ricevuto dal server (`codice` o `codice:n`).
 * Le frasi scritte a mano dal server (che non sono codici) si mostrano così come sono.
 */
export function testoMessaggio(t: Traduttore<D>, messaggio: string): string {
  const p = leggiMessaggio(messaggio);
  if (p && èErrore(p.codice)) return testoProblema(t, p);
  return messaggio || t("errore_sconosciuto");
}
