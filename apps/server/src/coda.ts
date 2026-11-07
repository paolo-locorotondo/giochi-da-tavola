/**
 * Coda della «partita veloce»: chi cerca un avversario si mette in fila per gioco e, appena ce
 * ne sono abbastanza, il gruppo (nell'ordine di arrivo) viene tolto dalla coda per formare una
 * stanza. Pura: la connessione è un tipo qualunque `C`, così si prova senza rete.
 */

export interface VoceCoda<C> {
  token: string;
  nome: string;
  conn: C;
  /** Quando è entrata in coda (ms). */
  dal: number;
}

export const MAX_IN_CODA = 50;
export const ATTESA_CODA_MS = 120_000;

export class Code<C> {
  private code = new Map<string, VoceCoda<C>[]>();

  /** Mette in coda; restituisce il gruppo completo (già tolto dalla coda) oppure null. */
  aggiungi(gioco: string, voce: VoceCoda<C>, giocatori: number): VoceCoda<C>[] | null {
    if (this.contiene(voce.conn)) throw new Error("giaInCoda");
    const lista = this.code.get(gioco) ?? [];
    if (lista.length >= MAX_IN_CODA) throw new Error("codaPiena");
    lista.push(voce);
    if (lista.length >= giocatori) {
      this.code.set(gioco, lista.slice(giocatori));
      return lista.slice(0, giocatori);
    }
    this.code.set(gioco, lista);
    return null;
  }

  contiene(conn: C): boolean {
    for (const l of this.code.values()) if (l.some((v) => v.conn === conn)) return true;
    return false;
  }

  /** Toglie la connessione dalla coda; dice se c'era. */
  togli(conn: C): boolean {
    let trovata = false;
    for (const [g, l] of this.code) {
      const resto = l.filter((v) => v.conn !== conn);
      if (resto.length !== l.length) {
        trovata = true;
        this.code.set(g, resto);
      }
    }
    return trovata;
  }

  /** Toglie e restituisce chi aspetta da più di `attesaMs`. */
  scadute(ora: number, attesaMs = ATTESA_CODA_MS): VoceCoda<C>[] {
    const fuori: VoceCoda<C>[] = [];
    for (const [g, l] of this.code) {
      this.code.set(g, l.filter((v) => (ora - v.dal > attesaMs ? (fuori.push(v), false) : true)));
    }
    return fuori;
  }

  lunghezza(gioco: string): number {
    return this.code.get(gioco)?.length ?? 0;
  }
}
