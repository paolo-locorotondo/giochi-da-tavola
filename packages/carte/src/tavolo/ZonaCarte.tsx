import { Fragment } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { CartaGrafica, type Dimensione } from "../ui/CartaGrafica";
import type { Carta } from "../tipi";
import "./tavolo.css";

export type DisposizioneZona = "fila" | "pila" | "colonne";

export interface PropsZonaCarte {
  /** Nome della zona, visibile e letto («Loro», «Scarti», «Mazzo»). */
  titolo: string;
  /**
   * `fila`: le carte in riga, tutte visibili. `pila`: si vede solo la cima (ultima carta); con `coperte` è un mazzo
   * coperto. `colonne`: gruppi di carte sovrapposte in verticale, ciascuna col valore in alto (combinazioni).
   */
  disposizione?: DisposizioneZona;
  /** Carte per `fila` e `pila` (in `pila`, l'ultima è la cima). */
  carte?: readonly Carta[];
  /** Carte coperte (mazzo): con `pila`, si mostra un dorso e il numero. */
  coperte?: number;
  /** Gruppi per `colonne`: ogni gruppo è una colonna dal bordo verso il basso. */
  gruppi?: readonly (readonly Carta[])[];
  /** Id delle carte selezionate. Con `onSeleziona` la zona è selezionabile (stesso modello di `Mano`). */
  selezione?: readonly number[];
  onSeleziona?: (selezione: number[]) => void;
  /** Più carte insieme (base: sì). Senza, toccare un'altra carta sostituisce la scelta. */
  multipla?: boolean;
  /** Testo quando la zona è vuota («Nessuna combinazione»). */
  vuota?: string;
  /** Dimensione delle carte (base: `mini` per le colonne, `piccola` per il resto). */
  dimensione?: Dimensione;
}

/**
 * Il nuovo elenco di id selezionati dopo aver toccato `id`: toglie se c'è già, aggiunge altrimenti.
 * Con selezione singola sostituisce la scelta. Funzione pura, usata da `ZonaCarte` e testata a parte.
 */
export function alternaSelezione(selezione: readonly number[], id: number, multipla: boolean): number[] {
  if (selezione.includes(id)) return selezione.filter((i) => i !== id);
  return multipla ? [...selezione, id] : [id];
}

/**
 * Una zona di carte del tavolo: fila, pila (con la cima o un mazzo coperto) o colonne sovrapposte.
 * Non sa cosa rappresenta: il gioco passa le carte e decide cosa succede al tocco.
 */
export function ZonaCarte({
  titolo,
  disposizione = "fila",
  carte = [],
  coperte,
  gruppi = [],
  selezione = [],
  onSeleziona,
  multipla = true,
  vuota,
  dimensione,
}: PropsZonaCarte) {
  const t = usaT(dizionari);
  const misura: Dimensione = dimensione ?? (disposizione === "colonne" ? "mini" : "piccola");
  const selezionabile = onSeleziona !== undefined;
  const vuotaDavvero = disposizione === "colonne" ? gruppi.every((g) => g.length === 0) : carte.length === 0 && !coperte;

  const tocca = (c: Carta) => {
    onSeleziona?.(alternaSelezione(selezione, c.id, multipla));
  };

  const carta = (c: Carta) =>
    selezionabile ? (
      <CartaGrafica
        carta={c}
        dimensione={misura}
        selezionata={selezione.includes(c.id)}
        onClick={() => tocca(c)}
      />
    ) : (
      <CartaGrafica carta={c} dimensione={misura} />
    );

  let corpo;
  if (vuotaDavvero) {
    corpo = <p className="cg-zona-vuota">{vuota ?? t("zonaVuota")}</p>;
  } else if (disposizione === "pila") {
    if (coperte !== undefined && carte.length === 0) {
      corpo = (
        <span className="cg-zona-pila">
          <CartaGrafica dorso dimensione={misura} />
          <span className="cg-zona-numero">{t("zonaCoperte", { n: coperte })}</span>
        </span>
      );
    } else {
      const cima = carte[carte.length - 1];
      corpo = (
        <span className="cg-zona-pila">
          {cima && carta(cima)}
          <span className="cg-zona-numero">{t("zonaCoperte", { n: carte.length })}</span>
        </span>
      );
    }
  } else if (disposizione === "colonne") {
    corpo = (
      <div className="cg-zona-colonne">
        {gruppi.map((g, i) => (
          <div key={i} className={`cg-zona-colonna cg-passo-${misura}`}>
            {g.map((c) => (
              <Fragment key={c.id}>{carta(c)}</Fragment>
            ))}
          </div>
        ))}
      </div>
    );
  } else {
    corpo = (
      <div className="cg-zona-fila">
        {carte.map((c) => (
          <Fragment key={c.id}>{carta(c)}</Fragment>
        ))}
      </div>
    );
  }

  return (
    <section className={`cg-zona cg-zona-${disposizione}`} aria-label={titolo}>
      <h4 className="cg-zona-titolo">{titolo}</h4>
      {corpo}
    </section>
  );
}
