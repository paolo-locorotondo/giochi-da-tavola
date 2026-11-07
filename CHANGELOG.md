# Changelog

Tutte le modifiche importanti a questo progetto. Le versioni seguono
[Semantic Versioning](https://semver.org/lang/it/): `MAJOR.MINOR.PATCH`.

- **MAJOR**: cambi che rompono le partite già in corso o i codici condivisi
- **MINOR**: nuovi giochi o nuove modalità
- **PATCH**: correzioni

## [Non rilasciato]

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
