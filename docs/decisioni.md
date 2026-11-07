# Decisioni di progetto — giochi-da-tavola

Riepilogo delle decisioni prese (avvio 2026-11-02, architettura di rete rivista il 2026-11-04).
Per ogni punto: cosa si è deciso e perché. I punti ancora aperti sono in fondo.

## Obiettivo

Una **raccolta di giochi "da tavola" / party game** da usare con lo smartphone mentre
si è seduti allo stesso tavolo. L'app non sostituisce l'interazione dal vivo: serve a
**distribuire informazioni segrete** (parola, ruolo), **guidare le fasi** (turni, timer,
notte/giorno, narrazione) e, quando serve, **raccogliere scelte segrete**.

Giochi, in ordine:
1. **Impostore** — tutti ricevono la stessa parola segreta tranne l'impostore. Giro di
   indizi, discussione, voto. Se scoperto, l'impostore può vincere indovinando la parola.
   Disponibile a un telefono e ognuno col suo telefono.
2. **Lupus in fabula** — ruoli segreti, fasi notte/giorno, voto e ballottaggio. Oggi a un
   telefono con narratore a voce; la versione ognuno col suo telefono è il prossimo passo.
3. **Tabù** — due squadre, timer, carte con parola vietata. Resta **solo a un telefono**:
   il telefono deve passare di mano, giocarlo online non avrebbe senso.
4. **Dadi** — moneta, dadi D4…D20 e dado personalizzato (con due valori diventa una moneta).
   Un telefono, senza partita. Lancio casuale con `crypto.getRandomValues`.
5. Altri giochi in futuro (si ipotizzano decine): l'architettura deve renderli economici
   da aggiungere.

## Piattaforma

- **Web app / PWA** installabile ("Aggiungi a schermata Home"), funzionante **offline**
  dopo il primo caricamento (service worker).
- Niente app native per ora. Se un giorno servisse la presenza negli store: Capacitor.
- **React + TypeScript**, build con **Vite**. Scelto React (rispetto a Svelte) per
  competenza spendibile, ecosistema e possibile React Native in futuro.

## Rete: due modi di giocare, un solo server

| Modalità | Come funziona | Rete |
|---|---|---|
| **A. Un solo telefono** | Il telefono passa di mano, ognuno vede la sua carta | Nessuna, anche offline |
| **B. Ognuno col suo telefono** | Un server tiene la partita e manda a ogni telefono solo ciò che può vedere | Internet, WiFi o hotspot |

### Modalità B: un nostro server WebSocket in Docker

**Decisione (2026-11-04):** un unico server Node (`apps/server`) con WebSocket, impacchettato
in un'immagine Docker. **Lo stesso programma** gira:
1. sul PC di chi organizza, con `docker compose up`, con i telefoni collegati allo stesso
   WiFi o all'hotspot di un telefono (nessun internet necessario);
2. su un servizio di hosting che esegue contenitori Docker, quando il PC non c'è
   (vedi [guida-deploy-online.md](guida-deploy-online.md)).

Locale e online sono quindi la stessa cosa: cambia solo l'indirizzo. Il server serve anche
i file dell'app (un comando, un indirizzo) e risponde `/salute` per i controlli.

**Perché non Supabase / funzioni di Vercel** (piano scartato, era nella prima versione di
questo file):
- Le funzioni di Vercel non tengono la memoria tra una richiesta e l'altra e i loro
  WebSocket erano in beta con durata massima limitata: serviva un database esterno e
  molti pezzi da far parlare tra loro.
- Supabase in Docker in locale avvia molti contenitori e non ha lo stesso comportamento
  dell'online, mentre l'obiettivo è che il locale emuli esattamente l'online.
- Un server nostro: meno dipendenze, stesso codice ovunque, comportamento sotto controllo.
- Costo: serve un hosting che esegua Docker e che regga i WebSocket. **Vercel da solo non
  basta** per la modalità B; può restare per la modalità A (sito statico).

**Come funziona**
- La logica di partita è un modulo **puro** (`nuovoStato`, `applica(azione)`,
  `vistaPer(giocatore)`), senza rete: lo usa il server e si testa da solo.
- Il server è **autoritativo**: controlla chi può fare cosa e tiene lo stato **in memoria**.
  Se il processo si riavvia le partite si perdono (accettato: sono brevi). Le stanze
  inattive da 6 ore vengono cancellate.
- Ogni telefono riceve solo la **sua vista**: la carta altrui non viaggia mai sulla rete.
- Ogni telefono ha un **token** salvato sul dispositivo: dopo refresh, schermo bloccato o
  caduta di rete rientra da solo nello stesso posto. Il client si riconnette da solo; il
  server fa un controllo periodico (ping ogni 25 s) per accorgersi dei telefoni caduti.
- Codice partita: 5 caratteri, alfabeto senza simboli ambigui (`0/O`, `1/I/L`).
- Un link `…/impostore/CODICE` porta direttamente nella partita.

**Limiti noti del WiFi locale** (dettagli in [guida-giocare-con-il-pc.md](guida-giocare-con-il-pc.md))
- Serve una regola del firewall di Windows per la porta 8080.
- Su `http://192.168.x.x` il browser **non è in contesto sicuro**: non funzionano
  "Condividi", copia negli appunti e installazione della PWA. L'invito si fa con un **QR code**
  generato sul telefono dell'organizzatore, oppure a voce con il codice o l'indirizzo.
- Il container stampa il suo indirizzo interno (`172.x`), non quello del PC: l'indirizzo
  giusto si legge con `ipconfig` o si fa stampare con la variabile `HOST_IP`.
- Se il WiFi isola i client (hotel, locali) i telefoni non vedono il PC: hotspot di un
  telefono oppure modalità A.
- `docker compose build` richiede internet: farlo prima di partire.

### Modalità A: codice con seme

La modalità A usa un generatore deterministico con seme (`packages/engine`). Il vecchio
"livello 1" (codice condiviso, ogni telefono calcola da solo) è **abbandonato** per le
partite a più telefoni: ogni telefono dovrebbe conoscere l'intera partita (la carta altrui
sarebbe visibile) e non si può votare o contare in diretta. Il codice di quell'esperimento
vive solo nel branch `feat/codice-condiviso`, **da non unire a `main`**.

### Impostore, modalità B

**Creare la partita** (organizzatore): nomi dei giocatori (nessun limite fisso), numero di
impostori (con consiglio), categoria e *voti visibili in diretta* (sì = contatori che
salgono; no = si rivelano quando hanno votato tutti) e *indizi scritti* (sì = si scrivono nell'app uno alla volta, nell'ordine che parte dal primo di turno casuale, per giocare da case diverse; no = a voce). Il server genera codice e link.

**Entrare:** si apre il link o si scrive il codice; il giocatore tocca il **proprio nome**
(un nome preso non è più scegliibile). Solo l'organizzatore può liberare un nome occupato.

| Fase | Giocatore | Organizzatore |
|---|---|---|
| Sala d'attesa | Nomi liberi e occupati | Chi è entrato, avvio partita |
| Carta | Solo la propria, da scoprire | Come gli altri; il pulsante per andare agli indizi si attiva quando l'hanno vista tutti |
| Indizi | A voce: chi parla per primo. Con *indizi scritti*: chi è di turno scrive e invia, gli altri leggono | Pulsante per passare al voto (attivo solo quando hanno scritto tutti, se gli indizi sono scritti); con indizi scritti anche sollecito |
| Voto | Gli altri giocatori, ne sceglie uno (modificabile finché non votano tutti); contatori solo se attivi | Come gli altri, più chi manca e sollecito |
| Ballottaggio | Solo i pari merito | Idem |
| Tentativo | Solo l'impostore scoperto scrive la parola | Vede che sta tentando |
| Fine | Esito, parola, impostori | Idem, e può ripartire |

**Voto e pareggio** (confermato 2026-11-04): viene eliminato chi ha più voti. In caso di
pareggio, **ballottaggio solo tra i pari merito**; se pareggiano ancora, **nessuno viene
eliminato e vincono gli impostori**. Non c'è una regola ufficiale: è una scelta nostra.

**Tutti devono votare:** il voto si chiude solo quando hanno votato tutti. L'organizzatore
vede chi manca e può sollecitare. **Niente "escludi dal voto"** (rimosso il 2026-11-05): provando con tre telefoni, escludere un giocatore caduto ha falsato il ballottaggio e l'esito. Con il rientro automatico, se qualcuno smette davvero di giocare si chiude la partita e se ne crea un'altra. Il voto per procura è scartato: toglierebbe il voto segreto. Stessa logica per carte e indizi: si avanza solo quando hanno agito tutti.

## Architettura software

- **Monorepo** con **pnpm workspaces**. Motivo: motore, giochi e server evolvono insieme,
  versioni sempre allineate, un'unica app "raccolta".
- **Ogni gioco è un plugin** (`games/*`): esporta un `manifest`, la logica e la UI; l'app
  li carica in lazy loading.
- **Ogni gioco ha un proprio indirizzo**: `/impostore`, `/lupus`, `/tabu`, `/dadi`.
- **Logica di gioco in TypeScript puro e deterministica**, separata dalla UI: testabile e
  identica nel browser (modalità A) e sul server (modalità B).
- **Fasi come macchina a stati.**
- **Carte e testi nei dati**: le carte di ogni gioco (parole, categorie, personaggi) stanno in
  `games/<gioco>/data/<lingua>/*.json` e si cambiano senza toccare il codice; il README del gioco
  spiega come. Le regole (poteri dei ruoli, punteggi) restano nel codice: sono logica, non dati.
- **Impostazioni**: l'ingranaggio mostra sempre «App» (tema, audio) e, dentro un gioco, anche le
  impostazioni del gioco, dichiarate nel `manifest` (`impostazioni`) e salvate dal pacchetto
  `@gdt/preferenze`. Sono dell'app su quel telefono, non della partita.
- **Lingue**: pacchetto nostro (non i18next) per avere chiavi controllate dal compilatore, peso
  quasi nullo e plurali con `Intl.PluralRules`. Lingue: italiano e inglese (realizzato, v0.7.0). Ogni gioco ha `src/locales/{it,en}.ts` e dati in `data/<lingua>/`; la logica non produce frasi ma codici (errori, esiti) che la UI traduce. Limite noto: alcuni messaggi di errore propri del server di gioco (`apps/server`) sono ancora in italiano.
- **Narratore** (Lupus): oggi un narratore automatico a voce (Web Speech API, funziona
  offline). Previsto anche un pannello per un narratore umano.

Struttura attuale:

```
giochi-da-tavola/
├── apps/
│   ├── web/        → PWA: menu giochi, indirizzi per gioco
│   └── server/     → server partite WebSocket (Node), serve anche l'app
├── packages/
│   ├── engine/     → RNG con seme, codice partita, utilità comuni
│   ├── suoni/      → suoni sintetizzati e interruttore audio
│   └── preferenze/ → impostazioni dei giochi salvate sul telefono
├── games/
│   ├── impostore/  → regole, UI a un telefono, modulo online (src/online) e UI online
│   ├── lupus/      → regole e UI a un telefono
│   ├── tabu/       → regole, carte e UI
│   └── dadi/       → lancio, modelli di dado e UI
├── Dockerfile, docker-compose.yml
└── docs/           → questo file e le guide
```

Git: branch `main` + un branch per gioco/funzione, commit con prefisso
(`feat(impostore): ...`, `fix(...)`). Il push lo fa sempre l'utente.

## Deploy

- **Server di gioco (modalità B):** immagine Docker. In locale `docker compose up`; online su
  un hosting che esegue contenitori e supporta i WebSocket
  ([guida](guida-deploy-online.md)).
- **Modalità A:** l'app è statica (`pnpm build` → `dist/`) e può stare anche su Vercel
  (Root Directory `apps/web`). Gli host statici rispondono 404 se si ricarica direttamente
  `/impostore`: per questo c'è `apps/web/vercel.json` con una regola "per qualsiasi
  indirizzo servi `index.html`" (provata su Vercel il 2026-11-04). Il server di sviluppo e
  il nostro server lo fanno già da soli.
- La modalità B funziona solo dall'indirizzo del server di gioco, perché è lì che c'è il
  WebSocket.

## Lezioni dal progetto precedente (`../tic-tac-toe`)

Server Node + `ws`, autoritativo, stanze con codice, heartbeat, deploy su Render free.
Fatto diversamente qui: logica di gioco separata dagli handler, **viste private per
giocatore**, N giocatori con organizzatore, **riconnessione con token**, e attenzione
all'hosting che va in sleep (Render free dopo ~15 minuti: avvio lento).

## Punti aperti

- Test grafici: gli screenshot di riferimento sono fatti su Windows; se serve la CI su Linux vanno rigenerati là (vedi docs/test.md). Manca un test automatico con più telefoni veri per la partita online.
- Prova su telefoni veri: WiFi con `docker compose up`, hotspot, schermo bloccato e rientro.
- Lupus ognuno col suo telefono (ruoli segreti, notte, voto).
- Prova del server online su Render (condizioni del piano gratuito da verificare).
- Sul sito statico (Vercel) il pulsante online non ha un server: dopo 8 s avvisa e propone un solo telefono.
- Tabù: miglioramenti di grafica e funzioni (carte scartate o usate nella mano, ecc.), da
  discutere.
- Regole e carte di Tabù e Lupus da verificare dall'utente; originalità delle carte.
- Licenza del repository (README: "Da definire").
- Turborepo sì/no (si può decidere più avanti).
- Vercel: decidere se toglierlo dalla documentazione (Render basta da solo: stesso indirizzo per sito, gioco online e installazione). Da scollegare anche dalla dashboard di Vercel.
- Grafica: stile «Tavolo» fatto; altri stili (Argilla, Quiz) solo se richiesti.
- Stili della carta riusata in "Rivedi la mia carta" (Impostore online): da verificare a schermo.
- Pulizia: cancellare il ramo locale `archivio/storia-completa` quando non serve più.
- TODO Lupus, nuovi ruoli: i test ora coprono tutti i casi attuali (`games/lupus/src/regole.test.ts`), quindi si può fare la sessione dedicata.
  Il lavoro andrà in `games/lupus/src/logica.ts`: i ruoli sono nel tipo `Ruolo`; ogni ruolo
  notturno ha una sua fase (come veggente e medico) e `risolviNotte` applica gli effetti.
  Per aggiungerne molti conviene trasformare le fasi in una lista di ruoli notturni ordinati,
  invece di scriverle a mano. Da decidere insieme: quali ruoli, a partire da quanti giocatori,
  e come cambiano le condizioni di vittoria.
