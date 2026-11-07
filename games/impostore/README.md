# Impostore

Tutti ricevono la stessa parola segreta tranne uno (o più): l'impostore. Servono **almeno 3 persone**.

## Regolamento

1. Ognuno guarda la propria carta in segreto: vede la parola, oppure scopre di essere l'impostore.
2. A turno si viene indicati dall'app e ognuno dice a voce (se offline) o digita (se online) **un indizio** sulla parola, senza dirla. L'impostore bluffa.
3. Si discute e si **vota** chi sembra l'impostore.
4. Se votano un innocente, vince l'impostore.
5. Se scoprono l'impostore, lui ha un'ultima occasione: se **indovina la parola** vince lui, altrimenti vincono gli altri.

Impostori consigliati: 1 fino a 6 giocatori, 2 da 7 a 10, 3 da 11; mai più della metà dei giocatori meno uno.

## Modalità di gioco

### Offline (un solo telefono che gira sul tavolo)

Il telefono passa di mano: ognuno guarda la propria carta e lo ripassa, poi si vota toccando il nome. Non serve rete: funziona anche in modalità aereo
dopo la prima apertura ([come installarla](../../docs/app-installabile.md)).

### Online (ognuno col suo telefono)

Serve il server di gioco ([giocare con il PC](../../docs/guida-giocare-con-il-pc.md), [pubblicarlo online](../../docs/guida-deploy-online.md)).

- L'organizzatore scrive i nomi, sceglie categoria e impostori, se i voti sono visibili in diretta e se gli indizi si scrivono nell'app.
- Ottiene un **codice**, un link `…/impostore/CODICE` e un QR code. Ognuno tocca il proprio nome.
- Ognuno vede solo la propria carta; devono votare tutti (l'organizzatore vede chi manca e può sollecitare).
- Pareggio: ballottaggio tra i pari merito; se pareggiano ancora vince l'impostore.
- Refresh o schermo bloccato non fanno perdere il posto. Se il server non risponde entro 8 secondi l'app propone la modalità a un telefono.

Come funzionano stanze, token e sicurezza: [architettura-tecnica.md](../../docs/architettura-tecnica.md).

## Provarlo

```
pnpm install       # solo la prima volta
pnpm dev           # modifiche al codice, anche online e telefono → apri http://localhost:5173/impostore
docker compose up  # build vera, installazione e offline → apri http://localhost:8080/impostore
```

Passi dettagliati, firewall di Windows e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md).

## Cosa controllare

- Meno di 3 nomi, o nomi doppi: errore e la partita non parte. Il consiglio sugli impostori segue il numero di nomi.
- Ognuno vede la propria carta e dopo non resta visibile; l'impostore non vede la parola.
- Voto su un innocente: vincono gli impostori. Voto sull'impostore: campo per indovinare la parola (vale anche con maiuscole, senza accenti, con spazi in più).
- A fine partita compaiono parola e impostori; **Nuova partita** riparte. Nella stessa categoria la parola non si ripete subito.
- Con l'audio acceso (ingranaggio → Audio, spento di default): suono diverso per la vittoria dei civili o degli impostori; online anche il sollecito suona oltre a vibrare.
- Online: nome già scelto non selezionabile, nessun telefono mostra la carta altrui, il refresh rientra nello stesso posto.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

```
src/logic/       partita dal seme, fasi, sessione a un telefono, validazione (logica pura)
src/online/      partita online, logica pura usata anche dal server
src/ui/          schermate React e parole recenti; ui/online/ per il collegamento WebSocket
src/parole.ts    accesso alle parole e VERSIONE_DATI
data/it/parole.json   parole per categoria
```

**Parole.** Modifica `data/it/parole.json`: una lista per categoria, senza duplicati (nemmeno ignorando maiuscole e accenti),
almeno 30 voci (lo verifica un test). Una nuova categoria va aggiunta anche a `NOME_CATEGORIA` in `src/ui/ImpostoreApp.tsx` e
`src/ui/online/ImpostoreOnline.tsx`. Se cambi ordine o contenuto di categorie esistenti, incrementa `VERSIONE_DATI` in `src/parole.ts`
(serve ai codici condivisi; la modalità a un telefono non ne risente).

## Deploy

Impostore è dentro l'app **Giochi da tavola**, che si pubblica una volta sola per tutti i giochi: [guida al deploy](../../docs/guida-deploy-online.md).
La modalità online richiede il server, non il solo sito statico.
