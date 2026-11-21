import { useEffect, useRef, useState } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import type { Colore, ConfigColore, RisultatoColore } from "../../minigiochi/colore";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviColore: Descrivi<RisultatoColore> = (r, t) => {
  if ("nessuno" in r) return t("valNessuno");
  return r.giusto ? t("valMs", { ms: r.ms }) : t("valSbagliato");
};

export function ColoreVista({ config, inizio, onRisultato }: VistaProps<ConfigColore, RisultatoColore>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [mostrata, setMostrata] = useState(false);
  const [esito, setEsito] = useState<RisultatoColore | null>(null);
  /** Il tasto toccato, per il bordo verde o rosso. */
  const [toccato, setToccato] = useState<{ colore: Colore; giusto: boolean } | null>(null);
  const èVisibile = useRef(false);
  const tVisibile = useRef<number | null>(null);

  useEffect(() => {
    const attesa = Math.max(0, config.attesaMs - (performance.now() - inizio));
    const id = window.setTimeout(() => {
      èVisibile.current = true;
      tVisibile.current = performance.now();
      setMostrata(true);
    }, attesa);
    return () => window.clearTimeout(id);
  }, [config, inizio]);

  // Il tempo parte dal fotogramma in cui la parola è stata disegnata.
  useEffect(() => {
    if (!mostrata) return;
    const f = requestAnimationFrame(() => {
      tVisibile.current = performance.now();
    });
    return () => cancelAnimationFrame(f);
  }, [mostrata]);

  const tocca = (scelto: Colore, istante: number) => {
    if (esito) return;
    // Prima che la parola compaia ogni tocco è sbagliato.
    const r: RisultatoColore = èVisibile.current
      ? { giusto: scelto === config.inchiostro, ms: Math.max(0, Math.round(istante - (tVisibile.current ?? istante))) }
      : { giusto: false, ms: 0 };
    setEsito(r);
    setToccato({ colore: scelto, giusto: r.giusto });
    rif.current(r);
  };

  return (
    <div className="dl-zona dl-colore">
      <p className="dl-colore-parola-riga" aria-live="off">
        {esito ? (
          <span className="dl-colore-msg">{esito.giusto ? t("valMs", { ms: esito.ms }) : t("sbagliato")}</span>
        ) : mostrata ? (
          <span className={`dl-colore-parola dl-c-${config.inchiostro}`} data-inchiostro={config.inchiostro}>
            {t(`c_${config.parola}`)}
          </span>
        ) : (
          <span className="dl-colore-msg">{t("aspetta")}</span>
        )}
      </p>
      <p className="suggerimento dl-colore-domanda">{t("coloreDomanda")}</p>
      <div className="dl-colore-tasti">
        {config.colori.map((c) => (
          <button
            key={c}
            type="button"
            className="btn dl-colore-tasto"
            data-suono="no"
            data-colore={c}
            aria-disabled={esito !== null}
            onPointerDown={(e) => tocca(c, e.timeStamp)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                e.preventDefault();
                tocca(c, e.timeStamp);
              }
            }}
          >
            <span className={`dl-campione dl-sfondo-${c}`} aria-hidden="true" />
            {t(`c_${c}`)}
            {toccato?.colore === c && <span className={`dl-effetto dl-effetto--${toccato.giusto ? "colpito" : "vuoto"}`} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
