import { nomeCarta, type Carta, type dizionariCarte } from "@gdt/carte";
import type { Traduttore, usaT } from "@gdt/i18n";
import type { it } from "../locales/it";
import type { Evento } from "../logica";

type T = Traduttore<typeof it>;
type TC = ReturnType<typeof usaT<typeof dizionariCarte.it>>;

/** «A», «A e B», «A, B e C» (la congiunzione viene dai testi: «e» / «and»). */
export function elencoParlato(t: T, voci: readonly string[]): string {
  if (voci.length <= 1) return voci.join("");
  return `${voci.slice(0, -1).join(", ")} ${t("elencoE")} ${voci[voci.length - 1]}`;
}

const nomiCarte = (t: T, tc: TC, carte: readonly Carta[]) => elencoParlato(t, carte.map((c) => nomeCarta(tc, c)));

/**
 * La riga del registro «Cosa è successo». Un evento senza l'elenco delle carte (partita salvata o server
 * di versione precedente) mostra il testo con il solo numero.
 */
export function testoEvento(t: T, tc: TC, e: Evento, nome: (p: number) => string): string {
  switch (e.tipo) {
    case "nuovoRound":
      return t("ev_nuovoRound");
    case "gioca":
      if (e.prese <= 0) return t("ev_cala", { nome: nome(e.posto), carta: nomeCarta(tc, e.carta) });
      return e.carte && e.carte.length > 0
        ? t("ev_prendeCarte", { nome: nome(e.posto), carta: nomeCarta(tc, e.carta), carte: nomiCarte(t, tc, e.carte) })
        : t("ev_prende", { nome: nome(e.posto), carta: nomeCarta(tc, e.carta), n: e.prese });
    case "scopa":
      return t("ev_scopa", { nome: nome(e.posto) });
    case "distribuzione":
      return t("ev_distribuzione", { n: e.mano });
    case "ultimaPresa":
      return e.elenco && e.elenco.length > 0
        ? t("ev_ultimaPresaCarte", { nome: nome(e.posto), n: e.elenco.length, carte: nomiCarte(t, tc, e.elenco) })
        : t("ev_ultimaPresa", { nome: nome(e.posto), n: e.carte });
    case "fineRound":
      return t("ev_fineRound");
    case "bot":
      return t("ev_bot", { nome: nome(e.posto) });
  }
}
