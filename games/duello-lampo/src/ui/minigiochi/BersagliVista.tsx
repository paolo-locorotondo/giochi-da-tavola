import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Target } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import { suonoGiusto, suonoSbagliato } from "../../suoni";
import { valutaTocco, type ConfigBersagli, type RisultatoBersagli } from "../../minigiochi/bersagli";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviBersagli: Descrivi<RisultatoBersagli> = (r, t) => {
  if ("nessuno" in r) return t("valNessuno");
  const colpiti = t("valColpiti", { n: r.colpiti });
  return r.vuoti > 0 ? `${colpiti} · ${t("valVuoti", { n: r.vuoti })}` : colpiti;
};

/** Quanto resta scritto «Colpito!» o «A vuoto». */
const LAMPO_MS = 400;

export function BersagliVista({ config, inizio, onRisultato }: VistaProps<ConfigBersagli, RisultatoBersagli>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const secondi = Math.ceil(config.durataMs / 1000);
  /** Indici dei bersagli accesi in questo momento e non ancora colpiti da questo giocatore. */
  const [vivi, setVivi] = useState<ReadonlySet<number>>(() => new Set());
  const [colpiti, setColpiti] = useState(0);
  const [restano, setRestano] = useState(secondi);
  const [lampo, setLampo] = useState<{ n: number; cella: number; tipo: "colpito" | "vuoto" } | null>(null);
  const [finito, setFinito] = useState(false);

  const colpitiRif = useRef(new Set<number>());
  const somma = useRef(0);
  const vuoti = useRef(0);
  const chiuso = useRef(false);
  const contaLampi = useRef(0);

  useEffect(() => {
    const ora = performance.now() - inizio;
    const ids: number[] = [];
    const dopo = (ms: number, f: () => void) => ids.push(window.setTimeout(f, Math.max(0, ms - ora)));
    const togli = (i: number) =>
      setVivi((v) => {
        if (!v.has(i)) return v;
        const n = new Set(v);
        n.delete(i);
        return n;
      });
    config.bersagli.forEach((b, i) => {
      dopo(b.comparsaMs, () => {
        if (!colpitiRif.current.has(i)) setVivi((v) => new Set(v).add(i));
      });
      dopo(b.scadeMs, () => togli(i));
    });
    for (let s = 1; s < secondi; s++) dopo(s * 1000, () => setRestano(secondi - s));
    dopo(config.durataMs, () => {
      if (chiuso.current) return;
      chiuso.current = true;
      setFinito(true);
      setVivi(new Set());
      setRestano(0);
      rif.current({ colpiti: colpitiRif.current.size, sommaMs: somma.current, vuoti: vuoti.current });
    });
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [config, inizio, secondi]);

  // «Colpito!» / «A vuoto» spariscono da soli.
  useEffect(() => {
    if (!lampo) return;
    const id = window.setTimeout(() => setLampo(null), LAMPO_MS);
    return () => window.clearTimeout(id);
  }, [lampo]);

  const tocca = (cella: number, istante: number) => {
    if (chiuso.current) return;
    const esito = valutaTocco(config, istante - inizio, cella, colpitiRif.current);
    if (esito.tipo === "ignorato") return;
    contaLampi.current += 1;
    if (esito.tipo === "colpito") {
      colpitiRif.current.add(esito.indice);
      somma.current += esito.ms;
      setColpiti(colpitiRif.current.size);
      setVivi((v) => {
        const n = new Set(v);
        n.delete(esito.indice);
        return n;
      });
      // Ogni metà suona per il proprio colpo: sono tocchi diversi, non si raddoppiano.
      suonoGiusto();
      setLampo({ n: contaLampi.current, cella, tipo: "colpito" });
    } else {
      vuoti.current += 1;
      suonoSbagliato();
      setLampo({ n: contaLampi.current, cella, tipo: "vuoto" });
    }
  };

  const viviPerCella = new Map<number, number>();
  vivi.forEach((i) => {
    const b = config.bersagli[i];
    if (b) viviPerCella.set(b.cella, i);
  });
  const stato = finito ? t("fermato") : lampo ? (lampo.tipo === "colpito" ? t("colpito") : t("aVuoto")) : t("colpitiN", { n: colpiti });

  return (
    <>
      {/* Sopra il riquadro: così non copre mai i bersagli */}
      <div className="dl-bersagli-info">
        <p className="dl-bersagli-stato" role="status">
          {stato}
        </p>
        <span className="dl-bersagli-tempo" aria-hidden="true">
          {t("secondiRimasti", { s: restano })}
        </span>
        <span className="dl-bersagli-barra" aria-hidden="true">
          <span className="dl-bersagli-barra-pieno" style={{ "--dl-durata": `${config.durataMs}ms` } as CSSProperties} />
        </span>
      </div>
      <div className="dl-zona dl-bersagli">
        <div className="dl-bersagli-griglia" style={{ "--dl-lato": config.lato } as CSSProperties}>
          {Array.from({ length: config.lato * config.lato }, (_, cella) => {
            const indice = viviPerCella.get(cella);
            return (
              <div key={cella} className="dl-bersagli-cella" data-cella={cella} onPointerDown={(e) => tocca(cella, e.timeStamp)}>
                {indice !== undefined && (
                  <button
                    type="button"
                    className="dl-bersaglio"
                    data-suono="no"
                    data-bersaglio={indice}
                    aria-label={t("bersaglioN", { n: indice + 1 })}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                        e.preventDefault();
                        tocca(cella, e.timeStamp);
                      }
                    }}
                  >
                    <Target className="dl-bersaglio-icona" strokeWidth={2.25} aria-hidden="true" focusable="false" />
                  </button>
                )}
                {lampo?.cella === cella && <span key={lampo.n} className={`dl-effetto dl-effetto--${lampo.tipo}`} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
