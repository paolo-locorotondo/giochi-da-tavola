import type { ReactNode } from "react";
import "./tavolo.css";

export type VarianteAzione = "primaria" | "secondaria" | "pericolo" | "online";

export interface AzioneTavolo {
  id: string;
  etichetta: string;
  /** Icona opzionale a sinistra (decorativa: il testo la spiega). */
  icona?: ReactNode;
  variante?: VarianteAzione;
  onTocca: () => void;
  disabilitata?: boolean;
  /** Di base il primario occupa tutta la riga; con `false` sta accanto agli altri (es. «Annulla» e «Conferma»). */
  larga?: boolean;
  /** Nome parlato, se diverso dal testo visibile (es. «Scarta sette di cuori» per «Scarta»). */
  nomeAria?: string;
  /** Id di un testo che spiega l'azione (`aria-describedby`). */
  descrittaDa?: string;
}

export interface PropsBarraAzioni {
  azioni: readonly AzioneTavolo[];
  /** Nome del gruppo, letto dai lettori di schermo (es. «Azioni»). */
  etichetta?: string;
}

/**
 * Le azioni del gioco in griglia (stesso schema dei pulsanti dell'app: `repeat(auto-fit, minmax(9.5rem, 1fr))`).
 * «Sollecita» e «Simula mossa col bot» sono azioni come le altre: le passa il gioco. Un solo primario per schermata:
 * il primario occupa tutta la riga.
 */
export function BarraAzioni({ azioni, etichetta }: PropsBarraAzioni) {
  if (azioni.length === 0) return null;
  return (
    <div className="cg-azioni" role="group" aria-label={etichetta}>
      {azioni.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`cg-azione cg-azione-${a.variante ?? "secondaria"}${a.larga === false ? " cg-azione-affiancata" : ""}`}
          disabled={a.disabilitata}
          aria-label={a.nomeAria}
          aria-describedby={a.descrittaDa}
          onClick={a.onTocca}
        >
          {a.icona && (
            <span className="cg-azione-icona" aria-hidden="true">
              {a.icona}
            </span>
          )}
          {a.etichetta}
        </button>
      ))}
    </div>
  );
}
