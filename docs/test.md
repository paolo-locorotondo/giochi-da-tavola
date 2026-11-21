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
| `packages/preferenze` | impostazioni dei giochi salvate; ordine scelto di un elenco (voci nuove in fondo, voci sparite e doppioni ignorati, spostamento su e giù, salvataggi non validi) |
| `packages/engine` | numeri casuali con seme, elenco giocatori (nomi vuoti, doppi, maiuscole), codice partita |
| `games/impostore` | partita dal seme, validazione dei campi, sessione a un telefono, parole (formato e duplicati), parole recenti, tutta la partita online (`regole.test.ts`: stanza, carte, indizi scritti, voto, ballottaggio, tentativo, privacy della vista) |
| `games/lupus` | distribuzione dei ruoli per 4–20 giocatori, candidati della notte, risoluzione della notte, voto e ballottaggio, vittoria, partite intere con molti semi |
| `games/tabu` | punti del turno, alternanza delle squadre, fine e pareggio, qualità delle carte, nomi di default |
| `games/tic-tac-toe` | le 8 linee vincenti, pareggio, mosse non valide, «difficile» che non perde mai e pareggia contro sé stesso, riproducibilità con un seme |
| `games/burraco` | tris e scale (asso alto e basso, niente angolo, 2 naturale, una sola matta) con confronto con una ricerca esaustiva, burraco pulito/semipulito/sporco, attacco che non sposta le matte; distribuzione, turno, monte libero e bloccato, pozzetto in diretta e con lo scarto (anche della coppia), chiusura (burraco, matta, scarto), fine tallone, stallo, punteggio; bot: 200 mani solo bot a 2 e 4 giocatori (livelli e monte), stesso seme stessa mano, mosse solo da dati pubblici; modulo online (config, permessi, viste senza carte altrui né pozzetti, mano a punti, riproducibilità) e offline; server: stanza a 2 e 4, bot dell'organizzatore, rientro. Gli e2e `burraco-bot` e `burraco-online` sono scritti ma ancora da eseguire |
| `games/ultima` | mazzo da 108 carte, giocabilità, effetti di Salta/Inverti/+2/Jolly, prima carta speciale, sfida del +4 (vinta e persa), «Ultima!» e «Beccato!», mazzo esaurito, punteggio; bot (priorità, sfida, colore, «Ultima!») e partite intere giocate solo dai bot con molti semi e da 2 a 10 giocatori; modulo offline contro i bot (partita sul telefono, vista senza mani altrui, nessun bot che gioca per me, partite intere a ogni livello, «Beccato!» con ritardo minimo) e modulo online (config, permessi, vista senza carte altrui né esito segreto della sfida, round a punti, riproducibilità con il seme) |
| `games/scopa` | mazzo da 40 e distribuzione (6 mani a 2, 3 a 4), prese (presa singola obbligatoria, somme con ordine stabile, tavolo grande), scelta della presa (mancante, valida, non valida), scopa (anche non valida all'ultima giocata), ultima presa, 40 carte sempre contate; punti (primiera con i valori e nulla senza un seme, carte, denari, settebello, pari, coppie, totale ≤ 4 + scope); bot (scopa, settebello, memoria, mosse lecite a ogni livello, difficile > facile su 120 partite); offline (2 e 4 posti, partite intere a ogni livello) e online (config, permessi, scambio delle coppie, vista senza carte altrui né prese in corso, soglia e pari, riproducibilità) |
| `games/dadi` | lancio sempre valido e riproducibile con un seme, distribuzione uniforme anche col generatore crittografico, valori personalizzati, qualità dei modelli |
| `games/duello-lampo` | scaletta dalle mani di ogni mini gioco (di fila, 0 = non si usa; ordine del registro, scelto dall'utente o a caso: tutti i 6 ordini possibili con tre mini giochi, riproducibile con il seme, nuovo a ogni rivincita; elenco salvato completato e ripulito), controllo delle mani, punti (anche negativi con gli errori), errori che contano −1 per ogni mini gioco, spareggio scelto a caso tra i mini giochi della sfida, pari e spareggio, regole di ogni mini gioco (partenza anticipata, risposta sbagliata, pari, chi non tocca; Colore giusto con parola e inchiostro diversi, griglie di Trova il panda / lo smile in cui a ogni passo cambiano esattamente N caselle (con il bersaglio solo all'ultimo passo, tra quelle che cambiano), figure dritte o senza rotazione, cambi che continuano dopo la comparsa senza toccare il bersaglio, impostazioni (valori di base, valori non ammessi, limiti che dipendono da altre impostazioni, ogni valore dà un round coerente), parole di Colori e nomi che combaciano solo alla fine, sequenza della memoria senza ripetizioni di fila; Bersagli con bersagli uguali per lo stesso seme, mai due vivi nella stessa cella, tocco colpito / già colpito / a vuoto, vincitore per colpi e poi per tempo, una sola penalità per round; Il più grande con numeri distinti, scarto minimo tra i due più grandi per ogni combinazione di impostazioni, giusto / sbagliato / nessun tocco; e2e: impostazioni e partita di entrambi, con screenshot a 375 px nei due temi), scelta a caso |
| `apps/server` | permessi di ogni azione, token, codici stanza, rientro, privacy della vista per ogni telefono; partita veloce (`veloce.test.ts`): attesa, conto, scaduta, avvio anticipato, grazia di 30 s, squadre, nomi uguali, corse tra anteprima e aggancio, coerenza delle dichiarazioni `veloce` di ogni gioco (tempo iniettato, nessun timer vero); Scopa (`scopa.test.ts`): 2 e 4 posti, coppie in sala, mano segreta, «Simula mossa», partita intera a 4 |

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
server non raggiungibile. Per la home: ricerca, **ordinamento dei giochi con le frecce** (salvataggio, «Annulla»,
«Ordine alfabetico») e **barra in alto sempre visibile** scorrendo. Per Duello Lampo (`duello-lampo.spec.ts`):
preparazione (mani, impostazioni di ogni mini gioco, ordine a caso o scelto), ogni mini gioco con i suoi casi
(partenza anticipata, risposta sbagliata, bersaglio che compare mentre la griglia continua a cambiare), errori che
contano −1, partita intera fino alla rivincita e barra dell'app nascosta durante la partita.

Partita veloce (più contesti del browser, progetti seriali `coda-scuro` e `coda-chiaro` perché le stanze
veloci aperte sono condivise dal server): `tris-coda.spec.ts` (due telefoni → partita avviata, «Esci dalla sala»,
refresh in attesa che tiene il posto) e `ultima-veloce.spec.ts` (Anna apre 4 posti a punti, Bruno vede l'anteprima
ed entra, Carla entra, «Apri adesso con 3 giocatori»; stanza da 3 che parte da sola). Negli screenshot della sala
si mascherano il tempo che scorre e il codice. I tempi lunghi (attesa, conto, grazia) si provano solo negli unit test.

Gli screenshot con elementi che cambiano nel tempo (le griglie dei «trova», il numero casuale di tocchi) si
confrontano **mascherando** la parte che cambia (`maschera` in `schermata`), altrimenti il confronto è instabile.
Dopo una modifica alla barra in alto o al numero di versione cambiano gli screenshot di tutte le schermate (la
versione è scritta in fondo): si rigenerano con `pnpm test:e2e:aggiorna` e si guardano a campione.

Non coprono: il **doppio tocco** vero con due dita sullo stesso schermo (Duello Lampo: si prova a mano su un
telefono), la barra fissa sotto il notch e i pulsanti in basso sopra la barra dei gesti, la partita online di
Impostore con più telefoni (la sua logica è nei test unitari di `online/regole` e
`apps/server`; il collegamento vero è nei "punti aperti" di [decisioni.md](decisioni.md)), la voce del narratore e
l'installazione/uso offline (si provano con `docker compose up`).
