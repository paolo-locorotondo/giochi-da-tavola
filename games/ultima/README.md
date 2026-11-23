# Ultima!

Gioco di carte a colori e numeri. Due modi: **contro i bot** su un solo telefono (da 1 a 9 bot, anche offline) oppure **ognuno col suo telefono** da 2 a 10 giocatori. La mano è segreta: per questo a un telefono gli avversari sono bot. Chi resta con una carta in mano deve dire «Ultima!».

Le regole sono simili ai classici giochi di carte a colori e numeri. Il nome e le carte sono originali: nel progetto non compaiono marchi di terzi.

## Regolamento

1. Ognuno riceve 7 carte e la prima carta del mazzo va scoperta. Si gioca ognuno dal proprio telefono: la mano è segreta.
2. Il mazzo ha 108 carte. Per ognuno dei 4 colori (rosso, giallo, verde, blu): uno 0, due per ogni numero da 1 a 9, due Salta, due Inverti e due +2, cioè 25 carte e 100 in tutto; poi 4 Jolly e 4 Jolly +4. Con la variante Scambio e Rotazione si aggiungono 2 Scambio e 2 Rotazione: 112 carte.
3. Al tuo turno cali una carta dello stesso colore, numero o simbolo di quella scoperta, oppure un Jolly. Se non puoi, peschi una carta: se si può giocare la cali subito, altrimenti passi.
4. Salta fa saltare il turno al prossimo. Inverti cambia il verso (in due vale come Salta). +2 fa pescare 2 carte al prossimo, che salta il turno. Jolly ti fa scegliere il colore. Jolly +4 fa scegliere il colore, il prossimo pesca 4 e salta il turno.
5. Il Jolly +4 si può giocare solo senza carte del colore in corso. Chi lo subisce può sfidare: se aveva ragione, chi l'ha giocato pesca 4; se aveva torto, lo sfidante pesca 6.
6. Quando resti con una carta devi premere «Ultima!». Se un altro preme «Beccato!» prima che il giocatore dopo di te giochi o peschi, pesci 2 carte.
7. Vince il round chi finisce le carte. A punti, il vincitore prende i punti delle carte rimaste agli altri: numeri = il loro valore, Salta, Inverti e +2 = 20, Jolly e Jolly +4 = 50.

Contro i bot (anche offline) o online da 2 a 10 giocatori. Alla creazione si sceglie un solo round oppure una partita a punti (di base fino a 500, da 50 a 2000). Se qualcuno non risponde, l'organizzatore può toccare «Simula mossa col bot» (vedi sotto).

Il mazzo è di 108 carte: per ogni colore (rosso, giallo, verde, blu) uno `0`, due per ciascun `1–9`, due Salta, due Inverti, due +2; più 4 Jolly e 4 Jolly +4. Ogni colore ha anche un simbolo (fiamma, sole, foglia, goccia) e il nome scritto: il colore non è mai l'unico segnale.

### Scelte di regola (dove il regolamento lascia margine)

- **Prima carta speciale**: vale per il primo giocatore. Salta lo fa saltare; +2 gli fa pescare 2; Inverti cambia verso (in due vale come Salta); un Jolly lo fa scegliere a lui. Un Jolly +4 scoperto si rimette nel mazzo e se ne gira un'altra. Il primo di mano ruota a ogni round.
- **Pesca**: una carta sola per turno. Dopo aver pescato si può calare **solo la carta pescata**; altrimenti si passa.
- **Jolly +4 illecito**: il server lo accetta (chi bluffa può farlo) e lo scopre la sfida: la legalità non viaggia mai sulla rete. È pubblico solo se chi l'ha giocato aveva appena pescato.
- **«Ultima!» e «Beccato!»**: la finestra si apre quando si cala la penultima carta e si chiude appena il giocatore dopo gioca o pesca. Chi la lascia aperta può essere beccato da chiunque altro.
- **Mazzo esaurito**: si rimescola lo scarto tranne la carta in cima (regola ufficiale; evento «Il mazzo è finito»). Se mazzo e scarto da rimescolare sono finiti (tutte le carte in mano) **non si pesca** (`mazzoVuoto`, sia la UI sia la logica lo rifiutano) e chi non può giocare **passa** direttamente (`passa` è lecito senza aver pescato solo in questo caso; il bot passa).
- **Partita a punti**: dopo ogni round l'organizzatore tocca «Prossimo round»; la partita finisce quando qualcuno arriva alla soglia.

### Perché queste scelte

- **Nome «Ultima!»**: «UNO» e «SOLO» sono marchi registrati e non compaiono nel gioco né nel nome; la descrizione parla solo di «regole simili ai classici giochi di carte a colori e numeri».
- **Solo regole ufficiali di base**, varianti tutte spente e scelte da chi crea la stanza (come le impostazioni di Lupus); chi entra le accetta.
- **«Simula mossa col bot» invece di bot automatici** online: chi non risponde non blocca il tavolo, ma l'organizzatore decide quando; il bot guarda solo ciò che vedrebbe quel giocatore.
- **Colore mai unico segnale** (simbolo e nome per ogni colore), per il daltonismo.

## Contro i bot (un telefono, anche offline)

Su «Come giocate?» si sceglie **Contro i bot**. Si scrivono il proprio nome e da 1 a 9 bot (con nomi modificabili, di base «Bot 1», «Bot 2»…), il livello, la velocità e come si vince. Le ultime scelte restano salvate sul telefono.

- Il telefono fa da server per sé: usa la stessa macchina a stati dell'online (`src/offline.ts`). Si vede solo la propria mano; dei bot solo quante carte hanno.
- I bot giocano da soli, uno alla volta, con una pausa: **lenta** 2,2 s, **normale** 1,3 s, **veloce** 0,6 s (`VELOCITA`). La velocità si cambia anche in partita.
- **Livelli** (come Tris): **facile** gioca carte lecite a caso; **medio** gioca la mossa migliore 55 volte su 100 (`PERCENTUALE_MEDIO`); **difficile** gioca sempre la mossa migliore. A ogni livello cambiano anche le probabilità di dire «Ultima!» (50 / 85 / 100 %, `PROB_ULTIMA`) e di beccare chi lo dimentica (60 / 90 / 100 %, `PROB_BECCA`).
- Se dimentichi «Ultima!» i bot ti possono beccare, ma prima ti lasciano almeno 1,8 s per dirlo (`RITARDO_BECCATO_MS`), anche alla velocità più alta.
- Fine round, classifica e «Prossimo round» come online; «Esci dalla partita» (con conferma) torna alla creazione.

## Il bot online («Simula mossa col bot»)

Solo l'organizzatore lo vede, per il giocatore di turno (anche per rispondere a un +4 o per «Ultima!»). Fa **una mossa sola** e nell'elenco degli eventi compare «Mossa simulata dal bot per X». Nessun bot automatico.

Usa solo ciò che quel giocatore vedrebbe (la sua mano e lo stato pubblico), così non «bara». Priorità, in `src/bot.ts`:

1. se il prossimo giocatore ha poche carte (`POCHE_CARTE`, 3), prima le carte che lo colpiscono (+2, Salta, Inverti);
2. altrimenti scarica prima le carte che valgono di più;
3. tiene i Jolly per ultimi; il +4 solo se è lecito (non bluffa);
4. a parità preferisce il colore di cui ha più carte.

Senza carte giocabili pesca; se la carta pescata si può giocare la gioca. Sceglie come colore quello di cui ha più carte. Sfida un +4 solo se chi l'ha giocato aveva appena pescato, altrimenti lo accetta. Becca chi ha una carta sola e non ha detto «Ultima!» (se la finestra è aperta: una mossa per pressione). Dichiara sempre «Ultima!» appena cala la penultima carta (resta negli eventi): per questo contro il bot non compare «Beccato!».

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/ultima (anche dal telefono, vedi l'indirizzo "Network")
```

Servono il sito **e** il server di gioco: `pnpm dev` li avvia insieme. Passi dettagliati, firewall e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md); con il PC come server: [guida-giocare-con-il-pc.md](../../docs/guida-giocare-con-il-pc.md). Contro i bot funziona **offline**: `pnpm --filter @gdt/web build`, apri il sito una volta, poi spegni la rete e ricarica. Online serve il server; se non risponde la pagina propone di riprovare o di giocare contro i bot.

## Cosa controllare

- Creazione: da 2 a 10 nomi, nomi uguali rifiutati, soglia fuori da 50–2000 rifiutata.
- Sala: l'organizzatore avvia solo quando tutti hanno scelto il nome; il link `/ultima/CODICE` e il QR portano nella stanza.
- Tavolo (con tre telefoni): ognuno vede solo la propria mano e **quante** carte hanno gli altri; le carte non giocabili restano più in basso con il fondo pieno, le giocabili sono sollevate; fuori turno non si può giocare né pescare.
- Jolly: appaiono quattro pulsanti con colore, simbolo e nome; il +4 apre la sfida al giocatore dopo.
- «Ultima!» (per chi resta con una carta) e «Beccato!» (per gli altri) finché il giocatore dopo non agisce.
- «Simula mossa col bot» e «Sollecita» solo per l'organizzatore.
- Fine round: punti e classifica; «Prossimo round» solo all'organizzatore; a fine partita «Ricomincia».
- Refresh o schermo bloccato: si rientra nel proprio posto, con la propria mano.
- Contro i bot: da 1 a 9 bot con nomi modificabili; i bot giocano da soli alla velocità scelta; con la rete spenta la partita va avanti; se dimentichi «Ultima!» un bot difficile ti becca dopo un attimo; «Esci dalla partita» chiede conferma.
- Refresh a metà partita contro i bot: si torna alla stessa partita (mani, scarto, turno, velocità) senza domande; se tocca a un bot, riparte da solo. Una finestra di taglio aperta si chiude; un «Ultima!» non detto resta da dire. Dopo «Esci dalla partita» o a partita finita il refresh porta alla creazione.
- Taglio: dopo una giocata sotto lo scarto compare la barra di 3 secondi; chi ha la stessa carta vede «Taglia con …»; chi arriva secondo vede «Qualcuno è stato più veloce»; con più telefoni la gara la vince il primo; i jolly non si tagliano; con la somma dei +2 si taglia anche un +2 del cumulo.
- Più carte uguali: il pulsante «Più carte» compare solo con due carte **identiche** (stesso colore e numero o simbolo) giocabili; due carte con lo stesso numero ma colori diversi non lo fanno comparire; in selezione le carte scelte hanno la spunta e la barra dice quante.
- Mazzo vuoto (tutte le carte in mano, niente scarti da rimescolare): «Pesca» è disattivato («Mazzo: 0»), compare «Passa» e il testo «Il mazzo è vuoto e non hai carte da giocare: passa il turno».
- Scambio e Rotazione: la carta mostra la mano (Scambio) o la freccia (Rotazione); dopo il colore lo Scambio chiede con chi (pulsanti a tutta larghezza, nome e numero di carte); le mani cambiate sono evidenziate; chi resta con una carta può dire «Ultima!» anche se non ha giocato lui.
- Varianti: in creazione la sezione «Varianti» ha quattro interruttori spenti; quelle accese compaiono in sala e sul tavolo. Con la somma dei +2: il cumulo è scritto sul mazzo («cumulo 4»), chi lo ha davanti vede «Pesca N» e può calare solo i +2; gli altri vedono chi deve rispondere.
- La mano (vedi «La mano a ventaglio»): ordinata per colore, a righe, carte leggibili nell'angolo, nessuno scroll orizzontale a 375 px, stati giocabile / non giocabile / scelta / taglio / appena pescata distinguibili anche senza il colore.
- Tema chiaro e scuro, inglese, nessuno scroll orizzontale a 375 px.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: mazzo, giocabilità, effetti, sfida del +4, «Ultima!»/«Beccato!», rimescolo e punteggio di un round. Puro e deterministico (il caso arriva da `Rng`); gli errori sono codici (`ErroreUltima`).
- `src/bot.ts`: `mossaBot(stato, n, posto)`, i livelli (`mossaBotLivello`) e `eseguiMossa`; usa solo ciò che vedrebbe quel giocatore.
- `src/offline.ts`: la partita contro i bot sul telefono (`nuovaPartitaLocale`, `agisci`, `muoviBot`, `pausaBot`, `vistaLocale`), con test in `offline.test.ts`.
- `src/online/gioco.ts`: stato della stanza (round, punti, soglia), azioni, permessi (`traduci`) e `vistaPer` (mai le carte altrui né l'esito segreto della sfida); registrato in `apps/server/src/giochi.ts`. Il seme di ogni mossa deriva dal seme del round, così con lo stesso seme la partita si ripete identica.
- `src/locales/{it,en}.ts` e `src/manifest.ts`: tutti i testi e il regolamento.
- `src/ui/`: `Ultima.tsx` (scelta della modalità), `UltimaLocale.tsx` (contro i bot), `UltimaOnline.tsx` (usa `@gdt/collegamento`), `Tavolo.tsx` (il tavolo, comune alle due modalità), `Varianti.tsx` (interruttori delle varianti, riusati da ogni creazione, e riepilogo), `Carta.tsx` e `ultima.css` (solo token del tema), `impaginaMano.ts` (ordine e chiave di gruppo della mano, puro, con `impaginaMano.test.ts`: oltre ai suoi test controlla che le righe siano uguali a quelle registrate prima della versione condivisa, `regressione.fixture.json`, e a quelle della funzione generica), `manoDiProva.ts` (solo sviluppo, vedi sotto).
- Test: `logica.test.ts`, `bot.test.ts`, `online/gioco.test.ts`, `apps/server/src/ultima.test.ts` ed e2e in `apps/web/e2e/ultima-online.spec.ts` (tre telefoni) e `ultima-bot.spec.ts` (contro i bot, anche offline).
- Le carte sono fisse (le regole stanno nel codice): non c'è una cartella `data/`.

## La mano a ventaglio

La mano è un **ventaglio a righe** (`.ul-mano` che è un `.cg-ventaglio` > `.cg-riga` > `.cg-blocco` > carte), senza scroll orizzontale. **L'impaginazione e il CSS di sovrapposizione sono condivisi con Burraco** e stanno in `@gdt/carte` (`impaginaMano`, componente `Ventaglio`, `ventaglio.css`, ingresso `@gdt/carte/ventaglio`; vedi il [README di `@gdt/carte`](../../packages/carte/README.md)). Qui restano solo l'ordine (`ordinaMano`, `confrontaMano`), la chiave di gruppo (il colore) e le misure di Ultima! (custom property `--cg-v-*` su `.ul-mano`, in `ultima.css`). L'aspetto non è cambiato (confrontato pixel per pixel con la versione precedente, vedi sotto).

- **Ordine** (`ordinaMano`): blocchi per colore blu, giallo, rosso, verde, poi i jolly (Jolly, +4, Scambio, Rotazione); dentro il colore i numeri 0-9, poi Salta, Inverti, +2; a parità per id. Ordine DOM = ordine visivo = ordine di tab.
- **Righe** (`impaginaMano(mano, capacita)`, che chiama quella generica di `@gdt/carte`): `CARTE_PER_RIGA = 9` (una costante in `@gdt/carte`, riesportata da `impaginaMano.ts`). Righe = `ceil(n / 9)`, bilanciate (con 10 carte 5+5); l'interruzione cade di preferenza fra due colori e un blocco più grande di una riga si divide in parti uguali. I blocchi di colore diversi nella stessa riga hanno 8 px di stacco in più. 7, 9 e 10 carte: 1, 1, 2 righe; 20: 3; 40: 5; 110: 13.
- **Sovrapposizione in solo CSS** (nessuna misura in JavaScript): la carta è 72×104 px; in una riga di `n` carte ogni carta dopo la prima ha margine sinistro `clamp(32px − 72px, (larghezza utile − 72 − stacchi) / (n−1) − 72, 8px)`, calcolato con `--cg-k` (= `max(n−1, 1)`) e `--cg-g` (numero di blocchi) messi dal componente `Ventaglio`. Se le carte ci stanno sono staccate di 8 px, altrimenti si sovrappongono in modo uniforme, con **almeno 32 px visibili**. A 375 px lo spazio utile è circa 343 px: con 7 carte se ne vedono circa 45 px, con 9 circa 34 px. La larghezza utile è `100cqw` (container query sul `.ul-mano`).
- **Sovrapposizione verticale**: passo di 56 px fra una riga e l'altra (la riga sotto copre la parte bassa di quella sopra), per questo valore e seme stanno **in alto a sinistra**.
- **Scelte (solo CSS, `ultima.css`)**: parte visibile minima 32 px (`--cg-v-min`), passo 56 px (`--cg-v-passo`), stacco 8 px (`--cg-v-gap`), carta 72×104 px (`--cg-v-w`, `--cg-v-h`). Il grande disegno in basso a destra si vede intero solo sull'ultima carta di una riga: il valore e il seme in alto a sinistra bastano a riconoscerla; il nome parlato resta nell'`aria-label` (invariato).
- **Stati**: giocabile = sollevata di 10 px; non giocabile = più bassa, con il fondo pieno (`--s2`) e non più opacità ridotta (si vedrebbe la carta sotto); «Più carte uguali» = spunta nell'angolo e bordo tratteggiato; taglio = forbici nell'angolo e bordo tratteggiato; appena pescata = anello d'accento, scintilla nell'angolo e sollevata (la carta si ritrova confrontando gli id della mano precedente; un nuovo round o uno scambio di mani non evidenzia nulla; se la carta è fuori dallo schermo la pagina scorre fino a lei); `:focus-visible` e `:active` portano la carta in primo piano (`z-index`) con l'anello di 3 px. Con il movimento ridotto non c'è nessuna transizione.
- **Bersagli**: la parte visibile di 32 px di larghezza è un'**eccezione dichiarata** alla regola dei 44 px (l'altezza piena è 104 px). Si accetta perché i bersagli sono alti, le carte non giocabili non reagiscono e quelle giocabili sono sollevate, e perché la mano non può stare in una riga sola senza scorrere. Un errore di tocco su una carta vicina è comunque limitato: una carta non giocabile non fa nulla, e «Più carte» e il taglio hanno pulsanti propri.
- **Mani molto grandi** (teoricamente fino a 110 carte, 13 righe): la pagina scorre in verticale come sempre; non c'è un'altezza massima con scroll interno (più semplice, e senza scroll annidati).

### Provare la mano con tante carte (solo sviluppo)

Con `pnpm dev`, apri la pagina con `?manoProva=N`, per esempio `http://IP-DEL-PC:5173/ultima?manoProva=33`, poi inizia una partita contro i bot: alla tua mano si aggiungono N carte finte (non giocabili, non entrano nella partita). Il valore resta per la scheda del browser (`sessionStorage`); per toglierlo chiudi la scheda o apri `?manoProva=0`. È attivo solo con `import.meta.env.DEV` (`src/ui/manoDiProva.ts`): nella versione pubblicata non fa nulla. Per provare gli stati: variante «Più carte uguali» e «Taglio» nella creazione.

## Partita veloce

Dalla schermata di creazione online, «Partita veloce»: ognuno scrive solo il suo nome. Se c'è già una stanza aperta di Ultima! con posti liberi se ne vede la scheda («Stanza di Anna · 1 posto su 4 · A punti, fino a 200 · Attesa 2 minuti») e si tocca «Entra nella stanza»; altrimenti chi tocca sceglie le impostazioni e apre la sua: **quanti giocatori** (da 2 a 10), **come si vince** (round singolo o a punti, le stesse impostazioni di «Crea la partita») e il **tempo d'attesa** (1, 2, 3 o 5 minuti), e ne diventa l'organizzatore. Chi entra accetta le impostazioni.

Nella sala d'attesa tutti vedono chi c'è e il tempo che resta. La partita parte da sola a stanza piena; l'organizzatore può aprire prima («Apri adesso con 3 giocatori») con almeno 2. Scaduto il tempo con almeno 2 giocatori parte un avviso di 10 secondi («Apri adesso» / «Continua ad aspettare»); con meno di 2 l'organizzatore sceglie «Aspetta ancora» o «Chiudi la stanza», e dopo 60 secondi senza risposta la stanza si chiude. Se l'organizzatore esce lo diventa il giocatore arrivato dopo di lui. Un telefono scollegato tiene il posto 30 secondi.

Dichiarazione in `src/online/gioco.ts`: `veloce: { posti: intervalloPosti(2, 10), anticipato: true, configVeloce: leggiConfig }`; le impostazioni scelte all'apertura sono in `src/ui/ImpostazioniVeloce.tsx`. Le **nuove varianti** della partita sono chiavi di `leggiConfig`: basta aggiungerle anche a quel componente per averle nella partita veloce.

## Varianti

Sono **impostazioni iniziali della stanza**: le sceglie chi crea la partita (online, contro i bot, o chi apre una partita veloce) nella sezione «Varianti» della creazione, sono **tutte spente di base** e valgono per tutta la partita. Chi entra le vede riassunte in sala e sul tavolo («Varianti: …»). Si possono combinare. Con tutte spente il gioco è quello ufficiale. Il piano originale è nella storia del repo (tag v0.28.0); le scelte sono qui sotto.

Nella configurazione della stanza sono la chiave `varianti` (`{ sommaPiu2, piuUguali, taglio, scambioRotazione }`, booleani): `leggiConfig` in `src/online/gioco.ts` le controlla (assenti = spente, non booleane = `configNonValida`), così valgono uguali per «Crea», per la partita veloce e contro i bot.

### Fatte

- **Somma dei +2** (`sommaPiu2`): chi riceve un +2 non pesca subito, ha davanti un **cumulo**. Può rispondere con un +2 di **qualunque colore** (il cumulo cresce di 2 e passa al successivo) oppure **pescare tutto il cumulo** e saltare il turno (pulsante «Pesca N»). Con un cumulo aperto non si pesca una carta sola, non si passa e non si gioca nient'altro (`rispondiCumulo`). Un +2 non risponde a un +4 né un +4 a un +2. Se la prima carta scoperta è un +2, il cumulo di 2 vale per il primo giocatore, con la stessa scelta. Un +2 che svuota la mano chiude il round senza cumulo. I bot rilanciano se hanno un +2, altrimenti pagano (facile e medio a volte pagano anche potendo rilanciare).

- **Scambio e Rotazione** (`scambioRotazione`): due nuove carte **jolly**, **due copie ciascuna** (il mazzo passa a **112**, id 108–111), da **50 punti**. Si giocano sempre, come il Jolly, e **chi le cala sceglie il colore**; non si giocano sopra un cumulo di +2 né sopra un +4. Non possono essere la prima carta scoperta (si rimettono nel mazzo). Icone `Handshake` e `RotateCw`.
  - **Scambio**: dopo il colore si sceglie un altro giocatore («Bruno · 5 carte»); le due mani si scambiano. Il turno passa al successivo.
  - **Rotazione**: ogni mano passa al posto successivo nel verso del gioco. Il turno passa al successivo.
  - Se sono l'ultima carta, chi le cala vince il round e basta (nessun effetto). Dopo l'effetto, chiunque resti con **una carta sola** ha la sua finestra di «Ultima!» (anche più di uno: `Partita.ultime` è una lista). Nell'elenco dei giocatori le mani cambiate sono evidenziate (bordo tratteggiato, senza animazione con il movimento ridotto) e una riga dice cosa è successo.
  - **Bot**: usano solo i numeri di carte (pubblici). Scambio se ha almeno 3 carte più di chi ne ha meno, e sceglie lui; Rotazione se la mano di chi lo precede ha almeno 3 carte meno della sua. Altrimenti le tengono come jolly di scorta (facile e medio ogni tanto le calano a caso).

- **Più carte uguali** (`piuUguali`, regola confermata il 22/11/2026): in un turno si calano insieme **due o più carte identiche**, cioè **stesso colore e stesso numero o simbolo** (due 2 rossi sì; un 2 rosso e un 2 giallo no): numeri, **Salta** (ognuno salta un giocatore in più, ma mai chi li cala) e **+2** (2 carte in più per carta, o il cumulo cresce di 2 per carta), sempre dello stesso colore. **Non** Inverti né jolly. Le carte identiche sono tutte giocabili o nessuna, quindi non c'è una «cima» da scegliere (in logica la cima è `id`, le altre `insieme`; il colore in corso è quello comune). Non si fa dopo aver pescato. Se il gruppo lascia una carta si apre «Ultima!»; se svuota la mano il round finisce. In logica: `gioca(..., { insieme: [id…] })` (retrocompatibile: senza `insieme` è una carta sola; con la variante spenta `insieme` dà `variantaSpenta`; carte non identiche `gruppoNonValido`), `valoreGruppo` (chiave colore+valore), `gruppiPossibili`/`gruppiDellaMano`. In UI il pulsante **«Più carte»** sopra la mano compare solo con almeno due carte identiche giocabili e apre la selezione (carte scelte con spunta e bordo tratteggiato, le altre si spengono), la barra annuncia «Hai selezionato N carte uguali», «Cala N carte» conferma. **Bot**: calano il gruppo che scarica più punti (a meno che possano colpire chi è in pericolo); facile a caso.

- **Taglio** (`taglio`): quando qualcuno cala una **carta colorata**, chi ha una carta **identica** (stesso colore e stesso numero o simbolo) può giocarla subito, **anche fuori turno**, entro **3 secondi** (`TAGLIO_MS`, più 1 s di tolleranza di rete sul server). Il turno passa al tagliatore e prosegue dal suo posto (l'effetto della carta vale come se l'avesse giocata lui). **Vince chi arriva per primo** (il server applica le richieste una alla volta): chi arriva dopo riceve «Qualcuno è stato più veloce». Il taglio è di **una carta sola**, non apre un'altra finestra, e **non si taglia**: un jolly, un +4, la carta di chi è di turno o di chi l'ha calata. **Taglio + Somma dei +2** (regola del 22/11/2026): si taglia anche un +2 che apre o aumenta un cumulo, solo con un +2 **dello stesso colore**; il cumulo cresce di 2 e cade sul **successivo del tagliatore** nel verso del gioco (come se l'avesse giocato lui), chi lo aveva davanti non paga nulla; la vittima del cumulo è di turno e quindi non taglia (risponde con un +2 normale; con 2 giocatori nessuno può tagliare); un gruppo di +2 calati insieme («Più carte uguali») apre la finestra e il taglio ne aggiunge uno solo. Senza «Somma dei +2» il +2 si paga subito: chi taglia fa pescare 2 carte al **suo** successivo, mentre chi aveva pescato prima tiene le carte (nessun rimborso) e se è già stato servito può tagliare a sua volta. Un taglio altrui **non chiude** la finestra «Ultima!» di chi ha una carta sola. La logica pura non legge l'orologio: l'azione porta l'`ora` che il chiamante prende da `ctx.ora()` (`ContestoOnline.ora`, già nel contratto). In UI sotto lo scarto compare una barra di 3 secondi (testo che conta con il movimento ridotto) e, se hai la carta, il pulsante **«Taglia con …»** (toccare la carta in mano non taglia: evita i tagli per sbaglio; la carta ha forbici e bordo tratteggiato). **Bot**: tagliano con probabilità 50 % (facile), 85 % (medio), 100 % (difficile) (`PROB_TAGLIO`), mai sopra una sfida (sopra un cumulo tagliano con un +2 identico); contro i bot reagiscono dopo almeno 1 s e al massimo 2,5 s (`ritardoTaglioBot`), così chi gioca ha il vantaggio del tocco; a parità vince il posto più basso. Il taglio non passa da «Simula mossa col bot».

### Scelte sulle varianti

- **+2 su +4 e +4 su +2 non ammessi** (né +4 su +4): il +4 si affronta con la sfida e un +2 darebbe una via d'uscita; mescolare cumulo e sfida obbligherebbe a ridefinire quanto pesca chi perde. Resta un'alternativa da valutare (+4 sopra il cumulo, sommato alla pesca) solo se richiesta.
- **Il cumulo si paga tutto**: con un cumulo aperto non si pesca una carta sola.
- **«Più carte uguali» solo identiche**: stesso colore e stesso numero o simbolo; Inverti no (due Inverti annullano il verso, troppo ambiguo da spiegare), jolly e carte nuove no. Un gruppo di +2 conta come più +2.
- **Taglio, finestra di 3 secondi** (1 s di tolleranza di rete): più corta sarebbe troppo dura per chi ha il telefono in mano. Il taglio è una carta sola e **non crea una catena**, così due tagli quasi simultanei restano una gara con un solo vincitore; un taglio altrui **non chiude** la finestra «Ultima!» (altrimenti sarebbe un modo di salvarsi da «Beccato!»); non si taglia sopra una sfida del +4.
- **Scambio e Rotazione al posto di «Sette e zero»**: due carte jolly nuove, **due copie ciascuna** (con una sola l'effetto comparirebbe in pochissime partite), colore scelto da chi le cala, 50 punti come gli altri jolly, mai prima carta scoperta, mai sopra un cumulo o una sfida, mai in gruppo né tagliate. Le mani dopo l'effetto sono evidenziate e ogni posto con una carta sola ha la sua finestra «Ultima!» (`Partita.ultime` è una lista).
- **I bot decidono Scambio e Rotazione solo con i numeri pubblici** di carte, mai con le mani altrui.

### Possibili (non ancora fatte)

- **Pesca finché non puoi giocare** invece di una carta sola.
- **+4 senza sfida** (si gioca sempre, niente controllo).
- **Penalità per «Ultima!»** diversa da 2.

## Lingue

Italiano («Ultima!») e inglese («Last One!», «Caught!»). Per cambiare un testo modifica la chiave in `src/locales/it.ts` e in `en.ts`; il compilatore segnala se manca in una lingua. Nel codice niente frasi: il TSX usa `t("chiave")` e la logica restituisce codici.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md). Serve il server di gioco (le stanze stanno in memoria sul server).
