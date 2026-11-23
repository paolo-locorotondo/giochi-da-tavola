import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import "./tavolo.css";

export interface PropsSegnapostoPosa {
  /** Chiamata al tocco: il gioco decide cosa vuol dire «posare qui». */
  onTocca: () => void;
  /** Testo del riquadro (base: «Posa qui»). */
  testo?: string;
  /** Non toccabile ora (es. la presa è obbligatoria): il gioco di norma lo nasconde, qui resta come ultima difesa. */
  disabilitato?: boolean;
}

/**
 * Il riquadro tratteggiato «Posa qui» da toccare sul tavolo. Visibile solo quando la posa è possibile: lo decide il gioco,
 * che non lo disegna altrimenti. Un pulsante vero, alto almeno 44 px.
 */
export function SegnapostoPosa({ onTocca, testo, disabilitato = false }: PropsSegnapostoPosa) {
  const t = usaT(dizionari);
  return (
    <button type="button" className="cg-segnaposto" onClick={onTocca} disabled={disabilitato}>
      {testo ?? t("segnapostoPosa")}
    </button>
  );
}
