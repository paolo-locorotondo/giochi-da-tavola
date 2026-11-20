/**
 * Un ordine scelto dall'utente per un elenco di voci (es. i giochi della home), salvato su questo
 * telefono. Senza un ordine salvato vale l'ordine «naturale» dato dal chiamante (es. alfabetico).
 * Le funzioni pure stanno qui sotto e si provano senza browser; `leggiOrdine` / `scriviOrdine`
 * sono il solo punto che tocca localStorage.
 */

/**
 * Mette le voci nell'ordine salvato: prima quelle presenti in `salvato`, nel suo ordine; poi, in
 * fondo e nell'ordine naturale, quelle nuove che il salvataggio non conosceva. Le voci del
 * salvataggio che non esistono più si ignorano. Senza salvataggio resta l'ordine naturale.
 */
export function applicaOrdine<T>(voci: readonly T[], id: (v: T) => string, salvato: readonly string[] | null): T[] {
  if (!salvato) return [...voci];
  const perId = new Map(voci.map((v) => [id(v), v]));
  const visti = new Set<string>();
  const ordinate: T[] = [];
  for (const k of salvato) {
    const v = perId.get(k);
    if (v !== undefined && !visti.has(k)) {
      visti.add(k);
      ordinate.push(v);
    }
  }
  return [...ordinate, ...voci.filter((v) => !visti.has(id(v)))];
}

/** Sposta la voce `k` di un posto su (−1) o giù (+1); se non si può, restituisce l'elenco com'è. */
export function spostaVoce(elenco: readonly string[], k: string, verso: -1 | 1): string[] {
  const i = elenco.indexOf(k);
  const j = i + verso;
  if (i < 0 || j < 0 || j >= elenco.length) return [...elenco];
  const nuovo = [...elenco];
  [nuovo[i], nuovo[j]] = [nuovo[j] as string, nuovo[i] as string];
  return nuovo;
}

/** Legge un salvataggio: un elenco di stringhe, oppure `null` (nessun ordine scelto, o dati non validi). */
export function decodificaOrdine(grezzo: string | null): string[] | null {
  if (!grezzo) return null;
  try {
    const v: unknown = JSON.parse(grezzo);
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) return null;
    return v as string[];
  } catch {
    return null;
  }
}

const chiaveOrdine = (nome: string) => `gdt-ordine-${nome}`;

/** L'ordine salvato su questo telefono, o `null` se si usa quello naturale. */
export function leggiOrdine(nome: string): string[] | null {
  try {
    return decodificaOrdine(localStorage.getItem(chiaveOrdine(nome)));
  } catch {
    return null;
  }
}

/** Salva un ordine; con `null` lo toglie (si torna all'ordine naturale). */
export function scriviOrdine(nome: string, ordine: readonly string[] | null): void {
  try {
    if (ordine === null) localStorage.removeItem(chiaveOrdine(nome));
    else localStorage.setItem(chiaveOrdine(nome), JSON.stringify(ordine));
  } catch {
    /* archivio non disponibile: vale per questa visita */
  }
}
