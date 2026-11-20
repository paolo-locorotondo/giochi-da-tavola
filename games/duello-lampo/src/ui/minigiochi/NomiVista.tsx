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
  const giuste = config.giuste;
  const èGiusta = (i: number) => giuste.includes(i);
  // La parola sullo schermo adesso (il ref è sempre aggiornato, lo stato può essere un attimo indietro).
  const corrente = useRef(0);
  /** Quando è comparsa la parola sullo schermo adesso: serve se è una delle giuste. */
  const tComparsa = useRef<number | null>(null);

  // Le parole passano tutte, fino all'ultima: se si fermassero, il fermo direbbe di toccare.
  useEffect(() => {
    corrente.current = 0;
    tComparsa.current = performance.now();
    const ora = performance.now() - inizio;
    const ids = config.parole.map((_, i) =>
      window.setTimeout(() => {
        corrente.current = i;
        tComparsa.current = performance.now();
        setPasso(i);
      }, Math.max(0, i * config.passoMs - ora)),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [config, inizio]);

  // Il tempo parte dal fotogramma in cui la parola è stata disegnata.
  useEffect(() => {
    const f = requestAnimationFrame(() => {
      tComparsa.current = performance.now();
    });
    return () => cancelAnimationFrame(f);
  }, [passo]);

  const tocca = (istante: number) => {
    if (esito) return;
    // Giusto solo mentre sullo schermo c'è una parola che combacia; in ogni altro momento è un errore.
    const r: RisultatoNomi = èGiusta(corrente.current)
      ? { ms: Math.max(0, Math.round(istante - (tComparsa.current ?? istante))) }
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
          data-giusta={èGiusta(passo) ? "true" : undefined}
        >
          {t(`c_${p.parola}`)}
        </span>
      ) : null}
      <span className="suggerimento">{t("nomiDomanda")}</span>
    </button>
  );
}
