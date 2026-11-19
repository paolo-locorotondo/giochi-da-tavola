import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import type { ConfigNomi, RisultatoNomi } from "../../minigiochi/nomi";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviNomi: Descrivi<RisultatoNomi> = (r, t) => {
  if ("ms" in r) return t("valMs", { ms: r.ms });
  if ("anticipo" in r) return t("valAnticipo");
  return t("valNessuno");
};

export function NomiVista({ config, inizio, onRisultato }: VistaProps<ConfigNomi, RisultatoNomi>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [passo, setPasso] = useState(0);
  const [esito, setEsito] = useState<RisultatoNomi | null>(null);
  const ultimo = config.parole.length - 1;
  const èGiusta = useRef(false);
  const tGiusta = useRef<number | null>(null);

  useEffect(() => {
    const ora = performance.now() - inizio;
    const ids = config.parole.map((_, i) =>
      window.setTimeout(() => {
        if (i === ultimo) {
          èGiusta.current = true;
          tGiusta.current = performance.now();
        }
        setPasso(i);
      }, Math.max(0, i * config.passoMs - ora)),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [config, inizio, ultimo]);

  // Il tempo parte dal fotogramma in cui la parola giusta è stata disegnata.
  useEffect(() => {
    if (passo !== ultimo) return;
    const f = requestAnimationFrame(() => {
      tGiusta.current = performance.now();
    });
    return () => cancelAnimationFrame(f);
  }, [passo, ultimo]);

  const tocca = (istante: number) => {
    if (esito) return;
    const r: RisultatoNomi = èGiusta.current
      ? { ms: Math.max(0, Math.round(istante - (tGiusta.current ?? istante))) }
      : { anticipo: true };
    setEsito(r);
    rif.current(r);
  };

  const tasto = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      e.preventDefault();
      tocca(e.timeStamp);
    }
  };

  const p = config.parole[passo];

  return (
    <button type="button" className="dl-zona dl-nomi" data-suono="no" onPointerDown={(e) => tocca(e.timeStamp)} onKeyDown={tasto}>
      {esito ? (
        <span className="dl-colore-msg">{"anticipo" in esito ? t("troppoPresto") : t("valMs", { ms: esito.ms })}</span>
      ) : p ? (
        <span
          className={`dl-colore-parola dl-c-${p.inchiostro}`}
          data-parola={p.parola}
          data-inchiostro={p.inchiostro}
          data-giusta={passo === ultimo ? "true" : undefined}
        >
          {t(`c_${p.parola}`)}
        </span>
      ) : null}
      <span className="suggerimento">{t("nomiDomanda")}</span>
    </button>
  );
}
