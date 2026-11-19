import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import type { ConfigRaffica, RisultatoRaffica } from "../../minigiochi/raffica";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviRaffica: Descrivi<RisultatoRaffica> = (r, t) =>
  t("valTocchi", { n: "tocchi" in r ? r.tocchi : 0 });

export function RafficaVista({ config, inizio, onRisultato }: VistaProps<ConfigRaffica, RisultatoRaffica>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [tocchi, setTocchi] = useState(0);
  const [restano, setRestano] = useState(config.durataMs);
  const conta = useRef(0);
  const finito = useRef(false);

  useEffect(() => {
    const fine = inizio + config.durataMs;
    const id = window.setInterval(() => {
      const r = Math.max(0, fine - performance.now());
      setRestano(r);
      if (r <= 0 && !finito.current) {
        finito.current = true;
        window.clearInterval(id);
        rif.current({ tocchi: conta.current });
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [config, inizio]);

  const tocca = () => {
    if (finito.current) return;
    conta.current += 1;
    setTocchi(conta.current);
  };

  const tasto = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      e.preventDefault();
      tocca();
    }
  };

  const secondi = Math.ceil(restano / 1000);
  const finita = restano <= 0;

  return (
    <button
      type="button"
      className={`dl-zona dl-raffica${finita ? " dl-raffica--fine" : ""}`}
      data-suono="no"
      onPointerDown={tocca}
      onKeyDown={tasto}
    >
      <span className="dl-raffica-numero" aria-live="off">
        {tocchi}
      </span>
      <span className="dl-raffica-info">{finita ? t("fermato") : `${t("inizioRaffica")} · ${t("secondiRimasti", { s: secondi })}`}</span>
    </button>
  );
}
