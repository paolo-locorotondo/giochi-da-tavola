# Tris (Tic-tac-toe)

Tre segni in fila su una griglia di nove caselle. Si gioca **contro il telefono** (tre livelli) oppure **in due sullo stesso telefono**. Online, **ognuno col suo telefono**, in due (un terzo telefono può solo guardare).

## Regolamento

1. Scegli se giocare contro il telefono (e a che livello) o in due sullo stesso telefono.
2. A turno si mette il proprio segno, X oppure O, in una casella libera.
3. Vince chi fa per primo tre segni in fila: in orizzontale, in verticale o in diagonale.
4. Se la griglia si riempie senza un tris, è pareggio. Chi inizia cambia a ogni partita.

Livelli contro il telefono: **facile** gioca a caso, **medio** gioca la mossa migliore 55 volte su 100 (`PERCENTUALE_MEDIO` in `src/logica.ts`), **difficile** non perde mai (minimax completo). Il punteggio resta finché non cambi modalità, livello o segno, o tocchi «Azzera il punteggio».

## Modalità di gioco

### Offline (un solo telefono)

Contro il telefono o in due. Funziona senza rete dopo la prima apertura ([come installarla](../../docs/app-installabile.md)).

### Online (ognuno col suo telefono)

Serve il server di gioco ([giocare con il PC](../../docs/guida-giocare-con-il-pc.md), [pubblicarlo online](../../docs/guida-deploy-online.md)).

- L'organizzatore scrive i due nomi (il primo gioca con X, il secondo con O) e ottiene un **codice**, un link `…/tris/CODICE` e un QR code. Ognuno tocca il proprio nome; l'organizzatore avvia.
- Si muove solo dal proprio telefono e al proprio turno: lo controlla il server, non l'app.
- Finita la partita la **rivincita** parte quando la chiedono entrambi; chi inizia alterna e il punteggio della serie continua.
- Un terzo telefono che entra guarda la partita; può prendere il posto di un giocatore caduto («Eri già in questa partita?»).
- Refresh o schermo bloccato non fanno perdere il posto. L'organizzatore può chiudere la partita per tutti. Se il server non risponde entro 8 secondi l'app propone la modalità a un telefono.

Come funzionano stanze, token e sicurezza: [architettura-tecnica.md](../../docs/architettura-tecnica.md). La logica online sta in `src/online/gioco.ts` (pura, usata dal server).

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/tris (anche dal telefono, vedi l'indirizzo "Network")
```

Passi dettagliati, firewall e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md). Per provarlo offline: `pnpm --filter @gdt/web build`, apri il sito una volta, poi spegni la rete e ricarica.

## Cosa controllare

- In due: le caselle occupate non si riusano; dopo il tris (o il pareggio) le caselle non rispondono e le tre vincenti sono evidenziate.
- «Nuova partita» fa iniziare l'altro segno; il punteggio resta.
- Contro il telefono a «Difficile» non si riesce a vincere; a «Facile» sì, spesso.
- Scegliendo O, il telefono (X) muove per primo da solo.
- Cambiare modalità, livello o segno azzera partita e punteggio.
- Le caselle sono leggibili dal lettore di schermo («Casella 2, colonna 2: X») e l'esito si annuncia.
- Cambiando lingua dall'ingranaggio cambiano testi ed etichette.
- Online (due telefoni, o due schede del browser con una in navigazione privata): sala con i due posti, «Inizia la partita» solo con entrambi, mossa rifiutata fuori turno, rivincita a due, refresh che riporta nel proprio posto, terzo telefono che guarda, «Chiudi la partita» che chiude per tutti.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: regole (`muovi`, `trovaLinea`), mossa del telefono (`mossaTelefono`, minimax in `mosseOttime`, caso iniettato con `Rng`) e punteggio. Niente frasi: gli errori sono codici (`ErroreTris`).
- `src/logica.test.ts`: le 8 linee, pareggio, errori, «difficile» che non perde mai, riproducibilità con seme.
- `src/locales/{it,en}.ts`: tutti i testi e il regolamento; `src/manifest.ts` li espone all'app.
- `src/online/gioco.ts`: stato, azioni, permessi e vista della partita online (contratto `GiocoOnline` di `@gdt/engine`, registrato in `apps/server/src/giochi.ts`); test in `gioco.test.ts`.
- `src/ui/Tris.tsx` (scelta della modalità), `TrisLocale.tsx` (un telefono), `online/TrisOnline.tsx` (online, usa `@gdt/collegamento`) e `tris.css`.
- Nessun dato in `data/`: il gioco non ha carte.

## Lingue

Italiano e inglese. Per cambiare un testo modifica la chiave in `src/locales/it.ts` e in `en.ts`; il compilatore segnala se manca in una lingua. Nel codice niente frasi: il TSX usa `t("chiave")`.

## Origine

Ricreato da zero seguendo le regole del progetto (logica pura, i18n, stile «Tavolo»), prendendo spunto da una versione precedente personale: nessun codice copiato.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md) (`apps/web/vercel.json` apre direttamente `/tris`).
