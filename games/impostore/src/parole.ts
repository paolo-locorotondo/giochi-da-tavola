import it from "../data/it/parole.json";
import en from "../data/en/parole.json";
import type { Lingua } from "@gdt/i18n";

/**
 * Versione dei dati, da inserire nel codice partita (0..30). Unica per tutte le lingue.
 * Va incrementata a ogni modifica dei file `data/<lingua>/parole.json` che cambi l'ordine o il contenuto
 * delle categorie: altrimenti due telefoni con elenchi diversi darebbero parole diverse.
 */
export const VERSIONE_DATI = 2;

/** Le chiavi di categoria sono le stesse in tutte le lingue (le guida il file italiano): lo controlla un test. */
export type Categoria = keyof typeof it;

interface DatiCategoria {
  nome: string;
  parole: readonly string[];
}

const dati: Record<Lingua, Record<Categoria, DatiCategoria>> = { it, en };

export const categorie = Object.keys(it) as Categoria[];

/** Lingue per cui ci sono le parole (le stesse dell'app). */
export const lingueParole = Object.keys(dati) as Lingua[];

export function paroleDi(categoria: Categoria, lingua: Lingua): readonly string[] {
  return dati[lingua][categoria].parole;
}

/** Nome della categoria come si legge nell'interfaccia (campo «nome» del file dati). */
export function nomeCategoria(categoria: Categoria, lingua: Lingua): string {
  return dati[lingua][categoria].nome;
}
