import { ArrowLeftRight, Ban, Droplet, Flame, Leaf, Layers, Sun, type LucideIcon } from "lucide-react";
import type { Traduttore } from "@gdt/i18n";
import type { Carta as DatiCarta, Colore } from "../logica";
import type { it } from "../locales/it";

type T = Traduttore<typeof it>;

/** Ogni colore ha anche un simbolo e un nome: il colore non è mai l'unico segnale. */
export const ICONA_COLORE: Record<Colore, LucideIcon> = { rosso: Flame, giallo: Sun, verde: Leaf, blu: Droplet };

export const nomeColore = (t: T, c: Colore) => t(`colore_${c}`);

/** Nome parlato della carta (per lettori di schermo ed eventi). `colore` è quello scelto per un Jolly. */
export function nomeCarta(t: T, c: DatiCarta, colore: Colore | null = null): string {
  switch (c.tipo) {
    case "numero":
      return t("carta_numero", { valore: c.valore, colore: nomeColore(t, c.colore) });
    case "salta":
      return t("carta_salta", { colore: nomeColore(t, c.colore) });
    case "inverti":
      return t("carta_inverti", { colore: nomeColore(t, c.colore) });
    case "piu2":
      return t("carta_piu2", { colore: nomeColore(t, c.colore) });
    case "jolly":
      return colore ? t("carta_jollyColore", { colore: nomeColore(t, colore) }) : t("carta_jolly");
    case "piu4":
      return colore ? t("carta_piu4Colore", { colore: nomeColore(t, colore) }) : t("carta_piu4");
  }
}

function Simbolo({ carta }: { carta: DatiCarta }) {
  switch (carta.tipo) {
    case "numero":
      return <>{carta.valore}</>;
    case "salta":
      return <Ban size={22} aria-hidden="true" />;
    case "inverti":
      return <ArrowLeftRight size={22} aria-hidden="true" />;
    case "piu2":
      return <>+2</>;
    case "jolly":
      return <Layers size={22} aria-hidden="true" />;
    case "piu4":
      return <>+4</>;
  }
}

interface Props {
  carta: DatiCarta;
  t: T;
  /** Colore scelto, per un Jolly sulla pila. */
  colore?: Colore | null;
  /** Se c'è, la carta è un pulsante. */
  onClick?: () => void;
  /** Attenuata: non si può giocare ora. */
  spenta?: boolean;
  grande?: boolean;
}

export function Carta({ carta, t, colore = null, onClick, spenta = false, grande = false }: Props) {
  const col = "colore" in carta ? carta.colore : colore;
  const Icona = col ? ICONA_COLORE[col] : null;
  const nome = nomeCarta(t, carta, colore);
  const classe = `ul-carta ul-${"colore" in carta ? carta.colore : "jolly"}${spenta ? " ul-spenta" : ""}${grande ? " ul-grande" : ""}`;
  const contenuto = (
    <>
      <span className="ul-valore">
        <Simbolo carta={carta} />
      </span>
      {Icona && <Icona className="ul-seme" size={grande ? 34 : 24} aria-hidden="true" />}
      <span className="ul-nome" aria-hidden="true">
        {col ? nomeColore(t, col) : carta.tipo === "piu4" ? t("carta_piu4") : t("carta_jolly")}
      </span>
    </>
  );
  if (!onClick) {
    return (
      <span className={classe} role="img" aria-label={nome}>
        {contenuto}
      </span>
    );
  }
  return (
    <button type="button" className={classe} aria-label={spenta ? t("cartaNonGiocabile", { carta: nome }) : nome} aria-disabled={spenta} onClick={onClick}>
      {contenuto}
    </button>
  );
}
