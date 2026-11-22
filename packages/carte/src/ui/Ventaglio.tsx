import { Fragment, type CSSProperties, type HTMLAttributes, type Key, type ReactNode, type Ref } from "react";
import type { RigaMano } from "../impagina";
import "./ventaglio.css";

export interface PropsVentaglio<C, K> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Le righe già impaginate (`impaginaMano`). */
  righe: readonly RigaMano<C, K>[];
  /** Disegna una carta (un pulsante o un'immagine). */
  carta: (carta: C) => ReactNode;
  /** Chiave React stabile della carta (di solito l'id). */
  chiaveCarta: (carta: C) => Key;
  /** Riferimento al contenitore (es. per scorrere fino a una carta). */
  rif?: Ref<HTMLDivElement>;
}

/**
 * Mano a ventaglio: righe di carte sovrapposte, divise in gruppi (`.cg-ventaglio` > `.cg-riga` > `.cg-blocco`).
 * Ordine DOM = ordine visivo = ordine di tab. Le misure (carta, stacco, parte visibile, passo) sono custom
 * property: vedi `ventaglio.css`. Senza logica di gioco: chi lo usa decide cosa disegnare e cosa si tocca.
 */
export function Ventaglio<C, K>({ righe, carta, chiaveCarta, rif, className, ...resto }: PropsVentaglio<C, K>) {
  return (
    <div {...resto} ref={rif} className={className ? `cg-ventaglio ${className}` : "cg-ventaglio"}>
      {righe.map((riga, r) => (
        <div key={r} className="cg-riga" style={{ "--cg-k": Math.max(riga.n - 1, 1), "--cg-g": riga.gruppi.length } as CSSProperties}>
          {riga.gruppi.map((g, i) => (
            <div key={`${String(g.chiave)}-${i}`} className="cg-blocco">
              {g.carte.map((c) => (
                <Fragment key={chiaveCarta(c)}>{carta(c)}</Fragment>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
