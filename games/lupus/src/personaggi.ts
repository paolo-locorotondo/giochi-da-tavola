import dati from "../data/it/personaggi.json";
import type { Ruolo } from "./logica";

/**
 * Testi dei personaggi, presi da `data/it/personaggi.json`.
 * Il tipo obbliga il file ad avere esattamente un elemento per ogni ruolo del codice:
 * un ruolo senza testi (o un testo senza ruolo) non compila.
 */
const PERSONAGGI: Record<Ruolo, { nome: string; tuo: string; regolamento: string }> = dati;

export const NOME_RUOLO: Record<Ruolo, string> = {
  lupo: PERSONAGGI.lupo.nome,
  contadino: PERSONAGGI.contadino.nome,
  veggente: PERSONAGGI.veggente.nome,
  medico: PERSONAGGI.medico.nome,
};

/** Cosa legge il giocatore sulla propria carta. */
export const DESCRIZIONE_RUOLO: Record<Ruolo, string> = {
  lupo: PERSONAGGI.lupo.tuo,
  contadino: PERSONAGGI.contadino.tuo,
  veggente: PERSONAGGI.veggente.tuo,
  medico: PERSONAGGI.medico.tuo,
};

/** Voci della sezione «I personaggi» del regolamento, nell'ordine del file. */
export const PERSONAGGI_REGOLAMENTO = (Object.keys(PERSONAGGI) as Ruolo[]).map((r) => ({
  nome: PERSONAGGI[r].nome,
  testo: PERSONAGGI[r].regolamento,
}));
