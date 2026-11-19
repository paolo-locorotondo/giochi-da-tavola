import { useEffect, useRef, useState } from "react";
import { Bird, Cat, Dog, Fish, Panda, Rabbit, Rat, Snail, Squirrel, Turtle, type LucideIcon } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import type { Animale, ConfigPanda, RisultatoPanda } from "../../minigiochi/panda";
import type { Descrivi, VistaProps } from "./tipi";

/** I colori degli animali: token `--c-<nome>` del tema. */
const TINTE = ["rosso", "blu", "verde", "giallo", "viola"] as const;

const ICONE: Record<Animale, LucideIcon> = {
  gatto: Cat,
  cane: Dog,
  uccello: Bird,
  pesce: Fish,
  coniglio: Rabbit,
  topo: Rat,
  lumaca: Snail,
  scoiattolo: Squirrel,
  tartaruga: Turtle,
};

export const descriviPanda: Descrivi<RisultatoPanda> = (r, t) => {
  if ("nessuno" in r) return t("valNessuno");
  return r.trovato ? t("valMs", { ms: r.ms }) : t("valSbagliato");
};

export function PandaVista({ config, inizio, onRisultato }: VistaProps<ConfigPanda, RisultatoPanda>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [comparso, setComparso] = useState(false);
  const [esito, setEsito] = useState<RisultatoPanda | null>(null);
  const èComparso = useRef(false);
  const tComparso = useRef<number | null>(null);

  useEffect(() => {
    const attesa = Math.max(0, config.attesaMs - (performance.now() - inizio));
    const id = window.setTimeout(() => {
      èComparso.current = true;
      tComparso.current = performance.now();
      setComparso(true);
    }, attesa);
    return () => window.clearTimeout(id);
  }, [config, inizio]);

  // Il tempo parte dal fotogramma in cui il panda è stato disegnato.
  useEffect(() => {
    if (!comparso) return;
    const f = requestAnimationFrame(() => {
      tComparso.current = performance.now();
    });
    return () => cancelAnimationFrame(f);
  }, [comparso]);

  const tocca = (indice: number, istante: number) => {
    if (esito) return;
    // Prima che il panda compaia ogni tocco è sbagliato.
    const r: RisultatoPanda = èComparso.current
      ? {
          trovato: indice === config.posizionePanda,
          ms: Math.max(0, Math.round(istante - (tComparso.current ?? istante))),
        }
      : { trovato: false, ms: 0 };
    setEsito(r);
    rif.current(r);
  };

  const stato = esito ? (esito.trovato ? t("trovato") : t("sbagliato")) : comparso ? "" : t("aspettaPanda");

  return (
    <div className="dl-zona dl-panda">
      <div className="dl-panda-griglia">
        {config.caselle.map((c, i) => {
          const èPanda = comparso && i === config.posizionePanda;
          const Icona = èPanda ? Panda : ICONE[c.animale];
          const colore = èPanda ? config.panda.colore : c.colore;
          const gradi = èPanda ? config.panda.gradi : c.gradi;
          return (
            <button
              key={i}
              type="button"
              className="dl-panda-casella"
              data-suono="no"
              data-panda={èPanda ? "true" : undefined}
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
                className={`dl-animale dl-c-${TINTE[colore % TINTE.length]}`}
                style={{ transform: `rotate(${gradi}deg)` }}
                strokeWidth={2.25}
                aria-hidden="true"
                focusable="false"
              />
            </button>
          );
        })}
      </div>
      <p className="dl-panda-stato" role="status">
        {stato}
      </p>
    </div>
  );
}
