/**
 * Macchina a stati per le fasi di un gioco (es. notte → giorno → voto).
 * È immutabile: `invia` restituisce una nuova macchina e non modifica quella di partenza,
 * così lo stato resta deterministico e facile da testare.
 */

export interface DefinizioneFasi<F extends string, E extends string> {
  iniziale: F;
  /** Per ogni fase, gli eventi ammessi e la fase a cui portano. Una fase senza eventi è finale. */
  transizioni: Readonly<Record<F, Readonly<Partial<Record<E, F>>>>>;
}

export interface Macchina<F extends string, E extends string> {
  readonly fase: F;
  /** Fasi attraversate, dalla prima alla corrente inclusa. */
  readonly storia: readonly F[];
  readonly finita: boolean;
  /** Eventi che la fase corrente accetta. */
  eventiAmmessi(): E[];
  puoInviare(evento: E): boolean;
  /** Errore se l'evento non è ammesso nella fase corrente. */
  invia(evento: E): Macchina<F, E>;
}

export function creaMacchina<F extends string, E extends string>(
  definizione: DefinizioneFasi<F, E>,
): Macchina<F, E> {
  return costruisci(definizione, [definizione.iniziale]);
}

function costruisci<F extends string, E extends string>(
  definizione: DefinizioneFasi<F, E>,
  storia: readonly F[],
): Macchina<F, E> {
  const fase = storia[storia.length - 1] as F;
  const uscite = definizione.transizioni[fase] as Partial<Record<E, F>>;
  const eventi = Object.keys(uscite) as E[];

  return {
    fase,
    storia,
    finita: eventi.length === 0,
    eventiAmmessi: () => [...eventi],
    puoInviare: (evento) => evento in uscite,
    invia(evento) {
      const prossima = uscite[evento];
      if (prossima === undefined) {
        throw new Error(`Evento "${evento}" non ammesso nella fase "${fase}"`);
      }
      return costruisci(definizione, [...storia, prossima]);
    },
  };
}
