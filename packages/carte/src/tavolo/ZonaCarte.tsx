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
  /**
   * Alternativa a `onSeleziona`: la zona riceve il tocco su una carta e non calcola la selezione, che decide il gioco
   * (es. Scopa, dove il tocco compone una presa). `selezione` resta solo per disegnare le carte scelte.
   */
  onTocca?: (carta: Carta) => void;
  /** Carte evidenziate senza essere scelte (es. quelle che si possono prendere). */
  evidenziate?: readonly number[];
  /** Nome parlato di una carta, al posto di quello normale (es. «Sette di coppe, puoi prenderla»). */
  etichetta?: (carta: Carta) => string | undefined;
  /** Più carte insieme (base: sì). Senza, toccare un'altra carta sostituisce la scelta. */
  multipla?: boolean;
  /** Testo quando la zona è vuota («Nessuna combinazione»). */
  vuota?: string;
  /** Dimensione delle carte (base: `mini` per le colonne, `piccola` per il resto). */
  dimensione?: Dimensione;
  /**
   * Solo `colonne`: ogni colonna diventa un pulsante (almeno 44 px di larghezza) che riceve l'indice del gruppo
   * (es. per aprire il dettaglio di una combinazione). Le carte dentro non sono toccabili una a una.
   */
  onToccaGruppo?: (indice: number) => void;
  /** Nome parlato della colonna-pulsante («Scala di picche, 4 carte»). */
  etichettaGruppo?: (indice: number) => string;
  /** Indici delle colonne evidenziate (es. quelle a cui si possono attaccare le carte scelte). */
  gruppiEvidenziati?: readonly number[];
  /** Solo `pila`: tutta la pila (carta e numero) diventa un pulsante, es. per pescare o prendere gli scarti. */
  onToccaPila?: () => void;
  /** Nome parlato della pila-pulsante («Mazzo, 39 carte: tocca per pescare»). */
  etichettaPila?: string;
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
  onTocca,
  evidenziate = [],
  etichetta,
  multipla = true,
  vuota,
  dimensione,
  onToccaGruppo,
  etichettaGruppo,
  gruppiEvidenziati = [],
  onToccaPila,
  etichettaPila,
}: PropsZonaCarte) {
  const t = usaT(dizionari);
  const misura: Dimensione = dimensione ?? (disposizione === "colonne" ? "mini" : "piccola");
  const selezionabile = onSeleziona !== undefined || onTocca !== undefined;
  const vuotaDavvero = disposizione === "colonne" ? gruppi.every((g) => g.length === 0) : carte.length === 0 && !coperte;

  const tocca = (c: Carta) => {
    if (onTocca) onTocca(c);
    else onSeleziona?.(alternaSelezione(selezione, c.id, multipla));
  };

  const carta = (c: Carta) =>
    selezionabile ? (
      <CartaGrafica
        carta={c}
        dimensione={misura}
        selezionata={selezione.includes(c.id)}
        evidenziata={evidenziate.includes(c.id) && !selezione.includes(c.id)}
        etichetta={etichetta?.(c)}
        onClick={() => tocca(c)}
      />
    ) : (
      <CartaGrafica carta={c} dimensione={misura} evidenziata={evidenziate.includes(c.id)} etichetta={etichetta?.(c)} />
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
        {gruppi.map((g, i) => {
          const classi = `cg-zona-colonna cg-passo-${misura}${gruppiEvidenziati.includes(i) ? " cg-colonna-evid" : ""}`;
          return onToccaGruppo ? (
            <button key={i} type="button" className={`${classi} cg-colonna-btn`} aria-label={etichettaGruppo?.(i)} onClick={() => onToccaGruppo(i)}>
              {g.map((c) => (
                <CartaGrafica key={c.id} carta={c} dimensione={misura} />
              ))}
            </button>
          ) : (
            <div key={i} className={classi}>
              {g.map((c) => (
                <Fragment key={c.id}>{carta(c)}</Fragment>
              ))}
            </div>
          );
        })}
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

  if (disposizione === "pila" && onToccaPila && !vuotaDavvero) {
    corpo = (
      <button type="button" className="cg-pila-btn" aria-label={etichettaPila} onClick={onToccaPila}>
        {corpo}
      </button>
    );
  }

  return (
    <section className={`cg-zona cg-zona-${disposizione}`} aria-label={titolo}>
      <h4 className="cg-zona-titolo">{titolo}</h4>
      {corpo}
    </section>
  );
}
