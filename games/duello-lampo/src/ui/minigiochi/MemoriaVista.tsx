import { useEffect, useRef, useState } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import {
  ACCESA_MS,
  ATTESA_INIZIALE_MS,
  CASELLE,
  PAUSA_MS,
  fineDimostrazione,
  type ConfigMemoria,
  type RisultatoMemoria,
} from "../../minigiochi/memoria";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviMemoria: Descrivi<RisultatoMemoria> = (r, t) => {
  if ("nessuno" in r) return t("valNessuno");
  return r.giusta ? t("valMs", { ms: r.ms }) : t("valSbagliato");
};

export function MemoriaVista({ config, inizio, onRisultato }: VistaProps<ConfigMemoria, RisultatoMemoria>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [acceso, setAcceso] = useState<number | null>(null);
  const [pronto, setPronto] = useState(false);
  const [fatte, setFatte] = useState(0);
  const [esito, setEsito] = useState<RisultatoMemoria | null>(null);
  const prontoRif = useRef(false);
  const fatteRif = useRef(0);
  /** Il tempo zero di chi ripete: la fine della dimostrazione. */
  const base = inizio + fineDimostrazione(config);

  useEffect(() => {
    const ora = performance.now() - inizio;
    const ids: number[] = [];
    config.sequenza.forEach((casella, i) => {
      const da = ATTESA_INIZIALE_MS + i * (ACCESA_MS + PAUSA_MS);
      ids.push(window.setTimeout(() => setAcceso(casella), Math.max(0, da - ora)));
      ids.push(window.setTimeout(() => setAcceso(null), Math.max(0, da + ACCESA_MS - ora)));
    });
    ids.push(
      window.setTimeout(() => {
        prontoRif.current = true;
        setPronto(true);
      }, Math.max(0, fineDimostrazione(config) - ora)),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [config, inizio]);

  const tocca = (casella: number, istante: number) => {
    // Durante la dimostrazione e dopo la fine i tocchi non contano.
    if (esito || !prontoRif.current) return;
    const ms = Math.max(0, Math.round(istante - base));
    if (casella !== config.sequenza[fatteRif.current]) {
      const r: RisultatoMemoria = { giusta: false, ms };
      setEsito(r);
      rif.current(r);
      return;
    }
    fatteRif.current += 1;
    setFatte(fatteRif.current);
    if (fatteRif.current === config.sequenza.length) {
      const r: RisultatoMemoria = { giusta: true, ms };
      setEsito(r);
      rif.current(r);
    }
  };

  const stato = esito
    ? esito.giusta
      ? t("completata")
      : t("sbagliato")
    : pronto
      ? t("ripeti", { fatte, tot: config.sequenza.length })
      : t("guarda");

  return (
    <div className="dl-zona dl-memoria">
      <div className="dl-memoria-griglia" data-sequenza={config.sequenza.join(",")}>
        {Array.from({ length: CASELLE }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`dl-memoria-casella${acceso === i ? " dl-memoria-casella--accesa" : ""}`}
            data-suono="no"
            data-casella={i}
            aria-label={t("casellaN", { n: i + 1 })}
            aria-disabled={!pronto || esito !== null}
            onPointerDown={(e) => tocca(i, e.timeStamp)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                e.preventDefault();
                tocca(i, e.timeStamp);
              }
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <p className="dl-memoria-stato" role="status">
        {stato}
      </p>
    </div>
  );
}
