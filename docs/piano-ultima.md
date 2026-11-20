# Piano di lavoro — «Ultima!» (gioco di carte in stile UNO)

Stato: **realizzato nella 0.24.0 (2026-11-20)**; piano approvato dall'utente. Scelte prese in corso d'opera: vedi «Scelte di regola» nel README del gioco. Origine: TODO in `docs/decisioni.md`.

Una sola versione: **online, ognuno col suo telefono** (la mano è segreta, con un solo telefono non avrebbe senso).

## Decisioni prese

| Tema | Decisione |
|---|---|
| Nome | **«Ultima!»**: chi resta con una carta in mano deve dire «Ultima!» (al posto di «UNO»). «UNO» e «SOLO» sono marchi registrati e non compaiono nel nome; nella descrizione al massimo «regole simili ai classici giochi di carte a colori e numeri». |
| Cartella e indirizzo | `games/ultima`, id `ultima`, indirizzo `/ultima` e `/ultima/CODICE`. |
| Icona | Un mazzo di carte con il **numero «1» sulla prima carta** (per distinguerlo dagli altri giochi di carte che arriveranno). Va disegnata come icona lucide personalizzata o come SVG nel set, in una sola famiglia di tratto. |
| Regole | **Solo ufficiali** nella prima versione. |
| Punteggio | Si sceglie alla creazione della stanza: **round singolo** oppure **partita a punti** (fino a 500, soglia regolabile). |
| Giocatore che non risponde | Pulsante dell'organizzatore **«Simula mossa col bot»**: il bot fa *una* mossa per quel giocatore, la migliore nel contesto. Nessun bot automatico. |
| Giocatori | Da 2 a 10. |

## Regole da implementare (regolamento ufficiale)

- **Mazzo da 108 carte**: per ogni colore (rosso, giallo, verde, blu) uno `0`, due per ciascun `1–9`, due `Salta`, due `Inverti`, due `+2`; più 4 `Jolly` e 4 `Jolly +4`.
- **Inizio**: 7 carte a testa, la prima carta del mazzo va scoperta sullo scarto. Se è un Jolly +4 la si rimette nel mazzo e se ne gira un'altra; se è una carta speciale il suo effetto vale per il primo giocatore (un Jolly lo fa scegliere al primo giocatore).
- **Turno**: si gioca una carta dello stesso colore, numero o simbolo, oppure un Jolly. Altrimenti si pesca una carta: se si può giocare la si può calare subito, se no si passa.
- **Effetti**: `Salta` fa saltare il turno al prossimo; `Inverti` cambia verso (in 2 giocatori vale come Salta); `+2` fa pescare 2 al prossimo, che salta il turno; `Jolly` sceglie il colore; `Jolly +4` sceglie il colore, il prossimo pesca 4 e salta il turno.
- **Sfida del Jolly +4**: il +4 si può giocare solo senza carte del colore in corso. Chi lo subisce può sfidare: se aveva ragione, chi l'ha giocato pesca 4 (e il turno non si perde); se aveva torto, lo sfidante pesca 6.
- **«Ultima!»**: chi cala la penultima carta preme «Ultima!». Se un altro preme «Beccato!» prima che il giocatore successivo abbia giocato o pescato, chi ha dimenticato pesca 2.
- **Mazzo esaurito**: si rimescola lo scarto tranne la carta in cima.
- **Fine round**: vince chi finisce le carte. A punti, il vincitore prende i punti delle carte rimaste agli altri (numeri = valore, Salta/Inverti/+2 = 20, Jolly e Jolly +4 = 50).

## Varianti per dopo (non nella prima versione)

Da scrivere anche nel README del gioco, sezione «Varianti possibili», così l'utente sceglie quali aggiungere. Ognuna diventerà un'opzione della stanza, spenta di base.

- **Somma dei +2** (e dei +4): chi riceve un +2 può rispondere con un +2 e il totale passa al successivo.
- **Più carte uguali insieme**: si calano in una volta tutte le carte con lo stesso numero.
- **Pesca finché non puoi giocare** invece di una carta sola.
- **Sette e zero**: con il 7 si scambia la mano con un altro, con lo 0 tutte le mani passano nel verso del gioco.
- **Taglio**: chi ha una carta identica a quella appena calata può giocarla anche fuori turno.
- **+4 senza sfida** (si gioca sempre, niente controllo).
- **Penalità per «Ultima!»** diversa da 2.

## Il bot («Simula mossa col bot»)

Sta nella logica pura: `mossaBot(stato, posto): Azione`, deterministica e testata. Solo l'organizzatore può chiederla, solo per il giocatore di turno (o per chi deve rispondere a una sfida o scegliere un colore). Copre ogni situazione in cui un giocatore deve agire:

- **Gioca o pesca**: tra le carte giocabili sceglie con priorità semplici e spiegabili:
  1. se il prossimo giocatore ha poche carte, prima le carte che lo colpiscono (+2, Salta, Inverti);
  2. altrimenti scarica prima le carte che valgono di più (speciali colorate e numeri alti), per perdere meno punti;
  3. tiene i Jolly per ultimi; il Jolly +4 solo se è lecito (il bot non bluffa);
  4. a parità, preferisce il colore di cui ha più carte, per restare in quel colore.
  Se non ha carte giocabili, pesca; se la carta pescata è giocabile la gioca.
- **Scelta del colore**: il colore di cui ha più carte in mano.
- **Sfida del +4**: sfida solo se lo stato pubblico lo fa ritenere probabile (per esempio chi ha giocato il +4 aveva appena pescato invece di giocare il colore in corso); altrimenti accetta. Il bot non guarda la mano altrui.
- **«Ultima!»**: se resta con una carta, la dichiara sempre.

Il bot usa **solo ciò che quel giocatore vedrebbe** (la sua mano e lo stato pubblico), così è corretto e non «bara». Nell'elenco degli eventi compare «Mossa simulata dal bot per X», visibile a tutti.

## Architettura

Struttura uguale a Tris e Impostore:

```
games/ultima/
├── package.json, tsconfig.json, README.md
├── src/
│   ├── logica.ts       → mazzo, mescolata (RNG con seme di @gdt/engine), carta giocabile, effetti, punteggio
│   ├── bot.ts          → mossaBot (puro, testato)
│   ├── online/
│   │   ├── gioco.ts    → GiocoOnline: nuovoStato, applica, traduci, vistaPer, mancanti
│   │   └── index.ts    → export `ultimaOnline`
│   ├── manifest.ts, locales/{it,en}.ts, errori-ui.ts
│   └── ui/ (UltimaOnline.tsx, Carta.tsx, ultima.css) e online/collegamento.ts
```

- **Stato** (solo sul server): mazzo, scarto, mani, verso, giocatore di turno, colore in corso, carte da pescare in sospeso, punteggi, fase (`sala | turno | sceltaColore | sfida | fineRound | fine`).
- **`vistaPer(posto)`**: la propria mano intera; degli altri solo **quante carte** hanno; del mazzo solo quante carte restano. Le carte altrui non passano mai sulla rete.
- **Azioni**: `avvia`, `gioca(carta, colore?)`, `pesca`, `passa`, `sfida`, `accetta`, `ultima`, `beccato(posto)`, `mossaBot(posto)` (solo organizzatore), `prossimoRound`, `ricomincia`.
- **Configurazione della stanza**: modo di punteggio (round singolo / a punti) e soglia dei punti. Più avanti anche le varianti.
- **Determinismo**: il seme lo dà il server (`ctx.seme()`); con un seme fisso la partita si ripete identica nei test.
- **Registrazione**: una riga in `apps/server/src/giochi.ts`, una voce in `apps/web/src/App.tsx`, icona in `Icona.tsx` (mazzo con il «1», vedi «Decisioni prese»).
- Il contratto `GiocoOnline` e il server **non cambiano**.

## UI

Si lavora con le skill `ui-giochi-da-tavola` e `ui-mobile-checklist`.

- **Mano** in basso, a ventaglio, scorrevole in orizzontale; le carte non giocabili sono attenuate. Toccando una carta la si gioca; con un Jolly compaiono 4 pulsanti grandi per il colore.
- **In alto** gli altri giocatori, con il numero di carte, chi è di turno e il verso del gioco.
- **Al centro** lo scarto, il mazzo (si tocca per pescare) e il colore in corso.
- Pulsanti **«Ultima!»** e **«Beccato!»** ben visibili quando servono.
- **Organizzatore**: «Sollecita» e «Simula mossa col bot» per chi è di turno.
- **Daltonismo**: il colore non è mai l'unico segnale, ogni colore ha anche un simbolo e un nome leggibile.
- Tema scuro e chiaro, verifica a 375 px con screenshot come da CLAUDE.md.

## Passi

1. **Logica pura** (`logica.ts`) con i test: mazzo, mescolata, giocabilità, effetti, prima carta speciale, Inverti in 2, sfida del +4, mazzo esaurito, punteggio.
2. **Bot** (`bot.ts`) con test: per ogni fase sceglie una mossa lecita e segue le priorità; una partita completa giocata solo da bot finisce sempre.
3. **Modulo online** (`gioco.ts`): macchina a stati, permessi in `traduci`, viste. Test: nessuna carta altrui nelle viste, partita completa con seme fisso, «Simula mossa» solo per l'organizzatore.
4. **Registrazione nel server** e test del server (stanza, rientro con token, sollecito).
5. **Manifest, locali it/en, creazione della stanza** e sala d'attesa.
6. **Tavolo di gioco**: mano, scarto, scelta del colore, Ultima!/Beccato!, fine round e classifica.
7. **Verifica visiva** e test e2e con 3 contesti del browser (come `tris-online.spec.ts`).
8. **README** (provare, controllare, struttura, Deploy, varianti possibili, come cambiare i testi), CHANGELOG, `decisioni.md`, versione (probabilmente `0.15.0`).
