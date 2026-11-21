import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { ordinaPerSeme, ordinaPerValore } from "../ordine";
import type { Carta } from "../tipi";
import { CartaGrafica } from "./CartaGrafica";
import "./carte.css";

export type OrdineMano = "seme" | "valore";

export interface PropsMano {
  carte: readonly Carta[];
  /** Id delle carte selezionate (controllato da chi usa il componente). */
  selezione: readonly number[];
  /** Riceve la nuova selezione. Con `multipla` falsa contiene al massimo una carta. */
  onSeleziona: (selezione: number[]) => void;
  /** Selezione multipla (base: sì). Senza, toccare un'altra carta sostituisce la scelta. */
  multipla?: boolean;
  /** Mostra i pulsanti «Per seme» / «Per valore» (base: sì). */
  riordino?: boolean;
  /** Ordine iniziale. Senza, le carte restano nell'ordine ricevuto finché non si sceglie. */
  ordineIniziale?: OrdineMano;
  /** Chiamata quando l'utente cambia l'ordine (es. per ricordarlo). */
  onOrdine?: (ordine: OrdineMano) => void;
  /** Carte non toccabili in questo momento (es. fuori turno). */
  disabilitata?: (carta: Carta) => boolean;
  /** Carte appena arrivate: evidenziate. */
  nuove?: readonly number[];
  /** Mostra il titolo con il numero di carte (base: sì). */
  titolo?: boolean;
}

/**
 * La mano del giocatore: carte in griglia (a righe, mai scroll orizzontale), selezione singola o multipla,
 * riordino per seme o per valore. Tastiera: Tab entra nella mano, frecce e Home/Fine si spostano tra le carte,
 * Invio o Spazio selezionano.
 */
export function Mano({
  carte,
  selezione,
  onSeleziona,
  multipla = true,
  riordino = true,
  ordineIniziale,
  onOrdine,
  disabilitata,
  nuove = [],
  titolo = true,
}: PropsMano) {
  const t = usaT(dizionari);
  const [ordine, setOrdine] = useState<OrdineMano | null>(ordineIniziale ?? null);
  const lista = useRef<HTMLUListElement>(null);

  const mostrate = useMemo(() => {
    if (ordine === "seme") return ordinaPerSeme(carte);
    if (ordine === "valore") return ordinaPerValore(carte);
    return [...carte];
  }, [carte, ordine]);

  const scegli = (o: OrdineMano) => {
    setOrdine(o);
    onOrdine?.(o);
  };

  const tocca = (carta: Carta) => {
    if (selezione.includes(carta.id)) onSeleziona(selezione.filter((i) => i !== carta.id));
    else onSeleziona(multipla ? [...selezione, carta.id] : [carta.id]);
  };

  const tasti = (e: KeyboardEvent<HTMLUListElement>) => {
    const bottoni = Array.from(lista.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const i = bottoni.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let j = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = Math.min(i + 1, bottoni.length - 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = Math.max(i - 1, 0);
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = bottoni.length - 1;
    else return;
    e.preventDefault();
    bottoni[j]?.focus();
  };

  return (
    <section className="cg-mano" aria-label={t("manoTitolo", { n: carte.length })}>
      <div className="cg-mano-testa">
        {titolo && <h3 className="cg-mano-titolo">{t("manoTitolo", { n: carte.length })}</h3>}
        {riordino && carte.length > 1 && (
          <div className="cg-ordina" role="group" aria-label={t("manoOrdina")}>
            <span className="cg-ordina-etichetta" aria-hidden="true">
              {t("manoOrdina")}
            </span>
            <button type="button" className="cg-ordina-btn" aria-pressed={ordine === "seme"} onClick={() => scegli("seme")}>
              {t("manoPerSeme")}
            </button>
            <button type="button" className="cg-ordina-btn" aria-pressed={ordine === "valore"} onClick={() => scegli("valore")}>
              {t("manoPerValore")}
            </button>
          </div>
        )}
      </div>
      {mostrate.length === 0 ? (
        <p className="cg-mano-vuota">{t("manoVuota")}</p>
      ) : (
        <ul className="cg-griglia" ref={lista} onKeyDown={tasti}>
          {mostrate.map((c) => (
            <li key={c.id}>
              <CartaGrafica
                carta={c}
                dimensione="piccola"
                selezionata={selezione.includes(c.id)}
                evidenziata={nuove.includes(c.id)}
                disabilitata={disabilitata?.(c) ?? false}
                onClick={() => tocca(c)}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="cg-mano-stato" role="status" aria-live="polite">
        {t("manoSelezionate", { n: selezione.length })}
      </p>
    </section>
  );
}
