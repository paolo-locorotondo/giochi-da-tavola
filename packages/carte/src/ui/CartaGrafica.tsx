import { usaT } from "@gdt/i18n";
import { dizionari, type T } from "../locales";
import { nomeCarta } from "../nomi";
import { mazzoDi, type Carta } from "../tipi";
import { Figura, Pips, haPips, tipoFigura } from "./Disegni";
import { SimboloSeme, Spunta, Stella } from "./Semi";
import "./carte.css";

export type Dimensione = "mini" | "piccola" | "normale";

export interface PropsCartaGrafica {
  /** La carta da mostrare. Ignorata se `dorso` è vero. */
  carta?: Carta;
  /** Mostra il dorso (carta coperta). */
  dorso?: boolean;
  /** `mini` 26×38 px (tavolo, combinazioni), `piccola` 44×64 px (mano), `normale` 60×87 px (scarti, tavolo). */
  dimensione?: Dimensione;
  selezionata?: boolean;
  /** Evidenziata senza essere scelta (es. carta appena pescata). */
  evidenziata?: boolean;
  /** Non toccabile ora: se c'è `onClick` diventa un pulsante `disabled`. */
  disabilitata?: boolean;
  /** Se c'è, la carta è un pulsante con area di tocco di almeno 44 px. */
  onClick?: () => void;
  /** Nome parlato al posto di quello della carta («Sette di cuori»). */
  etichetta?: string;
  className?: string;
}

/** Lettera grande di una figura (J, Q, K nel francese; F, C, R nell'italiano), o `null` se è una carta a numero. */
function figura(t: T, carta: Carta): string | null {
  if (carta.seme === null) return null;
  if (mazzoDi(carta) === "italiano") return carta.valore >= 8 ? t(`indiceI_${carta.valore}` as Parameters<T>[0]) : null;
  if (carta.valore === 11) return t("indiceFante");
  if (carta.valore === 12) return t("indiceRegina");
  if (carta.valore === 13) return t("indiceRe");
  return null;
}

function indice(t: T, carta: Carta): string {
  if (mazzoDi(carta) === "francese" && carta.valore === 1) return t("indiceAsso");
  return figura(t, carta) ?? String(carta.valore);
}

/**
 * Carta disegnata in proprio (SVG e CSS, nessun asset). Francese, italiana, jolly e dorso.
 * Senza `onClick` è un'immagine con nome parlato; con `onClick` è un pulsante con `aria-pressed`.
 */
export function CartaGrafica({
  carta,
  dorso = false,
  dimensione = "normale",
  selezionata = false,
  evidenziata = false,
  disabilitata = false,
  onClick,
  etichetta,
  className,
}: PropsCartaGrafica) {
  const t = usaT(dizionari);
  const coperta = dorso || !carta;
  const nome = etichetta ?? (coperta ? t("cartaDorso") : nomeCarta(t, carta));
  const classi = [
    "cg-carta",
    `cg-${dimensione}`,
    coperta ? "cg-dorso" : `cg-${mazzoDi(carta)} cg-${carta.seme ?? "jolly"}`,
    selezionata ? "cg-sel" : "",
    evidenziata ? "cg-evid" : "",
    disabilitata ? "cg-spenta" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const fig = coperta ? null : tipoFigura(carta);
  const contenuto = (
    <>
      {coperta ? (
        <span className="cg-cornice" aria-hidden="true" />
      ) : carta.seme === null ? (
        <>
          <Stella className="cg-ind-seme" />
          <span className="cg-centro" aria-hidden="true">
            <Stella className="cg-stella" />
            <span className="cg-scritta">{t("jollyScritta")}</span>
          </span>
        </>
      ) : (
        <>
          <span className="cg-indice" aria-hidden="true">
            <span className={indice(t, carta).length > 1 ? "cg-val cg-val-2" : "cg-val"}>{indice(t, carta)}</span>
            <SimboloSeme seme={carta.seme} className="cg-ind-seme" />
          </span>
          <span className="cg-centro" aria-hidden="true">
            {fig !== null ? (
              <>
                <Figura tipo={fig} className="cg-figura" />
                <SimboloSeme seme={carta.seme} className="cg-seme-fig" />
              </>
            ) : haPips(carta) ? (
              <Pips seme={carta.seme} valore={carta.valore} francese={mazzoDi(carta) === "francese"} className="cg-pips" />
            ) : (
              <SimboloSeme seme={carta.seme} className="cg-seme-asso" />
            )}
          </span>
        </>
      )}
      {selezionata && <Spunta className="cg-spunta" />}
    </>
  );

  if (!onClick) {
    return (
      <span className={classi} role="img" aria-label={selezionata ? t("cartaSelezionata", { carta: nome }) : nome}>
        {contenuto}
      </span>
    );
  }
  return (
    <button type="button" className={classi} aria-label={nome} aria-pressed={selezionata} disabled={disabilitata} onClick={onClick}>
      {contenuto}
    </button>
  );
}
