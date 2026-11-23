import { User } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import "./tavolo.css";

export interface PropsPostoGiocatore {
  /** Nome del giocatore (testo libero: va a capo, non si tronca). */
  nome: string;
  /** Numero di carte in mano (o coperte) del giocatore. */
  carte: number;
  /** È il turno di questo giocatore: si legge anche a parole, non solo dal colore. */
  diTurno?: boolean;
  /** Squadra, come testo (es. «Squadra 1»). Assente nei giochi senza squadre. */
  squadra?: string;
  /** Collegato alla partita (online). Assente nei giochi contro i bot o in locale. */
  collegato?: boolean;
  /** Punti, come testo già formattato (es. «Mano 3 di 6 · 11 punti»). */
  punti?: string;
}

/**
 * Il posto di un giocatore intorno al tavolo: omino, nome, carte, turno, squadra, collegamento.
 * Un solo testo leggibile per i lettori di schermo, così il posto si ascolta come una frase.
 * Non sa nulla delle regole: il gioco passa i dati già pronti.
 */
export function PostoGiocatore({ nome, carte, diTurno = false, squadra, collegato, punti }: PropsPostoGiocatore) {
  const t = usaT(dizionari);
  const classi = diTurno ? "cg-posto cg-posto-turno" : "cg-posto";
  const frase = [
    nome,
    squadra,
    t("postoCarte", { n: carte }),
    punti,
    diTurno ? t("postoDiTurno") : null,
    collegato === false ? t("postoNonCollegato") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={classi} role="group" aria-label={frase}>
      <span className="cg-posto-omino" aria-hidden="true">
        <User size={20} strokeWidth={2} />
      </span>
      <span className="cg-posto-nome">{nome}</span>
      <span className="cg-posto-riga">
        {squadra && <span className="cg-posto-squadra">{squadra}</span>}
        <span>{t("postoCarte", { n: carte })}</span>
      </span>
      {punti && <span className="cg-posto-riga">{punti}</span>}
      {diTurno && <span className="cg-posto-etichetta">{t("postoDiTurno")}</span>}
      {collegato === false && <span className="cg-posto-etichetta">{t("postoNonCollegato")}</span>}
    </div>
  );
}
