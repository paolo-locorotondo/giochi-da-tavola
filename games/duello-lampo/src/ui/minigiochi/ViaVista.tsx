import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import type { ConfigVia, RisultatoVia } from "../../minigiochi/via";
import { suonoVia } from "../../suoni";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviVia: Descrivi<RisultatoVia> = (r, t) => {
  if ("ms" in r) return t("valMs", { ms: r.ms });
  if ("anticipo" in r) return t("valAnticipo");
  return t("valNessuno");
};

export function ViaVista({ config, inizio, principale, onRisultato }: VistaProps<ConfigVia, RisultatoVia>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [verde, setVerde] = useState(false);
  const [esito, setEsito] = useState<RisultatoVia | null>(null);
  // Il verde si sa con certezza solo dal ref: lo stato di React può essere un attimo indietro.
  const èVerde = useRef(false);
  const tVerde = useRef<number | null>(null);

  useEffect(() => {
    const attesa = Math.max(0, config.attesaMs - (performance.now() - inizio));
    const id = window.setTimeout(() => {
      èVerde.current = true;
      tVerde.current = performance.now();
      setVerde(true);
    }, attesa);
    return () => window.clearTimeout(id);
  }, [config, inizio]);

  // Il tempo parte dal fotogramma in cui il verde è stato disegnato, non da quando lo abbiamo ordinato.
  useEffect(() => {
    if (!verde) return;
    if (principale) suonoVia();
    const f = requestAnimationFrame(() => {
      tVerde.current = performance.now();
    });
    return () => cancelAnimationFrame(f);
  }, [verde, principale]);

  const tocca = (istante: number) => {
    if (esito) return;
    const r: RisultatoVia = èVerde.current
      ? { ms: Math.max(0, Math.round(istante - (tVerde.current ?? istante))) }
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

  const stato = esito ? ("anticipo" in esito ? "anticipo" : "preso") : verde ? "ora" : "attesa";
  const testo =
    stato === "ora" ? t("ora") : stato === "anticipo" ? t("troppoPresto") : stato === "preso" ? t("valMs", { ms: (esito as { ms: number }).ms }) : t("aspetta");

  return (
    <button
      type="button"
      className={`dl-zona dl-via dl-via--${stato}`}
      data-suono="no"
      onPointerDown={(e) => tocca(e.timeStamp)}
      onKeyDown={tasto}
    >
      <span className="dl-via-testo">{testo}</span>
    </button>
  );
}
