import { useEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType } from "react";
import { Bird, Cat, Dog, Fish, Frown, Panda, Rabbit, Rat, Smile, Snail, Squirrel, Turtle, type LucideIcon } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import { suonoGiusto, suonoSbagliato } from "../../suoni";
import { comparsa, grigliaAlPasso, type ConfigTrova, type RisultatoTrova } from "../../minigiochi/trova";
import type { Descrivi, VistaProps } from "./tipi";

/** I colori delle figure: token `--c-<nome>` del tema. */
const TINTE = ["rosso", "blu", "verde", "giallo", "viola"] as const;

/** L'icona di ogni figura dei mini giochi «trova» (i nomi stanno in `minigiochi/trova.ts`). */
const ICONE: Record<string, LucideIcon> = {
  gatto: Cat,
  cane: Dog,
  uccello: Bird,
  pesce: Fish,
  coniglio: Rabbit,
  topo: Rat,
  lumaca: Snail,
  scoiattolo: Squirrel,
  tartaruga: Turtle,
  panda: Panda,
  triste: Frown,
  felice: Smile,
};

export const descriviTrova: Descrivi<RisultatoTrova> = (r, t) => {
  if ("nessuno" in r) return t("valNessuno");
  return r.trovato ? t("valMs", { ms: r.ms }) : t("valSbagliato");
};

/** Crea la vista di un mini gioco «trova»; `attesa` è la chiave del testo mostrato prima del bersaglio. */
export function creaTrovaVista(attesa: "aspettaPanda" | "aspettaSmile"): ComponentType<VistaProps<ConfigTrova, RisultatoTrova>> {
  return function TrovaVista({ config, inizio, onRisultato }) {
    const t = usaT(dizionari);
    const rif = useRef(onRisultato);
    rif.current = onRisultato;

    const [passo, setPasso] = useState(0);
    const [esito, setEsito] = useState<RisultatoTrova | null>(null);
    /** La casella toccata e se era quella giusta: per il bordo verde o rosso. */
    const [toccata, setToccata] = useState<{ indice: number; giusta: boolean } | null>(null);
    // Passo 0 = griglia iniziale; passo n = dopo n cambi. Il bersaglio arriva al passo `indiceComparsa`,
    // ma i cambi continuano: se la griglia si fermasse, il fermo direbbe che il bersaglio è uscito.
    const comparsaAl = config.indiceComparsa;
    const griglie = useMemo(
      () => Array.from({ length: config.passi.length + 1 }, (_, n) => grigliaAlPasso(config, n)),
      [config],
    );
    const èComparso = useRef(false);
    const tComparso = useRef<number | null>(null);

    // A ogni passo cambiano alcune caselle, per tutto il round (anche dopo il proprio tocco).
    useEffect(() => {
      const ora = performance.now() - inizio;
      const ids = config.passi.map((_, k) => {
        const n = k + 1;
        return window.setTimeout(() => {
          if (n === comparsaAl) {
            èComparso.current = true;
            tComparso.current = performance.now();
          }
          setPasso(n);
        }, Math.max(0, n * config.passoMs - ora));
      });
      return () => ids.forEach((id) => window.clearTimeout(id));
    }, [config, inizio, comparsaAl]);

    // Il tempo parte dal fotogramma in cui il bersaglio è stato disegnato.
    useEffect(() => {
      if (passo !== comparsaAl) return;
      const f = requestAnimationFrame(() => {
        tComparso.current = performance.now();
      });
      return () => cancelAnimationFrame(f);
    }, [passo, comparsaAl]);

    const tocca = (indice: number, istante: number) => {
      if (esito) return;
      const r: RisultatoTrova = èComparso.current
        ? { trovato: indice === config.posizione, ms: Math.max(0, Math.round(istante - (tComparso.current ?? istante))) }
        : { trovato: false, ms: 0 };
      (r.trovato ? suonoGiusto : suonoSbagliato)();
      setEsito(r);
      setToccata({ indice, giusta: r.trovato });
      rif.current(r);
    };

    const comparso = passo >= comparsaAl;
    const stato = esito ? (esito.trovato ? t("trovato") : t("sbagliato")) : comparso ? "" : t(attesa);
    const griglia = griglie[passo] ?? [];

    return (
      <>
        {/* Sopra il riquadro, tra l'intestazione e la griglia: così non copre mai le figure */}
        <p className="dl-trova-stato" role="status">
          {stato}
        </p>
        <div className="dl-zona dl-trova" data-comparsa={comparsa(config)}>
          <div className="dl-trova-griglia" style={{ "--dl-lato": config.lato } as CSSProperties}>
            {griglia.map((c, i) => {
              const Icona = ICONE[c.figura] ?? Frown;
              const èBersaglio = comparso && i === config.posizione;
              return (
                <button
                  key={i}
                  type="button"
                  className="dl-trova-casella"
                  data-suono="no"
                  data-bersaglio={èBersaglio ? "true" : undefined}
                  aria-label={t("casellaN", { n: i + 1 })}
                  aria-disabled={esito !== null}
                  onPointerDown={(e) => tocca(i, e.timeStamp)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                      e.preventDefault();
                      tocca(i, e.timeStamp);
                    }
                  }}
                >
                  <Icona
                    className={`dl-figura dl-c-${TINTE[c.colore % TINTE.length]}`}
                    style={{ transform: `rotate(${c.gradi}deg)` }}
                    strokeWidth={2.25}
                    aria-hidden="true"
                    focusable="false"
                  />
                  {toccata?.indice === i && <span className={`dl-effetto dl-effetto--${toccata.giusta ? "colpito" : "vuoto"}`} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  };
}
