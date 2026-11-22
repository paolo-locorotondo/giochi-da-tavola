import { ArrowLeftRight, Ban, Check, Droplet, Flame, Handshake, Leaf, Layers, RotateCw, Scissors, Sparkles, Sun, type LucideIcon } from "lucide-react";
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
    case "scambio":
      return colore ? t("carta_scambioColore", { colore: nomeColore(t, colore) }) : t("carta_scambio");
    case "rotazione":
      return colore ? t("carta_rotazioneColore", { colore: nomeColore(t, colore) }) : t("carta_rotazione");
  }
}

/** Nome corto scritto sulla carta senza colore. */
function nomeJolly(t: T, c: DatiCarta): string {
  switch (c.tipo) {
    case "piu4":
      return t("carta_piu4");
    case "scambio":
      return t("carta_scambio");
    case "rotazione":
      return t("carta_rotazione");
    default:
      return t("carta_jolly");
  }
}

function Simbolo({ carta, size = 22 }: { carta: DatiCarta; size?: number }) {
  switch (carta.tipo) {
    case "numero":
      return <>{carta.valore}</>;
    case "salta":
      return <Ban size={size} aria-hidden="true" />;
    case "inverti":
      return <ArrowLeftRight size={size} aria-hidden="true" />;
    case "piu2":
      return <>+2</>;
    case "jolly":
      return <Layers size={size} aria-hidden="true" />;
    case "piu4":
      return <>+4</>;
    case "scambio":
      return <Handshake size={size} aria-hidden="true" />;
    case "rotazione":
      return <RotateCw size={size} aria-hidden="true" />;
  }
}

/** Il grande disegno in basso a destra della carta compatta (visibile per intero sull'ultima carta della riga). */
function Centro({ carta, Icona }: { carta: DatiCarta; Icona: LucideIcon | null }) {
  if (carta.tipo === "piu2" || carta.tipo === "piu4") return <span className="ul-centro-testo">{carta.tipo === "piu2" ? "+2" : "+4"}</span>;
  if (carta.tipo === "numero") return Icona ? <Icona size={34} aria-hidden="true" /> : null;
  return <Simbolo carta={carta} size={34} />;
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
  /** Modalità «Più carte»: la carta è un interruttore (scelta o no). */
  scelta?: boolean;
  /** Taglio: questa carta è identica a quella appena calata (si taglia dal pulsante, non toccando la carta). */
  tagliabile?: boolean;
  /** Carta della mano: valore e seme in alto a sinistra, per la mano sovrapposta (72×104 px). */
  compatta?: boolean;
  /** Appena pescata (solo compatta): anello d'accento e piccolo badge. */
  nuova?: boolean;
  /** Per ritrovare la carta nel DOM (scorrimento verso la carta pescata). */
  idCarta?: number;
}

export function Carta({ carta, t, colore = null, onClick, spenta = false, grande = false, scelta, tagliabile = false, compatta = false, nuova = false, idCarta }: Props) {
  const col = "colore" in carta ? carta.colore : colore;
  const Icona = col ? ICONA_COLORE[col] : null;
  const nome = nomeCarta(t, carta, colore);
  const classe = `ul-carta ul-${"colore" in carta ? carta.colore : "jolly"}${spenta ? " ul-spenta" : ""}${grande ? " ul-grande" : ""}${scelta ? " ul-scelta" : ""}${tagliabile ? " ul-tagliabile" : ""}${compatta ? " ul-compatta" : ""}${nuova ? " ul-nuova" : ""}`;
  const contenuto = compatta ? (
    <>
      <span className="ul-angolo">
        <span className="ul-valore">
          <Simbolo carta={carta} size={20} />
        </span>
        {Icona && <Icona className="ul-seme" size={14} aria-hidden="true" />}
        {scelta ? (
          <Check className="ul-segno ul-spunta" size={14} aria-hidden="true" />
        ) : tagliabile ? (
          <Scissors className="ul-segno" size={14} aria-hidden="true" />
        ) : nuova ? (
          <Sparkles className="ul-segno" size={14} aria-hidden="true" />
        ) : null}
      </span>
      <span className="ul-centro-carta" aria-hidden="true">
        <Centro carta={carta} Icona={Icona} />
      </span>
    </>
  ) : (
    <>
      <span className="ul-valore">
        <Simbolo carta={carta} />
      </span>
      {scelta ? (
        <Check className="ul-seme ul-spunta" size={24} aria-hidden="true" />
      ) : tagliabile ? (
        <Scissors className="ul-seme" size={24} aria-hidden="true" />
      ) : (
        Icona && <Icona className="ul-seme" size={grande ? 34 : 24} aria-hidden="true" />
      )}
      <span className="ul-nome" aria-hidden="true">
        {col ? nomeColore(t, col) : nomeJolly(t, carta)}
      </span>
    </>
  );
  if (!onClick) {
    return (
      <span className={classe} data-carta={idCarta} role="img" aria-label={nome}>
        {contenuto}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={classe}
      data-carta={idCarta}
      aria-label={spenta ? t("cartaNonGiocabile", { carta: nome }) : nome}
      aria-disabled={spenta}
      aria-pressed={scelta === undefined ? undefined : scelta}
      onClick={onClick}
    >
      {contenuto}
    </button>
  );
}
