import { useEffect, type CSSProperties } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { suonoNinnaNanna } from "../suoni";

/**
 * Schermata che copre il passaggio tra un ruolo e l'altro e tra notte e giorno.
 * È sempre identica (testo, durata, aspetto), qualunque sia la schermata che segue:
 * chi riapre gli occhi troppo presto non ricava nulla.
 */
export function Transizione({
  secondi,
  giorno = false,
  ninnaNanna = false,
  onFine,
  onSalta,
}: {
  secondi: number;
  /** Alba: sole e «Il villaggio si risveglia» al posto di luna e «Occhi chiusi». */
  giorno?: boolean;
  /** Suona la ninna nanna (solo per «Occhi chiusi»). */
  ninnaNanna?: boolean;
  onFine: () => void;
  /** Solo se il narratore non gioca: gli permette di andare avanti prima della fine. */
  onSalta?: () => void;
}) {
  const t = usaT(dizionari);
  // La voce del narratore non parla durante la transizione: parte da sola quando questa finisce.
  useEffect(() => {
    const timer = setTimeout(onFine, secondi * 1000);
    return () => clearTimeout(timer);
  }, [secondi, onFine]);

  // La ninna nanna accompagna «Occhi chiusi» e si interrompe quando la schermata finisce.
  useEffect(() => {
    if (giorno || !ninnaNanna) return;
    const fine = new AbortController();
    void suonoNinnaNanna(fine.signal);
    return () => fine.abort();
  }, [giorno, ninnaNanna]);

  return (
    <section className="schermata transizione" aria-live="polite">
      <span className={giorno ? "transizione-sole" : "transizione-luna"} aria-hidden="true" />
      {giorno ? (
        <>
          <h2>{t("trAlba")}</h2>
          <p>{t("trApriGliOcchi")}</p>
          <p className="muted">{t("trRaccontare")}</p>
        </>
      ) : (
        <>
          <h2>{t("trOcchiChiusi")}</h2>
          <p>{t("trLasciaTelefono")}</p>
          <p className="muted">{t("trProssimo")}</p>
        </>
      )}
      <div className="transizione-barra" aria-hidden="true">
        <span style={{ "--durata": `${secondi}s` } as CSSProperties} />
      </div>
      {onSalta && (
        <button type="button" className="btn" onClick={onSalta}>
          {t("trSalta")}
        </button>
      )}
    </section>
  );
}
