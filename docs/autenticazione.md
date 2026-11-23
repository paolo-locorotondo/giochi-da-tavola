# Account utente: analisi di fattibilità

Analisi del 2026-11-23. **Nulla è ancora deciso né costruito**: questo documento raccoglie cosa si è capito
e le decisioni da prendere prima di iniziare. Oggi si gioca solo come **ospite** e così deve restare possibile.

Obiettivo valutato: poter giocare anche con un **proprio utente**, a cui associare salvataggio delle partite,
punteggi e statistiche, una community (amici, inviti, classifiche) e un sistema di **coins** vinte giocando,
in futuro forse scambiabili tra utenti.

Modulo valutato: **my-nextauth**, un template di autenticazione per Next.js basato su Better Auth
(email e password con verifica, Google facoltativo, reset password, ruoli, area admin, cancellazione utente),
con database Postgres.

## In breve

**Fattibile, ma non si installa e basta.** my-nextauth è un *template* da copiare in un nuovo progetto Next.js,
non una libreria: va fatto girare come **servizio separato** con il suo database. Il nostro web (Vite) e il
server di gioco (Node con WebSocket) restano come sono e gli parlano attraverso un token.

- Il modulo prevede già il caso di un server esterno che deve fidarsi dell'utente: firma un **token breve**
  (JWT, 15 minuti) e pubblica la chiave pubblica. Il server di gioco lo verifica senza conoscere segreti.
- Il token viaggia nel **primo messaggio** del WebSocket, accanto al token di stanza di oggi, che resta com'è.
- L'**ospite resta identico**, anche offline. «Accedi» è un'opzione, mai un ostacolo.

## Architettura proposta

```
 Telefono (PWA)
 ┌──────────────────────────────────────────┐
 │ modalità OSPITE: tutto locale, come oggi │
 │ modalità UTENTE: accedi / profilo        │
 └──────┬──────────────────────┬────────────┘
        │ HTTPS (accesso,       │ WebSocket /ws
        │ token breve)          │ 1° messaggio: token
        ▼                       ▼
 ┌────────────────┐      ┌──────────────────────────────┐
 │ SERVIZIO       │      │ SERVER DI GIOCO (apps/server) │
 │ ACCOUNT        │◄─────┤ stanze in memoria, come oggi  │
 │ (my-nextauth)  │chiave│ + verifica del token          │
 │                │pubbl.│ + esito delle partite         │
 └──────┬─────────┘      └──────────────┬───────────────┘
        ▼                               ▼
 ┌────────────────┐      ┌──────────────────────────────┐
 │ DB IDENTITÀ    │      │ DB GIOCO                     │
 │ email, password│      │ profilo, statistiche, storico,│
 │ sessioni, ruoli│      │ salvataggi, amici, coins      │
 └────────────────┘      └──────────────────────────────┘
```

- **Il modulo tiene solo l'identità** (email, password, sessioni, ruolo).
- **Il server di gioco tiene tutto il resto**, in un database suo, legato all'utente con un solo identificativo.
  Le tabelle di gioco non vanno nel database del modulo: il template si aggiorna nel tempo.
- **Senza database il server di gioco parte come oggi** (solo ospiti): `docker compose up` al tavolo, senza
  internet, continua a funzionare.
- Resta sul telefono tutto quello che c'è oggi: partita in corso, token di stanza, tema, lingua.

## Ospiti e utenti

- **Ospite**: nessun cambiamento. Giochi contro i bot e a un telefono offline, stanze online con il nome scritto
  a mano, partita veloce, salvataggi sul telefono.
- **Da ospite a utente**: al primo accesso l'app propone di collegare all'account i salvataggi del telefono.
  Le statistiche giocate da ospite non si importano come verificate.
- **Nella stessa stanza** ospiti e utenti convivono: ognuno ha il suo posto. Statistiche e coins si registrano solo
  per chi è collegato.

## Imbrogli: cosa si può contare

- **Partite online**: il server conosce lo stato della partita e può calcolare chi ha vinto. Serve aggiungere a ogni
  gioco online una funzione che restituisce l'esito (oggi il server sa solo se la partita è finita, non chi ha vinto).
  Il telefono non manda mai un risultato.
- **Partite contro i bot**: girano sul telefono, che sceglie anche il seme della partita. Lo stato salva il numero
  delle mosse, non quali mosse: il server non può verificarle. Anche registrandole, un programma potrebbe giocare
  al posto della persona. **Queste partite non danno coins e non entrano in classifica**; si possono tenere come
  statistiche personali, segnate come non verificate.
- **Altre regole per le coins**: almeno 2 account veri nella partita (non uno più i bot); durata minima; tetto
  giornaliero; limiti tra la stessa coppia di account; ogni partita paga una volta sola.

## Coins scambiabili: rischio da valutare

Se le coins diventano **acquistabili o convertibili** in denaro, premi o beni, potrebbero entrare in gioco le regole
su giochi a premi, valute virtuali, pagamenti e fisco (Italia e UE). Va valutato **con un esperto legale prima di
costruire lo scambio**; questo documento non è una consulenza. Con dei minori lo scambio tra sconosciuti è un rischio
in più (truffe, pressioni).

Proposta prudente: coins **solo simboliche** (non si comprano, non si convertono, nessun premio reale), assegnate solo
dal server, con un **registro delle transazioni che non si modifica** e limiti; lo scambio si decide dopo il parere legale.

## Privacy (GDPR): cosa preparare

Elenco di cose da preparare, non un parere:

- Informativa privacy (quali dati, perché, per quanto, a chi vanno, diritti, contatto).
- Termini di servizio con regole per nomi e avatar visibili agli altri.
- Età: in Italia la soglia del consenso digitale è 14 anni. Sotto, serve il consenso dei genitori: valutare di non
  permettere l'iscrizione ai minori di 14 anni o di non offrire loro funzioni social.
- Cancellazione dell'account estesa anche ai dati di gioco; esportazione dei propri dati.
- Durata di conservazione, backup, elenco dei fornitori (hosting, database, invio email).
- Il cookie di sessione è tecnico: senza analytics non serve un banner, ma va dichiarato.

Dati raccolti: email, nome, password (solo in forma cifrata), indirizzo IP e browser delle sessioni, profilo di gioco,
statistiche, storico, salvataggi, amici, coins.

## Cosa va provato prima di costruire

La guida del modulo non copre questi punti, che vanno provati in una prova tecnica:

- l'accesso dentro la **PWA installata su iPhone** (ha un archivio separato da Safari), compreso l'accesso con Google;
- CORS e cookie tra sottodomini (servizio account e app sullo stesso dominio);
- quanto dura la sessione e come si rinnova il token;
- un'app non Next che usa il client del modulo da un altro sottodominio.

Serve **un dominio unico con sottodomini** (es. `giochi.<dominio>` e `account.<dominio>`): con due domini diversi
Safari blocca i cookie. Il dominio serve anche per l'invio delle email in produzione. L'accesso richiede internet e HTTPS:
sul WiFi di casa senza internet si gioca solo da ospite.

## Piano a fasi

| Fase | Cosa vede l'utente | Dimensione |
|---|---|---|
| 0. Prerequisiti | Niente: dominio, servizio account, database, prove su iPhone | M |
| 1. Accesso facoltativo e profilo | «Accedi» nel menu; nome e avatar dal profilo | M |
| 2. Statistiche e storico online | Pagina profilo con vittorie e partite per gioco | M |
| 3. Salvataggi sincronizzati | La partita in corso segue l'utente da un telefono all'altro | M |
| 4. Community | Amici, inviti a una stanza, classifiche | L |
| 5. Coins simboliche | Saldo e guadagno a ogni vittoria online | M |
| 6. Scambio di coins | Solo dopo il parere legale | L |

S = pochi giorni, M = 1-2 settimane, L = di più.

Punti di contatto nel codice (per chi lo costruirà): `apps/server/src/index.ts` (nuovo primo messaggio con il token),
`apps/server/src/stanze.ts` (utente accanto al token del telefono), `packages/engine/src/online.ts` (esito della partita),
`packages/preferenze/src/partita.ts` (salvataggi), un nuovo pacchetto `packages/account` per l'app.

## Costi e manutenzione

- **Oggi**: un solo container, senza database né stato.
- **Con gli account**: un servizio in più, due database **con backup** (anche sullo stesso server), un dominio
  (pochi euro l'anno), invio email (gratuito fino a una certa soglia mensile). I prezzi vanno verificati sui siti dei fornitori.
- **Manutenzione**: backup e prova di ripristino, aggiornamenti del template (è una copia: non si aggiorna da solo),
  controllo dell'invio email, gestione di utenti e ruoli dall'area admin.

## Alternative

| Alternativa | Quando è meglio |
|---|---|
| my-nextauth (proposta) | Vuoi i dati tuoi e il controllo totale, e accetti di gestire un servizio in più |
| Servizio di accesso gestito da terzi | Vuoi partire in fretta e non gestire email e sicurezza |
| Solo link via email (senza password) | Il pubblico non vuole password; va provato su iPhone |
| Nessun account, **codice di recupero** | Ti basta portare i salvataggi tra telefoni: quasi nessun dato personale |

Via intermedia: iniziare con il **codice di recupero** per i salvataggi e aggiungere gli account solo quando serve la community.

## Decisioni da prendere

Ognuna con la raccomandazione dell'analisi.

1. **Chi sono i giocatori** (adulti, famiglie, minori)? *Raccomandazione*: età minima 14 anni (o consenso dei genitori)
   e niente funzioni social aperte a sconosciuti nella prima versione.
2. **Account o codice di recupero?** *Raccomandazione*: se oggi interessano soprattutto i salvataggi tra telefoni,
   prima il codice di recupero; gli account quando si vuole la community.
3. **Dominio**: lo si compra? *Raccomandazione*: sì, è necessario per email e cookie.
4. **Hosting di servizio e database**: dove? *Raccomandazione*: fornitori con backup e senza database che scadono.
5. **Accesso con Google** subito? *Raccomandazione*: no, prima solo email e password; Google dopo la prova su iPhone.
6. **Statistiche delle partite contro i bot**? *Raccomandazione*: solo locali e personali, senza coins né classifiche.
7. **Coins scambiabili**? *Raccomandazione*: no per ora; solo simboliche, scambio dopo il parere legale.
8. **Server di gioco senza database**: deve restare possibile? *Raccomandazione*: sì, per giocare al tavolo senza internet.
9. **Moderazione** di nomi, avatar e segnalazioni: chi la fa? *Raccomandazione*: deciderlo prima della fase 4.
