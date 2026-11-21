# Piano di lavoro — Partita veloce a stanze aperte (più di 2 giocatori)

Stato: **proposta, da approvare** (2026-11-21). Origine: voce TODO «Partita veloce a stanze aperte» in [decisioni.md](decisioni.md). Nessuna riga di codice scritta.

Serve a Ultima! (2–10), ai giochi di carte da 4 che arrivano (Burraco, Scopa, Briscola a coppie) e deve tenere il Tris (2 fissi) senza regressioni.

## 1. Stato attuale

| Pezzo | Cosa fa oggi | Limite |
|---|---|---|
| `GiocoOnline.coda?: { giocatori: number }` (`packages/engine/src/online.ts`) | Il gioco dichiara una dimensione fissa del gruppo. | Niente min/max, niente squadre, niente impostazioni. |
| `apps/server/src/coda.ts` (`Code<C>`) | Fila per gioco, puramente in memoria; quando la fila arriva a `giocatori` toglie il gruppo. Scadenza 2 min (`ATTESA_CODA_MS`), max 50 in fila. | Nessuna stanza finché il gruppo non è completo: niente organizzatore, niente sala, niente avvio anticipato. |
| `creaStanzaDaCoda` (`stanze.ts`) | Crea la stanza con **tutti i nomi** (`nuovoStato(nomi, {})`), siede i telefoni ai posti 1..n in ordine di arrivo, il primo è organizzatore, esegue `avvia`. | Config sempre `{}`. |
| `index.ts` | Messaggi `coda` / `esciDaCoda`, risposte `inCoda` / `codaScaduta`; alla chiusura del socket il telefono esce dalla fila; controllo scadenze ogni 5 s. | Chi blocca lo schermo perde la fila (il client si rimette in coda **in fondo**). |
| `@gdt/collegamento` | `cercaAvversario(nome)`, `annullaCoda()`, stato `inCoda`/`codaScaduta`; al rientro rimanda `coda`. | Nessun concetto di sala d'attesa veloce. |
| Tris UI (`TrisOnline.tsx` → `PartitaVeloce`) | Nome → «Cerca un avversario» → «In coda…» → partita già avviata. | Testi solo nel Tris. |
| Ultima! | Nessuna partita veloce. Ha `config { modo, soglia }` validata da `leggiConfig`; `nuovoStato` vuole nomi distinti e 2–10 nomi; `avvia` vuole tutti i posti occupati. | — |
| Impostore | Nessuna partita veloce (gioco in presenza con parole da dire a voce). | — |
| e2e | `tris-coda.spec.ts` (2 contesti), nei progetti seriali `coda-scuro`/`coda-chiaro` perché la fila è globale. | — |

Osservazione chiave: **i moduli dei giochi non hanno bisogno di ricevere i nomi uno alla volta**. Basta che la sala d'attesa veloce viva **nel server, fuori dallo stato del gioco**, e che lo stato del gioco si crei solo all'avvio con tutti i nomi raccolti, come fa già `creaStanzaDaCoda`. Così `nuovoStato`, `applica`, `avvia` dei giochi restano come sono e la migrazione è quasi tutta nel server e nel client.

## 2. Progetto

### 2.1 Idea in breve

1. «Partita veloce» → il telefono chiede un'**anteprima**: c'è una stanza veloce aperta di quel gioco con posti liberi?
2. Se sì, vede le impostazioni (posti, organizzatore, modo di punteggio, squadre, tempo d'attesa) e tocca **«Entra»**. Se no, compila le impostazioni e tocca **«Apri una stanza veloce»**, e ne diventa organizzatore. Giochi senza impostazioni e con posti fissi (Tris) saltano l'anteprima: un tocco e si entra o si apre.
3. La stanza esiste **subito** (codice e token come le altre): refresh e schermo bloccato si risolvono con il token, come nelle stanze con codice.
4. Sala d'attesa veloce (vista generica dal server) finché non parte; all'avvio il server crea lo stato del gioco, siede i telefoni e manda la vista del gioco.

### 2.2 Contratto in `@gdt/engine` (tipi esatti)

Nuovo blocco in `packages/engine/src/online.ts`; `coda?` sparisce (passo 3, dopo un periodo in cui convivono).

```ts
/** Come si formano le squadre in una stanza veloce. */
export type ModoSquadre = "arrivo" | "caso" | "scelte";

/** Il gioco supporta la «partita veloce a stanze aperte». */
export interface PartitaVeloceOnline {
  /**
   * Quanti posti può avere una stanza veloce, in ordine crescente, senza doppioni.
   * Un solo valore = posti fissi (Tris [2], Burraco [4]); più valori = li sceglie chi apre
   * (Scopa [2, 4], Ultima! intervalloPosti(2, 10)).
   */
  posti: readonly number[];
  /**
   * L'organizzatore può aprire prima che la stanza sia piena, con un numero di giocatori che sta
   * in `posti` (es. Ultima!: con 3 su 6). Falso o assente = si parte solo a stanza piena.
   * Non si può avere insieme a `squadre`.
   */
  anticipato?: boolean;
  /**
   * Le squadre per quel numero di posti: i posti di ogni squadra. null = ognuno per sé.
   * Scopa: (n) => n === 4 ? [[1, 3], [2, 4]] : null.
   */
  squadre?(posti: number): readonly (readonly number[])[] | null;
  /**
   * Controlla le impostazioni scelte da chi apre (arrivano dalla rete) e le completa con il numero
   * di giocatori che partono. Il risultato va a `nuovoStato(nomi, config)`. Lancia un errore
   * (codice da mostrare) se non sono valide. Si chiama all'apertura (con i posti) e all'avvio
   * (con i giocatori effettivi).
   */
  configVeloce(grezza: unknown, giocatori: number): unknown;
}

export interface GiocoOnline<Stato, Azione extends { tipo: string }, Vista> {
  // … tutto come oggi …
  /**
   * Partita veloce: il server tiene la sala d'attesa fuori dallo stato del gioco; all'avvio chiama
   * `nuovoStato(nomi, veloce.configVeloce(config, n))`, siede i telefoni ai posti 1..n e manda
   * l'azione `avvia` per conto dell'organizzatore. Il gioco non deve sapere altro.
   */
  veloce?: PartitaVeloceOnline;
}

/** [min, min+1, …, max]: per i giochi con un intervallo di giocatori. */
export function intervalloPosti(min: number, max: number): number[];

/** Cosa sceglie chi apre una stanza veloce (arriva dalla rete: il server lo controlla). */
export interface AperturaVeloce {
  posti: number;
  config: unknown;
  /** Solo se il gioco ha squadre per quei posti; altrimenti ignorato. */
  squadre?: ModoSquadre;
  /** Uno di ATTESE_VELOCE_MS. */
  attesaMs: number;
}

/** Tempi d'attesa che si possono scegliere: 1, 2, 3, 5 minuti. Predefinito 2 (come la coda di oggi). */
export const ATTESE_VELOCE_MS = [60_000, 120_000, 180_000, 300_000] as const;
export const ATTESA_VELOCE_PREDEFINITA_MS = 120_000;
/** L'avviso «tra 10 secondi». */
export const CONTO_VELOCE_MS = 10_000;

/** Riepilogo di una stanza veloce aperta, mostrato prima di agganciarsi. */
export interface AnteprimaVeloce {
  codice: string;
  organizzatore: string;
  posti: number;
  occupati: number;
  /** Già passata da `configVeloce`: la UI del gioco sa leggerla. */
  config: unknown;
  squadre: ModoSquadre | null;
  attesaMs: number;
}

export type MomentoSala = "attesa" | "conto" | "scaduta";

/** La sala d'attesa veloce vista da un telefono (generica per tutti i giochi). */
export interface VistaSalaVeloce {
  gioco: string;
  codice: string;
  momento: MomentoSala;
  /** Millisecondi che mancano alla scadenza dell'attesa o del conto (la UI li conta da sé). */
  restaMs: number;
  posti: number;
  /** Con quanti si può aprire prima (null = solo a stanza piena). */
  minimo: number | null;
  config: unknown;
  attesaMs: number;
  squadre: ModoSquadre | null;
  /** Squadre del gioco per `posti` (stesse di `squadre()`), per disegnarle. */
  postiSquadre: readonly (readonly number[])[] | null;
  host: boolean;
  /** In ordine di arrivo. */
  giocatori: {
    id: number; // numero d'arrivo, stabile, non il token
    nome: string;
    io: boolean;
    organizzatore: boolean;
    collegato: boolean;
    /** Indice in `postiSquadre`; null senza squadre o con «a caso» (si decide all'avvio). */
    squadra: number | null;
  }[];
}
```

Perché così:
- `posti: number[]` copre fissi, scelta tra pochi valori (Scopa 2 o 4) e intervalli senza tre tipi diversi.
- I nomi «uno alla volta» li tiene il server; i giochi ricevono ancora tutti i nomi all'avvio: **nessun cambio** a `nuovoStato`/`applica` di Tris e Ultima!.
- `configVeloce` riusa la validazione che il gioco ha già (`leggiConfig` di Ultima!), così le varianti future di Ultima! (piano parallelo) entrano da sole nella partita veloce.
- Le squadre sono solo **una mappa posti → squadra**: il server decide chi siede dove, il gioco continua a ragionare per posti (Scopa: compagni 1–3 e 2–4, come nel suo piano).

### 2.3 Macchina a stati della stanza veloce (server)

Modulo **puro** nuovo `apps/server/src/veloce.ts` (sostituisce `coda.ts`): tempo e connessioni entrano come parametri, così si prova senza rete né timer veri.

```ts
interface Arrivato { id: number; token: string; nome: string; squadra: number | null; arrivo: number; assenteDal: number | null }
interface SalaVeloce {
  gioco: string;
  apertura: AperturaVeloce;   // posti, config pulita, squadre, attesaMs
  momento: MomentoSala;
  scade: number;              // ms: fine attesa, fine conto, o chiusura della «scaduta»
  arrivati: Arrivato[];       // [0] = organizzatore
  aperta: number;             // per il limite di vita
}
```

Il campo `sala: SalaVeloce | null` va in `Stanza` (`stanze.ts`); finché c'è, `stato` è `null` e la stanza **non** accetta `azione`. Le sale stanno nella stessa mappa `stanze` (codici unici, stesso limite `MAX_STANZE`).

Stati e passaggi (`n` = arrivati, `P` = posti, `m` = minimo = `posti[0]` del gioco se `anticipato`, altrimenti `P`):

| Da | Evento | Condizione | A | Effetto |
|---|---|---|---|---|
| — | `apri` | nessuna sala aperta del gioco con posti liberi | `attesa` | `scade = ora + attesaMs` |
| `attesa`/`conto`/`scaduta` | `aggancia` | `n < P` | stesso | nome reso distinto; se `n` diventa `P` → **avvio** (salvo «scelte in sala», vedi sotto) |
| `attesa` | `apriAdesso` (host) | `anticipato` e `n ≥ m` | — | **avvio** con `n` |
| `attesa` | tempo | `n ≥ m`, `n < P` | `conto` | `scade = ora + 10 s`; avviso all'organizzatore |
| `attesa` | tempo | `n < m` | `scaduta` | `scade = ora + 60 s`; avviso all'organizzatore |
| `conto` | tempo | — | — | **avvio** con `n` |
| `conto` | `apriAdesso` (host) | — | — | **avvio** con `n` |
| `conto` | `annullaAvvio` (host) | — | `attesa` | nuova attesa piena (`scade = ora + attesaMs`) |
| `conto` | esce qualcuno | `n < m` | `scaduta` | |
| `scaduta` | `aspettaAncora` (host) | vita < 15 min | `attesa` | `scade = ora + attesaMs` |
| `scaduta` | arriva qualcuno | `n ≥ m` | `conto` | (il tempo era già finito: vale la regola dei 10 s) |
| `scaduta` | tempo | — | chiusa | tutti ricevono `fuoriSala { motivo: "scaduta" }` |
| qualsiasi | `esci` / assente oltre la grazia | resta qualcuno | stesso | posto liberato; se usciva l'organizzatore, lo diventa il prossimo in ordine d'arrivo; se si era in `conto`, il conto riparte da 10 s per il nuovo organizzatore |
| qualsiasi | `esci` dell'ultimo | — | chiusa | |
| qualsiasi | `chiudiSala` (host) | — | chiusa | tutti ricevono `fuoriSala { motivo: "chiusa" }` |

**Avvio** (funzione `avviaSala`, sostituisce `creaStanzaDaCoda`): ordine dei posti → `nuovoStato(nomi, configVeloce(config, n))` → `occupa` per ognuno → `avvia` a nome dell'organizzatore → `sala = null`. Da qui la stanza è una stanza normale: chi entra col codice è spettatore, `riprendi`, `sollecita`, `chiudi` come oggi.

Ordine dei posti:
- senza squadre: ordine di arrivo (posto 1 = primo arrivato = organizzatore, come oggi nel Tris);
- `arrivo`: l'i-esimo arrivato va al posto i (con Scopa/Burraco: 1° e 3° compagni, 2° e 4° compagni; si vede in sala man mano);
- `caso`: rimescolati all'avvio con `randomInt` del server; in sala le squadre si mostrano «da sorteggiare»;
- `scelte`: chi arriva va nella squadra con meno persone; ognuno può passare all'altra se c'è posto (`squadra`), l'organizzatore può spostare chiunque; all'avvio ogni squadra riempie i suoi posti in ordine d'arrivo. Con «scelte», quando la sala si riempie **non** parte subito ma entra in `conto` (10 s, visibile a tutti) per lasciare il tempo di sistemarsi; l'organizzatore può «Apri adesso».

Limiti e controlli: `posti` dell'apertura deve stare in `veloce.posti`; `attesaMs` in `ATTESE_VELOCE_MS` (assente = 2 min); `squadre` ammesso solo se `veloce.squadre(posti)` non è null (assente = `arrivo`); `anticipato` con `squadre` non nulle è un errore del modulo del gioco (test). Un telefono sta in una sola sala. Vita massima di una sala: 15 min. Il vecchio limite `MAX_IN_CODA` sparisce (il limite è `MAX_STANZE`).

### 2.4 Timer

- **Un solo `setInterval` da 1 s** in `index.ts` che chiama `tick(sala, ora, connesso)` per ogni sala; `tick` è puro e restituisce l'effetto: `niente | aggiorna | avvia | chiudi(motivo)`. Niente `setTimeout` per stanza da annullare (meno casi di bordo).
- Il client riceve `restaMs` e conta da sé con un intervallo locale; a ogni cambio di stato il server rimanda la vista, quindi lo scarto massimo è circa 1 s.
- **Grazia per chi si scollega in sala: 30 s** (`GRAZIA_SALA_MS`). Il socket chiuso non libera subito il posto (schermo bloccato, cambio di rete); `tick` segna `assenteDal` e libera dopo 30 s. «Esci» libera subito. Il heartbeat (ping 25 s) resta com'è.

### 2.5 Messaggi di rete

Dal telefono (`DaClient`, `stanze.ts` e specchio in `@gdt/collegamento`):

```ts
| { t: "anteprimaVeloce"; gioco: string }
| { t: "veloce"; gioco: string; nome: string; codice?: string; apri?: AperturaVeloce }
| { t: "esciDaSala" }
| { t: "sala"; comando: "apriAdesso" | "annullaAvvio" | "aspettaAncora" | "chiudiSala" }
| { t: "sala"; comando: "squadra"; id: number; squadra: number }   // id = chi spostare (sé stessi, o chiunque se organizzatore)
// compatibilità con i client di prima (PWA in cache), da togliere dopo una versione:
| { t: "coda"; gioco?: string; nome: string }   // = veloce senza codice né apri
| { t: "esciDaCoda" }                           // = esciDaSala
```

Regole di `veloce`: con `codice` = «entro in quella che ho visto»; se nel frattempo si è riempita o chiusa → `errore: salaCambiata` + nuova `anteprima`. Con `apri` = «apro io»; se nel frattempo se n'è aperta una → `errore: salaApertaNelFrattempo` + nuova `anteprima` (chi ha scelto impostazioni non finisce in silenzio in una stanza diversa). Senza nessuno dei due (Tris): entra nella prima o apre con le impostazioni di base (`configVeloce({}, posti[0])`, attesa 2 min).

Dal server (`DaServer`):

```ts
| { t: "anteprima"; gioco: string; sala: AnteprimaVeloce | null }
| { t: "benvenuto"; codice: string; token: string }     // come oggi, arriva subito all'aggancio
| { t: "salaVeloce"; sala: VistaSalaVeloce }             // al posto di `vista` finché non si parte
| { t: "vista"; vista: unknown }                          // come oggi, dall'avvio
| { t: "fuoriSala"; motivo: "uscito" | "scaduta" | "chiusa" }
```

`inCoda` e `codaScaduta` spariscono (al loro posto `salaVeloce` e `fuoriSala { motivo: "scaduta" }`).

`entra` con codice di una stanza **ancora in sala veloce**: con un token che la sala conosce = rientro (rimanda `salaVeloce`); con un token sconosciuto = `errore: stanzaVeloce` («Questa è una partita veloce: entra da Partita veloce»). Le stanze veloci restano separate da quelle con codice; dopo l'avvio chi arriva col codice è spettatore, come oggi.

### 2.6 Client `@gdt/collegamento`

`Collegamento<V>` cambia così:

```ts
sala: VistaSalaVeloce | null;           // in sala d'attesa veloce
anteprima: AnteprimaVeloce | null | undefined; // undefined = non ancora chiesta
fuoriSala: "uscito" | "scaduta" | "chiusa" | null;
chiediAnteprima(): void;
entraVeloce(nome: string, opzioni?: { codice?: string; apri?: AperturaVeloce }): void;
esciDaSala(): void;
comandoSala(c: ComandoSala): void;
// tolti: inCoda, codaScaduta, cercaAvversario, annullaCoda
```

Il rientro dopo schermo bloccato diventa quello normale (`entra` con codice e token, già salvati al `benvenuto`): sparisce `nomeInCoda` e il «rimettersi in coda in fondo». All'arrivo di `vista` si azzera `sala`; a `fuoriSala` si cancella il token e l'URL torna a `/<gioco>`.

### 2.7 UI della sala d'attesa

Componente **condiviso** `packages/collegamento/src/SalaVeloce.tsx` (+ `AnteprimaVeloce.tsx` per «Entra / Apri»), con i suoi testi in `packages/collegamento/src/locales/{it,en}.ts` (stesse chiavi, `Dizionari<typeof it>`), così Tris, Ultima!, Scopa e Burraco hanno la stessa sala senza ripetere testi. Il gioco passa solo:

```tsx
<SalaVeloce c={c} riepilogo={(config) => string} />          // il gioco traduce la sua config
<ApriVeloce c={c} veloce={ultimaOnline.veloce} impostazioni={<ImpostazioniUltima …/>} />
```

`@gdt/collegamento` aggiunge la dipendenza `@gdt/i18n` e `lucide-react` (già nel monorepo). Stile: classi esistenti (`schermata`, `btn`, `btn primario`, accordion della stanza, chip giocatori con pallino + testo), solo token CSS, secondo `ui-giochi-da-tavola`.

Schermate (verifica a 375 px, scuro e chiaro, checklist `ui-mobile-checklist`):

1. **Partita veloce** (nome): campo «Il tuo nome», sotto l'anteprima. Se c'è una sala: scheda «Stanza di Anna · 3 posti su 6 · Partita a punti fino a 500 · Coppie in ordine di arrivo · Attesa 2 minuti» e primario **«Entra nella stanza»**. Se non c'è: impostazioni del gioco (quelle della creazione: si riusa il componente), posti (radio se ≤ 4 valori, altrimenti stepper − / + come Ultima!), squadre (radio, solo se il gioco ne ha), tempo d'attesa (radio 1/2/3/5 min) e primario **«Apri una stanza veloce»**. Tris: nessuna scheda, il primario resta «Cerca un avversario».
2. **Sala d'attesa**: titolo, riepilogo impostazioni, «Aspetto altri 3 giocatori» (plurale), conto alla rovescia testuale con `role="timer"` aggiornato al più ogni 5 s per lo screen reader (`aria-live` solo sugli avvisi), elenco arrivati (chip con «organizza», «tu», collegato/assente), a squadre due gruppi «Squadra A / Squadra B» con posti vuoti tratteggiati e, con «scelte in sala», «Passa nella squadra B». Organizzatore: «Apri adesso con 3 giocatori» (se ammesso), «Chiudi la stanza» (pericolo, separato). Tutti: «Esci dalla sala».
3. **Avviso del conto** (organizzatore; gli altri vedono una riga informativa): testo dell'utente, contatore grande, «Apri adesso» (primario), «Continua ad aspettare» (annulla).
4. **Scaduta** (organizzatore): «Nessuno è arrivato in tempo», «Aspetta ancora», «Gioca con un solo telefono» (se il gioco lo ha), «Chiudi la stanza».

Testi (italiano; l'inglese ha le stesse chiavi):

| Chiave | it | en |
|---|---|---|
| `partitaVeloce` | Partita veloce | Quick match |
| `veloceTesto` | Scrivi il tuo nome: entri nella prima stanza aperta, oppure ne apri una tu. | Enter your name: you join the first open room, or open one yourself. |
| `stanzaDi` | Stanza di {nome} | {nome}'s room |
| `postiOccupati` | {n} posti su {tot} | {n} of {tot} seats |
| `entraNellaStanza` | Entra nella stanza | Join the room |
| `apriStanzaVeloce` | Apri una stanza veloce | Open a quick room |
| `quantiPosti` | Quanti giocatori | How many players |
| `squadreTitolo` | Squadre | Teams |
| `squadreArrivo` / `squadreCaso` / `squadreScelte` | In ordine di arrivo / A caso / Scelte in sala | In order of arrival / Random / Chosen in the room |
| `tempoAttesa` | Tempo d'attesa | Waiting time |
| `minuti` | {one: "1 minuto", other: "{n} minuti"} | {one: "1 minute", other: "{n} minutes"} |
| `salaAttesa` | Sala d'attesa | Waiting room |
| `aspettoAltri` | {one: "Aspetto un altro giocatore", other: "Aspetto altri {n} giocatori"} | {one: "Waiting for one more player", other: "Waiting for {n} more players"} |
| `restano` | Ancora {tempo} | {tempo} left |
| `apriAdesso` | Apri adesso | Start now |
| `apriAdessoCon` | Apri adesso con {n} giocatori | Start now with {n} players |
| `avvisoConto` | Il tempo d'attesa è esaurito, la partita verrà aperta in automatico tra {s} secondi con i giocatori attualmente in stanza | Waiting time is over: the game will start automatically in {s} seconds with the players in the room |
| `contoAltri` | La partita parte tra {s} secondi | The game starts in {s} seconds |
| `continuaAspettare` | Continua ad aspettare | Keep waiting |
| `scadutaTitolo` | Nessuno è arrivato in tempo | Nobody arrived in time |
| `aspettaAncora` | Aspetta ancora | Wait longer |
| `chiudiStanza` | Chiudi la stanza | Close the room |
| `esciDallaSala` | Esci dalla sala | Leave the room |
| `organizza` / `tu` / `collegato` / `assente` | organizza / tu / collegato / assente | host / you / online / away |
| `squadraN` | Squadra {lettera} | Team {lettera} |
| `daSorteggiare` | Le squadre si sorteggiano all'avvio | Teams are drawn at start |
| `passaInSquadra` | Passa nella squadra {lettera} | Move to team {lettera} |
| `postoLibero` | Posto libero | Free seat |
| `fuoriScaduta` | La stanza veloce è scaduta: nessuno è arrivato in tempo. | The quick room expired: nobody arrived in time. |
| `fuoriChiusa` | L'organizzatore ha chiuso la stanza. | The host closed the room. |
| `errore_salaCambiata` | La stanza si è riempita: eccone un'altra | That room filled up: here is another |
| `errore_salaApertaNelFrattempo` | Nel frattempo si è aperta una stanza: entra o torna indietro | A room opened meanwhile: join it or go back |
| `errore_stanzaVeloce` | Questa è una partita veloce: entra da «Partita veloce» | This is a quick match: join from «Quick match» |
| `errore_giaInSala` / `errore_postiNonValidi` / `errore_attesaNonValida` / `errore_pochiPerAprire` / `errore_soloHostSala` | … | … |

Gli errori di sala li traduce il componente condiviso; quelli di `configVeloce` restano del gioco (`errore_configNonValida` c'è già).

## 3. File che cambiano

### Condivisi

| File | Cosa |
|---|---|
| `packages/engine/src/online.ts` | `PartitaVeloceOnline`, `ModoSquadre`, `AperturaVeloce`, `AnteprimaVeloce`, `VistaSalaVeloce`, `MomentoSala`, costanti dei tempi, `intervalloPosti`; campo `veloce?` in `GiocoOnline`; poi tolto `coda?`. |
| `packages/engine/src/index.ts` | export dei nuovi tipi e funzioni. |
| `packages/engine/src/online.test.ts` (nuovo) | `intervalloPosti`. |
| `apps/server/src/veloce.ts` (nuovo, puro) | macchina a stati, `nomeDistinto`, ordine dei posti con squadre, `tick`. |
| `apps/server/src/veloce.test.ts` (nuovo) | vedi §5. |
| `apps/server/src/coda.ts`, `coda.test.ts` | **cancellati** (i casi del Tris passano in `veloce.test.ts`). |
| `apps/server/src/stanze.ts` | `Stanza.sala`, `stato` nullo in sala, `avviaSala` al posto di `creaStanzaDaCoda`, `nomiDistinti` riscritto su `nomeDistinto`, nuovi `DaClient`/`DaServer`, `eseguiAzione` rifiuta in sala, `vistaSalaDi`. |
| `apps/server/src/index.ts` | gestione dei nuovi messaggi e degli alias `coda`/`esciDaCoda`, `aggiornaTutti` manda `salaVeloce` o `vista`, `entra` su sala veloce, tick da 1 s, chiusura del socket non toglie più dalla sala (lo fa la grazia). |
| `apps/server/src/giochi.ts` | invariato (Burraco/Scopa aggiungono la loro riga come sempre). |
| `packages/collegamento/src/index.ts` | nuovi messaggi e stato (§2.6). |
| `packages/collegamento/src/SalaVeloce.tsx`, `ApriVeloce.tsx`, `locales/{it,en,index}.ts`, `sala-veloce.css` (nuovi) | UI condivisa. |
| `packages/collegamento/package.json` | dipendenze `@gdt/engine`, `@gdt/i18n`, `lucide-react`. |
| `apps/web/playwright.config.ts` | i progetti seriali `coda-*` prendono anche i nuovi spec veloci (`testMatch: /-coda|veloce/`). |
| `apps/web/src/*` | nulla, salvo importare il CSS condiviso se non lo importa già il gioco. |
| Doc | `docs/architettura-tecnica.md` (sala veloce, grazia, tempi), `docs/decisioni.md` (voce FATTO), `CHANGELOG.md`, versione in `apps/web/package.json`. |

### Giochi esistenti

- **Tris**: `veloce: { posti: [2], configVeloce: () => ({}) }` al posto di `coda`. UI: `PartitaVeloce` di `TrisOnline.tsx` usa `entraVeloce(nome)` e `<SalaVeloce>`; si tolgono le chiavi `inCoda*`, `codaScaduta`, `errore_giaInCoda`, `errore_codaPiena` dai locali del Tris. Comportamento visibile: «Cerca un avversario» → sala d'attesa con «Aspetto un altro giocatore» → la partita parte da sola appena arriva il secondo, il primo è X e organizzatore (identico a oggi). Differenze: l'URL ha il codice già in attesa, e un refresh in attesa **non** fa perdere il posto. README del Tris aggiornato.
- **Ultima!**: `veloce: { posti: intervalloPosti(MIN_GIOCATORI, MAX_GIOCATORI), anticipato: true, configVeloce: (g) => leggiConfig(g) }`. UI: pulsante «Partita veloce» nella schermata di creazione, estrarre le impostazioni di punteggio da `Crea` in un componente riusato da `ApriVeloce`, riepilogo con le chiavi esistenti `riepilogoSingolo`/`riepilogoPunti`. Nessuna modifica a logica e `gioco.ts` oltre al campo `veloce`. Attenzione all'agente delle **varianti**: le nuove opzioni vanno in `leggiConfig` e nel componente delle impostazioni, così arrivano anche qui.
- **Impostore**: niente (nessuna partita veloce; il campo è facoltativo).

### Giochi nuovi

- **Scopa**: `veloce: { posti: [2, 4], squadre: (n) => (n === 4 ? [[1, 3], [2, 4]] : null), configVeloce: (g, n) => leggiConfig({ ...(g as object), posti: n }) }`. Niente `anticipato` (una stanza da 4 non diventa da 2). Il suo piano già prevede «Coppie» in sala per le stanze con codice: quella scelta resta nel gioco; nella partita veloce le coppie le decide il server **prima** dell'avvio, quindi il gioco non deve fare nulla in più.
- **Burraco** (4 a coppie, eventualmente 2): `veloce: { posti: [4] /* o [2, 4] */, squadre: (n) => (n === 4 ? [[1, 3], [2, 4]] : null), configVeloce }`.
- **Briscola a coppie** (dopo): come Burraco.
- Regola per tutti: `nuovoStato` deve accettare i nomi resi distinti dal server (suffisso « (2)») e l'`avvia` mandato dal server a stanza piena; `configVeloce(grezza, n)` deve accettare `{}` (Tris: «impostazioni di base»).

## 4. Passi di implementazione

Ordine pensato per unire a main **il contratto prima** che gli altri agenti implementino Scopa e Burraco.

1. **Contratto (da unire subito, piccolo, senza comportamento)**: tipi e costanti in `@gdt/engine`, `intervalloPosti` con test, campo `veloce?` **accanto** a `coda?` (marcato `@deprecated`). Tris dichiara anche `veloce`. Typecheck e test verdi, nessun cambio visibile: versione invariata, voce in «Non rilasciato». Da qui Scopa e Burraco possono dichiarare `veloce` (inerte finché il server non lo usa).
2. **Server puro** `veloce.ts` + `veloce.test.ts` (tutti i casi di §5 con un gioco finto a squadre e con Tris/Ultima! veri).
3. **Server cablato**: `stanze.ts`, `index.ts`, alias dei vecchi messaggi, tick, `entra` su sala; via `coda.ts` e il campo `coda?`. I test del server esistenti restano verdi.
4. **Client**: `@gdt/collegamento` (stato e messaggi) e componenti condivisi con locali.
5. **Tris migrato**: UI e `tris-coda.spec.ts` aggiornato; verifica visiva a 375 px.
6. **Ultima!**: dichiarazione, UI d'apertura, `ultima-veloce.spec.ts`; verifica visiva.
7. **Doc e versione**: README di Tris e Ultima!, `architettura-tecnica.md`, `decisioni.md`, CHANGELOG; versione **minor** (funzione nuova), tag annotato.

I passi 2–7 possono andare in un solo ramo; il passo 1 da solo e prima.

## 5. Test

**Unit server (`veloce.test.ts`, tempo iniettato, nessun timer vero)**

- Aggancio alla prima sala aperta del gioco; giochi diversi non si mescolano; sala piena → la successiva o una nuova.
- Tris: due arrivi → avvio, posto 1 al primo e organizzatore, vista già in partita (i casi di `coda.test.ts` di oggi).
- Ultima! 6 posti: 3 arrivi, `apriAdesso` → partita a 3 con `config` dell'apertura; `apriAdesso` con 1 → `pochiPerAprire`; solo l'organizzatore può.
- Tempo: `attesa` → `conto` (n ≥ m) → avvio dopo 10 s; `annullaAvvio` → nuova attesa; arrivo che riempie durante il conto → avvio immediato; uscita durante il conto sotto il minimo → `scaduta`.
- `scaduta`: `aspettaAncora` riapre; arrivo che porta al minimo → `conto`; tempo → chiusura; vita oltre 15 min → niente più rinnovi.
- Organizzatore che esce → lo diventa il secondo arrivato; il conto riparte; l'ultimo che esce chiude.
- Grazia: socket chiuso 29 s → posto tenuto e rientro col token; 31 s → posto libero.
- Nomi: «Anna», «anna», «ANNA» → «Anna», «anna (2)», «ANNA (3)»; nome vuoto rifiutato; nome lungo tagliato.
- Squadre: `arrivo` (1°+3° contro 2°+4°), `caso` (con seme finto, ogni giocatore in un solo posto), `scelte` (assegnazione equilibrata all'arrivo, spostamento solo se c'è posto, l'organizzatore sposta altri, a sala piena parte il conto non l'avvio).
- Validazioni: posti fuori da `veloce.posti`, attesa non ammessa, squadre su gioco senza squadre, `configVeloce` che lancia → errore e nessuna sala.
- `entra` con codice di una sala: token noto = rientro, sconosciuto = `stanzaVeloce`; dopo l'avvio = spettatore.
- `eseguiAzione` in sala → errore; alias `coda` del vecchio client → aggancio.
- Moduli dei giochi: ogni `veloce` dichiarato ha `posti` crescenti e validi per `nuovoStato`, `configVeloce({}, n)` accettato per ogni `n`, `anticipato` mai con squadre (un test che gira su `GIOCHI_ONLINE`).

**E2e (Playwright, più contesti, progetti seriali `coda-*`)**

- `tris-coda.spec.ts` aggiornato: due telefoni → partita avviata, X al primo; annulla → di nuovo il nome; **nuovo**: refresh del primo in attesa e poi arrivo del secondo → stessa partita.
- `ultima-veloce.spec.ts`: Anna apre (4 posti, a punti 200, attesa 1 min) → Bruno vede l'anteprima con «Stanza di Anna · 1 posto su 4 · …» ed entra → Carla entra → Anna «Apri adesso con 3 giocatori» → tutti al tavolo, 7 carte ciascuno. Secondo test: 3 posti, la partita parte da sola al terzo. Screenshot di nome, anteprima, apertura, sala (organizzatore e ospite) nei due temi.
- I tempi (attesa, conto, grazia) **solo** negli unit test: il server vero non si fa scorrere nel tempo e le attese minime sono di 1 minuto.
- Squadre in e2e (4 contesti) quando arriva il primo gioco a coppie (Scopa o Burraco), nel suo spec.

## 6. Domande per l'utente (con la risposta consigliata)

1. **Tempo scaduto con meno del minimo** (di solito l'organizzatore da solo): bot, prolungare o chiudere? *Consiglio*: niente bot nella prima versione (online Ultima! non ha giocatori-bot, solo «Simula mossa»; Scopa e Burraco non li hanno ancora); all'organizzatore «Nessuno è arrivato in tempo» con **«Aspetta ancora»**, «Gioca con un solo telefono» (dove c'è), «Chiudi la stanza»; senza risposta la stanza si chiude dopo 60 s. Il campo `bot` si aggiunge al contratto quando un gioco li avrà online.
2. **Organizzatore che esce prima dell'avvio**: *Consiglio*: passa al prossimo in ordine di arrivo (la sala non si perde per chi aspetta); si chiude solo se esce l'ultimo. Se succede durante l'avviso dei 10 s, l'avviso riparte da 10 per il nuovo organizzatore.
3. **Tempo d'attesa: chi lo sceglie e con che valori**: *Consiglio*: l'organizzatore all'apertura, tra **1, 2, 3, 5 minuti**, base 2 (come oggi); Tris (nessuna impostazione) usa 2 minuti.
4. **«Annulla» nell'avviso dei 10 s**: *Consiglio*: vuol dire «continua ad aspettare» per un altro tempo d'attesa intero (la stanza resta aperta e «Apri adesso» resta disponibile); per buttare la stanza c'è «Chiudi la stanza».
5. **Arrivo che riempie i posti durante i 10 s**: *Consiglio*: si parte subito (vale la regola «a stanza piena»).
6. **Squadre «in ordine di arrivo»**: 1° e 3° compagni contro 2° e 4° (posti di fronte, come nel piano della Scopa), oppure 1° e 2° contro 3° e 4°? *Consiglio*: **1°+3° contro 2°+4°**, le squadre si vedono in sala man mano.
7. **Squadre «scelte in sala»: si parte appena piena?** *Consiglio*: no, a sala piena parte l'avviso di 10 s visibile a tutti per lasciare il tempo di cambiare squadra; l'organizzatore può aprire subito.
8. **Avvio anticipato nei giochi a squadre o con numeri di posti diversi** (Scopa da 4 che parte in 2): *Consiglio*: no, solo i giochi senza squadre con intervallo (Ultima!) hanno l'avvio anticipato.
9. **Impostazioni prima di agganciarsi**: si vedono e chi non le vuole può solo tornare indietro, oppure può anche «aprire una stanza sua» accanto alla prima? *Consiglio*: prima versione solo «Entra» o «Indietro» (le stanze aperte restano poche e si riempiono prima); l'altra opzione si aggiunge se serve.
10. **Schermo bloccato in sala**: *Consiglio*: il posto si tiene **30 s** dall'ultimo segnale del telefono, poi si libera; al ritorno entro quel tempo si rientra con il token, dopo si vede «La stanza è andata avanti senza di te» e si può rifare «Partita veloce».
11. **Nomi uguali**: *Consiglio*: come oggi, il secondo diventa «Anna (2)» al momento dell'aggancio (si vede subito in sala).
12. **Tris**: va bene che in attesa l'indirizzo mostri già il codice e che il refresh non faccia più perdere il posto? *Consiglio*: sì, è un miglioramento; i testi cambiano da «In coda…» a «Sala d'attesa · Aspetto un altro giocatore».
13. **Impostore in partita veloce?** *Consiglio*: no per ora (gioco in presenza).

## 7. Dimensioni

| Parte | Righe circa |
|---|---|
| Contratto engine + test | 120 |
| `veloce.ts` | 300 |
| `veloce.test.ts` | 450 |
| `stanze.ts` / `index.ts` | +180 / −80 |
| `@gdt/collegamento` (stato, messaggi) | +130 / −50 |
| Componenti condivisi + locali + CSS | 450 |
| Tris (UI, locali) | +30 / −70 |
| Ultima! (dichiarazione, UI d'apertura) | 120 |
| e2e | 200 |
| Doc | 100 |

Totale circa **2000 righe**, di cui un terzo test. Il passo 1 (contratto) è di un'ora; il resto è un lavoro medio-grande, paragonabile al modulo online di Ultima! senza il bot. Rischi principali: le corse tra anteprima e aggancio (coperte dagli errori `salaCambiata`/`salaApertaNelFrattempo`), il passaggio dell'organizzatore durante il conto, e i client in cache della versione precedente (alias `coda`/`esciDaCoda` per una versione).
