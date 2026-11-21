import { useRef, useState, type CSSProperties } from "react";
import { Check, X } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import type { ConfigPiuGrande, RisultatoPiuGrande } from "../../minigiochi/piugrande";
import type { Descrivi, VistaProps } from "./tipi";

export const descriviPiuGrande: Descrivi<RisultatoPiuGrande> = (r, t) => {
  if ("nessuno" in r) return t("valNessuno");
  return r.giusto ? t("valMs", { ms: r.ms }) : t("valSbagliato");
};

export function PiuGrandeVista({ config, inizio, onRisultato }: VistaProps<ConfigPiuGrande, RisultatoPiuGrande>) {
  const t = usaT(dizionari);
  const rif = useRef(onRisultato);
  rif.current = onRisultato;

  const [scelto, setScelto] = useState<number | null>(null);
  const finito = useRef(false);

  const tocca = (indice: number, istante: number) => {
    // Un solo tocco per giocatore: il secondo non conta.
    if (finito.current) return;
    finito.current = true;
    setScelto(indice);
    rif.current({ giusto: indice === config.indicePiuGrande, ms: Math.max(0, Math.round(istante - inizio)) });
  };

  const giusto = scelto === config.indicePiuGrande;
  const stato = scelto === null ? t("piuGrandeDomanda") : giusto ? t("giusto") : t("sbagliato");

  return (
    <div className="dl-zona dl-piugrande">
      <p className="dl-piugrande-stato" role="status">
        {stato}
      </p>
      <div className="dl-piugrande-griglia" style={{ "--dl-colonne": config.colonne } as CSSProperties}>
        {config.numeri.map((n, i) => {
          const segnato = scelto === i;
          return (
            <button
              key={i}
              type="button"
              className={`dl-numero${segnato ? (giusto ? " dl-numero--giusto" : " dl-numero--sbagliato") : ""}`}
              data-suono="no"
              data-valore={n}
              data-piu-grande={i === config.indicePiuGrande ? "true" : undefined}
              aria-label={t("numeroN", { n })}
              aria-disabled={scelto !== null}
              onPointerDown={(e) => tocca(i, e.timeStamp)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                  e.preventDefault();
                  tocca(i, e.timeStamp);
                }
              }}
            >
              {n}
              {segnato &&
                (giusto ? (
                  <Check className="dl-numero-segno" strokeWidth={3} aria-hidden="true" focusable="false" />
                ) : (
                  <X className="dl-numero-segno" strokeWidth={3} aria-hidden="true" focusable="false" />
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
