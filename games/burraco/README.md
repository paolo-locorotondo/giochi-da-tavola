# Burraco

Il classico gioco di carte a coppie con pozzetti e matte. Due modi: **contro i bot** su un solo telefono (in 2 contro un bot, oppure in 4 con un bot come compagno contro due bot; anche offline) oppure **ognuno col suo telefono**, in 2 o in 4 a coppie. La mano è segreta: per questo a un telefono gli altri sono bot.

## Regolamento

1. Si gioca con due mazzi francesi e 4 jolly (108 carte). Ognuno riceve 11 carte; due pozzetti da 11 carte aspettano coperti, uno per squadra. In 4 si gioca a coppie, con il compagno di fronte.
2. Al tuo turno peschi una carta dal mazzo (le carte coperte da cui si pesca) oppure prendi tutta la pila degli scarti (le carte scartate sul tavolo, a faccia in su). Poi, se vuoi, cali combinazioni o attacchi carte a quelle della tua squadra. Finisci scartando una carta.
3. Le combinazioni sono il tris (3 o più carte dello stesso valore) e la scala (3 o più carte di fila dello stesso seme; l'asso va prima del 2 o dopo il K). Jolly e 2 sono matte: al massimo una per combinazione. Un 2 al suo posto in una scala del suo seme è una carta normale.
4. Una combinazione di 7 o più carte è un burraco: pulito senza matte (+200), semipulito con la matta in testa o in coda a sette carte (+150), sporco con una matta in mezzo (+100).
5. Chi resta senza carte prende il pozzetto della squadra: subito se ha calato tutto, al turno dopo se ha finito scartando. Ogni squadra lo prende una volta sola.
6. Si chiude restando senza carte con l'ultimo scarto (mai una matta), dopo aver preso il pozzetto e con almeno un burraco: +100. Contano le carte calate, meno quelle rimaste in mano; il pozzetto mai preso costa 100.

Valori: jolly 30, 2 20, asso 15, dal K all'8 10, dal 7 al 3 5. Si gioca fino a 2005 punti (oppure 1505, 3005 o una sola mano). Il testo del regolamento mostrato nell'app sta in `src/locales/{it,en}.ts` (`regolamentoPassi`): se cambi uno, cambia anche l'altro.

## Regole verificate e fonti

Il piano ([piano-burraco.md](../../docs/piano-burraco.md)) era scritto a memoria, con dei punti «[verificare]». Sono stati confrontati con:

- **FIBUR**, *Codice di gara*, edizione 2026 (PDF su [fibur.it](https://www.fibur.it/codice_di_gara.php)), articoli citati sotto;
- [it.wikipedia.org/wiki/Burraco](https://it.wikipedia.org/wiki/Burraco);
- [pagat.com/rummy/burraco.html](https://www.pagat.com/rummy/burraco.html) (Burraco italiano).

Tutte le regole sono costanti in `src/regole.ts` e `src/carte.ts`: correggerle costa poco.

| Regola | Scelta nel gioco | Fonte | Stato |
|---|---|---|---|
| Mazzo | 2 mazzi francesi + 4 jolly = 108 carte | FIBUR art. 1 | verificata |
| Carte e pozzetti | 11 a testa, due pozzetti da 11 | FIBUR art. 4 | verificata |
| Valori delle carte | jolly 30, 2 20, asso 15, K–8 10, 7–3 5 | FIBUR art. 1, Wikipedia, Pagat | verificata |
| **2 in scala al suo posto** | carta naturale, vale comunque **20** punti; con lui si può aggiungere una matta | FIBUR art. 10, Pagat | verificata |
| Una matta per combinazione | sì; niente combinazioni di sole matte | FIBUR art. 10 | verificata |
| **Tris di 2** | **no** (i 2 sono matte; niente giochi di sole matte) | FIBUR art. 10, Pagat | verificata |
| Tris | da 3 a 9 carte (8 uguali + una matta) | FIBUR art. 12 | verificata |
| Scala | da 3 a 14 carte (A–K + una matta, oppure A-2-…-K-A); asso prima del 2 o dopo il K; non si gira l'angolo (K-A-3 no) | FIBUR art. 11 | verificata |
| Matta già calata | resta dov'è; si attacca solo se la sua posizione non cambia. Una matta libera si legge nella posizione più bassa (in alto se in basso c'è l'asso) | FIBUR art. 10 | verificata |
| **Soglie di apertura** (15/50/90/120 del piano) | **nessun minimo**: la prima calata è libera | FIBUR (nessun articolo le prevede), Wikipedia («nella versione italiana non c'è un punteggio minimo»), Pagat | verificata: il piano era sbagliato |
| **Scarti bloccati** da una matta | **di base gli scarti sono sempre liberi** (si prende tutto, nessun obbligo di usarli); la versione «bloccata» del piano resta come **opzione** | FIBUR art. 9, Wikipedia, Pagat: nessun blocco nel Burraco italiano | verificata: il piano era sbagliato; l'opzione «bloccata» è una variante casalinga **da verificare** |
| Pila degli scarti di una sola carta | quella carta non si può riscartare subito | FIBUR art. 9, Pagat | verificata |
| Pozzetto | in diretta (cala tutto, lo prende e continua) o con lo scarto (lo riceve al turno dopo); per prenderlo si può scartare anche una matta | FIBUR (definizioni), Pagat | verificata |
| **Chiusura con una matta** | **vietata**: l'ultimo scarto non può essere una matta | FIBUR art. 14 e 34, Wikipedia, Pagat | verificata |
| Chiusura senza scarto | vietata: per chiudere si scarta l'ultima carta | FIBUR art. 17 e 35, Pagat | verificata |
| Chiusura | serve il pozzetto preso e almeno un burraco (pulito o sporco); +100 | FIBUR art. 17 | verificata |
| Burraco | 7 o più carte; pulito 200 (anche con il 2 al suo posto), semipulito 150, sporco 100 | FIBUR art. 13 e 18 | verificata (il semipulito è nell'edizione 2026; il piano non lo aveva) |
| **Burraco di tris** | la FIBUR lo prevede («sequenza o combinazione»), ma l'utente ha scelto di **non** farlo nella prima versione: `burracoDiTris: false` | FIBUR art. 13 | verificata; spento per scelta |
| Pozzetto non preso | −100, non contato se nessuna squadra l'ha preso | FIBUR art. 18 | verificata |
| Pozzetto preso ma non giocato | le sue carte contano come carte in mano | FIBUR art. 18 | verificata |
| Fine del mazzo | quando ne restano 2 la mano finisce, senza bonus | FIBUR art. 17 | verificata |
| Stallo | due giri interi senza pescare dal mazzo né calare: la mano si interrompe | FIBUR art. 16 (lì decide l'arbitro) | adattata: **da verificare** il numero di giri |
| Due tris dello stesso valore nella stessa squadra | no | Pagat (la FIBUR non lo dice) | **da verificare** |
| Obiettivo 2005, con 1505 / 3005 / mano singola; a pari punti si gioca un'altra mano | scelta dell'utente | Wikipedia cita 505, 1005, 2005 | scelta del progetto |
| 3 giocatori | non supportato | Wikipedia e Pagat descrivono varianti diverse | scelta dell'utente |

## Contro i bot (un telefono, anche offline)

Su «Come giocate?» si sceglie **Contro i bot**: il proprio nome, in 2 o in 4, il livello, la velocità, fino a quanti punti e gli scarti (sempre liberi o bloccati). Le ultime scelte restano salvate sul telefono.

- Il telefono fa da server per sé: usa la stessa macchina a stati dell'online (`src/offline.ts`). Si vede solo la propria mano; degli altri solo quante carte hanno.
- In 4 sei al posto 1, il tuo compagno (bot) al 3, gli avversari al 2 e al 4. Il compagno attacca anche alle tue combinazioni, ma non sa cosa hai in mano.
- I bot fanno **un passo alla volta** (pesca, calata, scarto) con una pausa: lenta 2,2 s, normale 1,3 s, veloce 0,6 s (`VELOCITA`). La velocità si cambia anche in partita.
- **Livelli**: **difficile** cala tutto ciò che può (scegliendo le combinazioni che valgono di più), attacca, prende gli scarti quando conviene e non scarta carte che servono ai tris avversari; **medio** fa la mossa migliore 55 volte su 100 (`PERCENTUALE_MEDIO`); **facile** cala poco e scarta a caso.

## Il bot online («Simula mossa col bot»)

Solo l'organizzatore lo vede, per chi ha il turno. Fa **un passo** e negli eventi compare «Mossa simulata dal bot per X». Usa solo ciò che quel giocatore vedrebbe (la sua mano, le combinazioni, gli scarti), mai le mani altrui o i pozzetti: lo verifica un test che mescola le mani avversarie e controlla che la mossa non cambi.

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/burraco (anche dal telefono, vedi l'indirizzo "Network")
```

`pnpm dev` avvia il sito e il server di gioco. Passi dettagliati: [provare-in-locale.md](../../docs/provare-in-locale.md); con il PC come server: [guida-giocare-con-il-pc.md](../../docs/guida-giocare-con-il-pc.md). Contro i bot funziona **offline**: `pnpm --filter @gdt/web build`, apri il sito una volta, poi spegni la rete e ricarica. Online serve il server; se non risponde la pagina propone di riprovare o di giocare contro i bot.

Dal telefono: apri l'indirizzo "Network" che stampa `pnpm dev`, scegli Burraco, poi «Contro i bot» (funziona anche in aereo dopo il primo caricamento) oppure «Ognuno col suo telefono» (crea la stanza, gli altri entrano con il link o il QR).

## Cosa controllare

- Creazione: in 2 o in 4; nomi vuoti o uguali rifiutati; obiettivo e scarti scelti si vedono in sala.
- Mano: 11 carte in griglia a 7 colonne, mai scroll orizzontale anche con 21 carte; «Per seme» / «Per valore» (la scelta resta sul telefono); le carte appena arrivate sono evidenziate.
- Turno: prima «Pesca» o «Prendi gli scarti», poi «Cala» (attivo solo se le carte scelte sono una combinazione valida: l'anteprima dice quale e quanti punti), «Attacca qui» sotto le combinazioni della propria squadra a cui le carte si attaccano, «Scarta» con una sola carta scelta.
- Matte: le carte che fanno da matta hanno il segno «M»; un 2 al suo posto in scala no.
- Burraco: badge «Burraco pulito +200», «semipulito +150», «sporco +100».
- Pozzetto: «Pozzetto: da prendere / preso» per squadra; quando arriva in mano compare «Hai preso il pozzetto: 11 carte».
- Chiusura: «Scarta» diventa «Chiudi la mano» e chiede conferma; senza burraco o con una matta come ultima carta l'errore spiega perché.
- Scarti bloccati (opzione): avviso testuale e «Prendi gli scarti» attivo solo con due carte uguali alla cima scelte.
- Fine mano: tabella per squadra (carte calate, burraco, chiusura, carte in mano, pozzetto, totale, punti della partita); «Prossima mano» / «Ricomincia» solo all'organizzatore.
- Online: ognuno vede solo la propria mano; «Sollecita» e «Simula mossa col bot» solo all'organizzatore; refresh o schermo bloccato: si rientra nel proprio posto.
- Tema chiaro e scuro, inglese, 375 px.

I test automatici sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/regole.ts`: tutte le costanti di regola (carte, burraco, bonus, obiettivi, scarti, stallo, burraco di tris).
- `src/carte.ts`: mazzo (da `@gdt/carte`: `mazzoFrancese({ mazzi: 2, jolly: 4 })`), matte e valori.
- `src/combinazioni.ts`: `interpreta` (tutte le letture valide di un insieme di carte: tris o scala, posizione della matta, asso alto o basso), `scegli` (meno matte, matta più in basso), `attacca` (la matta già calata non si sposta), `burraco`. Provato contro una ricerca esaustiva in `combinazioni.test.ts`.
- `src/logica.ts`: distribuzione, `pesca`, `prendiPila` (libera o bloccata), `cala` (nuove e attacchi, anche più gruppi), `scarta`, pozzetto (in diretta e con lo scarto), chiusura, fine mazzo, stallo, `punteggioMano`, `anteprima`. Errori come codici (`ErroreBurraco`).
- `src/bot.ts`: `mossaBot` (un passo), `mossaBotLivello`, `eseguiMossa`.
- `src/online/gioco.ts`: stato della stanza (mani, punti di squadra, obiettivo), azioni, permessi (`traduci`), `vistaPer` (mai carte altrui né pozzetti). Registrato in `apps/server/src/giochi.ts`.
- `src/offline.ts`: la partita contro i bot sul telefono.
- `src/locales/{it,en}.ts`, `src/manifest.ts`: testi e regolamento.
- `src/ui/`: `Burraco.tsx` (scelta della modalità), `BurracoLocale.tsx`, `BurracoOnline.tsx`, `Tavolo.tsx` (comune alle due modalità; usa `CartaGrafica` e `Mano` di `@gdt/carte`), `burraco.css` (solo token; il segno «M» delle matte è qui).
- Test: `combinazioni.test.ts`, `logica.test.ts`, `bot.test.ts` (200 mani complete solo bot a 2 e 4), `online/gioco.test.ts`, `apps/server/src/burraco.test.ts`; e2e in `apps/web/e2e/burraco-bot.spec.ts` e `burraco-online.spec.ts`.
- Le carte sono il mazzo francese fisso (le regole stanno nel codice): non c'è una cartella `data/`.

## Partita veloce (punto di aggancio)

In «Gioca online» il pulsante **Partita veloce** sta in cima, prima di «Ho un codice». Chi apre sceglie punti da raggiungere, scarti (liberi o bloccati dalle matte), **2 o 4 giocatori**, come formare le coppie e il tempo d'attesa (1, 2, 3 o 5 minuti: per 4 persone da radunare conviene 5); chi si aggancia vede le impostazioni e può solo entrare.

- Dichiarazione: `veloce` in fondo a `burracoOnline` (`src/online/gioco.ts`): `posti: [2, 4]`, `squadre: (n) => (n === 4 ? [[1, 3], [2, 4]] : null)`, `configVeloce: (grezza) => leggiConfig(grezza)`. Niente avvio anticipato: parte solo a stanza piena. La logica non è cambiata.
- Le squadre seguono i posti (1+3 contro 2+4): il server siede i giocatori ai posti giusti prima di `avvia`, per «ordine di arrivo», «a caso» e «scelte in sala».
- UI: `src/ui/ImpostazioniVeloce.tsx` (obiettivo e scarti), riepilogo `riepilogoConfig` in `BurracoOnline.tsx`, sala e anteprima condivise da `@gdt/collegamento`.
- Da fare: la scadenza «più lunga di 2 minuti» decisa nel piano è per ora solo la scelta fino a 5 minuti all'apertura (il predefinito della schermata condivisa resta 2); un predefinito per gioco richiederebbe un campo nel contratto `veloce`.
- Provarla: due o quattro schede su `/burraco`. Test: `apps/server/src/veloce.test.ts` e `apps/web/e2e/burraco-veloce.spec.ts`.

## Varianti possibili

Non nella prima versione; ognuna diventerebbe un'opzione della stanza:

- **Burraco di tris** (7+ carte uguali): previsto dalla FIBUR, basta `burracoDiTris: true` in `regole.ts`.
- **Sostituzione della matta** (chi ha la carta naturale la mette al posto della matta, che va in fondo).
- **Apertura con un minimo di punti** (alcune varianti da tavolo e il Buraco brasiliano).
- **Riordino della mano a trascinamento** (con un pulsante equivalente).
- **Burraco a 3** (pozzetto da 18), solo se richiesto.

## Lingue

Italiano e inglese. Per cambiare un testo modifica la chiave in `src/locales/it.ts` e in `en.ts`; il compilatore segnala se manca in una lingua. I nomi delle carte e dei semi vengono da `@gdt/carte`.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md). Contro i bot è nella PWA (offline); online serve il server di gioco (le stanze stanno in memoria sul server), che include già il Burraco tramite `apps/server/src/giochi.ts`.
