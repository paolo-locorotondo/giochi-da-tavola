# Test

Due livelli, entrambi automatici. Prima di pubblicare: `pnpm typecheck`, `pnpm test`, `pnpm build`.

| Comando | Cosa fa |
|---|---|
| `pnpm test` | Tutto: test unitari e test grafici |
| `pnpm test:unit` | Solo i test unitari di ogni pacchetto (Vitest), pochi secondi |
| `pnpm test:e2e` | Solo i test grafici nel browser (Playwright), circa un minuto |
| `pnpm test:e2e:aggiorna` | Rigenera gli screenshot di riferimento dopo un cambio voluto della grafica |
| `pnpm coverage` | Test unitari con rapporto di copertura (cartella `coverage/`, non versionata) |

La prima volta i test grafici chiedono il browser: `pnpm --filter @gdt/web exec playwright install chromium`.

## Test unitari: dove stanno e cosa coprono

Ogni pacchetto ha i suoi test accanto al codice (`*.test.ts`), perché la logica è TypeScript puro e
deterministico: stesso seme, stesso risultato, nessuna rete e nessun browser.

| Pacchetto | Cosa si verifica |
|---|---|
| `packages/engine` | numeri casuali con seme, elenco giocatori (nomi vuoti, doppi, maiuscole), codice partita |
| `games/impostore` | partita dal seme, validazione dei campi, sessione a un telefono, parole (formato e duplicati), parole recenti, tutta la partita online (`regole.test.ts`: stanza, carte, indizi scritti, voto, ballottaggio, tentativo, privacy della vista) |
| `games/lupus` | distribuzione dei ruoli per 4–20 giocatori, candidati della notte, risoluzione della notte, voto e ballottaggio, vittoria, partite intere con molti semi |
| `games/tabu` | punti del turno, alternanza delle squadre, fine e pareggio, qualità delle carte, nomi di default |
| `apps/server` | permessi di ogni azione, token, codici stanza, rientro, privacy della vista per ogni telefono |

Regole del progetto per i test:

- Le regole di gioco e di validazione stanno **fuori dalla UI** (es. `validaConfigurazione`, `candidatiNotte`,
  `nomiSquadre`), così si provano senza browser e la UI si limita a mostrarle.
- Per ogni regola si prova il caso valido, ogni rifiuto con il suo messaggio e i valori limite.
- Le partite intere con molti semi (`for` su 20–25 semi) cercano stati impossibili che un caso scritto a mano non trova.
- I dati (parole, carte) hanno test di forma: niente duplicati, niente voci vuote, numero minimo.

## Test grafici (Playwright)

File in `apps/web/e2e/`; configurazione in `apps/web/playwright.config.ts`.

- Telefono da **375 × 812 px** (touch) in due progetti: **scuro** e **chiaro**. Ogni test gira in entrambi i temi.
- Parte da solo il server di sviluppo (porta 5199). `Math.random` è fisso (`aiuti.ts`), quindi parole, ruoli e carte
  sono sempre gli stessi e gli screenshot si possono confrontare.
- Ogni schermata passa da `schermata(page, nome)` che, prima dello screenshot, controlla **nessuno scorrimento
  orizzontale** e **bersagli alti almeno 44 px**.
- Gli screenshot di riferimento stanno in `apps/web/e2e/__screenshots__/{scuro,chiaro}/` e sono versionati.
  Sono generati su **Windows**: su un altro sistema operativo il testo si disegna in modo diverso e il confronto può
  fallire. In quel caso non si cambia il test: si rigenerano con `pnpm test:e2e:aggiorna` sul sistema in uso.
- Quando cambi la grafica di proposito: `pnpm test:e2e:aggiorna`, **guarda le immagini cambiate** e poi salvale.
- Le cartelle `playwright-report/` e `test-results/` sono prodotti dell'ultima esecuzione e non vanno salvate.

Cosa coprono: menu e tema, ogni schermata di Impostore (un telefono), Lupus e Tabù, gli errori di validazione, il
ripristino dopo refresh, "Chiudi la partita" con conferma, il timer di Tabù (orologio simulato) e il messaggio di
server non raggiungibile.

Non coprono: la partita online di Impostore con più telefoni (la sua logica è nei test unitari di `online/regole` e
`apps/server`; il collegamento vero è nei "punti aperti" di [decisioni.md](decisioni.md)), la voce del narratore e
l'installazione/uso offline (si provano con `docker compose up`).
