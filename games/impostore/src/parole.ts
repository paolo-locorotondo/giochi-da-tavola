import dati from "../data/it/parole.json";

/**
 * Versione dei dati, da inserire nel codice partita (0..30).
 * Va incrementata a ogni modifica di parole.json che cambi l'ordine o il contenuto
 * delle categorie: altrimenti due telefoni con elenchi diversi darebbero parole diverse.
 */
export const VERSIONE_DATI = 2;

export type Categoria = keyof typeof dati;

export const categorie = Object.keys(dati) as Categoria[];

export function paroleDi(categoria: Categoria): readonly string[] {
  return dati[categoria];
}
