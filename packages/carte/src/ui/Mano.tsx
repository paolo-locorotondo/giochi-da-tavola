import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDownUp } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { CARTE_PER_RIGA, impaginaMano } from "../impagina";
import { chiaveSeme, confrontaPerSeme, confrontaPerValore, ordinaPerSeme, ordinaPerValore } from "../ordine";
import type { Carta } from "../tipi";
import { CartaGrafica } from "./CartaGrafica";
import { Ventaglio } from "./Ventaglio";
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
  /**
   * Mano a ventaglio (base: no, griglia): righe di carte sovrapposte, con l'angolo valore+seme sempre visibile.
   * Di base ordina per seme; i semi sono i gruppi (stacco fra un seme e l'altro, righe interrotte di preferenza lì).
   */
  ventaglio?: boolean;
  /** Carte per riga del ventaglio (base: `CARTE_PER_RIGA`, 9). */
  cartePerRiga?: number;
  /** È il turno di chi tiene la mano: bordo `--ac` e titolo «La tua mano (tocca a te): n». Si legge anche a parole. */
  diTurno?: boolean;
  /** Una riga sotto la mano (es. mazzo, prese, scope). Testo già scritto dal gioco. */
  riepilogo?: ReactNode;
  /**
   * Dimensione delle carte del ventaglio (base: `piccola`, 44 px). `grande`: 72 px sul telefono e 80 px dai 480 px
   * di larghezza, con almeno 32 px visibili per carta (stessa misura di Ultima!).
   */
  dimensione?: "piccola" | "grande";
}

/**
 * La mano del giocatore: carte in griglia o a ventaglio (a righe, mai scroll orizzontale), selezione singola o multipla,
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
  ventaglio = false,
  cartePerRiga = CARTE_PER_RIGA,
  diTurno = false,
  riepilogo,
  dimensione = "piccola",
}: PropsMano) {
  const t = usaT(dizionari);
  const titoloMano = t(diTurno ? "manoTitoloTurno" : "manoTitolo", { n: carte.length });
  const [ordine, setOrdine] = useState<OrdineMano | null>(ordineIniziale ?? (ventaglio ? "seme" : null));

  const mostrate = useMemo(() => {
    if (ordine === "seme") return ordinaPerSeme(carte);
    if (ordine === "valore") return ordinaPerValore(carte);
    return [...carte];
  }, [carte, ordine]);

  // Ventaglio: per seme i semi sono gruppi (con stacco); per valore un gruppo solo, così le righe si tagliano dove serve
  // e 9 carte restano leggibili (lo stacco costerebbe 8 px per gruppo).
  const righe = useMemo(
    () =>
      ventaglio
        ? impaginaMano(carte, {
            capacita: cartePerRiga,
            chiave: ordine === "valore" ? () => "valore" : chiaveSeme,
            ordine: ordine === "valore" ? confrontaPerValore : confrontaPerSeme,
          })
        : [],
    [ventaglio, carte, ordine, cartePerRiga],
  );

  /** Un solo pulsante: alterna «per seme» e «per valore». */
  const prossimo: OrdineMano = ordine === "seme" ? "valore" : "seme";
  const scegli = (o: OrdineMano) => {
    setOrdine(o);
    onOrdine?.(o);
  };
  const nomeOrdine = (o: OrdineMano) => t(o === "seme" ? "manoOrdineSeme" : "manoOrdineValore");

  const tocca = (carta: Carta) => {
    if (selezione.includes(carta.id)) onSeleziona(selezione.filter((i) => i !== carta.id));
    else onSeleziona(multipla ? [...selezione, carta.id] : [carta.id]);
  };

  const tasti = (e: KeyboardEvent<HTMLElement>) => {
    const bottoni = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
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

  const carta = (c: Carta) => (
    <CartaGrafica
      carta={c}
      dimensione={dimensione}
      selezionata={selezione.includes(c.id)}
      evidenziata={nuove.includes(c.id)}
      disabilitata={disabilitata?.(c) ?? false}
      onClick={() => tocca(c)}
    />
  );

  return (
    <section className={diTurno ? "cg-mano cg-mano-turno" : "cg-mano"} aria-label={titoloMano}>
      <div className="cg-mano-testa">
        {titolo && <h3 className="cg-mano-titolo">{titoloMano}</h3>}
        {riordino && carte.length > 1 && (
          <button
            type="button"
            className="cg-ordina-btn"
            aria-label={
              ordine ? t("manoOrdineAria", { ordine: nomeOrdine(ordine), altro: nomeOrdine(prossimo) }) : t("manoOrdineAria", { ordine: t("manoOrdina"), altro: nomeOrdine(prossimo) })
            }
            onClick={() => scegli(prossimo)}
          >
            <ArrowDownUp size={18} aria-hidden="true" />
            <span aria-hidden="true">{ordine ? nomeOrdine(ordine) : t("manoOrdina")}</span>
          </button>
        )}
      </div>
      {mostrate.length === 0 ? (
        <p className="cg-mano-vuota">{t("manoVuota")}</p>
      ) : ventaglio ? (
        <Ventaglio
          righe={righe}
          chiaveCarta={(c) => c.id}
          carta={(c) => carta(c)}
          onKeyDown={tasti}
          className={dimensione === "grande" ? "cg-ventaglio-grande" : undefined}
        />
      ) : (
        <ul className="cg-griglia" onKeyDown={tasti}>
          {mostrate.map((c) => (
            <li key={c.id}>{carta(c)}</li>
          ))}
        </ul>
      )}
      <p className="cg-mano-stato" role="status" aria-live="polite">
        {t("manoSelezionate", { n: selezione.length })}
      </p>
      {riepilogo && <p className="cg-mano-riepilogo">{riepilogo}</p>}
    </section>
  );
}
