# Decisioni di progetto — giochi-da-tavola

Riepilogo delle decisioni prese prima di iniziare lo sviluppo (2026-11-02) e rivisto lo
stesso giorno per le partite a più telefoni. Per ogni punto: cosa si è deciso e perché.
I punti ancora aperti sono in fondo.

## Obiettivo

Una **raccolta di giochi "da tavola" / party game** da usare con lo smartphone mentre
si è seduti allo stesso tavolo. L'app non sostituisce l'interazione dal vivo: serve a
**distribuire informazioni segrete** (parola, ruolo), **guidare le fasi** (turni, timer,
notte/giorno, narrazione) e, quando serve, **raccogliere scelte segrete**.

Giochi previsti, in ordine:
1. **Impostore** — tutti ricevono la stessa parola segreta tranne l'impostore, che non la
   conosce. Giro di indizi, discussione, voto. Se scoperto, l'impostore può vincere
   indovinando la parola. È il primo gioco e serve a costruire il motore.
2. **Lupus in fabula** — ruoli segreti (lupi, veggente, medico, ...), fasi notte/giorno,
   voto e ballottaggio.
3. Altri giochi in futuro (si ipotizzano **decine**): l'architettura deve renderli
   economici da aggiungere.

## Piattaforma

- **Web app / PWA** installabile ("Aggiungi a schermata Home"), funzionante **offline**
  dopo il primo caricamento (service worker).
- Niente app native per ora. Se un giorno servisse la presenza negli store: Capacitor
  per impacchettare la PWA.
- **React + TypeScript**, build con **Vite**.
  - Scelto React (rispetto a Svelte, che era consigliato per semplicità) per
    competenza spendibile, ecosistema e possibile React Native in futuro.

## Rete: due modalità di gioco

Domanda chiave: *i telefoni devono parlarsi?*

| Modalità | Come funziona | Rete |
|---|---|---|
| **A. Un solo telefono** | Il telefono passa di mano, ognuno vede la sua carta | Nessuna, anche offline |
| **B. Ognuno col suo telefono** | Un server tiene la partita e manda a ogni telefono solo ciò che può vedere | Internet oppure wifi locale |

**Decisione (revisione del 2026-11-02):** l'idea iniziale del "livello 1" (codice condiviso,
ogni telefono calcola da solo, nessun server) è **abbandonata** per le partite a più
telefoni. Provata nella pratica ha limiti che non si correggono con le toppe:

1. Ogni telefono deve conoscere l'intera partita per calcolare la propria carta, quindi
   chiunque può vedere quella degli altri. Un segreto vero richiede un server.
2. I telefoni non si parlano: voto dal proprio telefono, contatori in diretta ed
   eliminazione automatica sono impossibili.
3. Chi entra a mano deve ripetere tutti i parametri e scegliere un numero di posto invece
   del proprio nome.

Il codice del livello 1 vive solo nel branch `feat/codice-condiviso`, **da non unire a
`main`**. Restano utili il generatore con seme e il codice a 8 caratteri: la modalità A
continua a usare il seme, e il server può riusare l'alfabeto senza simboli ambigui.

La modalità A resta com'è, perché funziona offline ed è l'unica che non richiede nulla.

### Formato del codice partita (modalità A, deciso)

- **8 caratteri**, alfabeto di 31 simboli senza `0/O` e `1/I/L` (si confondono a voce):
  `ABCDEFGHJKMNPQRSTUVWXYZ23456789`.
- Codifica il seed, con un carattere di versione dati e uno di controllo.
- La versione dati (`VERSIONE_DATI`, ora 2) va incrementata a ogni modifica di
  `parole.json` che cambi ordine o contenuto.

## Modalità B: server

### Un solo codice di gioco, due modi di ospitarlo

La logica di partita sta in un modulo **puro** (`init`, `applica(azione)`, `vistaPer(giocatore)`),
senza rete né archivio. Due adattatori lo usano:

| | Locale (wifi) | Online |
|---|---|---|
| Cosa | Server Node in Docker sul PC di chi organizza | Funzioni su Vercel + Supabase |
| Avvio | `docker compose up` | push su GitHub |
| Stato delle partite | In memoria del processo | Database Supabase |
| Telefoni | Aprono `http://<ip-del-pc>:porta` | Aprono l'indirizzo pubblico |
| Internet | Non serve | Serve |

Il client è lo stesso e parla con il server con un protocollo semplice; cambia solo
l'indirizzo.

**Vercel: cosa risulta dalla documentazione ufficiale** (guida sui WebSocket nelle Vercel
Functions, letta il 2026-11-02):
- I WebSocket sono supportati, ma in **beta**, su tutti i piani.
- Ogni connessione resta sull'istanza che l'ha accettata: per condividere lo stato tra
  istanze serve un archivio esterno (la guida consiglia Redis dal Marketplace).
- Le connessioni si chiudono alla durata massima (300 s sul piano Hobby): il client deve
  **riconnettersi da solo** e ricevere di nuovo lo stato.
- Per i flussi solo server → client la guida suggerisce Server-Sent Events (la
  riconnessione la fa il browser).

**Perché serve un database.** Le funzioni di Vercel non hanno memoria: ogni richiesta può
essere servita da un'istanza diversa e tra una richiesta e l'altra tutto si dimentica. La
partita (parola, impostori, voti, fase) deve quindi stare in un posto che resta: un
database. In locale con Docker non serve, perché il processo Node resta acceso e la tiene
in memoria.

**Online: Vercel + Supabase (già usati negli altri progetti).**
- Il database Postgres di Supabase tiene lo stato della partita. I client non possono
  leggerlo direttamente: lo leggono e scrivono solo le funzioni di Vercel.
- I giocatori mandano le azioni (scegli nome, vota, ...) con richieste HTTP alle funzioni di
  Vercel. La funzione controlla le regole, aggiorna il database e invia a ciascun
  telefono la sua vista.
- Gli aggiornamenti in diretta (i contatori che salgono) viaggiano su **Supabase Realtime
  Broadcast**, così non si dipende dai WebSocket in beta di Vercel.
- Segretezza: ogni giocatore ascolta un **canale privato suo**. Supabase consente di
  limitare con una regola (RLS su `realtime.messages`) chi può ricevere i messaggi di un
  canale. La carta di un giocatore passa solo sul suo canale, mai su quello comune.
- Limiti del piano gratuito Realtime (documentazione ufficiale): 200 connessioni
  contemporanee, 100 messaggi al secondo, messaggi fino a 256 KB. Una partita da 10
  giocatori usa circa 10 connessioni: bastano per molte partite insieme.

**Da verificare con una prova prima di costruire il resto** (la documentazione letta non
lo dice con certezza): come si identifica un telefono senza account (accesso anonimo di
Supabase?), se la funzione di Vercel può inviare messaggi a un canale privato, e come si
comporta la riconnessione quando lo schermo si spegne.

**Locale e online restano due adattatori della stessa logica.** In locale: server Node leggero
con stato in memoria. Online: Vercel + Supabase. Alternativa da valutare: usare anche in
locale Supabase (`supabase start`), che gira in Docker ma avvia molti contenitori; il
vantaggio è un solo adattatore, lo svantaggio è la pesantezza.

**Wifi locale con Docker: cose da sapere**
- Il PC ha bisogno di una regola del firewall per la porta (come già per `pnpm dev:rete`).
- Su `http://192.168.x.x` il browser **non è in contesto sicuro**: non funzionano il menu
  "Condividi", la copia negli appunti e l'installazione della PWA. In locale quindi l'invito
  è un **QR code** più l'indirizzo scritto grande sul telefono dell'organizzatore. Il sito
  pubblicato su Vercel resta quello installabile.
- Il server locale serve anche i file dell'app: un comando, un indirizzo.
- Se il wifi isola i client (hotel, locali) i telefoni non vedono il PC: restano l'hotspot
  di un telefono oppure la modalità A.

### Impostore, modalità B

**Creare la partita** (telefono dell'organizzatore): nomi dei giocatori (numero senza
limite fisso), numero di impostori (con consiglio), categoria e le **impostazioni di partita**:
- *Voti visibili durante la votazione*: sì = contatori che salgono in diretta accanto a
  ogni giocatore; no = i voti restano nascosti e si rivelano tutti insieme quando hanno
  votato tutti.

Il server genera un **codice partita breve** e un link `…/impostore/<codice>`.

**Entrare:** si apre il link, oppure si digita il codice nella pagina del gioco. Il server
manda l'elenco dei nomi e il giocatore tocca il proprio. Un nome già preso non è più
scegliibile. Il telefono riceve un **token** salvato sul dispositivo: dopo refresh,
schermo bloccato o caduta di rete rientra da solo nello stesso posto. Solo l'organizzatore
può liberare un nome occupato (telefono rotto, nome sbagliato).

**Cosa vede ogni telefono**, deciso dal server in `vistaPer(giocatore)`:

| Fase | Giocatore | Organizzatore |
|---|---|---|
| Sala d'attesa | Nomi liberi e occupati | Chi è entrato, avvio partita |
| Carta | Solo la propria, da scoprire | Come gli altri |
| Indizi | Chi parla per primo e l'ordine | Pulsante per passare al voto |
| Voto | Gli altri giocatori, ne sceglie uno (modificabile finché non si chiude); contatori solo se attivi | Come gli altri, più chi ha già votato |
| Ballottaggio | Solo i pari merito | Idem |
| Tentativo | Solo l'impostore scoperto scrive la parola | Vede che sta tentando |
| Fine | Esito, parola, impostori | Idem |

Nessun telefono riceve informazioni che non deve vedere: la carta altrui non viaggia sulla rete.

**Voto e pareggio:** viene eliminato chi ha più voti. In caso di pareggio, **ballottaggio
solo tra i pari merito**.

**Tutti devono votare:** è un gioco fatto intorno a un tavolo, quindi il voto si chiude solo
quando hanno votato tutti. Chi manca non è un astenuto: l'organizzatore vede chi non ha
ancora votato e può mandargli un sollecito sul telefono. Se un telefono è davvero
irraggiungibile (batteria, rete), l'organizzatore può votare al posto suo.

## Architettura software

- **Monorepo unico** con **pnpm workspaces** (Turborepo opzionale quando servirà).
  Motivo: motore e giochi evolvono insieme in un solo commit, versioni sempre allineate,
  un'unica app "raccolta".
- **Ogni gioco è un plugin**: esporta un `manifest` (id, nome, min/max giocatori,
  modalità supportate), la logica e la UI. L'app carica i giochi in **lazy loading**.
- **Ogni gioco ha un proprio indirizzo**: `/impostore`, poi `/lupus`. Aprire l'indirizzo
  porta direttamente al gioco.
- **La logica di gioco è TypeScript puro, deterministica e senza dipendenze dalla UI.**
  Così è testabile (importante per Lupus) e gira identica nel browser (modalità A) e sul
  server (modalità B) senza riscriverla.
- **Fasi come macchina a stati** nel motore.
- **Interfaccia di gioco per il server:** `init`, `applica(azione)`, `vistaPer(giocatore)`.
  Il client riceve solo la sua vista, mai lo stato completo.
- **Interfaccia `Narratore`** nel motore, con due implementazioni (richieste per Lupus,
  riusabili dagli altri giochi):
  - **Narratore automatico**: un telefono al centro del tavolo narra a voce (Web Speech
    API, funziona offline). Di notte i ruoli agiscono toccando quel telefono.
  - **Pannello narratore umano**: il telefono del master mostra tutti i ruoli, il copione
    da leggere, i pulsanti per avanzare di fase e il registro degli eventi.

Struttura cartelle prevista:

```
giochi-da-tavola/
├── apps/
│   ├── web/                    → PWA contenitore: menu giochi, percorsi per gioco, impostazioni
│   └── server/                 → server partite: adattatore Node (Docker) e adattatore Vercel
├── packages/
│   ├── engine/                 → RNG con seed, giocatori, fasi, timer, Narratore
│   ├── ui/                     → componenti condivisi: carta segreta, "passa il telefono", timer, voto
│   └── tts/                    → sintesi vocale per il narratore
├── games/
│   ├── impostore/
│   │   ├── src/logic/          → regole pure + test
│   │   ├── src/ui/             → schermate del gioco
│   │   ├── data/it/parole.json → parole per categoria (predisposto per altre lingue)
│   │   └── manifest.ts
│   └── lupus/                  → stessa struttura
└── docs/
    ├── decisioni.md            → questo file
    └── regole/                 → regolamenti in markdown
```

Git: branch `main` + un branch per gioco/funzione (`feat/lupus`), commit con prefisso
(`feat(impostore): ...`, `fix(engine): ...`).

## Deploy

- Il client e la modalità A producono file statici (`pnpm build` → `dist/`).
- Hosting attuale: **Vercel** (Root Directory `apps/web`). Resta la scelta anche per la
  modalità B online, vedi sopra.
- Un indirizzo per gioco è una scelta di React e non crea problemi nell'app: cliccare un
  gioco porta a `/impostore` senza ricaricare la pagina. Il problema è solo **aprire o
  ricaricare direttamente** `/impostore`: il browser lo chiede a Vercel, che cerca un file
  con quel nome, non lo trova e risponde 404. (Oggi funziona perché l'unico indirizzo è `/`.)
  Si risolve con poche righe in `vercel.json` che dicono "per qualsiasi indirizzo servi
  `index.html`", e poi React mostra il gioco giusto. Il server di sviluppo e quello
  locale lo fanno già da soli. Va documentata nel README.
- In locale: `docker compose up` avvia il server con i file dell'app (vedi sopra).

## Lezioni dal progetto precedente (`../tic-tac-toe`)

Il tris (Node + `ws`, server autoritativo, stanze con codice a 4 cifre, heartbeat, test
e2e, deploy su Render free) è un buon riferimento per il server, non come codice da
riusare. Cose da fare diversamente:
- Interfaccia di gioco generica (`init`, `applica`, `vistaPer`) invece di logica dentro gli
  handler e duplicata nel client.
- **Viste private per giocatore** (non uno stato pubblico uguale per tutti).
- Stanze con N giocatori, organizzatore e narratore.
- **Riconnessione con token + timer di grazia**: sui telefoni la connessione cade spesso
  (schermo bloccato, cambio app); un'uscita non deve distruggere la stanza.
- Evitare hosting che va in sleep (Render free dopo ~15 min: avvio lento).

## Piano di partenza

1. Inizializzare git e il monorepo (pnpm + Vite + React + TypeScript + PWA). ✔
2. Motore base: codice partita, RNG con seed, giocatori, fasi. ✔
3. Impostore, modalità A (un telefono), con parole ampliate. ✔
4. Indirizzo per gioco (`/impostore`) e lazy loading dei giochi.
5. Server partite: modulo puro + adattatore Node + `docker compose up`, prova con 2 telefoni.
6. Adattatore Vercel, a partire dalla prova di collegamento.
7. Impostore, modalità B (sala, nomi, carte, indizi, voto con ballottaggio, fine).
8. Poi Lupus, con entrambi i narratori.

## Punti aperti

- Secondo pareggio nel ballottaggio. Non ho trovato una regola ufficiale (la pagina del
  Camaleonte, gioco gemello, non parla dei pareggi). Proposta da confermare: ballottaggio
  ripetuto una volta; se pareggiano ancora, **nessuno viene eliminato e vince l'impostore**.
- Per quanto tempo restano salvate le partite nel database (proposta: si cancellano dopo 24 ore).
- Prova di collegamento Vercel + Supabase Realtime (accesso anonimo, canali privati,
  riconnessione) prima di fissare l'adattatore online.
- Locale: server Node leggero o `supabase start`.
- Codice partita della modalità B: lunghezza (4–6 caratteri) e durata di validità.
- Licenza del repository (README: "Da definire").
- Turborepo sì/no (si può decidere più avanti).
