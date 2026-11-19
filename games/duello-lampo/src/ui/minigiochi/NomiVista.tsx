import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import type { ConfigNomi, RisultatoNomi } from "../../minigiochi/nomi";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviNomi: Descrivi<RisultatoNomi> = (r, t) => {
  if ("ms" in r) return t("valMs", { ms: r.ms });
  if ("sbagliato" in r) return t("valSbagliato");
  return t("valNessuno");
};

export function NomiVista({ config, inizio, onRisultato }: VistaProps<ConfigNomi, RisultatoNomi>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [passo, setPasso] = useState(0);
  const [esito, setEsito] = useState<RisultatoNomi | null>(null);
  const giusta = config.indiceGiusta;
  // La parola sullo schermo adesso (il ref è sempre aggiornato, lo stato può essere un attimo indietro).
  const corrente = useRef(0);
  const tGiusta = useRef<number | null>(null);

  // Le parole passano tutte, anche dopo quella giusta: se si fermassero, il fermo direbbe di toccare.
  useEffect(() => {
    const ora = performance.now() - inizio;
    const ids = config.parole.map((_, i) =>
      window.setTimeout(() => {
        corrente.current = i;
        if (i === giusta) tGiusta.current = performance.now();
        setPasso(i);
      }, Math.max(0, i * config.passoMs - ora)),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [config, inizio, giusta]);

  // Il tempo parte dal fotogramma in cui la parola giusta è stata disegnata.
  useEffect(() => {
    if (passo !== giusta) return;
    const f = requestAnimationFrame(() => {
      tGiusta.current = performance.now();
    });
    return () => cancelAnimationFrame(f);
  }, [passo, giusta]);

  const tocca = (istante: number) => {
    if (esito) return;
    // Giusto solo mentre la parola che combacia è sullo schermo; prima o dopo è un errore.
    const r: RisultatoNomi =
      corrente.current === giusta
        ? { ms: Math.max(0, Math.round(istante - (tGiusta.current ?? istante))) }
        : { sbagliato: true };
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
        <span className="dl-colore-msg">{"sbagliato" in esito ? t("sbagliato") : t("valMs", { ms: esito.ms })}</span>
      ) : p ? (
        <span
          className={`dl-colore-parola dl-c-${p.inchiostro}`}
          data-parola={p.parola}
          data-inchiostro={p.inchiostro}
          data-giusta={passo === giusta ? "true" : undefined}
        >
          {t(`c_${p.parola}`)}
        </span>
      ) : null}
      <span className="suggerimento">{t("nomiDomanda")}</span>
    </button>
  );
}
