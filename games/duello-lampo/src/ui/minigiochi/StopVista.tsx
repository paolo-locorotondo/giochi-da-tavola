import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import { distanzaDalCentro, posizione, type ConfigStop, type RisultatoStop } from "../../minigiochi/stop";
import type { Descrivi, VistaProps } from "./tipi";

/** Scarto in percentuale della metà della barra: 0 % = al centro, 100 % = al bordo. */
export const scartoPercento = (distanza: number): number => Math.round(distanza * 200);

export const descriviStop: Descrivi<RisultatoStop> = (r, t) =>
  "distanza" in r ? t("valScarto", { p: scartoPercento(r.distanza) }) : t("valNessuno");

export function StopVista({ config, inizio, onRisultato }: VistaProps<ConfigStop, RisultatoStop>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const pista = useRef<HTMLSpanElement>(null);
  const marcatore = useRef<HTMLSpanElement>(null);
  const [fermo, setFermo] = useState<number | null>(null);

  /** Sposta il marcatore (solo `transform`) nella posizione `p`, da 0 a 1. */
  const metti = (p: number) => {
    const el = marcatore.current;
    const barra = pista.current;
    if (!el || !barra) return;
    el.style.transform = `translateX(${p * (barra.clientWidth - el.offsetWidth)}px)`;
  };

  useEffect(() => {
    if (fermo !== null) return;
    let id = 0;
    const fotogramma = () => {
      metti(posizione(config, performance.now() - inizio));
      id = requestAnimationFrame(fotogramma);
    };
    fotogramma();
    return () => cancelAnimationFrame(id);
  }, [config, inizio, fermo]);

  const tocca = (istante: number) => {
    if (fermo !== null) return;
    const p = posizione(config, istante - inizio);
    const distanza = distanzaDalCentro(p);
    metti(p);
    setFermo(distanza);
    rif.current({ distanza });
  };

  const tasto = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      e.preventDefault();
      tocca(e.timeStamp);
    }
  };

  return (
    <button
      type="button"
      className="dl-zona dl-stop"
      data-suono="no"
      onPointerDown={(e) => tocca(e.timeStamp)}
      onKeyDown={tasto}
    >
      <span className="dl-pista" ref={pista} aria-hidden="true">
        <span className="dl-centro" />
        <span className="dl-marcatore" ref={marcatore} />
      </span>
      <span className="dl-stop-testo">
        {fermo === null ? t("inizioRaffica") : `${t("fermato")} ${t("valScarto", { p: scartoPercento(fermo) })}`}
      </span>
    </button>
  );
}
