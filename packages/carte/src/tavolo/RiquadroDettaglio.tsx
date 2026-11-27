import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import "./tavolo.css";

export interface PropsRiquadroDettaglio {
  /** Titolo del riquadro (es. «Scala di picche»). */
  titolo: string;
  /** Chiude il riquadro (pulsante X ed Esc). */
  onChiudi: () => void;
  children: ReactNode;
}

/**
 * Riquadro di dettaglio aperto dal gioco (es. toccando una combinazione sul tavolo). Va messo tra i figli di
 * `TavoloCarte`: si apre sopra la parte bassa del tavolo, largo come il tavolo, così non esce dallo schermo.
 * All'apertura il fuoco va sul riquadro; si chiude con la X o con Esc.
 */
export function RiquadroDettaglio({ titolo, onChiudi, children }: PropsRiquadroDettaglio) {
  const t = usaT(dizionari);
  const rif = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rif.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onChiudi]);
  return (
    <div ref={rif} className="cg-dettaglio" role="region" aria-label={titolo} tabIndex={-1}>
      <div className="cg-dettaglio-testa">
        <h4 className="cg-info-titolo">{titolo}</h4>
        <button type="button" className="cg-dettaglio-chiudi" aria-label={t("dettaglioChiudi")} onClick={onChiudi}>
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  );
}
