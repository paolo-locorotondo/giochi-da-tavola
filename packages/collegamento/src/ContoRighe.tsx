import { CircleAlert } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "./locales";
import "./campo-testo.css";

interface Props {
  /** Id del contatore, da mettere nell'`aria-describedby` dell'area di testo. */
  id: string;
  /** Righe (nomi) già scritte. */
  n: number;
  /** Massimo di righe consentite. */
  massimo: number;
  /** Il massimo è raggiunto: compare il messaggio con l'icona. */
  pieno: boolean;
  /** Testo del messaggio («Al massimo 24 giocatori»): lo scrive il gioco, nel suo locale. */
  testo: string;
}

/**
 * Contatore «n/massimo» sotto un'area di testo «uno per riga» (giocatori), con il messaggio d'errore quando
 * le righe sono al massimo. Il bordo rosso lo mette la classe `campo-pieno` sull'area di testo.
 */
export function ContoRighe({ id, n, massimo, pieno, testo }: Props) {
  const t = usaT(dizionari);
  return (
    <div className="ct-sotto" id={id}>
      <span className="ct-errore" role="status">
        {pieno && (
          <>
            <CircleAlert size={16} aria-hidden="true" />
            {testo}
          </>
        )}
      </span>
      <span className="ct-conto" aria-label={t("righeConto", { n, max: massimo })}>
        {n}/{massimo}
      </span>
    </div>
  );
}
