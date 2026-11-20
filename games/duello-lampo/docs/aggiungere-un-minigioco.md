# Aggiungere un mini gioco a Duello Lampo

Guida per chi sviluppa. Un mini gioco è fatto di due parti separate:

- le **regole** (TypeScript puro, senza grafica né tempo reale): decidono chi vince e si provano con i test;
- la **vista** (React): disegna la metà di schermo di un giocatore e riporta il suo risultato.

Le due parti non si conoscono: le collega solo l'`id` del mini gioco.

## Cosa serve

Esempio: «Tocco lento», vince chi aspetta di più prima di toccare dopo il via.

### 1. Le regole

Crea `src/minigiochi/lento.ts` con un oggetto `MiniGioco<Config, Risultato>` (`prepara` riceve anche le impostazioni, qui nessuna):

```ts
import { confronta, type MiniGioco } from "./tipi";

export interface ConfigLento { dopoMs: number }
export interface RisultatoLento { ms: number }

export const lento: MiniGioco<ConfigLento, RisultatoLento> = {
  id: "lento",
  prepara: (rng, _imp) => ({ dopoMs: 2000 + rng.intero(2000) }), // tutta la casualità passa da qui
  durataMassima: (c) => c.dopoMs + 3000,
  chiudeAlPrimo: false,
  vincitore: (_c, [a, b]) =>
    confronta("ms" in a ? a.ms : 0, "ms" in b ? b.ms : 0, "maggiore"),
};
```

- `prepara(rng)`: i parametri del round, **uguali per i due giocatori**. Qualsiasi numero casuale va preso da `rng`, mai da `Math.random()`: così il round si ripete identico nei test.
- `durataMassima(config)`: dopo quanti millisecondi il round si chiude comunque.
- `chiudeAlPrimo`: `true` se il round finisce appena uno dei due ha un risultato (come «Via!»); `false` se si aspettano entrambi o il tempo massimo.
- `vincitore(config, [basso, alto])`: restituisce `0` (chi sta in basso), `1` (chi sta in alto) o `null` (pari). Chi non ha finito in tempo vale `NESSUNO`: va sempre considerato.
- `confronta(a, b, "minore" | "maggiore", soglia?)` aiuta a confrontare due numeri; sotto la soglia il risultato è pari.

### Impostazioni (facoltative)

Un mini gioco può avere delle impostazioni, scelte nella preparazione. Si dichiarano nell'oggetto e arrivano a `prepara` già complete e valide:

```ts
export const lento: MiniGioco<ConfigLento, RisultatoLento> = {
  id: "lento",
  impostazioni: [
    { tipo: "scelta", chiave: "attesa", valori: [2, 3, 5], base: 3, formato: "secondi" },
    { tipo: "interruttore", chiave: "difficile", base: false },
  ],
  prepara: (rng, imp) => ({ dopoMs: numero(imp, "attesa") * 1000 + rng.intero(2000) }),
  …
};
```

- `scelta`: un numero tra `valori` (`formato`: `"numero"`, `"secondi"` o `"griglia"` per «n×n»). Con `massimo(valori)` il limite dipende da un'altra impostazione (es. le caselle che cambiano non superano quelle della griglia).
- `interruttore`: sì/no. Con `disattivo(valori)` si spegne quando un'altra impostazione lo rende inutile.
- **Metti nel `Config` tutto ciò che serve alla vista** (es. `durataMs`, `caselle`): la vista non legge mai le impostazioni.
- Il valore `base` deve dare lo stesso gioco di prima, così le sfide già salvate non cambiano.
- Testi: `mg_<id>_imp_<chiave>` per il titolo (per le impostazioni a livelli, come la velocità, anche `mg_<id>_imp_<chiave>_<valore>`).
- Test: `prepara` con ogni valore ammesso dà un `Config` coerente.

### 2. Il registro delle regole

In `src/minigiochi/index.ts` aggiungi `lento` all'elenco `MINIGIOCHI`. **L'ordine dell'elenco è l'ordine di partenza** di «Il mio ordine» (con «A caso» l'ordine cambia a ogni sfida); un mini gioco nuovo va in fondo anche nelle scelte già salvate. Scelta, scaletta e salvataggio usano il registro da soli.

### 3. I test

In `src/logica.test.ts` aggiungi un `describe` per il nuovo mini gioco: chi vince, i pari, chi non risponde (`NESSUNO`), e che `prepara` dia gli stessi parametri con lo stesso seme. Per provarli: `pnpm --filter @gdt/duello-lampo test`.

### 4. La vista

Crea `src/ui/minigiochi/LentoVista.tsx`. Riceve queste proprietà (`VistaProps`):

| Proprietà | Significato |
|---|---|
| `config` | i parametri preparati da `prepara` |
| `lato` | `0` basso, `1` alto |
| `inizio` | `performance.now()` del momento in cui il round è partito: il tempo zero comune |
| `principale` | `true` solo in una delle due viste: serve per i suoni che devono suonare una volta sola |
| `onRisultato(r)` | da chiamare **una sola volta**, quando il giocatore ha finito |

Regole per la vista:

- Per i tempi usa `performance.now()` e `inizio`, non l'ora del computer.
- La zona di tocco usa la classe `dl-zona`, un `<button>` con `data-suono="no"` e il gestore `onPointerDown` (non `onClick`, che aggiunge ritardo).
- Il colore non è mai l'unico segnale: scrivi sempre anche un testo.
- Stili in `src/ui/duello.css`, solo con i token (`var(--…)`), niente colori scritti a mano.
- Esporta anche una funzione `descrivi…` che trasforma il risultato in un testo breve per la schermata dell'esito (es. «320 ms»).

Poi aggiungi la vista a `VISTE` in `src/ui/minigiochi/index.ts`, con la stessa `id`:

```ts
lento: { Vista: LentoVista, descrivi: descriviLento },
```

### 5. I testi

In `src/locales/it.ts` e `src/locales/en.ts` aggiungi le chiavi `mg_lento_nome` e `mg_lento_regola` (e quelle dei testi della vista). Le chiavi devono essere uguali nelle due lingue: lo verifica il compilatore.

### 6. Controlli finali

- `pnpm -r typecheck` e `pnpm test:unit`.
- In `apps/web/e2e/duello-lampo.spec.ts` un test del nuovo mini gioco, con gli screenshot a 375 px in tema scuro e chiaro (`pnpm test:e2e:aggiorna` per generarli la prima volta, poi guardarli).
- Aggiorna `docs/test.md` e la tabella dei mini giochi nel [README](../README.md).
- Nella preparazione il nuovo mini gioco compare da solo, con il suo selettore delle mani.

## Perché è fatto così

- Regole e vista separate: le regole si provano senza browser e saranno le stesse se un giorno si farà la versione online (vedi «Online» nel [README](../README.md)).
- Ogni giocatore misura il proprio tempo sul proprio lato dello schermo, quindi non conta chi ha il telefono «più veloce».
