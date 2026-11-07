# Tris (Tic-tac-toe)

Tre segni in fila su una griglia di nove caselle. Si gioca **contro il telefono** (tre livelli) oppure **in due sullo stesso telefono**. La modalità online (ognuno col suo telefono) non c'è ancora: vedi «Modalità di gioco».

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

**Non ancora realizzata.** Il server (`apps/server`) oggi conosce solo Impostore: per Tris serve generalizzarlo (stanze per gioco) o aggiungere un canale dedicato. È un punto aperto in [decisioni.md](../../docs/decisioni.md).

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

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: regole (`muovi`, `trovaLinea`), mossa del telefono (`mossaTelefono`, minimax in `mosseOttime`, caso iniettato con `Rng`) e punteggio. Niente frasi: gli errori sono codici (`ErroreTris`).
- `src/logica.test.ts`: le 8 linee, pareggio, errori, «difficile» che non perde mai, riproducibilità con seme.
- `src/locales/{it,en}.ts`: tutti i testi e il regolamento; `src/manifest.ts` li espone all'app.
- `src/ui/TrisApp.tsx` e `tris.css`: la schermata.
- Nessun dato in `data/`: il gioco non ha carte.

## Lingue

Italiano e inglese. Per cambiare un testo modifica la chiave in `src/locales/it.ts` e in `en.ts`; il compilatore segnala se manca in una lingua. Nel codice niente frasi: il TSX usa `t("chiave")`.

## Origine

Ricreato da zero seguendo le regole del progetto (logica pura, i18n, stile «Tavolo»), prendendo spunto da una versione precedente personale: nessun codice copiato.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md) (`apps/web/vercel.json` apre direttamente `/tris`).
