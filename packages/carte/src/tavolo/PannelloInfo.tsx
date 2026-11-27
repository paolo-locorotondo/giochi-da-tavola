import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Info } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import "./tavolo.css";

export interface PropsBottoneInfo {
  /** Nome parlato del pulsante («Dettagli: Scarti»). */
  titolo: string;
  /** Il riquadro è aperto (per `aria-expanded`). */
  aperto: boolean;
  onTocca: () => void;
}

/** Solo il pulsante «i» (44 px): il riquadro lo apre il gioco con `RiquadroDettaglio`, così ha la X e le misure degli altri. */
export function BottoneInfo({ titolo, aperto, onTocca }: PropsBottoneInfo) {
  const t = usaT(dizionari);
  return (
    <div className="cg-info">
      <button type="button" className="cg-info-btn" aria-expanded={aperto} aria-label={t("infoApri", { titolo })} onClick={onTocca}>
        <Info size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

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
  const radice = useRef<HTMLDivElement>(null);
  const [misura, setMisura] = useState<CSSProperties>({});
  // Il riquadro sale sopra il pulsante ma si allinea ai bordi del tavolo (o dello schermo), così non esce a lato.
  useLayoutEffect(() => {
    if (!aperto || !radice.current) return;
    const mio = radice.current.getBoundingClientRect();
    const tavolo = radice.current.closest(".cg-tavolo")?.getBoundingClientRect();
    const sinistra = Math.max(tavolo?.left ?? 0, 8);
    const destra = Math.min(tavolo?.right ?? window.innerWidth, window.innerWidth - 8);
    const larghezza = Math.min(destra - sinistra - 12, 20 * 16);
    setMisura({ ["--cg-info-x" as string]: `${sinistra + 6 - mio.left}px`, ["--cg-info-w" as string]: `${larghezza}px` });
  }, [aperto]);
  return (
    <div className="cg-info" ref={radice}>
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
        <div id={id} className="cg-info-riquadro" role="region" aria-label={titolo} style={misura}>
          <h4 className="cg-info-titolo">{titolo}</h4>
          {children}
        </div>
      )}
    </div>
  );
}
