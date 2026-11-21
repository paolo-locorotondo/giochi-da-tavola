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
4. **Tris** — tre in fila, contro il telefono o in due; anche online (ognuno col suo telefono).
5. **Dadi** — moneta, dadi D4…D20 e dado personalizzato (con due valori diventa una moneta).
   Un telefono, senza partita. Lancio casuale con `crypto.getRandomValues`.
6. **Duello Lampo** — sfida di riflessi per due sullo stesso telefono, appoggiato al centro del tavolo: mini giochi di velocità (Via!, Raffica, Stop al centro, Colore giusto, Colori e nomi, Trova il panda, Trova lo smile, Memoria lampo), 1 punto a ogni mini gioco. Si scelgono le mani di ogni mini gioco, le sue impostazioni e l'ordine (a caso o scelto). Solo un telefono; la versione online è rimandata (cosa comporta: README del gioco).
7. **Ultima!** — gioco di carte a colori e numeri (regole ufficiali), contro i bot su un telefono (anche offline) oppure online da 2 a 10 (la mano è segreta). Round singolo o partita a punti; «Simula mossa col bot» per chi non risponde. Piano e decisioni: [piano-ultima.md](piano-ultima.md).
8. Altri giochi in futuro (si ipotizzano decine): l'architettura deve renderli economici
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
- La logica di partita è un modulo **puro** (contratto `GiocoOnline` in `@gdt/engine`:
  `nuovoStato`, `applica(azione)`, `traduci` con i permessi, `vistaPer(giocatore)`), senza
  rete: lo usa il server e si testa da solo. Il server è **generico**: ogni gioco online si
  registra in `apps/server/src/giochi.ts` (oggi Impostore, Tris e Ultima!). Un gioco può abilitare
  anche la «partita veloce» con coda (`coda: { giocatori }`).
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
- **Ogni gioco ha un proprio indirizzo**: `/impostore`, `/lupus`, `/tabu`, `/dadi`, `/tris`, `/duello-lampo`.
- **Logica di gioco in TypeScript puro e deterministica**, separata dalla UI: testabile e
  identica nel browser (modalità A) e sul server (modalità B).
- **Fasi come macchina a stati.**
- **Carte e testi nei dati**: le carte di ogni gioco (parole, categorie, personaggi) stanno in
  `games/<gioco>/data/<lingua>/*.json` e si cambiano senza toccare il codice; il README del gioco
  spiega come. Le regole (poteri dei ruoli, punteggi) restano nel codice: sono logica, non dati.
- **Barra in alto sempre visibile** (0.23.0): nella home e dentro i giochi resta in cima scorrendo. Un gioco a schermo intero (Duello Lampo durante la partita) la nasconde con `segnalaSchermoIntero` di `@gdt/preferenze`. Il piè di pagina con la versione non è fisso.
- **Ordine dei giochi nella home** (0.23.0): di base alfabetico; l'utente può sceglierne uno suo con le frecce, salvato sul telefono (`applicaOrdine` / `leggiOrdine` in `@gdt/preferenze`); un gioco nuovo va in fondo.
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
│   └── server/     → server partite WebSocket (Node) generico per gioco, con coda; serve anche l'app
├── packages/
│   ├── engine/     → RNG con seme, codice partita, contratto GiocoOnline, utilità comuni
│   ├── collegamento/ → hook WebSocket condiviso (rientro con token, coda partita veloce)
│   ├── i18n/       → lingue it/en con chiavi controllate dal compilatore
│   ├── suoni/      → suoni sintetizzati e interruttore audio
│   └── preferenze/ → impostazioni dei giochi e ordine della home salvati sul telefono, segnale «schermo intero»
├── games/
│   ├── impostore/  → regole, UI a un telefono, modulo online (src/online) e UI online
│   ├── lupus/      → regole e UI a un telefono
│   ├── tabu/       → regole, carte e UI
│   ├── dadi/       → lancio, modelli di dado (con spiegazione delle facce) e UI
│   ├── tic-tac-toe/ → regole, telefono avversario (minimax), modulo online con partita veloce e UI
│   └── duello-lampo/ → partita a punti, mini giochi di riflessi (regole + vista + impostazioni, con registro), ordine a caso o scelto, UI a schermo diviso
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

Legenda: **FATTO** = chiuso; **TODO** = ancora da fare o da decidere. Ultimo controllo con il codice: 2026-11-20 (v0.23.1).

### Fatti

- FATTO **Tris, modalità online** (0.10.0): server generico con registro di giochi (`GiocoOnline` in `@gdt/engine`, `apps/server/src/giochi.ts`), modulo `games/tic-tac-toe/src/online`, collegamento WebSocket condiviso in `packages/collegamento`.
- FATTO **Tris, partita veloce con coda** (0.11.0): coda in memoria per gioco (`apps/server/src/coda.ts`), abbinamento a coppie, scadenza 2 minuti, nomi uguali distinti col suffisso «(2)». Idea dal vecchio progetto `../tic-tac-toe`.
- FATTO **Dadi, spiegazione delle facce** (0.12.0): campo facoltativo `info` nei modelli (e nel dado personalizzato), tasto «i» accanto al dado; modello Taboo.
- FATTO **Sito statico senza server** (es. Vercel): il pulsante online dopo 8 s avvisa che il server non risponde e propone un solo telefono (Impostore e Tris).
- FATTO **Grafica**: stile «Tavolo» (scuro e chiaro, token CSS). Altri stili (Argilla, Quiz) solo se richiesti.
- FATTO **Test con più telefoni** per la partita online del Tris: test e2e con più contesti del browser (`tris-online.spec.ts`, `tris-coda.spec.ts`). Per Impostore online resta solo il test del server (vedi sotto).
- FATTO **Prova del server online su Render**: provato più volte con deploy reali. La pausa del piano gratuito (15 minuti) e cosa fare per risvegliarlo sono in [guida-deploy-online.md](guida-deploy-online.md).
- FATTO **Stili della carta riusata in «Rivedi la mia carta»** (Impostore online): verificati a schermo dall'utente.
- FATTO **Messaggi di errore del server a codici**: le frasi di `apps/server`, del modulo Impostore e del Tris sono codici (`errore_<codice>`, anche `codice:n`) tradotti in it/en da `testoMessaggio`.
- FATTO **Branch `riscrittura`**: era già unito a `main`, cancellato.
- FATTO **Lupus, nuovi ruoli e rifiniture** (0.13.0, 0.14.0): da 8 a 24 giocatori; motore a descrittori (`FASI_NOTTE` in `games/lupus/src/logica.ts`); Medico, Medium, Indemoniato, Massoni, Criceto mannaro, Gufo (Letale da 20 giocatori) e Mitomane; voto ufficiale a due turni; storico della partita per il narratore; timer della discussione e durata della transizione regolabili (con «Salta la transizione» se il narratore non gioca); suoni mp3 (ululato, gallo, pianto del lupo, ninna nanna) con la voce del narratore che parla solo dopo suoni e transizione. Il piano di lavoro (`piano-lupus-personaggi.md`) è stato eseguito per intero e rimosso; la storia è nel CHANGELOG.

- FATTO **Duello Lampo, versione a un telefono** (0.15.0): sfida di riflessi per due con schermo diviso (metà in alto ruotata), mini giochi Via!, Raffica e Stop al centro, scelta dei mini giochi e dei round, spareggio. I mini giochi sono moduli (regole + vista + registro): aggiungerne uno costa un file di regole, una vista e una riga per registro (guida nel README del gioco).

- FATTO **Duello Lampo, impostazioni dei mini giochi** (0.19.0): pannello «Impostazioni» sotto ogni mini gioco nella preparazione, salvate sul telefono con la sfida; griglia dei «trova» fino a 6×6 (più grande da valutare sui tablet).

- FATTO **Duello Lampo, rifiniture** (0.20.0–0.22.0): impostazione «gli errori contano −1» (solo risposte sbagliate, non la lentezza); spareggio con un mini gioco a caso tra quelli scelti; Colori e nomi con parole e parole giuste impostabili, in posizioni casuali; ordine dei mini giochi a caso (di base, nuovo a ogni rivincita) o scelto con le frecce; nei «trova» le figure continuano a cambiare dopo la comparsa del bersaglio.
- FATTO **Home ordinabile e barra fissa** (0.23.0, 0.23.1): ordine dei giochi con le frecce, salvato sul telefono; barra in alto sempre visibile, nascosta solo dai giochi a schermo intero.
- FATTO **Prova su telefono vero di Duello Lampo e della barra fissa** (verificata dall'utente il 2026-11-20): doppio tocco con due dita (anche in Raffica), griglia 6×6 dei «trova» a 375 px, barra fissa sotto il notch e pulsanti dell'ordinamento sopra la barra dei gesti.

### Da fare (TODO)

- TODO **Test grafici su Linux/CI**: gli screenshot di riferimento sono fatti su Windows; se serve la CI su Linux vanno rigenerati là (vedi docs/test.md). Non esiste ancora una CI (nessuna cartella `.github`).
- TODO **Test e2e con più telefoni per Impostore online** (oggi coperto solo dai test del server in `apps/server`).
- TODO **Prova su telefoni veri**: WiFi con `docker compose up`, hotspot, schermo bloccato e rientro (anche per Tris online e partita veloce).
- TODO **Lupus ognuno col suo telefono** (ruoli segreti, notte, voto): Lupus non ha ancora un modulo online; oggi è solo a un telefono. Con il server generico basta scrivere `games/lupus/src/online` e registrarlo; la coda non serve (partita da molti giocatori).
- TODO **Suoni dei Dadi**: ora c'è solo il click globale dei pulsanti. Quando l'utente avrà scaricato gli mp3 (CC0), aggiungerli in `packages/suoni/audio/` (la cartella oggi non esiste) con la fonte in `CREDITI.md`, aggiungere i formati a `globPatterns` in `apps/web/vite.config.ts` e rimettere i suoni personalizzati dove servono (lancio del dado, moneta, e gli altri giochi).
- TODO **Vercel**: decidere se toglierlo dalla documentazione (Render basta da solo: stesso indirizzo per sito, gioco online e installazione). `apps/web/vercel.json` c'è ancora e Vercel va scollegato dalla dashboard.
- TODO **Tabù**: miglioramenti di grafica e funzioni (carte scartate o usate nella mano, ecc.), da discutere.
- TODO **Regole e carte di Tabù e Lupus** da verificare dall'utente; originalità delle carte.
- TODO **Licenza del repository**: non c'è un file `LICENSE`, il README dice «Da definire».
- TODO **Turborepo sì/no**: non c'è `turbo.json`; si può decidere più avanti.
- TODO **Pulizia branch locali**: resta `archivio/storia-completa` (29 commit non in `main`): cancellarlo quando non serve più (`git branch -D`).
- FATTO **Ultima!** (0.24.0, poi 0.25.0): regole ufficiali, round singolo o a punti, bot su richiesta dell'organizzatore online; dalla 0.25.0 anche contro i bot su un telefono, offline, con tre livelli e velocità (`games/ultima`). Piano: [piano-ultima.md](piano-ultima.md). Restano le varianti (README del gioco), la partita veloce (vedi la voce «Partita veloce a stanze aperte») e la prova su telefoni veri.
- TODO **Partita veloce a stanze aperte (più di 2 giocatori)**, chiesta dall'utente il 2026-11-20, da riparlarne prima di farla. Oggi la coda (`apps/server/src/coda.ts`) abbina un gruppo di dimensione fissa (`coda: { giocatori: 2 }`, solo Tris) e crea la stanza solo quando il gruppo è completo. Serve per i giochi di carte da 4 che arriveranno (burraco, scopa, briscola) e per Ultima! (2–10). Idea dell'utente: chi tocca «Partita veloce» **si aggancia alla prima stanza aperta** di quel gioco finché ci sono posti; se non ce n'è una, la crea lui (e ne diventa organizzatore). Da decidere insieme:
  - quando parte la partita: appena i posti sono pieni, oppure quando lo decide l'organizzatore con i giocatori arrivati finora (minimo del gioco), oppure dopo un tempo;
  - posti di una stanza veloce: fissi per gioco (4 per burraco e briscola a coppie) o scelti da chi la apre (Ultima! da 2 a 10);
  - squadre o coppie (burraco, briscola a 4): formate in ordine di arrivo, a caso o scelte in sala;
  - impostazioni della stanza (es. round singolo o a punti): valori di base del gioco o scelte dal primo;
  - stanze veloci e stanze con codice: separate, oppure una stanza con codice può diventare «aperta» ai giocatori della partita veloce;
  - chi esce dalla sala prima dell'avvio libera il posto; scadenza di una stanza aperta che non si riempie (oggi 2 minuti per la coda);
  - contratto `GiocoOnline`: probabilmente `coda` diventa `{ min, max }` o `{ posti }` e il server smette di avviare da solo; i nomi arrivano uno alla volta (oggi `nuovoStato` riceve tutti i nomi alla creazione).
- TODO **Impostore, partita veloce**: per ora no (deciso il 2026-11-21); si potrà aggiungere dichiarando `veloce` nel modulo online quando la partita veloce a stanze aperte sarà pronta.
- TODO **Duello Lampo: altri mini giochi** (idee: Bersagli, Il più grande), griglie più grandi di 6×6 sui tablet e, più avanti, la versione online (vedi README del gioco).
