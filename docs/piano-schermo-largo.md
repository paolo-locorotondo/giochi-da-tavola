# Piano operativo: schermo largo (PC e tablet)

Stato: piano da eseguire dopo la revisione dei giochi. Da cancellare quando finito, dopo aver
spostato le scelte in `docs/decisioni.md`.

## 1. Obiettivo e criterio di «fatto»

Su PC e tablet le schermate usano più larghezza, sul telefono restano come sono.

| Larghezza | Cosa si vede |
|---|---|
| 375 px (e 360, 430) | Identico a oggi, in entrambi i temi. Nessun pixel cambia nelle e2e attuali. |
| 768 px (tablet verticale) | Contenuto largo fino a 80rem, lista giochi a 2 colonne, pulsanti al massimo 3 per riga. |
| 1024 px | Lista giochi a 3 colonne, tavoli di carte più grandi. |
| 1440 px | Contenuto fino a 80rem centrato. Testi e form a larghezza di lettura (40rem / 32rem), non stirati. |

Criterio: passano le e2e a 375 px senza nuovi snapshot; esistono screenshot a 768, 1024 e 1440 px in
entrambi i temi; nessuna pagina ha scroll orizzontale a nessuna larghezza; checklist `ui-mobile-checklist`
ok anche sulla versione larga.

## 2. Decisioni da prendere con l'utente prima di cominciare

| Decisione | Raccomandazione |
|---|---|
| Larghezza massima del contenitore | **Tetto 80rem** (1280 px), centrato. Sotto il tetto usa tutta la larghezza; sopra, margini ai lati. Alternativa «tutta la finestra»: più spazio ai tavoli ma righe di testo lunghissime. |
| Larghezza di lettura (testi, regole, form) | **40rem per i testi, 32rem per i form** (come oggi). Il contenuto largo non si stira, si centra. |
| Lista giochi a colonne | **2 colonne da 48rem, 3 da 64rem.** Le schede restano di altezza uniforme. |
| Tavoli di carte affiancati (tavolo + mano) | **No nella prima tornata.** Prima si allarga il tavolo e la mano sta sotto. Affiancare è un passo separato, solo sopra 64rem, da decidere dopo aver visto il risultato. |
| Breakpoint | **48rem (768 px) per il contenitore e le griglie; 64rem (1024 px) per la lista a 3 colonne e i tavoli.** Vedi nota sotto. |
| Progetto Playwright largo | **Un solo viewport, 1280x800**, con tema scuro e chiaro. Il tablet (768x1024) solo per poche schermate. |

Nota breakpoint: le media query non leggono `var()`, quindi `48rem` va scritto a mano nei file che lo
usano. In alternativa si può mettere `container-type: inline-size` su `.app` e usare `@container`
per le griglie interne: un solo valore nel CSS dell'app, ma i giochi che usano già le container query
(`cqw`, `cqh`) vanno controllati. Raccomandazione: `@media` con 48rem e 64rem, commentati e
elencati nella skill, perché è più prevedibile per chi modifica i giochi.

## 3. Passi

Ogni passo è un commit piccolo (versione: vedi sezione 6). A 375 px ogni passo deve dare zero differenze.

### Passo 1 - Token e contenitore (piccolo)

- Aggiungere in `apps/web/src/tema.css` (`:root`): `--larghezza-app: 80rem; --larghezza-testo: 40rem; --larghezza-form: 32rem;`.
- In `apps/web/src/index.css` (`.app`, circa riga 33): sostituire `max-width: 32rem` con `max-width: var(--larghezza-app)`; a 375 px il valore resta
  inutile perché il telefono è più stretto del tetto. Verificare: lo stesso `.app` contiene la testata
  e i giochi, quindi il tetto si allarga per tutti.
- Aggiungere la regola `@media (min-width: 48rem) { .app { ... } }` solo se serve un padding laterale diverso.
- Rischio: alto come superficie (tocca ogni schermata), basso come complessità. Stima: piccolo.
- Verifica: confronto screenshot 375 px (nessuna differenza, vedi sezione 4) e 1280 px manuale su tutte
  le home dei giochi.

### Passo 2 - Barra di ordinamento e barra fissa (piccolo)

- `apps/web/src/index.css`: `.ordina-azioni` (circa riga 748-751) ha `max-width: 32rem`: portarlo a
  `var(--larghezza-app)`. Stesso per `.barra-fissa` (circa riga 85): ha margini negativi `-1rem`, che restano validi.
- `.app--ordinamento` (circa riga 762): lo spazio sotto la lista non cambia.
- Verifica: a 1280 px la barra con i due pulsanti deve essere centrata e allineata alla lista.

### Passo 3 - Lista giochi (medio)

- `apps/web/src/index.css`, `.lista-giochi` (circa riga 515): oggi `display: grid; gap: 0.75rem` a una colonna.
  Aggiungere `@media (min-width: 48rem) { grid-template-columns: repeat(2, minmax(0, 1fr)); }` e a 64rem 3 colonne.
- La riga `.riga-gioco` (gioco + icona libro) e la scheda del gioco devono avere `min-width: 0` e
  altezza uniforme (`height: 100%` sulla scheda).
- Il banner «beta» e i badge non devono uscire dalla scheda.
- Verifica: a 375 px lista identica; a 768 px due colonne senza testo tagliato.

### Passo 4 - Limiti di lettura e form (medio)

- Testi di regole e registri: un contenitore `.testo-lettura { max-width: var(--larghezza-testo) }`. Il regolamento
  (`ui-giochi-da-tavola`: righe 35-60 caratteri, cioè ~65-70ch) va applicato a tutti i blocchi di
  testo lungo: `Regolamento` dei giochi, `AvvisoBetaTesto`, registro «Cosa è successo» (`RegistroEventi` in `packages/carte/src/tavolo`).
- Form (`packages/collegamento/src/CampoTesto.tsx`, `ContoRighe.tsx`, schermate di creazione stanza):
  `max-width: var(--larghezza-form)`. I campi restano a tutta larghezza della colonna, la colonna è
  centrata.
- Dialoghi stretti (`.impostazioni`, `.beta-avviso` con `max-width: 24rem`) NON si allargano.
- File: `apps/web/src/index.css`, `packages/collegamento/src/*.css`, `packages/collegamento/src/sala-veloce.css`.
- Rischio: righe di testo troppo corte su 1440 se il tetto è 40rem con font grande. Verificare con zoom 200%.
- Stima: medio.

### Passo 5 - Pulsanti e griglie (medio)

Le griglie `repeat(auto-fit, minmax(9.5rem, 1fr))` sopra 48rem diventano 5-7 pulsanti in fila. Regola:
limitare le colonne con `minmax(9.5rem, 1fr)` dentro `repeat(auto-fit, ...)` **più** `max-width` sul contenitore
(tetto 80rem / 9.5rem circa 8 colonne) oppure `grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))` con un `max-width: 40rem` sulla barra
dei pulsanti. Raccomandazione: un token `--larghezza-pulsanti: 40rem` per le barre di pulsanti, così i pulsanti restano 3-4 per riga.

File con griglie `auto-fit`/`9.5rem` da controllare:

| File | Riga circa |
|---|---|
| `games/ultima/src/ui/ultima.css` | 222 |
| `games/impostore/src/ui/online/online.css` | 66, 74 |
| `games/duello-lampo/src/ui/duello.css` | 230, 361 |
| `packages/carte/src/tavolo/tavolo.css` | 277 |
| `packages/collegamento/src/sala-veloce.css` | 58, 123 |

Verifica: a 768 px al massimo 4 pulsanti per riga; a 375 px invariato.

### Passo 5b - Componente adattivo per i gruppi di carte (medio-grande, richiesto dall'utente)

Oggi la dimensione delle carte si sceglie a tentativi, gioco per gioco, con `@media (min-width: 30rem)` (guarda la finestra).
L'utente vuole che la dimensione e la sovrapposizione dipendano **dallo spazio che il gruppo trova**: su PC, se c'è
spazio, le carte stanno in fila senza sovrapporsi; su telefono si sovrappongono a ventaglio; se non basta vanno a capo.

- Nuovo componente `GruppoCarte` in `packages/carte/src/ui/` (esportato da `@gdt/carte`), costruito su `Ventaglio`:
  riceve le carte, la dimensione massima e quella minima, e il numero massimo di carte per riga.
- Regola di disposizione, solo CSS con container query (`container-type: inline-size`, `100cqw`, come già fa `ventaglio.css`):
  1. se tutte le carte stanno alla dimensione massima con lo stacco pieno, in fila senza sovrapposizione;
  2. altrimenti a ventaglio, con almeno `--cg-v-min` (32 px) visibili per carta;
  3. altrimenti più righe (impaginazione di `impaginaMano`).
- Dimensione: `clamp(minima, frazione di 100cqw, massima)` invece degli scatti a 30rem; da sostituire la classe
  `cg-ventaglio-grande` e la dimensione `grande` di `CartaGrafica` (oggi in `carte.css` e `ventaglio.css`, `@media 30rem`).
- Dove usarlo: la mano (`Mano` con `ventaglio`), il riquadro della combinazione di Burraco (`DettaglioComb` in
  `games/burraco/src/ui/Tavolo.tsx`, oggi `cg-ventaglio-grande` con carte `grande`), mazzo e scarti, le colonne del tavolo
  (`ZonaCarte` `colonne`, oggi `--cg-fs-colonna` con due scatti in `games/burraco/src/ui/burraco.css`).
- Verifica: a 375 px le misure devono restare quelle di oggi (72 px nella mano, 34 px nelle colonne), quindi zero differenze
  negli screenshot; a 768 e 1280 px la mano di 11 carte di Burraco deve stare in una riga senza sovrapposizione.
- Test unitari della regola (quante carte per riga, quando si sovrappone) se una parte del calcolo va in TypeScript.

### Passo 6 - Giochi uno per uno (grande, un commit per gioco)

Per ciascun gioco: aprire la schermata a 1280x800 in tema scuro e chiaro, controllare la checklist,
poi ritoccare solo i file del gioco. Ordine dal più semplice al più complesso.

| Gioco | Cosa guardare | File principali |
|---|---|---|
| Tris | La griglia è `width: min(100%, 20rem)`: sopra 48rem il tabellone resta piccolo, valutare `min(100%, 28rem)` solo sopra 48rem. | `games/tic-tac-toe/src/ui/tris.css` (riga 32) |
| Dadi | Il contenuto è `max-width: 80%` e `100%` (righe 74-78): sul largo i dadi restano piccoli; lasciare il tetto al contenuto. | `games/dadi/src/ui/dadi.css` |
| Duello Lampo | Schermo intero `position: fixed` (riga 245), bolla `max-width: 70%` (riga 290), griglie `min(100cqw, 100cqh, N*rem)` (riga 600, 647, 761): sul largo il limite sono le altezze; verificare che il minigioco non cresca oltre 100cqh. Testi di istruzione restano a 40rem. | `games/duello-lampo/src/ui/duello.css`, `games/duello-lampo/src/ui/Preparazione.tsx` |
| Impostore | QR `width: min(60vw, 14rem)` (riga 222) va bene; liste di partecipanti in griglia (righe 66, 74): 2-3 colonne sopra 48rem. | `games/impostore/src/ui/online/online.css`, `games/impostore/src/ui/impostore.css` |
| Lupus | Solo testi e pulsanti: applicare passo 4 e 5. | `games/lupus/src/ui/LupusApp.tsx` (nessun CSS proprio, verificare) |
| Tabù | Carta della parola: `min-width: 50%` (riga 17); la carta deve avere larghezza massima (es. 28rem) e centrarsi. | `games/tabu/src/ui/tabu.css` |
| Scopa | Tavolo e mano nel componente comune: solo tetto del contenitore, niente affiancamento in questo passo. Controllare le carte a `cg-grande` (30rem). | `games/scopa/src/ui/scopa.css`, `games/scopa/src/ui/Tavolo.tsx`, `games/scopa/src/ui/ScopaOnline.tsx` |
| Burraco | Ventaglio con `@media (min-width: 30rem)` (riga 51): sul largo il ventaglio resta a righe da 9 carte? Controllare i colori degli scarti. | `games/burraco/src/ui/burraco.css`, `packages/carte/src/ui/ventaglio.css` |
| Ultima! | Mano a righe con soglia 9 carte per riga (in `ultima.css`): sul largo la soglia può salire, ma solo se resta leggibile; griglia pulsanti riga 222. | `games/ultima/src/ui/ultima.css`, `packages/carte/src/tavolo/tavolo.css` |

Passo a parte per i giochi di carte (`packages/carte`): `tavolo.css` ha `--cg-info-w: min(20rem, 100vw - 2rem)`
e la mano usa `cg-grande` con `@media (min-width: 30rem)` (in `carte.css` riga 30 e `ventaglio.css` riga 69).
Le dimensioni delle carte e la soglia 30rem si sostituiscono con il passo 5b (componente adattivo), non qui.

### Passo 7 - Progetto Playwright largo (medio)

- In `apps/web/playwright.config.ts` aggiungere due progetti: `largo-scuro` e `largo-chiaro`,
  con `use: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false }`
  e `testMatch: /largo\//` (cartella nuova `apps/web/e2e/largo/`).
- I test dei giochi esistenti restano sui progetti a 375 px: aggiungere `testIgnore: /largo\//` ai progetti esistenti.
- Snapshot: non duplicare. Un solo file per gioco (lista, una schermata di gioco), non tutti gli stati.
  Cartelle screenshot separate per progetto (già così con `{projectName}`). Soglia uguale a
  quella attuale (`maxDiffPixelRatio: 0.01`), tranne il tavolo di carte che può avere una soglia a parte.
- Non includere i test `veloce`/`coda`: le stanze veloci sono condivise, il progetto largo non va nella
  catena `dependencies` delle code.
- Comando nuovo: `pnpm --filter @gdt/web test:e2e:largo`, da aggiungere a `apps/web/package.json`
  con `--project=largo-scuro --project=largo-chiaro`.
- Stima: medio.

### Passo 8 - Skill e documentazione (piccolo)

- `.claude/skills/ui-giochi-da-tavola/SKILL.md`: nuova sezione «Larghezza» con i token `--larghezza-*`,
  i due breakpoint (48rem, 64rem) e la regola «il tetto è nel `.app`, i giochi non lo ridefiniscono».
- `.claude/skills/ui-mobile-checklist/SKILL.md`, sezione 3 «Layout e responsive»: aggiungere la riga
  «verificare anche a 1280 px; testi a 40rem; nessuna griglia con più di 4 pulsanti per riga».
- `.claude/skills/FONTI.md`: nessuna nuova fonte.
- README dei giochi: solo se un gioco cambia il suo modo di presentarsi (es. lista a 2 colonne). Di solito nessuno.
- `docs/decisioni.md`: sezione «Schermo largo» con le decisioni prese in sezione 2.

## 4. Per ogni passo: rischio e verifica

Il confronto a 375 px si fa così: prima del passo, `pnpm --filter @gdt/web test:e2e` deve passare; dopo il passo
lo stesso comando deve passare senza `--update-snapshots`. Se uno snapshot cambia, il passo ha toccato il telefono: si torna indietro.
Controllo manuale: schermate a 375 px in tema scuro e chiaro, come da `CLAUDE.md`.

| Passo | Rischio | Verifica | Stima |
|---|---|---|---|
| 1 Token e contenitore | Cambia il contenitore di tutte le pagine | e2e 375 px invariati; screenshot 1280 px home | piccolo |
| 2 Barre fisse | Barra non allineata alla lista | screenshot 1280 px barra e lista | piccolo |
| 3 Lista giochi | Schede di altezza diversa, banner beta fuori scheda | screenshot 768 e 1280 px | medio |
| 4 Lettura e form | Righe troppo corte, form con campi stretti | zoom 200% a 1280 px; screenshot form | medio |
| 5 Pulsanti | Griglie a 5-7 colonne | conteggio pulsanti per riga a 768 e 1280 px | medio |
| 6 Giochi | Regressioni nei CSS di gioco; soglie 30rem delle carte | e2e del gioco a 375 px + screenshot largo | grande (9 giochi) |
| 7 Playwright | Snapshot che si moltiplicano, stanze veloci condivise | numero di screenshot nuovi = numero di file di `largo/` | medio |
| 8 Skill e doc | Dimenticare un valore | rilettura | piccolo |

## 5. Rischi e cose da non rompere

- **Telefono**: 375 px è il riferimento. Ogni passo ha un commit a sé, così si torna indietro senza toccare gli altri.
- **Zoom 200%**: con il tetto più largo il testo non deve andare fuori dal contenitore; le righe restano a 40rem.
- **Bersagli touch 44 px**: i pulsanti più grandi non devono mai scendere sotto 44 px, anche a 1280 px.
- **Lunghezza riga**: 65-70 caratteri per i testi lunghi (regolamenti, registri).
- **Scroll orizzontale**: verificare a 768 e 1280 px che `document.documentElement.scrollWidth` sia uguale alla finestra (si può
  aggiungere un controllo nelle e2e largo).
- **Barra fissa e safe area**: il margine negativo della `.barra-fissa` deve restare valido con il tetto nuovo.
- **Carte**: oggi la dimensione «grande» della mano usa `@media (min-width: 30rem)` (`carte.css`, `ventaglio.css`,
  `burraco.css`). La sostituisce il passo 5b; fino ad allora non va toccata, e a 375 px le misure devono restare uguali.
- **Dialoghi**: impostazioni e avviso beta restano stretti (24rem).
- **Stanze condivise**: il progetto largo non deve partecipare alle partite veloci (vedi `playwright.config.ts`).

## 6. Come chiudere

1. Voce in `CHANGELOG.md` sotto «Non rilasciato», per ora. Al rilascio: sposta sotto `## [x.y.z] - data`.
2. Versione **MINOR** (es. 0.32.0 se l'attuale è 0.31.0): cambia l'aspetto su PC e tablet, non le regole né i codici.
   Alzare `version` in `apps/web/package.json`, tag annotato `vx.y.z` (locale, il push lo fa l'utente).
3. Eliminare `docs/piano-schermo-largo.md` **dopo** aver spostato le decisioni di sezione 2 in `docs/decisioni.md`
   (nuova sezione «Schermo largo»).
4. Commit: un commit per passo, il rilascio nell'ultimo commit con la versione.
