import { useId, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import "./tavolo.css";

export interface PropsPannelloInfo {
  /** Titolo del riquadro, letto anche come nome del pulsante (es. «Scarti»). */
  titolo: string;
  /** Il contenuto del riquadro. */
  children: ReactNode;
}

/**
 * Il pulsante «i»: apre un riquadro con dettagli (la pila degli scarti, il testo d'aiuto). Bersaglio da 44 px,
 * `aria-expanded` e `aria-controls`; il riquadro si chiude con lo stesso pulsante. Il pulsante sta sul tavolo, quindi
 * usa i colori del feltro; il riquadro, sulla scheda dell'app.
 */
export function PannelloInfo({ titolo, children }: PropsPannelloInfo) {
  const t = usaT(dizionari);
  const [aperto, setAperto] = useState(false);
  const id = useId();
  return (
    <div className="cg-info">
      <button
        type="button"
        className="cg-info-btn"
        aria-expanded={aperto}
        aria-controls={id}
        aria-label={t("infoApri", { titolo })}
        onClick={() => setAperto((a) => !a)}
      >
        <Info size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      {aperto && (
        <div id={id} className="cg-info-riquadro" role="region" aria-label={titolo}>
          <h4 className="cg-info-titolo">{titolo}</h4>
          {children}
        </div>
      )}
    </div>
  );
}
