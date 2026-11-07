# Architettura tecnica: stanze, dati sul browser e sicurezza

Per chi vuole capire cosa succede dietro le quinte quando si gioca "ognuno col suo telefono".
Vale per Impostore e per i futuri giochi online (Lupus). Le modalità "un solo telefono" non usano il server.

## I pezzi

```
telefono (browser)  ⇄  WebSocket /ws  ⇄  server Node (apps/server)  →  logica del gioco (modulo puro)
        └── scarica l'app (HTML/JS) dallo stesso server
```

È **un'unica applicazione** con due parti nel codice: il **sito** (`apps/web`, quello che si vede) e il
**server di gioco** (`apps/server`, tiene le partite online). Quante porte vedi dipende solo da come la avvii:

```
pnpm dev            sito (Vite)      → http://localhost:5173   ← l'unico indirizzo da aprire
                    server di gioco  → porta 8081, nessuna pagina; Vite gli inoltra /ws

docker compose up   un solo processo → http://localhost:8080   (sito già costruito + partite, come online)
```

In sviluppo sono due processi per avere il ricaricamento istantaneo del sito. In produzione il server Node
serve anche i file del sito, quindi è un processo solo.

Nota: la porta 8081 non va mai aperta nel browser. Se ci hai aperto in passato una versione costruita del sito,
il browser può aver tenuto un service worker (la parte offline della PWA) che continua a mostrare quella
vecchia versione con F5; il server di sviluppo lo rimuove da solo, oppure: DevTools → Application → Service Workers → Unregister.

- **Server** (`apps/server`): un processo Node. Serve i file dell'app (in produzione) e tiene le partite.
  È lo stesso in `docker compose up` sul PC e su un hosting online.
- **Logica di gioco** (es. `games/impostore/src/online`): funzioni pure `nuovoStato`, `applica`, `vistaPer`.
  Non conoscono la rete. Il server le chiama.
- **Telefono**: mostra la "vista" ricevuta e manda richieste ("vota Anna"). Non decide nulla.

## Le stanze

- Una **stanza** è una partita: codice di 5 caratteri (senza simboli ambigui), stato del gioco, elenco dei telefoni.
- Le stanze stanno **solo nella memoria del server**. Non c'è database né file. Se il server si riavvia (aggiornamento,
  `docker compose down`, hosting che si spegne) **tutte le partite si perdono**.
- Una stanza senza azioni da **6 ore** viene cancellata (controllo ogni 10 minuti). L'organizzatore può chiuderla prima
  con **Chiudi la partita**: la stanza sparisce subito e gli altri telefoni vedono "Partita chiusa".
- Tornare alla lista dei giochi **non** chiude la partita: resta in memoria finché non la chiudi o scadono le 6 ore.
  Creare una nuova partita ne crea un'altra, non cancella la vecchia.
- Limiti contro gli abusi: massimo 300 stanze contemporanee, 60 giocatori per stanza, messaggi fino a 4 KB.

## Come si riconosce un telefono

Non ci sono account. Alla prima connessione il server crea un **token** casuale (16 byte, 128 bit) e lo manda al telefono.
Il telefono lo salva e lo rimanda quando rientra: così dopo refresh, schermo bloccato o caduta della rete torna nello
stesso posto. Chi ha creato la stanza è riconosciuto dal suo token.

Il rientro funziona così:
- Il token vale solo per la stanza che l'ha creato; un token sconosciuto viene sostituito da uno nuovo.
- Se un telefono perde il token (altro browser, dati cancellati, schermata in incognito) e la partita è già avviata,
  vede la lista dei giocatori **senza telefono collegato** e può riprendere il proprio nome. Non può prendere il posto
  di un giocatore che risulta ancora collegato: in quel caso l'organizzatore deve liberarlo (**libera**).
- Più schede dello stesso browser condividono il token e convivono: il server tiene per ogni token **un insieme**
  di connessioni, non una sola. (Prima la nuova connessione chiudeva la vecchia; le due schede si cacciavano a vicenda
  riconnettendosi ogni 1,5 secondi.)
- In ogni schermata il pannello "Stanza" mostra chi è **collegato** adesso: un giocatore è collegato se almeno una sua
  connessione è aperta. Il server se ne accorge dal heartbeat (ping ogni 25 s), quindi un telefono caduto può risultare
  collegato per qualche decina di secondi.

## Cosa viene salvato sul browser

Solo `localStorage` (niente cookie, niente account, niente dati inviati a terzi):

| Chiave | Contenuto | Quando sparisce |
|---|---|---|
| `gdt.impostore.token.<CODICE>` | il token del telefono per quella partita | alla chiusura della partita; altrimenti resta (pochi byte) finché non cancelli i dati del sito |
| `gdt.impostore.recenti` | ultime parole uscite per categoria (modalità un telefono) | finché non cancelli i dati del sito |
| `gdt-impostore-locale` | partita Impostore a un telefono in corso | a fine partita o con "Chiudi la partita" |
| `gdt-lupus-partita` | partita Lupus in corso | a fine partita o con "Chiudi la partita" |
| `gdt-tabu-partita` | partita Tabù in corso (un turno a metà riparte da "Via!": il timer non si riprende) | a fine partita o con "Chiudi la partita" |
| `gdt-tema`, `gdt-stile` | tema scuro/chiaro scelto e stile grafico | finché non cancelli i dati del sito |

Il service worker della PWA mette in cache i file dell'app per farla funzionare offline. Il browser, se
l'archivio è bloccato (navigazione privata), continua a funzionare senza memoria: il refresh in quel caso fa perdere il posto.

## Cosa vede ogni telefono

Il server, per ogni telefono, chiama `vistaPer(stato, posto, èOrganizzatore)` e manda **solo quel risultato**.
La parola e i ruoli altrui non viaggiano mai sulla rete verso chi non deve vederli: non si possono leggere dagli
strumenti del browser. L'organizzatore vede in più chi non ha ancora votato; non vede le carte degli altri.

Controlli lato server (il telefono non è mai considerato affidabile): solo l'organizzatore avvia, avanza, ripete o chiude;
ognuno vota solo per sé (nessuno vota per un altro; il voto si chiude solo quando hanno votato tutti); solo
l'impostore scoperto può tentare la parola; non si vota se stessi né chi non è candidato.

## Limiti di sicurezza (da sapere)

- **Nessuna cifratura sulla rete locale.** Su `http://192.168…` le connessioni sono in chiaro: chi è nella stessa
  rete e sa guardare il traffico può leggere ciò che passa (inclusi i token). Per una serata tra amici sul proprio WiFi
  o hotspot è un rischio accettabile; online l'hosting fornisce HTTPS (`wss://`) e il problema non si pone.
- **Il codice di 5 caratteri si può indovinare**, in teoria: ~31^5 = 28 milioni di combinazioni. Chi entra in una
  stanza vede solo i nomi e può scegliere un nome libero, ma non vede carte o ruoli. Non c'è limite ai tentativi
  per indirizzo: su un server pubblico servirebbe un blocco dopo troppi codici sbagliati.
- **Il token è l'unica prova di identità.** Chi lo copia (o ha accesso al telefono sbloccato) diventa quel giocatore.
- **Chi ha il link può occupare un nome libero**: la sala non è privata. L'organizzatore può liberare un nome
  occupato per sbaglio.
- **Nessun salvataggio**: niente dati personali, solo i nomi scritti dall'organizzatore, tenuti in memoria e mai su disco.
- Le dimensioni di messaggi e stanze sono limitate (vedi sopra), ma il server non è pensato per un uso pubblico di massa.
- **Disponibilità:** un solo processo, una sola macchina, nessuna replica. Se cade, le partite cadono.
