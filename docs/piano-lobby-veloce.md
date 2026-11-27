# Piano: partita veloce con elenco di stanze («lobby»)

Studio e piano, nessuna implementazione. Si cancella a lavoro finito (regola in `docs/decisioni.md:8`); le scelte vanno poi nella voce «Partita veloce a stanze aperte» di `docs/decisioni.md:266` e nei README dei giochi.

**Richiesta**: chi tocca «Partita veloce» vede l'**elenco delle stanze aperte** di quel gioco, filtrabile, ognuna con il suo codice, e sceglie dove entrare oppure apre una stanza nuova con le sue impostazioni. Quindi **più stanze aperte per gioco**.

## 1. Stato attuale (modello «coda»)

| Dove | Cosa fa oggi |
|---|---|
| `apps/server/src/veloce.ts:278-282` | `salaAperta`: restituisce la **prima** stanza del gioco con posti liberi (ordine d'inserimento della `Map`). |
| `apps/server/src/veloce.ts:284-294` | `anteprima`: codice, organizzatore, posti, occupati, config, squadre, attesaMs. Manca il tempo residuo (`scade`) e il momento. |
| `apps/server/src/stanze.ts:141-176` | `entraVeloce`: con `codice` entra in quella stanza (`salaCambiata` se piena/sparita, :158); con `apri` **rifiuta se esiste già una sala aperta** (`salaApertaNelFrattempo`, :161); senza nulla entra nella prima o ne apre una di base (:163). |
| `apps/server/src/stanze.ts:179-183` | `anteprimaDi`: una sola anteprima (o null) per gioco. |
| `apps/server/src/index.ts:208-210` | messaggio `anteprimaVeloce` → risposta `anteprima` (singolare), solo su richiesta: nessun push. |
| `apps/server/src/index.ts:211-237` | `veloce` / `coda` (alias, :212 e :215): in caso di corsa manda errore + anteprima aggiornata (:223-226). |
| `apps/server/src/index.ts:33` | `MAX_STANZE = 300`, globale per tutte le stanze (normali e veloci); nessun limite per telefono, nessun rate limit. |
| `apps/server/src/index.ts:306-321` | orologio da 1 s che fa scorrere attese, conti e grazie (`tick`, `veloce.ts:221`). |
| `apps/server/src/veloce.ts:24-28` | grazia 30 s, sala scaduta 60 s, vita massima 15 min (anti «fantasma» già presente). |
| `packages/engine/src/online.ts:42-104` | contratto `PartitaVeloceOnline` (posti, anticipato, squadre, `configVeloce`), `AperturaVeloce`, `ATTESE_VELOCE_MS`, `AnteprimaVeloce`. |
| `packages/collegamento/src/index.ts:95-108, 261-275` | hook: `anteprima` (una), `chiediAnteprima`, `entraVeloce(nome, {codice?, apri?})`, `riprendiVeloce`. |
| `packages/collegamento/src/ApriVeloce.tsx:54-219` | una schermata: nome, poi **o** la scheda della stanza aperta («Entra», :107-119) **o** il modulo per aprirne una (:121-198). `semplice` (:56) = Tris: un tocco, `entraVeloce(nome)` senza anteprima (:91). |
| `packages/collegamento/src/SalaVeloce.tsx:53-56` | `linkVeloce` = `/<gioco>?veloce=1`, `veloceDaIndirizzo`. |
| Giochi | Tris `games/tic-tac-toe/src/online/gioco.ts:162` (`posti: [2]`); Ultima! `games/ultima/src/online/gioco.ts:372` (2–10, anticipato); Scopa `games/scopa/src/online/gioco.ts:291-298` ([2,4], coppie); Burraco `games/burraco/src/online/gioco.ts:328-332` ([2,4], coppie). UI delle impostazioni in `games/{ultima,scopa,burraco}/src/ui/ImpostazioniVeloce.tsx`. |

**Perché non basta.** Con una sola sala per gioco chi vuole Burraco a 2 trova una stanza a 4 da 3005 punti e può solo entrare o tornare indietro; non può aprire la sua finché l'altra non si riempie o scade (fino a 15 min). Con Ultima! (2–10 posti, 2 modi di punteggio, 4 varianti) le combinazioni sono tante: una sola sala obbliga tutti alle scelte del primo arrivato.

## 2. Decisioni da prendere con l'utente

| # | Decisione | Opzioni | Raccomandazione |
|---|---|---|---|
| D1 | Quante stanze aperte per gioco | a) illimitate (vale solo `MAX_STANZE`); b) limite per gioco (es. 20); c) limite per gioco + per telefono | **c**: max 20 sale veloci aperte per gioco (sotto `MAX_STANZE`, che resta il tetto globale) e **una sola sala aperta per connessione/token** (già vero: `index.ts:213` rifiuta `giaInSala`). Errore nuovo `troppeStanzeVeloci` → «Ci sono già molte stanze: entra in una». |
| D2 | Cosa mostra la scheda | organizzatore, occupati/totali, attesa residua, impostazioni, squadre, codice | Tutto: **nome dell'organizzatore**, **posti 2/4** (con barra), **tempo che resta** (nuovo campo `restaMs` + `momento`), **riepilogo impostazioni** (`riepilogo` del gioco già esiste), **modo squadre**, **codice** in piccolo. Niente altri nomi oltre all'organizzatore. |
| D3 | Filtri, per quali giochi | generici (posti, squadre, attesa) + specifici del gioco | Generici dal contratto: **posti** (se `posti.length > 1`), **squadre** (se il gioco ne ha). Specifici dichiarati dal gioco: Scopa soglia 11/21; Burraco obiettivo e scarti; Ultima! modo di punteggio (+ «senza varianti»). Tempo d'attesa: **no** come filtro (si ordina). Tris: nessun filtro. |
| D4 | Ordinamento di default | più piene prima / più recenti / che partono prima | **Più vicine a partire**: prima chi ha meno posti liberi, poi meno tempo residuo. Chi aspetta di più viene servito prima. |
| D5 | Il «un tocco» classico | a) eliminarlo; b) pulsante «Entra nella prima adatta» sopra l'elenco; c) solo Tris resta un tocco | **b + c**: Tris (`semplice`) resta identico (un tocco, nessun elenco); negli altri giochi sopra l'elenco c'è «Entra nella prima adatta» (rispetta i filtri; se non c'è nessuna stanza adatta apre la schermata «Apri stanza» con i filtri come impostazioni iniziali). |
| D6 | Aggiornamento dell'elenco | a) ricarica a mano; b) polling ogni N s; c) push dal server a chi guarda l'elenco | **c**: chi apre l'elenco si «iscrive» al gioco (`guardaVeloce`), il server manda `elencoVeloce` a ogni cambiamento, al massimo una volta al secondo (sfrutta l'orologio di `index.ts:307`). Il tempo residuo lo conta la UI, come fa già la sala (`VistaSalaVeloce.restaMs`). Pulsante «Aggiorna» comunque presente se la connessione cade. |
| D7 | Privacy | solo organizzatore / tutti i nomi | **Solo il nome dell'organizzatore** e il numero dei presenti (come oggi). Nessun nome degli altri, nessun dato di rete. |
| D8 | Anti-abuso | rate limit, limite per telefono, scadenza, fantasmi | Già c'è: grazia 30 s, scadenza, vita 15 min, sala vuota che si chiude. Da aggiungere: **una sala aperta per connessione** (già), **limite per gioco** (D1), **rate limit** semplice per connessione su `veloce`/`anteprimaVeloce`/`guardaVeloce` (es. 10 messaggi in 10 s, poi `troppeRichieste`). Limite per IP: **no** per ora (in WiFi di casa tutti hanno lo stesso IP). |
| D9 | Stanze private | a) tutte pubbliche; b) opzione «solo con codice» | **a per ora**: la partita privata esiste già («Ho un codice» / stanza normale). Eventuale «nascosta dall'elenco» dopo, è un campo di `AperturaVeloce`. |
| D10 | Il link `/<gioco>?veloce=1` | apre l'elenco / entra nella prima | **Apre l'elenco** del gioco. Valutare un link a una stanza precisa (`/<gioco>?veloce=CODICE`) che mostra la sua scheda con «Entra». |

## 3. Modifiche tecniche per strato

**Contratto `@gdt/engine`** (`packages/engine/src/online.ts`)
- `AnteprimaVeloce` (:95): aggiungere `momento: MomentoSala`, `restaMs: number`, `minimo: number | null` (per Ultima! «può partire con 3»).
- Nuovo, facoltativo in `PartitaVeloceOnline`: `filtri?(config: unknown): Record<string, string | number | boolean>`; il gioco riduce la sua config a **chiavi confrontabili** (Scopa `{ soglia }`, Burraco `{ obiettivo, pila }`, Ultima! `{ modo, varianti: bool }`). Il server lo usa per «la prima adatta», la UI per filtrare. Nessun descrittore di UI nel contratto (resta TypeScript puro): le etichette le mette il gioco.
- `FiltroVeloce = { posti?: number; squadre?: ModoSquadre; config?: Record<string, …> }` e funzione pura `adatta(anteprima, filtro, v)` in engine, condivisa da server e UI (niente codice duplicato).

**Server** (`apps/server`)
- `veloce.ts`: `salaAperta` (:279) → `saleAperte(stanze, gioco)` ordinate come D4; `salaAperta` resta come «prima adatta» con `filtro`. `anteprima` (:284) aggiunge `momento`, `restaMs` (riceve `ora`), `minimo`.
- `stanze.ts`: `entraVeloce` (:141) toglie `salaApertaNelFrattempo` (:161); con `apri` controlla il limite per gioco; senza codice né apertura usa `opz.filtro`. `anteprimaDi` (:179) → `elencoDi(stanze, gioco, ora)`.
- `index.ts`: nuovi messaggi `guardaVeloce { gioco }` / `smettiDiGuardare`, risposta push `elencoVeloce { gioco, stanze: AnteprimaVeloce[] }`; mappa `osservatori: gioco → Set<WebSocket>`; un flag «sporco» per gioco messo da `applicaEffetto`/`chiudiStanza`/`entraVeloce`, svuotato dall'orologio da 1 s. `anteprimaVeloce` resta (risponde con la prima, per i client vecchi). Rate limit per connessione. Errore di corsa (:223) → manda `elencoVeloce`.

**`@gdt/collegamento`**
- `index.ts`: `elenco: AnteprimaVeloce[] | undefined`, `guardaElenco()` / `smetti()`, `entraVeloce(nome, { codice? | apri? | filtro? })`. `riprendiVeloce` (:270) invariato.
- Nuovo `ElencoVeloce.tsx`: nome in cima, barra filtri (chip, comprimibile), «Entra nella prima adatta», lista di schede (D2) con «Entra», in fondo «Apri una stanza nuova». `ApriVeloce.tsx` diventa solo il modulo di apertura (le parti :121-198), con iniziali presi dai filtri. Il percorso `semplice` (:56, :91) resta.
- Locali `src/locales/{it,en}.ts`: `filtri`, `nessunaStanzaAdatta`, `entraPrimaAdatta`, `apriNuova`, `restaTempo`, `errore_troppeStanzeVeloci`, `errore_troppeRichieste`; togliere `errore_salaApertaNelFrattempo` (:70/:72) dopo una versione.

**Giochi** (Ultima!, Scopa, Burraco; Tris non cambia)
- `src/online/gioco.ts`: aggiungere `filtri(config)` accanto a `configVeloce`.
- `src/ui/ImpostazioniVeloce.tsx`: aggiungere a `ImpostazioniVeloce` un `disegnaFiltri(filtro, cambia)` facoltativo che **riusa gli stessi campi** di `disegna` con l'opzione «Qualsiasi»; i testi nei `locales` del gioco.
- `*Online.tsx`: passare a `ElencoVeloce` le stesse props di oggi (`veloce`, `impostazioni`, `riepilogo`).

**Rientro e link**: il token per sala (`chiaveUltimaVeloce`, `collegamento/src/index.ts:63`) non cambia: chi è in una sala rientra in quella, l'elenco serve solo prima. `veloceDaIndirizzo` apre l'elenco (D10).

## 4. Compatibilità

- **Si rompe**: `veloce.test.ts:222-227` (`salaApertaNelFrattempo`); `:206-220` («sala piena → nuova», ora è «più sale»); le e2e `burraco-veloce`, `scopa-veloce`, `ultima-veloce` (oggi il secondo telefono vede la scheda singola e tocca «Entra nella stanza»); `tris-coda.spec.ts` non dovrebbe cambiare; README Tris/Scopa/Burraco/Ultima! (sezione «Partita veloce»), `docs/decisioni.md:266`, `games/impostore/README.md:34`.
- **PWA vecchie in cache**: `anteprimaVeloce`/`anteprima` restano (prima sala adatta), `veloce` senza filtro entra nella prima o apre: funzionano come oggi. Il client vecchio che manda `apri` mentre esiste una sala ora la **apre** (prima veniva rifiutato): accettabile. Alias `coda`/`esciDaCoda` (`index.ts:212, 239`): si possono togliere in questa versione (erano previsti «per una versione», ormai passate) oppure tenerli; raccomando di toglierli in un passo a parte.
- **Partite in corso**: le stanze sono in memoria; il deploy le azzera comunque. Il formato delle sale non cambia, si aggiungono solo campi.

## 5. Passi

| # | Passo | Verifica | Rischio | Stima |
|---|---|---|---|---|
| 1 | Engine: campi nuovi di `AnteprimaVeloce`, `FiltroVeloce`, `adatta()`, `filtri?` nel contratto | test unitari engine (`online.test.ts`): `adatta` con posti, squadre, config | basso | piccolo |
| 2 | Server: `saleAperte` ordinate, `anteprima` con `restaMs`/`momento`, `elencoDi` | `veloce.test.ts`: 3 sale di Ultima! con occupati/tempi diversi → ordine D4; giochi non mescolati; sale piene escluse | basso | piccolo |
| 3 | Server: `entraVeloce` senza `salaApertaNelFrattempo`, limite per gioco, «prima adatta» con filtro | test: due `apri` di seguito → due sale; 21ª → `troppeStanzeVeloci`; filtro posti 2 salta la sala da 4; `codice` di sala piena → `salaCambiata` | medio (corse) | piccolo |
| 4 | Giochi: `filtri(config)` in Scopa, Burraco, Ultima! | test del server per gioco (`scopa.test.ts`, `burraco.test.ts`, `ultima.test.ts`): prima adatta per soglia/obiettivo/modo | basso | piccolo |
| 5 | `index.ts`: `guardaVeloce`, push `elencoVeloce` con flag sporco a 1 s, rate limit, `anteprimaVeloce` compatibile | test puri sul limitatore (estrarlo in un modulo `limiti.ts`); prova a mano con due schede | medio | medio |
| 6 | Collegamento: hook (`elenco`, `guardaElenco`), `ElencoVeloce.tsx`, `ApriVeloce` ridotto, locali it/en | typecheck; screenshot 375 px scuro/chiaro + `ui-mobile-checklist` (elenco vuoto, 1 stanza, 10 stanze, filtri aperti) | medio (UI) | grande |
| 7 | Giochi: `disegnaFiltri` + collegamento in `*Online.tsx`, locali | screenshot di ogni gioco; Tris invariato (un tocco) | medio | medio |
| 8 | E2E: riscrivere `ultima/scopa/burraco-veloce.spec.ts` (il secondo telefono sceglie la stanza dall'elenco per codice); nuove: due stanze di Burraco (2 e 4) aperte insieme, filtro che ne nasconde una, «prima adatta», elenco che si aggiorna da solo quando una stanza si riempie | progetti `coda-scuro`/`coda-chiaro` (`apps/web/playwright.config.ts:21-22`), solo 375×812. Le stanze sono globali: ogni test cerca la **sua** stanza per codice o nome organizzatore unico, non «la prima» | alto (flakiness) | medio |
| 9 | Doc: README dei 4 giochi, `decisioni.md:266`, `impostore/README.md:34`; CHANGELOG, versione minore | lettura | basso | piccolo |
| 10 | (separato) togliere alias `coda`/`esciDaCoda` e `errore_salaApertaNelFrattempo` | test server | basso | piccolo |

## 6. Rischi aperti e domande

- **Test e2e paralleli**: con più sale per gioco un test può entrare nella sala di un altro test se usa «prima adatta». Le e2e devono entrare per codice; i test di «prima adatta» devono usare impostazioni uniche (es. Burraco 3005 punti, scarti bloccati) o restare seriali.
- **Frammentazione**: con pochi giocatori online, più stanze = più attese a vuoto (3 stanze da 1 persona invece di una da 3). La «prima adatta» e l'ordinamento D4 attenuano; valutare un avviso «C'è già una stanza simile: entri lì?» quando si apre una stanza con gli stessi filtri di una esistente.
- **Carico del push**: con 20 sale × molti osservatori l'invio ogni secondo è piccolo (JSON di poche righe), ma va limitato agli osservatori del gioco e solo quando qualcosa cambia.
- **Domande per l'utente**: D1 (limite 20 per gioco?), D3 (quali filtri specifici, attesa come filtro o no), D5 (tenere «Entra nella prima adatta»?), D6 (push o ricarica a mano), D9 (stanze nascoste dall'elenco), D10 (link a stanza precisa), e se togliere ora l'alias `coda`.
