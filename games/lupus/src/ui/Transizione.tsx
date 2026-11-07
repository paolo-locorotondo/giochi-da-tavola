import { useEffect, type CSSProperties } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { staParlando } from "./voce";

/** Dopo la durata si aspetta ancora che il narratore finisca la frase, ma non oltre questi secondi. */
const ATTESA_VOCE_MAX = 20;

/**
 * Schermata che copre il passaggio tra un ruolo e l'altro e tra notte e giorno.
 * È sempre identica (testo, durata, aspetto), qualunque sia la schermata che segue:
 * chi riapre gli occhi troppo presto non ricava nulla.
 */
export function Transizione({
  secondi,
  giorno = false,
  onFine,
}: {
  secondi: number;
  /** Alba: sole e «Il villaggio si risveglia» al posto di luna e «Occhi chiusi». */
  giorno?: boolean;
  onFine: () => void;
}) {
  const t = usaT(dizionari);
  useEffect(() => {
    let intervallo: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      const limite = Date.now() + ATTESA_VOCE_MAX * 1000;
      const prova = () => {
        if (staParlando() && Date.now() < limite) return;
        clearInterval(intervallo);
        onFine();
      };
      intervallo = setInterval(prova, 250);
      prova();
    }, secondi * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(intervallo);
    };
  }, [secondi, onFine]);

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
    </section>
  );
}
