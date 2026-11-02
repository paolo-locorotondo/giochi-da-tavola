# Decisioni di progetto — giochi-da-tavola

Riepilogo delle decisioni prese prima di iniziare lo sviluppo (2026-11-02).
Per ogni punto: cosa si è deciso e perché. I punti ancora aperti sono in fondo.

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

## Rete: tre livelli, si parte dal livello 0 e 1

Domanda chiave: *i telefoni devono parlarsi?* Quasi sempre no.

| Livello | Come funziona | Rete |
|---|---|---|
| **0. Un solo telefono** | Il telefono passa di mano, ognuno vede la sua carta | Nessuna |
| **1. Codice partita condiviso** | Un telefono crea la partita e mostra un codice (es. `K7F2`). Ognuno lo inserisce sul proprio telefono insieme al proprio **numero di posto**. Da codice + posto ogni telefono **calcola da solo**, in modo deterministico (RNG con seed), la propria parola/ruolo. | Nessuna (va anche in modalità aereo) |
| **2. Realtime** | Un server scambia messaggi tra i telefoni | WiFi/internet |

**Decisione: livello 0 + livello 1, nessun backend.** Il livello 2 si aggiunge solo
quando un gioco ne ha davvero bisogno (es. azioni segrete inviate da più telefoni
contemporaneamente).

Perché:
- Funziona senza internet, anche su WiFi con isolamento dei client (hotel, locali).
- Nessun costo di server, nessun cold start, nessun problema di WebSocket sospesi
  quando il telefono blocca lo schermo.

Limiti accettati:
- Tutti i telefoni devono avere la stessa versione di regole/dati: il codice partita
  deve includere (o verificare) una **versione dei dati**.
- Chi vuole barare può inserire il posto di un altro. È come sbirciare le carte: al
  tavolo ci si fida.

**Formato del codice partita (deciso):**
- **8 caratteri**, alfabeto di 31 simboli senza `0/O` e `1/I/L` (si confondono a voce):
  `ABCDEFGHJKMNPQRSTUVWXYZ23456789`.
- Codifica il seed, non i parametri. I parametri (n. giocatori, n. impostori, categoria)
  si inseriscono a mano e il checksum del codice li include: un telefono con parametri
  diversi vede un errore invece di una parola sbagliata.
- Versione dati: da definire insieme al primo gioco.

## Architettura software

- **Monorepo unico** con **pnpm workspaces** (Turborepo opzionale quando servirà).
  Motivo: motore e giochi evolvono insieme in un solo commit, versioni sempre allineate,
  un'unica app "raccolta".
- **Ogni gioco è un plugin**: esporta un `manifest` (id, nome, min/max giocatori,
  modalità supportate), la logica e la UI. L'app carica i giochi in **lazy loading**.
- **La logica di gioco è TypeScript puro, deterministica e senza dipendenze dalla UI.**
  Così è testabile (importante per Lupus) e, se servirà il livello 2, si può eseguire
  sul server senza riscriverla.
- **Fasi come macchina a stati** nel motore.
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
│   ├── web/                    → PWA contenitore: menu giochi, crea/entra partita, impostazioni
│   └── server/                 → (futuro, solo se servirà il livello 2)
├── packages/
│   ├── engine/                 → codice partita, RNG con seed, giocatori, fasi, timer, Narratore
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

- Il livello 0/1 produce solo file statici (`pnpm build` → `dist/`).
- Hosting consigliato: **Cloudflare Pages** collegato al repo GitHub, deploy automatico
  a ogni push. Alternative valide: GitHub Pages, Netlify, Vercel, Render Static Site.
- Se in futuro servisse il server del livello 2: servizio Node separato (es. su Render),
  il client resta sull'hosting statico.

## Lezioni dal progetto precedente (`../tic-tac-toe`)

Il tris (Node + `ws`, server autoritativo, stanze con codice a 4 cifre, heartbeat, test
e2e, deploy su Render free) è un buon riferimento **per il livello 2**, non come codice
da riusare. Cose da fare diversamente se/quando si farà il server:
- Interfaccia di gioco generica (`init`, `applyAction`, `viewFor(player)`) invece di
  logica dentro gli handler e duplicata nel client.
- **Viste private per giocatore** (non uno stato pubblico uguale per tutti).
- Stanze con N giocatori, host e narratore.
- **Riconnessione con token + timer di grazia**: sui telefoni il WebSocket cade spesso
  (schermo bloccato, cambio app); un'uscita non deve distruggere la stanza.
- Render free va in sleep dopo ~15 min: cold start lento.

## Piano di partenza

1. Inizializzare git e il monorepo (pnpm + Vite + React + TypeScript + PWA).
2. Motore base: codice partita, RNG con seed, giocatori, fasi.
3. Impostore in modalità "un telefono" (livello 0) e "codice condiviso" (livello 1).
4. Poi Lupus, con entrambi i narratori.

## Punti aperti

- Parole di Impostore: solo italiano? Quali categorie (cibi, luoghi, animali, ...)?
- Conferma dell'hosting (Cloudflare Pages consigliato).
- Turborepo sì/no (si può decidere più avanti).
