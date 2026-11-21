# Changelog

Tutte le modifiche importanti a questo progetto. Le versioni seguono
[Semantic Versioning](https://semver.org/lang/it/): `MAJOR.MINOR.PATCH`.

- **MAJOR**: cambi che rompono le partite già in corso o i codici condivisi
- **MINOR**: nuovi giochi o nuove modalità
- **PATCH**: correzioni

## [Non rilasciato]

- **Partita veloce a stanze aperte** (da rilasciare come MINOR): chi tocca «Partita veloce» entra nella prima stanza aperta del gioco o ne apre una; sala d'attesa con tempo scelto dall'organizzatore (1, 2, 3 o 5 minuti), avvio anticipato, avviso di 10 secondi, grazia di 30 secondi con lo schermo bloccato. Tris (2 fissi) la usa al posto della coda (il refresh in attesa non fa più perdere il posto); Ultima! la ha da 2 a 10 giocatori con le impostazioni di punteggio scelte da chi apre. Server: `apps/server/src/veloce.ts` al posto di `coda.ts` (i vecchi messaggi `coda` restano come alias per una versione); client e componenti condivisi in `@gdt/collegamento` (`SalaVeloce`, `ApriVeloce`, testi it/en). Nuovi test unitari del server e due spec e2e (`ultima-veloce`, `tris-coda` aggiornato) da eseguire sul coordinatore.
- Ultima!: **varianti** come impostazioni iniziali della stanza, scelte da chi crea la partita (online e contro i bot) e spente di base; quelle accese si vedono in sala e sul tavolo. Varianti: **Somma dei +2** (un +2 si risponde con un +2 di qualunque colore, chi non risponde pesca tutto il cumulo) e **Scambio e Rotazione** (due nuovi jolly da due copie: Scambio fa cambiare la mano con un altro giocatore, Rotazione fa passare tutte le mani al successivo; mazzo da 112 carte, 50 punti l'una), **Più carte uguali** (si calano insieme più carte con lo stesso numero, o più Salta, o più +2, scegliendo quale resta in cima) e **Taglio** (chi ha la stessa carta appena calata la gioca subito, anche fuori turno, entro 3 secondi: vince chi arriva per primo; i bot tagliano a ogni livello). La finestra di «Ultima!» ora può riguardare più giocatori insieme (serve per Scambio e Rotazione).

- Contratto della partita veloce a stanze aperte in `@gdt/engine` (tipi `PartitaVeloceOnline`, `AperturaVeloce`, `AnteprimaVeloce`, `VistaSalaVeloce`, `intervalloPosti`, costanti d'attesa e di conto) e `ContestoOnline.ora()` per le logiche con finestre di tempo. Solo contratto: nessun cambio di comportamento.
- Interno: nuovo pacchetto `@gdt/carte` (mazzo francese anche doppio con jolly, mazzo italiano da 40, mescolata con `Rng`, ordinamenti, `CartaGrafica` e `Mano` con selezione e riordino, it/en) e token `--carta-*` nel tema; base per Burraco e Scopa, nessun gioco lo usa ancora.
- Documentazione allineata: prove su telefono vero di Duello Lampo (doppio tocco, 6×6) e della barra fissa verificate dall'utente il 2026-11-20; `decisioni.md` (giochi, struttura, voci FATTO), `test.md` (cosa copre la suite e cosa no) e README (Tris anche online).

## [0.26.0] - 2026-11-21

### Aggiunto

- Duello Lampo: due nuovi mini giochi. **Bersagli**: compaiono cerchi in una griglia (2×2, 3×3, 4×4) e si toccano prima che spariscano; vince chi ne colpisce di più, a parità chi è più veloce. **Il più grande**: compaiono 4, 6 o 9 numeri e vince chi tocca per primo il più grande; chi tocca un altro numero perde il round. Ognuno ha le sue impostazioni (durata, griglia, vita e ritmo dei bersagli; quanti numeri, cifre, scarto minimo) e «Gli errori contano −1». La sfida di base passa a 10 mini giochi e 20 round (2 mani ciascuno).

## [0.25.0] - 2026-11-20

### Aggiunto

- Ultima!: **contro i bot**, su un solo telefono e anche offline. Si sceglie da «Come giocate?»: il proprio nome e da 1 a 9 bot con nomi modificabili, il livello (**facile**, **medio**, **difficile**, come Tris), la velocità (lenta, normale, veloce; si cambia anche in partita) e come si vince. I bot giocano da soli uno alla volta, dicono «Ultima!» e ti beccano se lo dimentichi, lasciandoti prima almeno 1,8 secondi. Le ultime scelte restano salvate sul telefono.

### Modificato

- Ultima! non è più solo online: in home ha anche il badge «offline». Se il server non risponde, oltre a «Riprova» propone di giocare contro i bot.
- Il tavolo è un componente comune alle due modalità (`Tavolo.tsx`).

## [0.24.2] - 2026-11-20

### Corretto

- Ultima!: «Simula mossa col bot» ora **becca** chi ha una carta sola e non ha detto «Ultima!» (prima il bot ignorava la dimenticanza e giocava il proprio turno, chiudendo la finestra e facendo scampare la penalità). Il bot usa solo dati pubblici.

## [0.24.1] - 2026-11-20

### Corretto

- Ultima!: quando il bot dichiara «Ultima!» ora resta traccia nell'elenco degli eventi («X dice «Ultima!»»), come per chi preme il pulsante. Prima sembrava che non fosse successo niente e non compariva nessun pulsante «Beccato!».

### Modificato

- Ultima! in inglese si chiama **Last One!** (nome del gioco, pulsante e testi); resta «Caught!» per «Beccato!».

## [0.24.0] - 2026-11-20

### Aggiunto

- **Ultima!**: nuovo gioco di carte a colori e numeri (regole ufficiali: mazzo da 108 carte, Salta, Inverti, +2, Jolly e Jolly +4 con sfida, «Ultima!» e «Beccato!»), da 2 a 10 giocatori, **solo online** perché la mano è segreta. Alla creazione si sceglie un solo round o una partita a punti (di base fino a 500). L'organizzatore ha «Sollecita» e «Simula mossa col bot»: il bot fa una sola mossa per il giocatore di turno usando solo ciò che quel giocatore vedrebbe. Le carte altrui non passano mai sulla rete. Indirizzo `/ultima` e `/ultima/CODICE`; testi in italiano e inglese.
- Home: nuova icona del mazzo con il «1»; i giochi solo online non mostrano il badge «offline».
- Test: logica, bot (partite intere giocate dai bot), modulo online, server e e2e con tre telefoni.

## [0.23.1] - 2026-11-20

### Corretto

- Duello Lampo: a partita avviata la barra in alto dell'app (resa fissa nella 0.23.0) copriva la metà dello schermo di chi sta in alto. Ora la partita sta sopra a tutto e la barra si nasconde finché si gioca; torna uscendo. Regola generale: un gioco a schermo intero lo segnala con `segnalaSchermoIntero` (`@gdt/preferenze`), gli altri giochi tengono la barra.

## [0.23.0] - 2026-11-20

### Aggiunto

- Home: **ordinamento dei giochi**. Di base restano in ordine alfabetico; con il tasto ↑↓ accanto alla lente ogni gioco mostra la posizione e le frecce ▲▼, e si salva con «Salva l'ordinamento» (in fondo allo schermo, sempre visibile). «Annulla» lascia l'ordine di prima, «Ordine alfabetico» torna a quello di base. Durante l'ordinamento la ricerca è spenta e i giochi non si aprono. L'ordine resta salvato sul telefono; un gioco nuovo va in fondo.

### Modificato

- La barra in alto resta **sempre visibile** scorrendo, nella home (titolo, ordinamento, lente, ingranaggio) e dentro i giochi (indietro, nome, ingranaggio). Il piè di pagina con la versione resta in fondo alla pagina.
- Home: il titolo «Giochi da tavola» sta su una riga, anche con tre tasti accanto.

## [0.22.0] - 2026-11-20

### Aggiunto

- Duello Lampo: **ordine dei mini giochi**. Di base è «A caso»: a ogni sfida e a ogni rivincita i mini giochi escono in un ordine nuovo, con le mani di ognuno di fila (come nel Reactor). Con «Il mio ordine» si spostano i mini giochi con le frecce ▲▼ e escono in quell'ordine. L'ordine scelto resta salvato sul telefono. Sotto il totale dei round si legge la sequenza (o «Ordine casuale»).

### Modificato

- Duello Lampo: prima i mini giochi uscivano sempre nell'ordine dell'elenco; ora di base l'ordine è casuale (per ritrovare il vecchio comportamento: «Il mio ordine»).

## [0.21.0] - 2026-11-20

### Aggiunto

- Duello Lampo, Colori e nomi: impostazioni **«Parole nel round»** (da 2 a 10, base 6) e **«Parole che combaciano»** (da 1 al totale meno una, base 1), con selettore − / + come le mani. Le parole che combaciano escono in posizioni casuali (anche la prima o l'ultima): prima dopo quella giusta ne passavano sempre 3, e si poteva prevedere la fine.

## [0.20.0] - 2026-11-19

### Aggiunto

- Duello Lampo: impostazione **«Gli errori contano −1»** (spenta di base) in tutti i mini giochi dove si può sbagliare: chi sbaglia perde anche un punto, e il punteggio può andare sotto zero. Sono errori solo le risposte sbagliate (toccare prima del via, un colore sbagliato, una parola che non combacia, una figura che non è il bersaglio, una casella fuori sequenza), non essere più lenti. Raffica e Stop al centro non hanno errori. L'esito del round segna «(−1)».

### Modificato

- Duello Lampo: lo **spareggio** è un mini gioco scelto a caso tra quelli della sfida (prima era sempre Via!).
- Duello Lampo, Colori e nomi: dopo la parola che combacia ne passano altre, lo scorrimento non si ferma più (fermarsi suggeriva di toccare). Toccare quando nome e colore non combaciano, prima o dopo quella giusta, è un errore. Regola riscritta: «Tocca non appena vedi che nome e colore combaciano (es. «Blu» scritto in blu). Se tocchi quando non combaciano, perdi il round.»

## [0.19.1] - 2026-11-19

### Corretto

- Duello Lampo, Trova il panda e Trova lo smile: la scritta «Aspetta il panda…» (e «Trovato!», «Sbagliato!») copriva le figure al centro della griglia; ora sta sopra il riquadro, tra l'intestazione della metà e la griglia. Le caselle del 6×6 restano di 44 px.

## [0.19.0] - 2026-11-19

### Aggiunto

- Duello Lampo: **impostazioni di ogni mini gioco**, in un pannello a scomparsa sotto il mini gioco nella preparazione (con «N modificate» e «Valori di base»), salvate sul telefono con la sfida.
  - Via!: attesa massima prima del via (3, 5, 8 s).
  - Raffica: durata (3, 5, 10 s).
  - Stop al centro: velocità dell'indicatore (lenta, media, veloce).
  - Colore giusto: numero di colori (4 o 5, con il viola).
  - Colori e nomi: tempo per ogni parola (0,8, 1,3, 2 s).
  - Trova il panda e Trova lo smile: griglia (da 3×3 a 6×6), caselle che cambiano a ogni passo (da 1 a tutte), ogni quanto cambiano (da 0,5 a 2 s), rotazione delle figure che cambiano, figure tutte dritte (facile).
  - Memoria lampo: caselle (4, 6, 9) e lunghezza della sequenza (da 3 a 8).
- Guida per aggiungere un mini gioco: paragrafo sulle impostazioni.

### Modificato

- Duello Lampo, Trova il panda e Trova lo smile: quando compare il bersaglio le altre figure **continuano a cambiare** fino a fine round (prima la griglia si fermava e si capiva che era uscito); il bersaglio resta nella sua casella. Lo stato («Aspetta il panda…», «Trovato!») sta sopra la griglia invece che sotto, così la griglia ha più spazio.
- Le scelte salvate delle versioni precedenti di Duello Lampo si scartano (ripartono dai valori di base).

### Rimosso

- `games/duello-lampo/docs/piano-impostazioni-minigiochi.md`: il piano è stato realizzato, il contenuto è nel README del gioco e nella guida per aggiungere un mini gioco.

## [0.18.1] - 2026-11-19

### Modificato

- Duello Lampo, Trova il panda e Trova lo smile: invece di cambiare tutta la griglia (che stancava la vista) ogni secondo cambiano solo 3 caselle a caso, e il bersaglio compare in una di quelle. Griglia, caselle che cambiano, tempo, rotazione e figure dritte sono già parametri del modulo (`ParametriTrova`), pronti per diventare impostazioni.
- Piano delle impostazioni dei mini giochi aggiornato con le decisioni dell'utente.

## [0.18.0] - 2026-11-19

### Aggiunto

- Duello Lampo: **Colori e nomi**, passano nomi di colori scritti con un altro colore e vince chi tocca per primo quando nome e colore combaciano (chi anticipa perde, come in Via!).
- Duello Lampo: **Trova lo smile**, faccine tristi colorate e girate, vince chi tocca per primo quella che sorride.
- Duello Lampo: piano per le impostazioni di ogni mini gioco (`games/duello-lampo/docs/piano-impostazioni-minigiochi.md`, da rivedere).

### Modificato

- Duello Lampo: in **Trova il panda** la griglia cambia tutta ogni 0,7 secondi finché non compare il panda, così non si trova più per esclusione. Panda e smile usano lo stesso modulo (`minigiochi/trova.ts`).

## [0.17.0] - 2026-11-19

### Aggiunto

- Duello Lampo: tre nuovi mini giochi.
  - **Colore giusto**: il nome di un colore scritto con un altro colore, si tocca il colore della scritta (effetto Stroop).
  - **Trova il panda**: griglia di animali colorati girati in direzioni casuali, vince chi tocca per primo il panda quando compare.
  - **Memoria lampo**: si ripete una sequenza di quattro caselle che si accendono.
- Colori di gioco come token del tema (`--c-rosso`, `--c-blu`, `--c-verde`, `--c-giallo`, `--c-viola`), con contrasto ≥ 4,5:1 nei due temi.

### Modificato

- Duello Lampo: tolto `docs/piano-duello-lampo.md`, il contenuto è nel README del gioco, in `docs/decisioni.md` e nella guida per aggiungere un mini gioco.

## [0.16.2] - 2026-11-19

### Modificato

- Duello Lampo: il nome inglese diventa **Flash Duel** (prima «Lightning Duel»).

## [0.16.1] - 2026-11-19

### Corretto

- Duello Lampo: i pulsanti − e + delle mani erano spostati a destra, con l'icona fuori centro: ora sono centrati.

## [0.16.0] - 2026-11-19

### Modificato

- Duello Lampo: al posto del numero di round fisso (3, 5, 7, 9, 11) ogni mini gioco ha un **selettore delle mani** (− e +, da 0 a 9; con 0 non si usa). Le mani di un mini gioco si giocano **di fila**, nell'ordine dell'elenco (es. Via! due volte, poi Stop al centro tre volte); sotto l'elenco si legge il totale dei round. Le scelte salvate con la versione precedente si scartano.
- Duello Lampo: **contatore dei punti** grande in ogni metà dello schermo, con il nome e i punti del giocatore di quella metà.
- Duello Lampo: la guida per aggiungere un mini gioco è ora in `games/duello-lampo/docs/aggiungere-un-minigioco.md`; il README del gioco ha solo il rimando.

## [0.15.0] - 2026-11-19

### Aggiunto

- **Duello Lampo**, nuovo gioco: sfida di riflessi per due sullo stesso telefono, appoggiato al centro del tavolo (la metà di schermo in alto è ruotata di 180°). Mini giochi **Via!**, **Raffica** e **Stop al centro**, 1 punto a ogni mini gioco vinto, spareggio di Via! se finisce in parità. Prima di cominciare si scelgono i mini giochi (con «Tutti» e «A caso»), da 3 a 11 round e i nomi, e la scelta resta salvata sul telefono. Indirizzo `/duello-lampo`, italiano e inglese, suoni sintetizzati, schermo sempre acceso durante la sfida. I mini giochi sono moduli (regole, vista, registro) pensati per aggiungerne altri facilmente; la versione online è rimandata e la guida del gioco spiega cosa comporta.
- Piani di lavoro: `docs/piano-duello-lampo.md` e `docs/piano-ultima.md` (gioco di carte in stile UNO, da fare).

## [0.14.0] - 2026-11-19

### Aggiunto

- Lupus in fabula: **storico della partita** per il narratore (notte per notte chi ha indicato chi e chi è morto, giorno per giorno indiziati ed eliminato); se il narratore gioca, ogni ruolo rivede le proprie scelte passate durante il suo turno.
- Lupus in fabula: nelle impostazioni del gioco si sceglie la durata del **timer della discussione** (ore, minuti e secondi come il timer del telefono, da 1 secondo a 1 ora; predefinito 3 minuti).

### Modificato

- Lupus in fabula: «Salta la transizione» per il narratore che non gioca (se gioca non c'è, per non sbirciare il turno dopo); l'ululato suona anche alla vittoria dei lupi.
- Lupus in fabula: la durata della schermata di transizione si regola liberamente (minuti e secondi, da 1 secondo a 1 minuto) invece dei preset 3/5/8/10 s; l'opzione «No» non c'è più.
- Lupus in fabula: nuovi suoni mp3, il pianto del lupo quando muore un lupo e la ninna nanna a carillon durante «Occhi chiusi» (si ferma quando la schermata finisce; nella transizione verso i lupi resta solo l'ululato, per non sovrapporli).
- Lupus in fabula: ululato e gallo sono ora registrazioni mp3 (offline, con ripiego sulla sintesi se non partono).
- Lupus in fabula: la carta del Gufo è dinamica («Gufo» sotto i 20 giocatori, «Gufo Letale» da 20); testo del criceto mannaro più chiaro; alla scoperta della carta i lupi non vedono più i compagni (si riconoscono di notte, come i massoni).

### Corretto

- Lupus in fabula: la voce del narratore non si sovrappone più a nessun suono (ululato, gallo, versi e jingle, mp3 o sintetizzati): parte quando sono finiti e, se c'è la schermata di transizione, solo dopo che questa è finita (la transizione non aspetta più la voce).
- Lupus in fabula: nella scelta dei personaggi non si possono spuntare più speciali di quanti ne entrino (i contadini non scendono sotto zero).

## [0.13.0] - 2026-11-14

### Aggiunto

- Lupus: nuovi personaggi (Medium, Indemoniato, Massoni, Criceto mannaro, Gufo e Gufo Letale, Mitomane), voto ufficiale a due turni, da 8 a 24 giocatori. Dettagli nei punti seguenti.

### Modificato

- Lupus (passo 2 del piano): da 8 a 24 giocatori; 2 lupi (3 da 16), un veggente, il Medico da 11 giocatori (con casella per toglierlo o aggiungerlo), il resto contadini. Il veggente si sveglia prima dei lupi; la prima notte nessuno viene sbranato (opzione attiva). Il Medico agisce dalla seconda notte, non può proteggere sé stesso ma può ripetere la stessa persona. Il ruolo di chi muore non si dice più di default. Le partite salvate di versioni precedenti si scartano.
- Lupus (passo 3 del piano): voto ufficiale a due turni. Dopo la discussione (timer facoltativo) votano tutti, anche i morti; i due più votati sono gli indiziati e fanno l'arringa; al secondo turno votano in segreto i vivi non indiziati e il più votato è linciato. I pareggi li decide il «Benvenuto!» (l'ultimo morto, il primo giorno il narratore). Il ballottaggio non c'è più.
- Lupus (passo 4 del piano): nuovi personaggi. Il **Medium** (da 9 giocatori, dalla seconda notte sente se l'ultimo linciato era un lupo), l'**Indemoniato** (da 10, umano ma vince con i lupi; per il veggente è innocente) e i due **Massoni** (da 13, si riconoscono la prima notte). Le fasi si giocano anche se chi ha il ruolo è morto, senza risultati.
- Lupus (passo 7 del piano): il **Mitomane** (da 16 giocatori), una sola volta alla fine della seconda notte, indica un vivo e ne prende il ruolo se è lupo o veggente.
- Lupus (passo 6 del piano): il **Gufo** (da 12 giocatori) indica uno ogni notte; sotto i 20 giocatori l'indicato è tra gli indiziati del primo turno, da 20 (Gufo Letale) muore all'alba se non è lupo o criceto.
- Lupus (passo 5 del piano): il **Criceto mannaro** (da 15 giocatori) non si può sbranare, muore con lo sbranato se il veggente lo guarda e, se è vivo a fine partita, vince da solo. L'alba può annunciare due morti.


### Interno

- Lupus, motore a descrittori (passo 1 di `docs/piano-lupus-personaggi.md`): le fasi della notte sono un elenco ordinato `FASI_NOTTE` (chi si sveglia, chi può scegliere, effetto) al posto di `dopoLupi`/`dopoVeggente`; aggiunti `fazione(ruolo)`, `finePartita` (fine e vincitori) e `ruoliIniziali`. Il gioco non cambia, i 135 test restano verdi.
- Errori del server (Impostore e Tris) come codici `errore_<codice>` tradotti in it/en, invece di frasi italiane scritte a mano.
- `docs/guida-deploy-online.md`: cosa fare quando Render free è in pausa.
- `docs/decisioni.md`: «Punti aperti» con FATTO/TODO e architettura aggiornata (server generico, coda, `packages/collegamento` e `packages/i18n`).

## [0.12.0] - 2026-11-08

### Aggiunto

- **Dadi, spiegazione delle facce**: un modello può avere un campo facoltativo `info` (testo libero, max 1000 caratteri) e accanto al dado compare il tasto «i» che apre la spiegazione. Anche il dado «Personalizzato» ha il suo campo «Cosa significano le facce (facoltativo)».
- **Dadi, modello «Taboo»** (5 facce: Indovino singolo, Tempo doppio, Statua di sale, Tutti in gioco, Taboo classico) in italiano e inglese, con la spiegazione di ogni faccia.

## [0.11.0] - 2026-11-07

### Aggiunto

- **Tris, «Partita veloce»**: nella schermata online di Tris basta scrivere il proprio nome e toccare «Cerca un avversario». Il server abbina i telefoni in coda a due a due e avvia subito la partita (il primo in coda è X e organizzatore), senza codici da scambiarsi. Si può annullare; dopo 2 minuti senza avversario l'app propone di giocare con un solo telefono. Nomi uguali diventano «Nome» e «Nome (2)».

### Interno

- Coda in memoria per gioco (`apps/server/src/coda.ts`, max 50 voci); un gioco online la abilita con `coda: { giocatori }` in `GiocoOnline`. Nuovi messaggi `coda`, `esciDaCoda`, `inCoda`, `codaScaduta`. I test e2e della coda girano uno alla volta (progetti `coda-*`) perché la coda è condivisa dal server.

## [0.10.0] - 2026-11-07

### Aggiunto

- **Tris online** (`/tris`, «Ognuno col suo telefono»): l'organizzatore scrive i due nomi (X e O) e condivide codice, link o QR; ognuno prende il proprio posto e si muove solo dal suo telefono, al suo turno (lo verifica il server). Rivincita quando la chiedono entrambi, chi inizia alterna, punteggio della serie. Un terzo telefono può guardare o riprendere il posto di chi è caduto; il rientro dopo refresh o caduta di rete è automatico. L'organizzatore può chiudere la partita. Italiano e inglese. Nella home Tris ha ora anche il segno online.

### Cambiato

- In Tris, aprendo il gioco si sceglie prima «Un solo telefono» o «Ognuno col suo telefono» (come in Impostore).

### Interno

- Server di gioco generico: `apps/server` non dipende più da Impostore. Ogni gioco online espone un `GiocoOnline` (contratto in `@gdt/engine`: `nuovoStato`, `applica`, `traduci` con i permessi, `vistaPer`, `momento`, `inGioco`) e si registra in `apps/server/src/giochi.ts`. Il messaggio `crea` accetta `gioco` (assente = Impostore, per i client di prima).
- Nuovo pacchetto `packages/collegamento` (`@gdt/collegamento`): il hook WebSocket (rientro con token, riconnessione, stanza chiusa) è condiviso da Impostore e Tris.
- Tris online lato logica: `games/tic-tac-toe/src/online` (con test) e test del server; i test grafici partono anche dal server di gioco (`playwright.config.ts`).

## [0.9.0] - 2026-11-07

### Aggiunto

- Nuovo gioco **Tris** (`/tris`), a un telefono: contro il telefono (facile, medio, difficile; il difficile non perde mai) oppure in due. Sceglie il segno X/O, chi inizia alterna a ogni partita, punteggio della serie. Italiano e inglese. La modalità online non c'è ancora (punto aperto in `docs/decisioni.md`).

## [0.8.2] - 2026-11-07

### Aggiunto

- Home: accanto al nome di ogni gioco ci sono le icone delle modalità, le stesse della scelta in Impostore: offline (un solo telefono, oro) e online (ognuno col suo telefono, verde). Tutti i giochi hanno l'offline; l'online c'è solo in Impostore (`online: true` nel `manifest`).

### Corretto

- Su telefono, al tocco di un pulsante non compare più il riquadro azzurro del browser (`-webkit-tap-highlight-color`); il doppio tocco non fa più zoom sui pulsanti e sui link.

## [0.8.1] - 2026-11-07

### Aggiunto

- Home: i giochi sono in ordine alfabetico (nella lingua in uso) e la lente in alto apre una barra di ricerca per filtrarli per nome o descrizione.

### Corretto

- Il click sonoro dei pulsanti non suonava su quelli che si disabilitano cliccandoli (il «Lancia» dei Dadi).

### Cambiato

- Impostore: la parola da indovinare ha un massimo di 40 caratteri (`MAX_CARATTERI_PAROLA`), valido per il campo del tentativo e per le parole in `data/`; un test controlla le parole e il README lo ricorda.
- Dadi: documentato che per ora c'è solo il suono di click dei pulsanti, come negli altri giochi.

## [0.8.0] - 2026-11-07

### Aggiunto

- Nuovo gioco **Dadi** (`/dadi`, italiano e inglese): moneta, D4, D6, D8, D10, D12, D20 e dado personalizzato con i valori scritti uno per riga; con due valori diventa una moneta. Lancio con `crypto.getRandomValues` (senza bias), animazione che rispetta «riduci movimento», storico degli ultimi lanci. I modelli stanno in `games/dadi/data/<lingua>/modelli.json`.

### Cambiato

- Limite di 20 caratteri per i nomi dei giocatori e delle squadre (Impostore, Lupus, Tabù) e per i valori del dado personalizzato, perché non escano dagli elementi grafici. Nell'Impostore online il limite dei nomi scende da 40 a 20.

### Corretto

- Impostazioni: l'etichetta del tema ora segue il tema in uso («Tema scuro» / «Tema chiaro», «Dark theme» / «Light theme») invece di restare sempre «Tema scuro».

## [0.7.1] - 2026-11-07

### Cambiato

- La scelta della lingua mostra le bandiere (SVG).
- README di Lupus: riportata la guida per aggiungere un personaggio (era stata tolta per errore), aggiornata alle lingue.

## [0.7.0] - 2026-11-07

### Aggiunto

- Inglese: l'app, Impostore, Lupus in fabula e Tabù si possono usare in italiano o inglese (ingranaggio → Lingua; predefinita quella del telefono). Ogni lingua ha le sue parole, carte e personaggi (`data/en/`). In Impostore online la lingua delle parole si sceglie alla creazione della stanza.
- Nuovo pacchetto `packages/i18n` (`@gdt/i18n`): lingua, traduzioni con segnaposti e plurali.

### Cambiato

- Carte nei dati: Tabù legge le carte da `games/tabu/data/it/carte.json`; Impostore ha il nome di ogni categoria nel file delle parole (`nome` + `parole`); Lupus ha i testi dei personaggi in `games/lupus/data/it/personaggi.json`. Nessun cambiamento visibile. I README spiegano come cambiare o aggiungere carte e personaggi.
- Tabù: il README dichiarava 148 carte, sono 140.

## [0.6.1] - 2026-11-07

### Cambiato

- Lupus: prima del racconto dell'alba la transizione mostra il sole e «Il villaggio si risveglia» (non più luna e «Occhi chiusi»).

## [0.6.0] - 2026-11-07

### Aggiunto

- Lupus: schermata di transizione «Occhi chiusi» tra un ruolo e l'altro e tra notte e giorno, per non vedere la schermata successiva dopo aver toccato il pulsante di fine turno. Durata nelle impostazioni del gioco (No, 3, 5, 8, 10 s; predefinito 5 s); aspetta la fine della voce del narratore (massimo 20 s).
- Impostazioni di gioco: dentro un gioco l'ingranaggio mostra due sezioni, «App» (tema, audio) e il nome del gioco (impostazioni del gioco). Nel menu restano solo quelle dell'app. Nuovo pacchetto `packages/preferenze` (`@gdt/preferenze`): ogni gioco dichiara le sue impostazioni nel manifest.

### Cambiato

- Lupus: lupi e medico chiudono con «Conferma e torna a dormire», il veggente con «Ho visto, torna a dormire», uguali in tutte le fasi notturne.

## [0.5.0] - 2026-11-07

### Aggiunto

- Test grafici (Playwright, 375 px, tema scuro e chiaro) per menu, Impostore, Lupus e Tabù; vedi `docs/test.md`.
- Test unitari estesi a tutta la logica e alle validazioni (da circa 100 a 550 test): Lupus, Tabù, Impostore online, permessi del server, motore.
- `pnpm test:unit`, `pnpm test:e2e`, `pnpm coverage`.
- Regolamento nell'app: libro accanto a ogni gioco nel menu; dentro un gioco anche dall'ingranaggio. Si scorre solo il testo, titolo e X restano fermi. Lupus ha la sezione "I personaggi".
- Impostazioni (ingranaggio in alto a destra): interruttori animati per tema scuro e audio. L'audio è spento di default: acceso, dà un suono a ogni pulsante e attiva i suoni dei giochi (Tabù: indovinata, vietata, passa e fine turno; Impostore: vittoria di civili o impostori e sollecito online; Lupus: voce del narratore, gallo all'alba, ululato all'inizio della notte, un verso per ogni ruolo di chi muore se il narratore ne dice il ruolo, e due suoni di fine partita per contadini e lupi). Spegnerlo ferma subito la voce in corso. Nuovo pacchetto `packages/suoni` (suoni sintetizzati, nessun file).

### Cambiato

- Impostore: la freccia indietro (e il tasto indietro del telefono) dalla modalità scelta torna a «Come giocate?», non al menu.
- Tabù: turni (1–20) e secondi per turno (10–180, a passi di 5) si scelgono con − / + invece che da un elenco fisso.
- Lupus: il testo della spunta del narratore cambia secondo la scelta; tolta la frase sotto «Inizia».
- Impostore: testi aggiornati per la modalità online e per il giro degli indizi nel regolamento.
- `pnpm dev`: la porta 8081 rimuove da sola un vecchio service worker rimasto da una build precedente.

- Comandi di sviluppo: `pnpm dev` avvia sito e server di gioco insieme ed è raggiungibile anche dal telefono. Rimossi `pnpm dev:server`, `pnpm dev:rete` e `pnpm anteprima` (la build vera si prova con `docker compose up`).

- Lupus: i candidati della notte (lupi, veggente, medico) si calcolano nella logica, non più nella schermata; il server di gioco e la UI usano le stesse regole. Il riduttore ora rifiuta scelte non valide.
- Lupus: controllo dei nomi spostato in `validazione.ts` (stesso messaggio: servono almeno 4 giocatori).
- Documentazione: README dei giochi snelliti (sezioni "Regolamento" e "Modalità di gioco" Offline/Online, comandi in breve); la guida passo passo e il firewall sono in `docs/provare-in-locale.md`; nuova guida `docs/test.md`; corretti il link a "Pubblicare" e il verso del giro in Impostore, la tabella dei dati sul browser, i conteggi di parole e carte.

## [0.4.2] - 2026-11-05

### Aggiunto

- Impostore online: "Rivedi la mia carta" durante indizi, voto e tentativo. La carta resta nascosta finché non la tocchi e la vedi solo tu.

## [0.4.1] - 2026-11-05

### Cambiato

- Impostore online: tolti "Escludi dal voto" e "Salta il turno". Se un giocatore sparisce la partita si chiude e se ne crea un'altra (il rientro automatico copre le cadute di rete). Escluderlo falsava il ballottaggio e l'esito.
- Impostore online: "Tutti hanno visto: via agli indizi" si attiva solo quando hanno visto la carta tutti; con gli indizi scritti "Si passa al voto" solo quando hanno scritto tutti. Il server rifiuta comunque l'avanzamento anticipato.

## [0.4.0] - 2026-11-04

### Aggiunto

- Impostore online: opzione "Indizi scritti nell'app" alla creazione della partita. Nella fase indizi chi è di turno scrive il suo indizio e lo invia; gli altri lo vedono subito, e si procede in ordine (dal primo di turno) fino a chi chiude il giro. L'organizzatore può sollecitare e passare al voto. Gli indizi restano consultabili durante la votazione. Senza l'opzione gli indizi si dicono a voce come prima.

## [0.3.1] - 2026-11-04

### Aggiunto

- Impostore online: un asterisco accanto al nome dell'organizzatore nell'elenco della stanza e nella sala d'attesa

### Corretto

- Impostore online: se l'organizzatore perde il collegamento e rientra come "nuovo" telefono, riprendendo il proprio nome torna organizzatore (prima nessuno poteva più far avanzare la partita)
- Entrando con il codice scritto a mano, il telefono ora si presenta con il proprio token se la partita lo conosce già

## [0.3.0] - 2026-11-04

Impostore ognuno col suo telefono.

### Aggiunto

- **Server di gioco** (`apps/server`, WebSocket, Docker): `docker compose up` sul PC (WiFi o hotspot) oppure su un hosting che esegue contenitori; serve anche l'app
- **Impostore online**: stanze con codice e link, ognuno sceglie il proprio nome, carta visibile solo sul proprio telefono, voto dal proprio telefono con ballottaggio (secondo pareggio: vincono gli impostori)
- Organizzatore: avvio, chiusura partita, sollecito, "Escludi dal voto" per un telefono irraggiungibile, liberare un nome
- Rientro dopo refresh, schermo bloccato o caduta di rete (token sul telefono) e rientro in una partita già avviata
- Pannello stanza con chi è collegato, **QR code** dell'invito generato sul telefono
- Se il server non risponde entro 8 secondi l'app avvisa e propone un solo telefono
- Versione dell'app mostrata in grigio in fondo a ogni pagina
- Guide: giocare con il PC (WiFi/hotspot, firewall) e mettere il server online; architettura tecnica (stanze, dati sul browser, limiti di sicurezza)

### Cambiato

- `vercel.json` valido: ogni indirizzo apre l'app

## [0.2.0] - 2026-11-04

I tre giochi a un telefono, anche offline.

### Aggiunto

- **Tabù** (due squadre, timer) con carte originali
- **Lupus in fabula** con narratore a voce, veggente, medico, voto e ballottaggio
- **Impostore**: parole portate a circa 800 e tre nuove categorie (sport, oggetti, mezzi di trasporto); consiglio sul numero di impostori
- Un indirizzo per ogni gioco (`/impostore`, `/lupus`, `/tabu`) e `vercel.json` per aprirli direttamente
- App web installabile (PWA) che funziona offline dopo il primo caricamento; versione in grigio in fondo a ogni pagina
- Motore condiviso: numeri casuali con seme, giocatori, codice partita, macchina a stati per le fasi
- Guide passo passo per ogni gioco
