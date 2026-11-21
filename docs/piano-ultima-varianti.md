# Piano — varianti di «Ultima!»

Stato: **progettazione (fase 1)**, nessuna riga di codice scritta. Data: 2026-11-21. Base: versione 0.25.0 (regole ufficiali, contro i bot anche offline, partita a punti).
Origine: sezione «Varianti possibili» di `games/ultima/README.md` e «Varianti per dopo» in `docs/piano-ultima.md`. Le quattro varianti richieste dall'utente sono il tema di questo piano; le altre tre (pesca finché non puoi giocare, +4 senza sfida, penalità diversa da 2 per «Ultima!») restano fuori.

Il piano è scritto per essere unito con quello della «partita veloce a stanze aperte» (vedi sezione 6).

---

## 0. Decisioni comuni

**Opzioni della stanza.** Ogni variante è un booleano in una nuova chiave `varianti` della configurazione (accanto a `modo` e `soglia`), tutti `false` di base:

```ts
interface Varianti {
  sommaPiu2: boolean;      // 1. Somma dei +2
  piuUguali: boolean;      // 2. Più carte uguali insieme
  taglio: boolean;         // 3. Taglio
  scambioRotazione: boolean; // 4. Scambio e Rotazione (al posto di «Sette e zero»)
}
```

- `leggiConfig` (in `online/gioco.ts`) controlla ogni campo: assente = `false`, non booleano = `configNonValida`. Il server non cambia: la config arriva già come `unknown` a `nuovoStato`.
- Le varianti sono **combinabili** e ognuna è testata da sola e con le altre (sezione 5).
- Con tutte spente il gioco è identico a oggi: i test esistenti devono passare senza modifiche.
- La configurazione finisce in `Partita.varianti` alla creazione del round (copia), così la logica resta autosufficiente e `nuovoRound(n, rng, eventi, primo, varianti = BASE)` ha un default. Le chiamate esistenti non cambiano.
- Nella creazione (online e contro i bot) si aggiunge una sezione «Varianti (facoltative)» con quattro interruttori, ognuno con una riga di spiegazione. Di base tutti spenti.

**Nuovi codici di errore** (tutti da tradurre in `it.ts` e `en.ts`): `rispondiCumulo`, `tagliTardi`, `nonTagliabile`, `scambioNonValido`, `gruppoNonValido`, `variantaSpenta`.

**Nuovi eventi** (pubblici, senza mani): `cumulo`, `pescaCumulo`, `taglio`, `scambio`, `rotazione`, e `gioca` con il numero di carte calate (`quante`).

**Contratto `ctx.ora`.** Il taglio ha una finestra di tempo. La logica pura non legge l'orologio: l'azione porta il tempo (`ora`) che il chiamante fornisce. Serve una piccola aggiunta al contesto di `GiocoOnline` (`packages/engine/src/online.ts`): `ContestoOnline.ora(): number`, valorizzata da `apps/server/src/stanze.ts` con `Date.now()` e da `agisci` offline con `Date.now()`. È una modifica al contratto condiviso: va coordinata con la partita veloce (sezione 6).

---

## 1. Somma dei +2 (e valuta dei +4)

### Regola

- Quando un +2 viene giocato, il giocatore che lo riceve **non pesca subito**: riceve un **cumulo** di `2` carte da pescare.
- Chi riceve il cumulo ha due sole scelte: **giocare un +2** (di qualunque colore: il colore non conta, un +2 risponde a un +2) oppure **pescare tutto il cumulo** e perdere il turno.
- Se risponde con un +2, il totale cresce di 2 e passa al giocatore dopo, che ha la stessa scelta. Il cumulo si paga tutto insieme da chi non ha risposto.
- Il cumulo non si può ignorare pescando una carta sola: la pesca normale è vietata finché il cumulo è aperto (`rispondiCumulo`).
- Se il +2 è l'ultima carta di chi lo gioca, il round finisce e non nasce nessun cumulo (come oggi).
- Il primo giocatore: se la prima carta scoperta è un +2, il cumulo vale per lui (2 carte), come oggi ma con la stessa scelta.

### +2 e +4: decisioni proposte

| Combinazione | Ammessa? | Motivo |
|---|---|---|
| +2 su +2 (qualunque colore) | **sì** | è la variante |
| +2 su +4 | **no** | il +4 si affronta con la sfida; un +2 darebbe una via d'uscita dalla sfida e la sfida dipende dalla legalità del +4 |
| +4 su +2 | **no** | con un cumulo aperto chi riceve il +4 deve prima pagare il cumulo; mescolare le due cose complica la sfida (il cumulo andrebbe sommato alla pesca di 4 o 6) |
| +4 su +4 | **no** | come oggi: il +4 si sfida, non si risponde |

Alternativa B (non consigliata per la prima versione): ammettere +4 su cumulo, con il cumulo sommato alla pesca della sfida (chi perde pesca cumulo + 4, o cumulo + 6). Richiede di ridefinire la sfida e aggiunge un caso in più da testare. Se l'utente la vuole, va in un passo a parte.

### Logica (`logica.ts`)

- Nuovo campo `Partita.cumulo: { posto: number; quante: number } | null`. Chi lo riceve è `posto` (diventa `turno`).
- `gioca`: se `varianti.sommaPiu2` e la carta è `piu2`, invece di `pescaCarte(vittima, 2)` imposta `cumulo = { posto: vittima, quante: (cumulo?.quante ?? 0) + 2 }` (il cumulo cresce se la carta risponde a un cumulo aperto, cioè `cumulo` è già impostato). Il turno passa a `vittima`.
- Con un cumulo aperto, `giocabili` restituisce solo i +2 (ignorando colore e numero) e `gioca` valida `carta.tipo === "piu2"`, altrimenti `nonGiocabile`/`rispondiCumulo`.
- `pesca` con cumulo aperto: `rispondiCumulo`. Nuova azione `pescaCumulo(chi)`: pesca `quante` carte, azzera `cumulo`, passa il turno a `avanza(chi)`, registra `pescaCumulo`. Sostituisce per il cumulo il ruolo di `accetta`.
- `passa`: non applicabile con cumulo (si pesca il cumulo).
- Il +2 giocato da chi risponde a un cumulo non cambia il verso e non fa pescare nessuno finché non è chiusa la catena: il pagamento avviene solo a chi chiude (`pescaCumulo`).
- `sfida`/`accetta`: invariati, mai con un cumulo aperto (il +4 non si gioca sopra un cumulo).
- La finestra di taglio non si apre se la giocata lascia un cumulo aperto (vedi sezione 3).

### Bot (`bot.ts`)

- Con cumulo aperto, `mossaBot` per il bersaglio: se ha un +2, lo gioca (sceglie il colore di cui ha più carte; il colore non serve, ma il criterio di scarico resta); altrimenti `pescaCumulo`.
- Priorità di `carteGiocabili` in cumulo: il +2 è sempre preferito quando il cumulo è già alto e il bersaglio successivo ha poche carte (il bot può usare `POCHE_CARTE` come oggi).
- Facile: sceglie a caso tra «gioca +2» e «pesca cumulo» quando entrambe sono possibili; medio e difficile come sopra.
- `eseguiMossa` gestisce i due nuovi tipi.

### Online (`online/gioco.ts`)

- `AzioneOnline` nuova: `{ tipo: "pescaCumulo"; chi }`. `traduci` la produce per il posto che ha il cumulo; organizzatore: «Simula mossa col bot» gestisce anche il cumulo (vedi sopra).
- `vistaPer`: nuovo campo `cumulo: { posto, quante } | null` (pubblico). `giocabili` nel mio turno con cumulo = ids dei +2 in mano.
- Nessun permesso nuovo: chi risponde è sempre il bersaglio.

### Offline (`offline.ts`)

- Nessuna logica nuova: usa la stessa macchina a stati. `muoviBot` copre il cumulo perché `botDiTurno` già ritorna il turno del bot.

### UI a 375 px (`Tavolo.tsx`)

- Con cumulo aperto per me: banner in alto nell'area di avviso (`ul-avviso`): «{nome} ti fa pescare {n} carte. Gioca un +2 o pesca {n}.» Due pulsanti in griglia: **Pesca {n}** (primario) e, se ho un +2, il suggerimento «Puoi rispondere con un +2 qui sotto».
- I +2 in mano restano accesi; le altre carte sono spente. Il pulsante del mazzo è disabilitato.
- Per chi non è in turno: «Cumulo di {n} carte per {nome}» nel riquadro di stato.
- Il contatore del cumulo è sul mazzo: «Mazzo: 40 · cumulo 4».

### Testi (it / en)

- `ev_cumulo`: «{nome} fa pescare {n} carte» / «{nome} makes {n} cards be drawn»
- `ev_pescaCumulo`: «{nome} pesca {n} carte» / «{nome} draws {n} cards»
- `cumuloTitolo`, `cumuloTesto`, `cumuloPesca` («Pesca {n}» / «Draw {n}»), `cumuloRispondi`, `cumuloAiuto`.
- `errore_rispondiCumulo`: «Con un cumulo aperto puoi giocare solo un +2 o pescare il cumulo» / «With a stack open you can only play a +2 or draw the stack».

### Interazioni

- **Ultima!**: chi ha una carta sola e riceve un cumulo non può dire «Ultima!» prima di rispondere; la finestra si chiude con la risposta come oggi.
- **Taglio**: con un cumulo aperto non si taglia (sezione 3).
- **Più carte uguali**: un gruppo di +2 vale come più +2 in una volta (il cumulo cresce di 2 per carta).
- **Scambio/Rotazione**: non si giocano sopra un cumulo (solo +2).

---

## 2. Più carte uguali insieme

### Regola (proposta)

- Si possono calare **più carte dello stesso valore** in un'unica giocata, anche di **colori diversi** (es. 5 rosso, 5 verde, 5 blu).
- Gruppi ammessi:
  - **numeri** 0–9: sì;
  - **Salta** (anche di colori diversi): sì, con effetto moltiplicato: ogni Salta salta un giocatore in più;
  - **+2**: sì, con effetto moltiplicato (il cumulo o la pesca cresce di 2 per carta);
  - **Inverti**: no (due Inverti annullano il verso: troppo ambiguo da spiegare);
  - **Jolly, Jolly +4 e le carte nuove** (Scambio, Rotazione): no (sono una carta sola per natura).
- Mai un gruppo misto (es. 5 e Salta). Un gruppo è di **un solo valore o simbolo**.
- **Quale carta resta in cima** (decisione importante): la **cima** è una carta scelta dal giocatore tra quelle del gruppo, che deve essere giocabile sulla scoperta (colore in corso o stesso valore/simbolo). Il colore in corso diventa il colore della cima; le altre carte finiscono sotto, qualunque sia il loro colore. Di base la cima è la prima carta giocabile del gruppo, cambiabile con un tocco (vedi UI).
- **Effetti**: l'effetto di un gruppo è quello della cima moltiplicato per il numero di carte: Salta k volte = si saltano k giocatori (turno = `avanza(chi, verso, n, 1 + k)`); +2 k volte = `2k` carte al bersaglio (o cumulo `2k`); numeri: nessun effetto.
- **Ultima!** e **Beccato!** come oggi: il gruppo che lascia una carta apre la finestra; il gruppo che svuota la mano chiude il round (il vincitore prende i punti delle carte rimaste agli altri).
- Il gruppo non si estende al taglio: il taglio è una carta sola (sezione 3).

### Logica

- Nuova funzione pura `gruppoValido(mano, cima, ids, scoperta, colore)` e `gruppiPossibili(mano, scoperta, colore)` (per la UI e per il bot).
- `gioca` accetta `carta` (cima) e `insieme?: number[]` (le altre carte, sotto). Il client vecchio, che manda solo `carta`, continua a funzionare: retrocompatibile. Con variante spenta `insieme` è rifiutato (`variantaSpenta`).
- Validazione: tutte le carte in mano; stesso valore o stesso simbolo; cima giocabile; non più di 10 carte (il mazzo lo rende comunque impossibile, ma il limite protegge la rete).
- Se la mano scende a 1: finestra «Ultima!». Se scende a 0: round finito.
- Il gruppo è una sola voce in `eventi` (`gioca` con `quante`).

### Bot

- Per ogni valore presente in mano si valuta il **gruppo intero** (tutte le carte di quel valore) e la **singola** migliore: la scelta è quella con più punti scaricati (`valorePunti` della somma) e poi, a parità, più carte scaricate. Il bot non tiene carte per «riserva» se il gruppo è giocabile: questa è la priorità semplice e spiegabile.
- La cima è la carta giocabile del gruppo con più punti (come oggi), ma il bot prima vede se la cima sceglie un colore utile.
- Facile: gioca a caso tra le giocate lecite, gruppi compresi. Medio e difficile: la scelta sopra.
- `punteggioMossa` va esteso con il numero di carte del gruppo.

### Online

- `traduci`: `gioca` con `insieme` (lista di id), validazione in logica. Nessun nuovo permesso.
- `vistaPer`: `giocabili` continua a essere la lista delle carte che possono fare da cima. Il gruppo lo ricostruisce la UI dalla mano (che il client ha), con la stessa funzione pura di `logica.ts`.

### Offline

- Nessuna logica nuova: solo la UI passa `insieme`.

### UI a 375 px (`Tavolo.tsx`, `Carta.tsx`, `ultima.css`)

- Sotto la mano c'è un pulsante **«Più carte»** (secondario, icona `Copy`), visibile solo con la variante e solo se in mano ci sono almeno due carte con lo stesso valore. Il pulsante passa la mano in **modalità selezione**.
- In modalità selezione, ogni carta con un «gemello» mostra un **segno di spunta** (non solo il colore: anche il segno e il bordo tratteggiato). Toccando una carta la si seleziona o deseleziona. Dopo la prima selezione le carte di **altro valore** si spengono: un gruppo ha un solo valore.
- Sopra la mano compare la **barra del gruppo**: «3 carte: 5, 5, 5. In cima:» seguito da chip (un chip per carta, con colore, simbolo e nome come la carta) per scegliere la cima tra quelle giocabili. Di base la cima è la prima giocabile. Pulsanti in griglia: **Cala 3 carte** (primario) e **Annulla** (secondario). Il primario occupa la riga intera.
- Con un gruppo scelto il colore: se la cima è un numero, nessun pulsante colore (il colore è quello della cima).
- Dimensione: la mano resta a scorrimento orizzontale; la barra è in flusso normale (non fissa), così non copre le carte a 375 px.
- Accessibilità: la carta selezionata ha `aria-pressed`; la barra annuncia «Hai selezionato 3 carte di valore 5» in `role="status"`.

### Testi (it / en)

- `piuCarteBtn`: «Più carte» / «Multi-play»
- `piuCarteSeleziona`: «Tocca le carte uguali da calare insieme.» / «Tap the same cards to play together.»
- `piuCarteBarra`: «{n} carte di valore {valore}» / «{n} cards of value {valore}»
- `piuCarteCima`: «In cima:» / «On top:»
- `piuCarteCala`: «Cala {n} carte» / «Play {n} cards»
- `ev_gioca` con `quante`: «{nome} gioca {n} carte {carta}» / «{nome} plays {n} {carta} cards»

### Interazioni

- **Somma +2**: un gruppo di +2 ne conta come più (sezione 1).
- **Taglio**: la carta tagliata è sempre una sola.
- **Scambio/Rotazione**: mai in gruppo.
- **Ultima!**: un gruppo che lascia una sola carta apre la finestra di chi l'ha giocato, come una giocata normale.

---

## 3. Taglio

### Regola (proposta)

- Quando un giocatore cala una carta, si apre una **finestra di taglio** di **3 secondi** (tempo di gioco, poi 1 secondo di tolleranza di rete lato server).
- Chi **non è di turno** e ha in mano una carta **identica** alla carta scoperta può giocarla: è un **taglio**. «Identica» = stesso colore **e** stesso valore (numeri) oppure stesso colore **e** stesso simbolo (Salta, Inverti, +2). Jolly, Jolly +4, Scambio e Rotazione **non si tagliano** e non danno nessun taglio.
- Il taglio è **una sola carta**. Il suo effetto vale come se fosse giocata dal tagliatore nel suo turno: il **turno passa al tagliatore** (il turno che sarebbe toccato a un altro salta) e poi prosegue dal tagliatore (`avanza(tagliatore, verso, n)` con l'effetto della carta applicato).
- **Chi taglia per primo vince la gara**: il server applica le azioni una alla volta (da verificare in `apps/server/src/index.ts`, dove le richieste di un WebSocket sono gestite in sequenza). Il secondo taglio arriva con una finestra già chiusa e riceve `tagliTardi`: il messaggio è neutro, «Qualcuno è stato più veloce».
- **Il taglio non crea una catena**: chiude la finestra. Non si riapre sulla carta tagliata, così due tagli quasi simultanei restano una gara con un solo vincitore. (Alternativa: riaprire la finestra; ammessa come opzione, sconsigliata.)
- **Chiusura della finestra**: si chiude con qualunque azione di gioco del turno (gioca, pesca, passa, scegli colore, sfida, accetta, pesca cumulo), con un taglio, con la scadenza dei 3 secondi (che non produce un evento: semplicemente non si può più tagliare). Un giocatore che pesca o gioca sulla propria carta chiude la finestra.
- **Il taglio non si apre** se la giocata lascia un cumulo aperto (somma +2), o una sfida da rispondere (+4), o un colore da scegliere.
- **Chi taglia non può essere il giocatore di turno**: il turno gli spetta già, gioca normalmente.
- **Taglio di chi ha una carta sola**: se il tagliatore ha due carte e taglia, resta con una carta: la finestra «Ultima!» si apre per lui come per una giocata. Se il taglio svuota la mano, il tagliatore vince il round (punti agli altri).
- **Ultima!**: un taglio altrui **non chiude** la finestra «Ultima!» del giocatore che ha una carta sola (consigliato: altrimenti chi ha una carta sola si salverebbe da «Beccato!» con un taglio di un altro). La finestra si chiude solo alla prima azione del turno, come oggi.
- **Chi taglia e il turno**: se il giocatore di turno X non ha ancora agito e Y taglia, il turno passa a Y. X resta con la sua mano, invariata. Il conto dei giri non cambia.

### Logica

- `Partita.apertaTaglio: { posto: number; carta: Carta; fino: number } | null` (il posto di chi ha calato la carta, la carta, la scadenza). Impostato da `gioca` (e da `pescaCumulo`? no: il cumulo non apre tagli) se la variante è attiva, la carta è colorata o numero/simbolo, il cumulo non è aperto. `fino = ora + 3000`.
- `gioca`/`pesca`/`passa`/`scegliColore`/`sfida`/`accetta`/`pescaCumulo`/`ultima`/`beccato`: azzerano `apertaTaglio` (salvo l'`ultima` per la regola sopra: `ultima` non azzera la finestra di taglio, e `taglio` non azzera `ultima`).
- Nuova funzione `taglia(p, n, chi, id, ora, rng)`: controlla variante attiva, `apertaTaglio` presente, `ora <= fino`, `chi !== apertaTaglio.posto`, `chi !== turno`... (vedi sotto), la carta in mano è identica alla `apertaTaglio.carta`. Errori: `nonTagliabile`, `tagliTardi`. Poi applica la carta come `gioca` fuori turno: `turno = chi` prima dell'effetto, azzera `apertaTaglio` (niente catena), registra `taglio`.
- Il turno del giocatore che aveva il diritto di agire viene «saltato»: `chi` diventa il turno, l'effetto della carta si applica e si passa al giocatore dopo `chi`.
- `ora` arriva dall'azione (il chiamante la legge da `ctx.ora()`), mai dall'orologio della logica.
- Con variante spenta, `apertaTaglio` resta sempre `null`.

### Bot

- Nel `mossaBotLivello` della finestra: il bot con una carta identica in finestra decide il taglio con probabilità per livello: **facile 50 %**, **medio 85 %**, **difficile 100 %** (come `PROB_ULTIMA`).
- Ritardo di reazione del bot: la pausa della velocità scelta, ma **mai oltre 2,5 s** (la finestra dura 3 s). Due bot con un taglio possibile: vince quello con il posto più basso (ordine deterministico).
- Il bot taglia solo in finestra e solo se la sua mossa non è un «Beccato!» da fare nello stesso istante (la priorità è «Ultima!» → «Beccato!» → taglio → turno).
- Il bot non taglia sopra un cumulo o una sfida.
- Nuova funzione pura `mossaTaglioBot(p, posto, livello, rng)`; `muoviBot` la chiama quando la finestra è aperta e il bot ha il diritto.

### Online (`online/gioco.ts`, `apps/server`)

- Nuova azione client `{ tipo: "taglia"; carta: number }` (id della carta in mano). `traduci` produce `{ tipo: "taglia", chi, carta, ora: ctx.ora() }`. Solo chi ha un posto, mai chi guarda; mai l'organizzatore «Simula mossa» per un taglio (un taglio si fa dal proprio telefono; altrimenti il bot organizzatore cadrebbe in gare con il cuore del gioco).
- `gioca` riceve `ora` per aprire la finestra: nuova chiave nell'azione interna, non sulla rete (la `traduci` la aggiunge da `ctx.ora()`).
- `vistaPer`: nuovo campo `taglio: { carta: Carta; posto: number } | null` (pubblico: la carta è già sullo scarto) e `puoTagliare: number[]` (ids delle mie carte identiche, se la finestra è aperta e non tocca a me). Il tempo rimanente non sta nella vista: il client mostra 3 secondi dal momento in cui riceve la vista.
- Nessun permesso nuovo sul server; il taglio passa da `eseguiAzione` come le altre mosse (il server serializza, quindi la gara la decide l'ordine di arrivo).

### Offline (`offline.ts`, `UltimaLocale.tsx`)

- `agisci` passa `ora: Date.now()` alle azioni. La finestra è quella del tempo reale: il tavolo offline la rispetta come l'online.
- `muoviBot`: se la finestra è aperta e un bot ha una carta identica, programma il taglio con il ritardo sopra (la UI usa il timer di `pausaBot`, che restituisce anche il ritardo del taglio). La funzione pura è `botTagliaOra(p, ora)`, deterministica con il seme.
- Per il giocatore (IO): se ha una carta identica il pulsante **«Taglia!»** appare in finestra; alla scadenza scompare (la UI ricalcola `ora` in base a `fino`).
- Ordine di precedenza offline: l'azione del giocatore arriva prima del timer dei bot (il bot aspetta almeno 1 s): così il giocatore ha il vantaggio del clic.

### UI a 375 px

- Accanto allo scarto, quando la finestra è aperta, una **barra di 3 secondi** sottile (4 px, sotto la carta scoperta, con `role="progressbar"` e testo nascosto «Puoi tagliare per X secondi»). Con `prefers-reduced-motion` la barra diventa un testo che conta.
- Se ho una carta identica: la carta in mano si evidenzia (bordo a tratteggio e icona `Scissors`) e compare il pulsante **«Taglia con {carta}»** (primario, a tutta riga), nella riga delle azioni sopra la mano. Un solo percorso: il pulsante. (Toccare la carta in mano senza il pulsante non taglia: evita tagli per sbaglio.)
- Se un altro ha tagliato prima: messaggio neutro in `role="status"` per 4 secondi: «Qualcuno è stato più veloce».
- Chi non ha la carta e non è di turno: nessun pulsante; la barra e «Taglio possibile per {nome}?» restano solo informativi.
- Il gesto di tocco resta quello dei pulsanti (44 px di altezza minima come da checklist).

### Testi (it / en)

- `tagliaBtn`: «Taglia con {carta}» / «Cut with {carta}»
- `tagliaAiuto`: «Hai la stessa carta: puoi giocarla fuori turno entro pochi secondi.» / «You have the same card: you can play it out of turn within a few seconds.»
- `tagliaFinestra`: «Puoi tagliare ancora per {n} s» / «You can still cut for {n} s»
- `tagliaTardi`: «Qualcuno è stato più veloce» / «Someone was faster»
- `ev_taglio`: «{nome} taglia con {carta}» / «{nome} cuts with {carta}»
- `errore_nonTagliabile`: «Non puoi tagliare adesso» / «You can't cut now»
- `errore_tagliTardi`: «Qualcuno è stato più veloce» / «Someone was faster»

### Interazioni

- **Più carte**: il taglio è sempre una carta.
- **Somma +2**: nessun taglio sopra un cumulo.
- **Scambio/Rotazione**: non si tagliano (jolly); una carta tagliata non può essere il rimescolo di una mano (la finestra si chiude con lo scambio).
- **+4**: non si taglia, e con una sfida aperta non si apre finestra.
- **Ultima!/Beccato!**: vedi sezione 3, regola «Ultima!».

---

## 4. Scambio e Rotazione (al posto di «Sette e zero»)

L'utente ha chiesto due **nuove carte jolly** separate, senza potere su 7 e 0 (che restano numeri normali, come nel gioco ufficiale).

### Carte (proposta)

| | it | en | Tipo | Icona (lucide) |
|---|---|---|---|---|
| Scambio | **Scambio** | **Swap** | jolly (nessun colore: chi la cala sceglie il colore, come il Jolly) | `Handshake` |
| Rotazione | **Rotazione** | **Rotate** | jolly (come sopra) | `RotateCw` |

- **Giocabili sempre**, come il Jolly (nessun vincolo di colore o simbolo), ma **non si giocano** sopra un cumulo di +2 né sopra una sfida: rispondono prima le regole di quei casi.
- **Chi le cala sceglie il colore in corso** con i quattro pulsanti, come il Jolly. Questo le rende uguali agli altri jolly nell'interfaccia. Alternativa: non cambiano colore (sono «nere» e il colore resta). Consigliata la prima, perché l'effetto è già potente.
- **Quante copie**: l'utente ha scritto «due nuove carte jolly». Letteralmente sono due carte (una per tipo, mazzo da 110). **Proposta: due per tipo (quattro carte, mazzo da 112)**, perché con una sola copia l'effetto compare in pochissime partite. Da confermare (domanda 9).
- **Punteggio a fine round**: **50 punti**, come gli altri jolly (chi tiene in mano una di queste carte paga il prezzo pieno). Alternativa: 20. Consigliata 50.
- **Primo di mano**: se la carta scoperta all'inizio è Scambio o Rotazione, si rimette nel mazzo come il +4 e se ne gira un'altra. Il loro effetto non vale per il primo giocatore (serve una giocata vera).
- Nuovi tipi nel tipo `Carta`: `{ id; tipo: "scambio" | "rotazione" }` nel ramo `jolly` di `Carta`. `eJolly` li riconosce già (non sono colorati). `valorePunti` restituisce 50 già. Il compilatore segnala i `switch` da completare (`nomeCarta`, `Simbolo`, `punteggioMossa` del bot).

### Regole

- **Scambio**: chi la cala sceglie un altro giocatore (non sé stesso) a cui scambiare la mano. Le due mani si scambiano: chi l'ha giocata riceve le carte dell'altro, e viceversa. La carta scambiata non entra nel gioco: è giocata e basta. Il turno passa al giocatore dopo chi l'ha calata (come una carta normale).
- **Rotazione**: tutte le mani passano nel verso del gioco: la mano di ogni posto va al posto successivo nel verso (`avanza(posto, verso, n)`). Dopo la rotazione il turno passa al giocatore dopo chi l'ha calata. Nessuna mano si perde.
- Se la carta calata è l'**ultima** di chi la gioca, il round finisce subito con quel giocatore vincitore: nessuno scambio e nessuna rotazione.
- **Mani pubbliche?** Il conteggio delle carte è pubblico: dopo uno scambio o una rotazione si vede il nuovo numero di carte di ciascuno. Chi riceve una mano conosce le carte che ha (le vede lui); gli altri no.
- **Ultima!** dopo lo scambio o la rotazione: se qualcuno resta con una carta sola, apre la finestra. Se ne restano **due** (possibile con la rotazione), serve una finestra per più posti: `Partita.ultima` diventa una lista (`ultime: { posto, dichiarata }[]`). Questo cambiamento pesa più dell'effetto in sé: è una dipendenza da fare nel passo 2. Alternativa più semplice: aprire la finestra solo per chi ha giocato la carta e per il primo nell'ordine dei posti (asimmetrica, da evitare).
- **Interazione con il +4 illegale**: la legalità del +4 si decide al momento in cui il +4 è calato. Uno scambio o una rotazione successivi non la cambiano. Il +4 non si gioca mai come risposta a uno scambio.

### Logica

- `gioca` con `scambiaCon?: number` (posto) per lo Scambio: validazione (posto esistente, diverso da `chi`, con carte in mano) → errore `scambioNonValido`. Azione `scambio` in `eventi` con `posto` e `con`.
- `rotazione` nuova in `gioca` (senza parametri): ruota `mani` di un passo nel verso; errore: nessuno.
- `mazzoCompleto(varianti)`: con `scambioRotazione` aggiunge due copie di ciascuna carta nuova con id 108–111 (`mazzoCompleto()` senza argomenti resta invariato, per i test esistenti).
- Totale: 112 carte con la variante. I test di composizione verificano anche la variante.

### Bot

- **Scambio**: il bot lo cala quando la sua mano ha almeno **3 carte in più** del giocatore con meno carte (dato pubblico) e lo sceglie come bersaglio. Altrimenti lo tiene (con priorità bassa, come gli altri jolly). Il bot non vede la mano altrui: il criterio è solo il numero di carte.
- **Rotazione**: il bot la cala quando la **mano del giocatore precedente** (chi passa la sua mano a lui, dato pubblico) ha meno carte della propria di almeno 3. Altrimenti la tiene.
- Facile: a caso tra le giocate lecite (come per i jolly). Medio e difficile: il criterio sopra.
- Il bot non calcola su mani nascoste: solo numeri pubblici.

### Online

- `traduci`: `gioca` con `scambiaCon` (o niente per la rotazione). Il posto scelto è validato da `logica`.
- `vistaPer`: nessun campo nuovo. Lo scambio compare negli eventi pubblici (`scambio`, senza carte). La mano nuova la riceve ciascuno dal server nella propria vista, che la ricalcola a ogni mossa.
- `Vista.giocabili` include i jolly nuovi quando sono in mano (sempre giocabili).

### Offline

- Nessuna logica nuova; `UltimaLocale` mostra il selettore del bersaglio quando serve (vedi UI).

### UI a 375 px

- Per **Scambio**: dopo aver toccato la carta si apre il pannello del colore (come il Jolly, quattro pulsanti) e poi il pannello **«Con chi scambi la mano?»**: un pulsante per ogni altro giocatore, a tutta larghezza, con nome e numero di carte (es. «Bruno · 5 carte»), altezza minima 48 px. Con due giocatori il pannello resta (una sola scelta, ma coerente).
- **Rotazione**: dopo il colore nessun pannello in più; si vede il **passaggio delle mani**: nella lista dei giocatori, ogni riga mostra per 600 ms una freccia (`RotateCw` piccola) e il nuovo numero di carte; con `prefers-reduced-motion` nessuna animazione, solo il testo «Le mani sono passate» in `role="status"`. Le mani non si vedono mai mentre passano (la mia cambia numero: il conteggio del mio pannello si aggiorna).
- **Scambio**: nella lista dei giocatori, le due righe coinvolte si evidenziano per 600 ms (sfondo `--ac` a bassa opacità, con icona `Handshake`); stesse regole di movimento.
- La mano (mia) si aggiorna con un leggero fade-in di 200 ms; se la mano cambia numero di molto la scorrimento orizzontale resta quello di sempre.
- Nessuno scroll orizzontale: il pannello dello scambio è in flusso, non sovrapposto.

### Testi (it / en)

- `carta_scambio`: «Scambio» / «Swap»; `carta_rotazione`: «Rotazione» / «Rotate»
- `carta_scambioColore`: «Scambio ({colore})» / «Swap ({colore})»; `carta_rotazioneColore`: «Rotazione ({colore})» / «Rotate ({colore})»
- `scambioTitolo`: «Con chi scambi la mano?» / «Who do you swap hands with?»
- `scambioTesto`: «Scambi la tua mano con quella di un altro giocatore. Le carte restano coperte.» / «You swap your hand with another player's. The cards stay hidden.»
- `ev_scambio`: «{nome} scambia la mano con {con}» / «{nome} swaps hands with {con}»
- `ev_rotazione`: «Tutte le mani passano nel verso del gioco» / «All hands pass in the direction of play»
- `regolamentoNote` (nuova voce in `it.ts`/`en.ts`, e nel README): spiegazione delle quattro varianti.

### Interazioni

- **Somma +2**: non si giocano sopra un cumulo.
- **Più carte**: non in gruppo.
- **Taglio**: non si tagliano.
- **Ultima!**: vedi sopra (finestra per più posti).

---

## 5. Interazioni tra varianti (riassunto e test di combinazione)

| | Somma +2 | Più carte | Taglio | Scambio/Rotazione |
|---|---|---|---|---|
| **Somma +2** | — | gruppo di +2 = cumulo di 2 per carta | no taglio sopra un cumulo | non si giocano sopra un cumulo |
| **Più carte** | | — | il taglio è sempre una carta | mai in gruppo |
| **Taglio** | | | — | non si tagliano |
| **Scambio/Rotazione** | | | | — |

- **Ultima! con più varianti**: la finestra è una sola per posto (come oggi), tranne il caso «due carte sole» di Scambio/Rotazione, che richiede la lista di finestre (sezione 4).
- **Tutte e quattro insieme** (consigliato testarle insieme, non attivarle insieme di base): 112 carte, gruppi, tagli, cumuli, scambi. Il bot deve finire ogni partita e non perdere carte.

---

## 6. Punti di contatto con la partita veloce a stanze aperte

Sono i punti in cui le due modifiche toccano gli stessi file o le stesse firme. Vanno coordinati prima di iniziare.

1. **`packages/engine/src/online.ts` (`ContestoOnline`)**: il taglio chiede `ctx.ora()`. È una modifica del contratto condiviso da tutti i giochi online. Va fatta una sola volta, insieme alla partita veloce, che già cambia il contratto per i posti e per i nomi.
2. **`apps/server/src/stanze.ts`**: `eseguiAzione` passa il contesto (`ora`). Stesso file della coda e di `creaStanzaDaCoda` (che oggi crea la stanza con `config = {}`).
3. **`games/ultima/src/online/gioco.ts`**:
   - `nuovoStato(nomi, config)` e `leggiConfig`: la partita veloce cambia i nomi (arrivano uno alla volta) e i posti (min–max scelti dall'organizzatore). Le varianti aggiungono `varianti` alla config. Vanno scritte nello stesso `leggiConfig`.
   - `n` (numero di giocatori): `avanza(..., n)` oggi usa `s.nomi.length`. Con posti min–max il numero dei giocatori è quello **fissato all'avvio**. Il taglio, lo scambio e la rotazione dipendono da `n`: la partita veloce deve fissare `n` all'avvio (e noi non dobbiamo salvarlo in `Partita`).
   - `iniziaRound`/`nuovoRound`: aggiungono un parametro `varianti`; la partita veloce aggiungerà i posti. Le firme vanno aggiornate insieme.
   - `Vista`: entrambi aggiungono campi (`config`, `nomi`, `taglio`, `cumulo`…). Conflitto probabile su `Vista` e su `vistaPer`.
4. **`games/ultima/src/ui/UltimaOnline.tsx`**: la sezione «Crea» (modo, soglia) e la sala. La partita veloce aggiunge il pulsante «Partita veloce» e la scelta posti; le varianti aggiungono gli interruttori. Stessa schermata: il lavoro va fatto una volta sola, con un componente `Varianti` riusato.
5. **`games/ultima/src/locales/{it,en}.ts`**: stesso file, chiavi nuove da entrambi i piani. Serve un'unica passata di coerenza.
6. **Partita veloce per Ultima!**: la coda oggi è prevista con `coda: { giocatori: n }`, ma Ultima! è 2–10. Decisione: **le varianti sono spente nella partita veloce** (la stanza è creata con `config = {}`), oppure l'organizzatore può sceglierle. Consigliato: spente (domanda 14), perché la partita veloce è pensata per gare brevi e casuali.
7. **Tavolo (`Tavolo.tsx`)**: entrambi i piani lo toccano per il pannello d'attesa e per i pulsanti. Il pulsante «Taglia» e il pannello scambio sono nuovi; la partita veloce non cambia il tavolo.
8. **Partita con più giocatori e taglio**: la gara su un taglio è tra telefoni: nella partita veloce ci saranno più telefoni che non sono ancora seduti. Il taglio richiede un posto (`posto !== null`): chi guarda non taglia, e la sala d'attesa non ha finestre. Nessun conflitto, ma va scritto nei test.

Nessun punto richiede modifiche al server oltre il passaggio di `ora`.

---

## 7. File toccati

### Dentro `games/ultima`

- `src/logica.ts`: tipo `Carta` (due tipi jolly nuovi), `Partita` (`varianti`, `cumulo`, `apertaTaglio`, `ultime`), `mazzoCompleto(varianti)`, `nuovoRound(..., varianti)`, `giocabili`, `gioca` (gruppi, scambio, rotazione, taglio), `pesca`, `passa`, `pescaCumulo` (nuova), `taglia` (nuova), `gruppiPossibili`, `gruppoValido`, `Evento` (nuovi tipi).
- `src/bot.ts`: `punteggioMossa` (nuovi tipi), `carteGiocabili` (cumulo, gruppi), `mossaBot` (cumulo, scambio, rotazione, taglio), `mossaBotLivello` (livelli per taglio, cumulo, scambio), `eseguiMossa`, `mossaTaglioBot` (nuova), `botTagliaOra` (nuova).
- `src/offline.ts`: `agisci` (con `ora`), `muoviBot` (taglio dei bot), `pausaBot` (ritardo del taglio), `ConfigLocale` (varianti).
- `src/online/gioco.ts`: `ConfigOnline` (varianti), `leggiConfig`, `nuovoStato`, `applica`, `mossa` (nuove azioni), `traduci` (`insieme`, `scambiaCon`, `taglia`, `pescaCumulo`, `ora`), `vistaPer` (nuovi campi), `AzioneOnline` (nuovi tipi).
- `src/ui/Tavolo.tsx`: cumulo (banner e pulsanti), modalità selezione e barra del gruppo, pulsante «Taglia», barra dei 3 secondi, pannello scambio, animazione delle mani, nuovi eventi in `testoEvento`.
- `src/ui/Carta.tsx`: `nomeCarta` e `Simbolo` per Scambio e Rotazione; evidenziazione «tagliabile».
- `src/ui/UltimaOnline.tsx`: interruttori varianti nella creazione (e riuso del componente con la partita veloce).
- `src/ui/UltimaLocale.tsx`: interruttori varianti nella creazione offline; salvataggio della scelta (`CHIAVE` in `localStorage`).
- `src/ui/ultima.css`: barra del gruppo, chip della cima, barra del taglio, animazione delle mani (con `prefers-reduced-motion`), stati selezionato/spento.
- `src/locales/it.ts`, `src/locales/en.ts`: testi della sezione 1–4 e nuovi errori.
- `src/manifest.ts`: `regolamentoNote` (spiegazione delle varianti) in `testi(lingua)`.
- Test: `src/logica.test.ts`, `src/bot.test.ts`, `src/offline.test.ts`, `src/online/gioco.test.ts`.
- `README.md`: sezione «Varianti» (le quattro, con le decisioni), «Cosa controllare», struttura. Va sostituita la sezione «Varianti possibili».

### Fuori da `games/ultima`

- `packages/engine/src/online.ts`: `ContestoOnline.ora` (taglio). **Anche la partita veloce.**
- `apps/server/src/stanze.ts`: passa `ora` al contesto. **Anche la partita veloce.**
- `apps/server/src/ultima.test.ts`: test di config con varianti, gara di due tagli, permesso del taglio. **Anche la partita veloce** (stesso file di test).
- `apps/web/e2e/ultima-online.spec.ts`: tre telefoni con varianti; gara di tagli; gruppo; scambio. **Partita veloce** (stesso file, se aggiunge e2e).
- `apps/web/e2e/ultima-bot.spec.ts`: contro i bot con varianti, offline.
- `apps/web/e2e/__screenshots__/`: screenshot di riferimento per le nuove schermate (scuro e chiaro, 375 px).
- `docs/decisioni.md`: voce «Ultima! varianti» (stato e decisioni), aggiornata a ogni passo.
- `docs/test.md`: cosa copre la suite di Ultima! con le varianti.
- `docs/piano-ultima.md`: nessuna modifica necessaria (il piano originale resta storico); in alternativa una nota che rimanda a questo piano.
- `CHANGELOG.md`: voci «Non rilasciato» per ogni passo; versione spostata al rilascio.
- `apps/web/package.json`: solo al rilascio di ogni passo (`version`), come da CLAUDE.md.

### Per la partita veloce (da coordinare, non da fare qui)

`packages/engine/src/online.ts`, `apps/server/src/stanze.ts`, `apps/server/src/coda.ts`, `games/ultima/src/online/gioco.ts`, `games/ultima/src/ui/UltimaOnline.tsx`, `games/ultima/src/locales/*.ts`, `games/ultima/src/ui/Tavolo.tsx`, `apps/server/src/ultima.test.ts`.

---

## 8. Passi di implementazione (ordinati, ognuno rilasciabile)

Ordine consigliato: prima le varianti che toccano solo la logica di gioco, poi quelle con interfaccia nuova, infine il taglio, che è l'unica che tocca il contratto condiviso (`ctx.ora`) e la partita veloce.

**Passo 0 — infrastruttura (nessun effetto visibile).** `Varianti` nella config, `leggiConfig`, `Partita.varianti` (default), interruttori nella creazione (online e contro i bot) con tutto spento, testi e test di retrocompatibilità (con varianti spente tutto uguale). Si rilascia insieme al passo 1.

**Passo 1 — Somma dei +2 (0.26.0).** Cumulo in logica, `pescaCumulo`, bot, banner in UI, eventi, test. Più piccolo e isolato. Le combinazioni con gli altri passi arrivano dopo.

**Passo 2 — Scambio e Rotazione (0.27.0).** Due carte jolly nuove, `scambiaCon`, rotazione, `ultime` (lista di finestre «Ultima!»), bot con criterio sui numeri pubblici, pannello del bersaglio, animazione delle mani, testi. Non dipende dagli altri.

**Passo 3 — Più carte uguali insieme (0.28.0).** `gruppoValido`, `insieme` in `gioca`, selezione multipla e barra della cima in UI, bot con gruppi. Dipende dal passo 1 per il cumulo di +2 in gruppo (se il passo 1 non c'è, il gruppo di +2 si limita all'effetto singolo).

**Passo 4 — Taglio (0.29.0).** `ctx.ora` nell'engine e nel server, `apertaTaglio`, `taglia`, finestra di 3 s, gara lato server, bot con probabilità, UI con barra e pulsante, test della gara. Il passo più delicato: si fa per ultimo e si coordina con la partita veloce (sezione 6).

**Passo 5 — Verifica e chiusura.** Test di combinazione (tutte e quattro insieme), e2e con tre telefoni, screenshot in scuro e chiaro a 375 px, checklist `ui-mobile-checklist`, README, decisioni, test.md. Versione: 0.29.0 (o patch, se il passo 5 è solo test e doc: regola CLAUDE.md).

Ogni passo: la sua voce in «Non rilasciato», poi la versione al rilascio, con tag annotato `vx.y.z` sul commit (il push lo fa l'utente).

---

## 9. Piano di test

**Unit (`logica.test.ts`)**

- Mazzo: 108 con variante spenta (invariato); 112 con `scambioRotazione`; id distinti; composizione (due per tipo).
- Somma +2: cumulo di 2; risposta con +2 di colore diverso; cumulo a 6 dopo tre +2; `pesca` rifiutata con cumulo (`rispondiCumulo`); `pescaCumulo` paga e passa il turno; +2 su +4 e +4 su +2 rifiutati; primo di mano con +2 iniziale.
- Più carte: gruppo di numeri di colori diversi; cima decide il colore; Salta multiplo salta k giocatori (anche in due giocatori); +2 multiplo; gruppo che lascia una carta apre «Ultima!»; gruppo che svuota chiude il round; gruppo misto o di Inverti rifiutato; cima non giocabile rifiutata.
- Taglio: finestra aperta dopo una giocata; taglio con identica (colore e valore; colore e simbolo); taglio con colore uguale ma valore diverso rifiutato; taglio dopo la scadenza (`tagliTardi`); taglio del giocatore di turno rifiutato; seconda gara rifiutata; taglio con effetto (Salta, Inverti, +2) e turno passato al tagliatore; taglio con cumulo rifiutato; taglio che svuota la mano vince; taglio di un Jolly rifiutato; `ultima` non chiusa da un taglio altrui.
- Scambio: scambio con altro posto; scambio con sé stesso rifiutato; scambio come ultima carta: nessuno scambio; scambio di mani invertite esatte.
- Rotazione: ogni mano va al posto successivo nel verso; verso invertito; nessuna carta persa; turno dopo la rotazione.
- Ultima! lista: due posti con una carta sola dopo rotazione: entrambe le finestre; `beccato` solo per chi ha la finestra aperta.

**Bot (`bot.test.ts`)**

- Cumulo: il bot con +2 risponde; senza +2 pesca il cumulo; mai una mossa illegale.
- Gruppi: sceglie il gruppo quando scarica più punti; la cima è giocabile; facile gioca gruppi a caso ma leciti.
- Taglio: il bot con carta identica taglia con la probabilità del livello (test con seme fisso e numero di prove); non taglia sopra cumulo o sfida; ritardo non oltre 2,5 s; due bot: vince il posto più basso.
- Scambio/Rotazione: criterio sui numeri pubblici (bersaglio con meno carte, mano precedente con meno carte); non guarda mai la mano altrui (test: stessa vista pubblica con mani diverse → stessa mossa).
- Partite complete con **ogni combinazione** di varianti (16 combinazioni) e n = 2, 3, 4, 7, 10 su molti semi: finiscono sempre; nessuna carta persa o duplicata (112); nessun taglio riuscito con ora oltre la scadenza; riproducibili con lo stesso seme.

**Online (`online/gioco.test.ts`)**

- `leggiConfig`: varianti assenti = `false`; non booleane rifiutate; config vecchia (solo `modo`, `soglia`) valida.
- `vistaPer`: il cumulo e la finestra di taglio sono pubblici; `puoTagliare` solo per chi ha la carta e non è di turno; nessuna mano altrui in nessuna vista (con tutte le varianti).
- `traduci`: `taglia` solo con un posto; `scambiaCon` solo il posto valido; `insieme` solo con variante; `pescaCumulo` solo per il bersaglio.
- Partita intera con seme fisso (tutte le varianti): stesso risultato a ogni esecuzione.

**Offline (`offline.test.ts`)**

- `agisci` passa `ora` e il taglio dell'IO rispetta la scadenza; `muoviBot` taglia se la finestra è aperta e il bot ha la carta; la vista locale non mostra mai le mani dei bot con le varianti.

**Server (`apps/server/src/ultima.test.ts`)**

- Creazione con varianti (valide e non valide: `configNonValida`).
- **Gara**: due telefoni inviano `taglia` sulla stessa carta: uno riceve la mossa, l'altro `tagliTardi`; l'ordine di arrivo decide.
- Taglio con telefono che guarda: rifiutato (`nonPartecipa`).
- Il taglio non passa per «Simula mossa col bot» (solo il posto proprietario).
- La `ora` usata è quella del server (test con orologio finto).

**e2e (`apps/web/e2e/ultima-online.spec.ts`, `ultima-bot.spec.ts`)**

- Tre telefoni con varianti: cumulo di +2 (risposta e pagamento); gruppo di 5 con cima scelta; taglio di un telefono mentre un altro è di turno; gara di due tagli quasi simultanei (un solo vincitore, messaggio neutro per l'altro); scambio con scelta del bersaglio; rotazione con animazione (e con movimento ridotto).
- Contro i bot offline: partita completa con tutte le varianti e velocità veloce; pulsante «Taglia!» per il giocatore.
- Screenshot a 375 px in tema scuro e chiaro per: pannello varianti in creazione, banner del cumulo, modalità selezione con la barra della cima, barra e pulsante del taglio, pannello del bersaglio dello scambio, lista dei giocatori dopo la rotazione.
- `controllaMobile` su ogni schermata nuova (niente scroll orizzontale, bersagli di almeno 44 px).

**Verifica**: `pnpm --filter @gdt/ultima test`, typecheck, `pnpm --filter @gdt/server test` (o il comando in `docs/test.md`), e2e di Ultima!, poi la checklist `ui-mobile-checklist` e le schermate di verifica visiva come da CLAUDE.md.

---

## 10. Domande per l'utente (con risposta consigliata)

1. **+2 su +4 e +4 su +2**: ammessi? **Consigliato: no** in entrambi i casi (e +4 su +4 no). Alternativa B in sezione 1.
2. **Cumulo di +2**: chi non risponde deve pescare tutto il cumulo, senza scelta di pescare una carta sola? **Consigliato: sì**, il cumulo si paga tutto.
3. **Più carte: quali valori si raggruppano?** **Consigliato**: numeri, e Salta e +2 (effetto moltiplicato); **no** a Inverti. Alternativa più semplice: solo numeri.
4. **Più carte: chi sceglie la cima?** **Consigliato**: il giocatore, tra le carte giocabili del gruppo (barra con chip).
5. **Taglio: finestra di 3 secondi, chiusa dalla prima azione successiva e senza catena?** **Consigliato: sì**, il taglio chiude la finestra. Tempo da confermare (3 s proposto; più corto è più difficile per chi ha il telefono in mano).
6. **Taglio e «Ultima!»**: un taglio altrui non chiude la finestra di chi ha una carta sola? **Consigliato: no** (altrimenti è un modo per salvarsi da «Beccato!»).
7. **Taglio e Jolly**: i Jolly (e le carte Scambio/Rotazione) non si tagliano? **Consigliato: no**.
8. **Taglio online**: il server riceve `ctx.ora` dal contesto (modifica del contratto `GiocoOnline`, condivisa con la partita veloce). Va bene? **Consigliato: sì**, una sola volta.
9. **Scambio e Rotazione: quante copie?** Lei ha scritto «due nuove carte jolly»: una per tipo (mazzo 110) o due per tipo (mazzo 112)? **Consigliato: due per tipo**, perché con una copia l'effetto quasi non compare.
10. **Scambio e Rotazione: colore**: chi le cala sceglie il colore in corso (come il Jolly)? **Consigliato: sì**.
11. **Scambio e Rotazione: punti a fine round**: 50 (come i Jolly) o 20? **Consigliato: 50**.
12. **Scambio e Rotazione: giocabili sempre** come il Jolly, o devono rispettare colore o simbolo? **Consigliato: sempre** (come il Jolly); non sopra un cumulo né una sfida.
13. **Nomi e icone**: «Scambio» / «Rotazione» (en: Swap / Rotate) con icone `Handshake` e `RotateCw`: vanno bene?
14. **Partita veloce**: le varianti sono **spente** nelle partite veloci, o l'organizzatore può sceglierle? **Consigliato: spente**. Da decidere insieme al piano della partita veloce.
15. **Combinazioni**: le quattro varianti si possono attivare insieme? **Consigliato: sì**, con i test di combinazione della sezione 9.
16. **Più finestre di «Ultima!»**: va bene il cambiamento di `Partita.ultima` in lista (necessario per Scambio e Rotazione)? **Consigliato: sì.**

---

## 11. Stima (indicativa, in giornate di lavoro)

| Passo | Stima | Note |
|---|---|---|
| 0 Infrastruttura | 1 | config, interruttori, test di retrocompatibilità |
| 1 Somma dei +2 | 1,5 | logica, bot, banner, test |
| 2 Scambio e Rotazione | 2,5 | carte, `ultime`, bot, pannello, animazione, testi |
| 3 Più carte | 2,5 | gruppi, selezione multipla in mano a 375 px, bot |
| 4 Taglio | 3,5 | `ctx.ora`, gara, finestra, bot in tempo reale, UI |
| 5 Verifica e chiusura | 2 | e2e tre telefoni, screenshot scuro e chiaro, documentazione |
| **Totale** | **circa 13** | senza la partita veloce; ogni passo chiuso è rilasciabile |

Il taglio e la gara tra telefoni sono la parte con più rischio di tempo (test di rete e di ritardi); il resto è lavoro noto dalla base attuale.
