# Impostore

Tutti ricevono la stessa parola segreta tranne l'impostore, che non la conosce.
Si danno indizi a voce, si discute e si vota. Se l'impostore viene scoperto può ancora
vincere indovinando la parola.

Modalità disponibili: **un telefono solo** (il telefono passa di mano).
Codice condiviso tra più telefoni: non ancora implementato.

## Provarlo

Dalla radice del repo (serve Node 20+ e pnpm 9, vedi il [README principale](../../README.md)):

```bash
pnpm install
pnpm dev
```

Apri nel browser l'indirizzo mostrato nel terminale (di solito http://localhost:5173)
e tocca **Impostore** nel menu.

### Su un telefono vero

Il PC e il telefono devono essere sulla stessa rete WiFi.

```bash
pnpm --filter @gdt/web dev --host
```

Apri sul telefono l'indirizzo `Network` mostrato nel terminale. Così si prova l'interfaccia
touch, ma non l'installazione come app né l'uso offline: il service worker funziona solo
su HTTPS o su `localhost`. Per quelle prove usa il sito deployato (vedi sotto).

### Provare l'offline in locale

```bash
pnpm build
pnpm --filter @gdt/web preview
```

Apri l'indirizzo mostrato (`localhost`), ricarica una volta, poi spegni la rete o
metti il browser offline dagli strumenti per sviluppatori: l'app deve continuare a funzionare.

### Cosa controllare

1. Configurazione: inserisci almeno 3 nomi, un numero di impostori valido e una categoria.
2. Ogni giocatore vede la propria carta; l'impostore non vede la parola.
3. Dopo le carte compare chi dà il primo indizio.
4. Votando un civile la partita finisce con la vittoria degli impostori.
5. Votando l'impostore compare il campo per indovinare la parola; la risposta ignora
   maiuscole, accenti e spazi.
6. Con "Nuova partita" le parole appena uscite non si ripetono subito.

### Test automatici

```bash
pnpm --filter @gdt/impostore test
```

## Struttura

```
src/logic/partita.ts    regole pure: partita dal seme, carta, tentativo, voto
src/logic/fasi.ts       fasi (distribuzione, indizi, voto, tentativo, fine) e vincitore
src/logic/sessione.ts   stato della partita a un telefono, riduttore testato
src/ui/                 schermate React e memoria delle parole recenti
src/parole.ts           accesso alle parole e VERSIONE_DATI
data/it/parole.json     parole per categoria
src/manifest.ts         id, nome e descrizione per il menu
```

## Aggiungere o cambiare parole

Modifica [data/it/parole.json](data/it/parole.json): una lista di parole per categoria,
senza duplicati e con almeno 20 voci (lo verifica un test). Una nuova categoria va aggiunta
anche a `NOME_CATEGORIA` in `src/ui/ImpostoreApp.tsx`.

Se cambi l'ordine o il contenuto di categorie già esistenti, incrementa `VERSIONE_DATI`
in `src/parole.ts`. Serve alla modalità con codice condiviso, dove telefoni con elenchi
diversi darebbero parole diverse. La modalità a un telefono non ne risente.

## Deploy

Impostore non ha un deploy suo: è dentro l'app `apps/web`, che si pubblica una volta sola
per tutti i giochi. Vedi la sezione [Deploy](../../README.md#deploy) del README principale.
Dopo ogni push su `main` Vercel pubblica la nuova versione, e i telefoni con l'app installata
si aggiornano da soli al caricamento successivo.
