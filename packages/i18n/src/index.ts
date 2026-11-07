import { useSyncExternalStore } from "react";

/** Lingue dell'app. Per aggiungerne una: qui, in `NOME_LINGUA` e un file `locales/<lingua>.ts` per pacchetto. */
export const LINGUE = ["it", "en"] as const;
export type Lingua = (typeof LINGUE)[number];

/** Nome di ogni lingua scritto nella lingua stessa (si legge anche se l'interfaccia è in un'altra). */
export const NOME_LINGUA: Record<Lingua, string> = { it: "Italiano", en: "English" };

export const LINGUA_PREDEFINITA: Lingua = "it";

const CHIAVE = "gdt-lingua";
const EVENTO = "gdt-lingua";

/** Una voce è una frase con `{segnaposto}` oppure le forme del plurale (si sceglie con `{n}`). */
export type Voce = string | { zero?: string; one: string; two?: string; few?: string; many?: string; other: string };

/**
 * Il dizionario di riferimento (italiano) fissa le chiavi; ogni altra lingua deve avere
 * le stesse chiavi: se ne manca una il compilatore dà errore.
 */
export type Dizionario<D> = Record<keyof D, Voce>;
export type Dizionari<D> = { it: D } & Record<Exclude<Lingua, "it">, Dizionario<D>>;
export type Parametri = Record<string, string | number>;
export type Traduttore<D> = (chiave: keyof D & string, parametri?: Parametri) => string;

function èLingua(v: unknown): v is Lingua {
  return typeof v === "string" && (LINGUE as readonly string[]).includes(v);
}

/** Dalla lingua del telefono: se è una delle nostre, quella; altrimenti l'italiano. */
export function linguaDelTelefono(): Lingua {
  const codice = typeof navigator === "undefined" ? "" : (navigator.language ?? "").slice(0, 2).toLowerCase();
  return èLingua(codice) ? codice : LINGUA_PREDEFINITA;
}

/** Lingua scelta dall'utente su questo telefono; se non ha scelto, quella del telefono. */
export function leggiLingua(): Lingua {
  try {
    const v = localStorage.getItem(CHIAVE);
    if (èLingua(v)) return v;
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
    if (typeof voce === "string") return riempi(voce, parametri);
    const n = Number(parametri?.n ?? 0);
    const forma = n === 0 && voce.zero !== undefined ? "zero" : plurali.select(n);
    return riempi(voce[forma as keyof typeof voce] ?? voce.other, parametri);
  };
}

/** Per i componenti: `const t = usaT(dizionari)`; cambia da sola con la lingua. */
export function usaT<D extends Record<string, Voce>>(dizionari: Dizionari<D>): Traduttore<D> {
  return traduttore(dizionari, usaLingua());
}
