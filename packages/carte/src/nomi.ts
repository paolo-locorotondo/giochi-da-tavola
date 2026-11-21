import type { T } from "./locales";
import { mazzoDi, type Carta } from "./tipi";

/** Nome parlato della carta: «Sette di cuori», «Re di spade», «Jolly». */
export function nomeCarta(t: T, carta: Carta): string {
  if (carta.seme === null) return t("cartaJolly");
  const prefisso = mazzoDi(carta) === "italiano" ? "valoreI_" : "valoreF_";
  const nome = t("carta", {
    valore: t(`${prefisso}${carta.valore}` as Parameters<T>[0]),
    seme: t(`seme_${carta.seme}` as Parameters<T>[0]),
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}
