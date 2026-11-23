import type { ReactNode } from "react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { PostoGiocatore, type PropsPostoGiocatore } from "./PostoGiocatore";
import "./tavolo.css";

export interface DisposizionePosti {
  sinistra: number;
  sopra: number;
  destra: number;
}

/**
 * Quanti posti su ogni lato del tavolo, per `n` altri giocatori (chi gioca è in basso, con la mano).
 * Fino a 2: tutti sopra. Da 3 a 5: uno per lato, il resto sopra. Da 6: due per lato, il resto sopra (a 9: 2, 5, 2).
 */
export function disponiPosti(n: number): DisposizionePosti {
  const lato = n < 3 ? 0 : n <= 5 ? 1 : 2;
  return { sinistra: lato, sopra: n - 2 * lato, destra: lato };
}

export interface PropsTavoloCarte {
  /**
   * Gli altri giocatori, in senso orario a partire da chi siede alla tua sinistra. Tu sei in basso (la mano):
   * il componente li mette sul lato sinistro (dal basso in alto), sopra (da sinistra a destra) e sul lato destro
   * (dall'alto in basso). Non riordina: l'ordine lo decide il gioco.
   */
  posti: readonly PropsPostoGiocatore[];
  /**
   * `intorno` (base): avversari sui lati e sopra, come `disponiPosti`. `sopra`: tutti in una riga sopra, così le zone
   * del centro hanno tutta la larghezza (Burraco, per le combinazioni). L'ordine resta il senso orario.
   */
  disposizione?: "intorno" | "sopra";
  /** Zone del gioco al centro del tavolo (mazzo, scarti, combinazioni, segnaposto). Il gioco le compone. */
  children?: ReactNode;
}

function Lato({ posti, lato }: { posti: readonly PropsPostoGiocatore[]; lato: keyof DisposizionePosti }) {
  if (posti.length === 0) return null;
  return (
    <ul className={`cg-tavolo-lato cg-tavolo-${lato}`} role="list">
      {posti.map((p, i) => (
        <li key={`${p.nome}-${i}`} className="cg-tavolo-posto">
          <PostoGiocatore {...p} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Il tavolo: un rettangolo di feltro con i posti intorno e le zone al centro. Non sa cosa c'è al centro né quali
 * regole valgono: lo decide il gioco. L'ordine nel DOM è quello del giro (sinistra, sopra, destra), così chi usa un
 * lettore di schermo sente i giocatori in senso orario; il CSS li dispone sui lati.
 */
export function TavoloCarte({ posti, disposizione = "intorno", children }: PropsTavoloCarte) {
  const t = usaT(dizionari);
  const { sinistra, sopra } =
    disposizione === "sopra" ? { sinistra: 0, sopra: posti.length } : disponiPosti(posti.length);
  const sx = posti.slice(0, sinistra);
  const su = posti.slice(sinistra, sinistra + sopra);
  const dx = posti.slice(sinistra + sopra);
  const classi = sinistra > 0 ? "cg-tavolo" : "cg-tavolo cg-tavolo-senza-lati";
  return (
    <section className={classi} aria-label={t("tavoloTitolo", { n: posti.length })}>
      <Lato posti={sx} lato="sinistra" />
      <Lato posti={su} lato="sopra" />
      <Lato posti={dx} lato="destra" />
      {children && <div className="cg-tavolo-centro">{children}</div>}
    </section>
  );
}
