import { useSyncExternalStore } from "react";
import type { ImpostazioneGioco } from "@gdt/preferenze";

/** Lingue dell'app. Per aggiungerne una: qui, in `NOME_LINGUA` e un file `locales/<lingua>.ts` per pacchetto. */
export const LINGUE = ["it", "en"] as const;
export type Lingua = (typeof LINGUE)[number];

/** Nome di ogni lingua scritto nella lingua stessa (si legge anche se l'interfaccia è in un'altra). */
export const NOME_LINGUA: Record<Lingua, string> = { it: "Italiano", en: "English" };

export const LINGUA_PREDEFINITA: Lingua = "it";

const CHIAVE = "gdt-lingua";
const EVENTO = "gdt-lingua";

/**
 * Una voce è una frase con `{segnaposto}`, una lista di frasi (es. i passi del regolamento: si leggono
 * con `elenco()`) oppure le forme del plurale (si sceglie con `{n}`).
 */
export type Voce = string | readonly string[] | { zero?: string; one: string; two?: string; few?: string; many?: string; other: string };

/**
 * Il dizionario di riferimento (italiano) fissa le chiavi; ogni altra lingua deve avere
 * le stesse chiavi: se ne manca una il compilatore dà errore.
 */
export type Dizionario<D> = Record<keyof D, Voce>;
export type Dizionari<D> = { it: D } & Record<Exclude<Lingua, "it">, Dizionario<D>>;
export type Parametri = Record<string, string | number>;
export type Traduttore<D> = (chiave: keyof D & string, parametri?: Parametri) => string;

function eLingua(v: unknown): v is Lingua {
  return typeof v === "string" && (LINGUE as readonly string[]).includes(v);
}

/** Dalla lingua del telefono: se è una delle nostre, quella; altrimenti l'italiano. */
export function linguaDelTelefono(): Lingua {
  const codice = typeof navigator === "undefined" ? "" : (navigator.language ?? "").slice(0, 2).toLowerCase();
  return eLingua(codice) ? codice : LINGUA_PREDEFINITA;
}

/** Lingua scelta dall'utente su questo telefono; se non ha scelto, quella del telefono. */
export function leggiLingua(): Lingua {
  try {
    const v = localStorage.getItem(CHIAVE);
    if (eLingua(v)) return v;
  } catch {
    /* storage non disponibile */
  }
  return linguaDelTelefono();
}

export function scriviLingua(lingua: Lingua): void {
  try {
    localStorage.setItem(CHIAVE, lingua);
  } catch {
    /* storage non disponibile */
  }
  applicaLingua(lingua);
  window.dispatchEvent(new Event(EVENTO));
}

/** Imposta l'attributo `lang` della pagina (lettori di schermo, sillabazione, correzione). */
export function applicaLingua(lingua: Lingua): void {
  if (typeof document !== "undefined") document.documentElement.lang = lingua;
}

function iscrivi(cb: () => void): () => void {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Lingua corrente; la schermata si ridisegna quando cambia. */
export function usaLingua(): Lingua {
  return useSyncExternalStore(iscrivi, leggiLingua, () => LINGUA_PREDEFINITA);
}

function riempi(testo: string, parametri?: Parametri): string {
  if (!parametri) return testo;
  return testo.replace(/\{(\w+)\}/g, (tutto, nome: string) => (nome in parametri ? String(parametri[nome]) : tutto));
}

/** Traduttore fisso per una lingua (usalo fuori da React, es. nei test o per la voce del narratore). */
export function traduttore<D extends Record<string, Voce>>(dizionari: Dizionari<D>, lingua: Lingua): Traduttore<D> {
  const dizionario = (dizionari[lingua] ?? dizionari.it) as Record<string, Voce>;
  const plurali = new Intl.PluralRules(lingua);
  return (chiave, parametri) => {
    const voce = dizionario[chiave] ?? (dizionari.it as Record<string, Voce>)[chiave];
    if (voce === undefined) return chiave;
    if (Array.isArray(voce)) return voce.join(" ");
    if (typeof voce === "string") return riempi(voce, parametri);
    const n = Number(parametri?.n ?? 0);
    const plurale = voce as Exclude<Voce, string | readonly string[]>;
    const forma = n === 0 && plurale.zero !== undefined ? "zero" : plurali.select(n);
    return riempi(plurale[forma as keyof typeof plurale] ?? plurale.other, parametri);
  };
}

/** Una lista di frasi di una lingua (es. `elenco(dizionari, "en", "regolamentoPassi")`). */
export function elenco<D extends Record<string, Voce>>(dizionari: Dizionari<D>, lingua: Lingua, chiave: keyof D & string): readonly string[] {
  const v = ((dizionari[lingua] ?? dizionari.it) as Record<string, Voce>)[chiave];
  return Array.isArray(v) ? v : [];
}

/** Per i componenti: `const t = usaT(dizionari)`; cambia da sola con la lingua. */
export function usaT<D extends Record<string, Voce>>(dizionari: Dizionari<D>): Traduttore<D> {
  return traduttore(dizionari, usaLingua());
}

/**
 * Testi di un gioco che l'app mostra fuori dal gioco stesso (elenco, regolamento, ingranaggio).
 * Ogni gioco li fornisce con `manifest.testi(lingua)`.
 */
export interface TestiGioco {
  nome: string;
  descrizione: string;
  regolamento: {
    passi: readonly string[];
    note?: readonly string[];
    /** Elenco di ruoli/personaggi con la loro abilità, mostrato dopo i passi. */
    personaggi?: readonly { nome: string; testo: string }[];
  };
  /** Impostazioni del gioco con i testi nella lingua scelta (chiavi, valori e predefiniti non cambiano con la lingua). */
  impostazioni: readonly ImpostazioneGioco[];
}
