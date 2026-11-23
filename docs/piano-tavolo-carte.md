# Piano — interfaccia comune per i giochi di carte

Stato: **da progettare con l'utente** (2026-11-23). Nessuna implementazione. Base: versione 0.28.0.
Quando il lavoro è finito le scelte vanno nei README e in [decisioni.md](decisioni.md), e questo file si elimina.

## L'idea dell'utente

Abbiamo tre giochi di carte (Scopa, Burraco, Ultima!) e abbiamo reso comuni solo le carte. Conviene rendere comune
il più possibile, così aggiungere un gioco di carte (es. Briscola) è facile: cambia il gioco, non il sistema in cui gira.

- Una **mano** con il ventaglio di carte (già comune: `Mano` e `Ventaglio` in `@gdt/carte`).
- Un **tavolo** stilizzato: rettangolo fino a 4 giocatori, ovale o cerchio oltre.
- Sul tavolo: il **mazzo**, i **segnaposto dei giocatori** con un omino intorno al tavolo, e le **zone del gioco**
  (Burraco: le combinazioni calate delle due squadre; Scopa: solo le carte a terra; Ultima!: scoperta e mazzo).
- Spunto: due schermate di app note (Scopa: tavolo verde, avversario in alto con avatar, carte a terra al centro,
  mano in basso; Burraco: combinazioni come colonne di carte sovrapposte in verticale per le due squadre, mano in basso,
  mazzo e scarti in mezzo, punteggi accanto).

## Segnalazioni dai test (da fare dentro o prima del sistema comune)

**Scopa**
- Niente pannello con «Posa a terra» e «Annulla»: si interagisce col tavolo. Per posare, sul tavolo compare un
  riquadro tratteggiato «segnaposto» da toccare. Per prendere, si selezionano le carte a terra una a una e poi
  «Conferma» o «Annulla»; «Conferma» valida la presa. Stesso sistema di selezione di Burraco.
- Tavolo pulito, solo carte: «Mazzo: n carte» e «x carte prese · nessuna scopa» vanno nella sezione «La tua mano».
- «Tocca a te» non si vede scrollando: bordo oro sulla sezione «La tua mano» e titolo «La tua mano (tocca a te)».

**Burraco**
- Stesso «tocca a te»: bordo oro e titolo «La tua mano (tocca a te): n carte».
- «Sollecita» e «Simula mossa col bot» in basso, come negli altri giochi.
- Ordine per seme alternando rossi e neri: **cuori, fiori, quadri, picche** (oggi cuori, quadri, fiori, picche).
  Attenzione: non cambiare `SEMI_FRANCESI` in `packages/carte/src/tipi.ts` (genera gli id delle carte); cambiare solo
  l'ordine usato per ordinare la mano (`ORDINE_SEMI` in `packages/carte/src/ordine.ts`).
- «Vedi tutti gli scarti» ruba spazio: aprirlo con un pulsante «i» sul riquadro degli scarti. Nuova impostazione alla
  creazione della partita: scarti visibili sì/no (nasconderli rende la partita più difficile). Nota: oggi il server
  manda a tutti l'intera pila degli scarti; con scarti nascosti deve mandare solo la cima.
- (Da ragionare) Le combinazioni «Loro» e «Noi» sul tavolo, visibili a tutti: un'unica sezione «tavolo» con mazzo,
  scarti e accanto le combinazioni delle due squadre. Combinazioni senza titolo («Scala di quadri»): solo le carte;
  toccando il gruppo si vede cosa rappresenta e quanti punti vale.
- Matta: in una scala 5, 6, matta, 8 il 7 pescato non si attacca. È voluto (la matta calata non si sposta, FIBUR
  art. 10 secondo il README; sostituzione rimandata). Alternative: (1) niente sostituzione, com'è oggi; (2) il 7 prende
  il posto e la matta torna in mano; (3) il 7 prende il posto e la matta va in fondo alla combinazione; (4) sostituzione
  come opzione della stanza, spenta di base. Il testo del Codice di gara 2026 non è stato riletto: va verificato.
  In ogni caso un testo d'aiuto dovrebbe spiegare perché la carta non si attacca.

**Piccole cose emerse, non urgenti**
- Carte: nel «10» l'angolo è un po' stretto vicino ai pips.
- Duello Lampo, Colori e nomi: senza suono al tocco (il tocco chiude il round), da aggiungere se si vuole.
- Burraco, partita veloce: tempo d'attesa di base più lungo (serve un campo nel contratto di `@gdt/engine`).

## L'analisi (2026-11-23)

**Cosa c'è oggi.** I tre `Tavolo.tsx` (Scopa ~326 righe, Burraco ~478, Ultima! ~591) hanno lo stesso schema scritto
tre volte con classi diverse (`sc-`, `bu-`, `ul-`): stato «Tocca a te» in alto; riquadri di testo dei giocatori (senza
omino); zona di gioco propria; la mano; «Sollecita» e «Simula mossa col bot»; registro «Cosa è successo». Duplicati:
l'interfaccia `Comandi` (`azione`, `sollecita`, `conBot`), il blocco bot/sollecita, il registro, i riquadri dei giocatori,
il testo di stato. Online e contro i bot usano lo stesso `Tavolo` di ogni gioco: si cambia in un posto solo per gioco.

**Spazio a 375 px.** Larghezza utile ~343 px; spazio verticale utile ~740 px su un telefono da 812. Oggi Scopa è alta
~1800 px e Burraco ~1620: lo scroll nasce da qui. Il tavolo comune punta a stare in una schermata nei casi normali
(mano tipica), con mano e barra azioni eventualmente fisse in basso.

**Sistema proposto**, in `packages/carte/src/tavolo/` con ingresso `@gdt/carte/tavolo`:

| Componente | Cosa fa |
|---|---|
| `TavoloCarte` | Il tavolo (rettangolo fino a 4, ovale da 5 a 10), con i posti intorno e le zone del gioco al centro e ai lati |
| `PostoGiocatore` | Omino, nome, numero di carte, di turno, squadra, collegato |
| `ZonaCarte` | Una zona di carte (a fila, a pila, a colonne sovrapposte), anche selezionabile |
| `SegnapostoPosa` | Riquadro tratteggiato «Posa qui», toccabile |
| `Mano` (esistente) | In più: bordo oro e titolo «(tocca a te)», e una riga di informazioni |
| `BarraAzioni` | Azioni del gioco in basso, con «Sollecita» e «Simula mossa col bot» |
| `RegistroEventi` | Il registro «Cosa è successo» |
| `PannelloInfo` | Pulsante «i» con un riquadro di dettagli |

Il gioco passa dati e callback e decide regole, contenuto delle zone, testo del registro e azioni; il sistema non conosce
le regole. Un solo modello di selezione per mano e tavolo (quello di `Mano`: `selezione`, `onSeleziona`). Il posto di chi
gioca è sempre in basso, gli altri in senso orario. Serve un token nuovo per il feltro del tavolo (es. `--tavolo-fondo`) in
`apps/web/src/tema.css`, nei due temi. Accessibilità: ordine di lettura stato → posti → zone → mano → azioni → registro;
turno anche a parole, non solo col colore; l'annuncio del cambio turno resta in `role="status"`.

Schemi a 375 px:

```
Scopa a 2                              Burraco a 4
+-------------------------------+      +-------------------------------+
|        (O) Bot 1  1 carta     |      |      (O) Carla (compagna) 11  |
| +---------------------------+ |      | (O)Bruno 11      (O)Dario 11  |
| | [A][2][6][7]              | |      | +---------------------------+ |
| | - - - - Posa qui - - - -  | |      | | Loro  |  |  |  colonne     | |
| +---------------------------+ |      | | [Mazzo 41]  [Scarti 3C](i)| |
| La tua mano (tocca a te)  oro |      | | Noi   |  |  colonne       | |
|  [7 coppe][3 spade][C bast]   |      | +---------------------------+ |
|  Mazzo 18 · 9 prese · 0 scope |      | La tua mano (tocca a te): 11  |
| [Annulla]          [Conferma] |      |  [ventaglio 2 righe]          |
| > Cosa è successo             |      | [Cala] [Scarta] [Togli]       |
+-------------------------------+      | [Sollecita] [Simula col bot]  |
                                       +-------------------------------+
Ultima! a 6
+-------------------------------+
| (O)Bea 7  (O)Ciro 5  (O)Dina 1|
| (O)Elia 4           (O)Gigi 8 |
|   ( [mazzo]  [Rosso 7] )      |   ovale
| La tua mano (tocca a te): 7   |
| [Ultima!] [Passa]             |
+-------------------------------+
```

## Progetto dei componenti (bozza, da approvare prima del codice)

Regole comuni: solo token CSS (niente colori né misure fisse nei componenti; il feltro è un nuovo token
`--tavolo-fondo`, da calcolare con il contrasto WCAG nei due temi). Bersagli ≥ 44 px. Turno, squadra e stato sempre
con testo oltre al colore. Icone `lucide-react` con `aria-hidden` quando accanto a testo.

**`TavoloCarte`**: `posti: PostoGiocatore[]` (il primo è chi gioca, gli altri in senso orario), `children` per le zone
del centro. Forma: rettangolo arrotondato fino a 4 posti, ovale da 5 a 10 (decisione 3). Layout a griglia con aree
nominate: posti sul bordo, zone al centro, nessuna posizione assoluta, così il tavolo scala con il numero di posti.

**`PostoGiocatore`**: `nome`, `carte: number`, `diTurno: boolean`, `squadra?: string` (testo, es. «Squadra 1»),
`collegato?: boolean`, `punti?: string`. Omino `user` di `lucide-react` (decisione 4); iniziali solo se due nomi
coincidono, lo decide il componente. Accessibile: un solo testo leggibile («Carla, 11 carte, tocca a lei»).

**`ZonaCarte`**: `titolo: string`, `carte: Carta[] | number` (numero per il mazzo coperto), `disposizione: "fila" |
"pila" | "colonne"`, `selezione?` e `onSeleziona?` (stesso modello di `Mano`), `vuota?: string` (testo se è vuota).
Le colonne (Burraco) sono sovrapposte in verticale: il componente non sa cosa sono, sa solo come disporle.

**`SegnapostoPosa`**: riquadro tratteggiato, bordo `--bd-ctrl`, testo «Posa qui», `onTocca`, `disabilitato?`.
Visibile solo quando la posa è possibile (il gioco decide).

**`Mano` (esistente, da estendere)**: `diTurno?: boolean` (bordo `--ac` 2 px e titolo «La tua mano (tocca a te): n»),
`riepilogo?: ReactNode` (una riga sotto la mano: mazzo, prese, scope). Nessun'altra modifica.

**`BarraAzioni`**: `azioni: { id, etichetta, icona?, variante: "primaria" | "secondaria" | "pericolo" | "online",
onTocca, disabilitata? }[]`. Griglia `repeat(auto-fit, minmax(9.5rem, 1fr))` come da skill. «Sollecita» e «Simula
mossa col bot» sono azioni come le altre, passate dal gioco.

**`RegistroEventi`**: `voci: string[]`, accordion `<details>` in basso (decisione 5). Se appesantisce, un tasto «Cosa è
successo» tra le azioni.

**`PannelloInfo`**: pulsante «i» (`aria-label`, ≥ 44 px) che apre un riquadro con `titolo` e `children`. Serve per
gli scarti in Burraco (decisione 7) e per il testo d'aiuto della matta.

**Schermate da verificare a 375 px** (scuro e chiaro, checklist `ui-mobile-checklist`): partita a 2 in Scopa, a 4 in
Burraco, a 6 in Ultima!, con mano piena (10+ carte) e con lo scorrimento già assente nei casi normali.

**Esito dell'anteprima statica a 375 px** (2026-11-23, file fuori dal repo; scuro e chiaro; feltro `--tavolo-fondo`
proposto `#1f5a3f` scuro, contrasto 7,05 col testo, e `#2a6b4f` chiaro, 6,23):
- Scopa a 2 e Ultima! a 6 stanno in una schermata, con «Posa qui», bordo oro sulla mano e «Di turno» leggibili.
- Burraco a 4: i tre posti sulla stessa riga risparmiano circa 90 px; le combinazioni a colonne vanno affiancate (non
  una a destra e una a sinistra); nelle colonne sovrapposte il valore e il seme stanno **in alto a sinistra** (al
  centro restano coperti), con J, Q, K e la stella per il jolly; la mano da 11 carte sta su una riga (carte da 34 px
  nel ventaglio). Mano, azioni e registro entrano quasi tutti nei ~740 px utili; resta da stringere un poco.
- «i» degli scarti a 44 px.
- Da verificare nel codice vero: bersaglio di tocco di 44 px nelle carte sovrapposte (34 px di larghezza visibile),
  contrasti di tutti i testi sul feltro, testo ingrandito, movimento ridotto, safe area.

**Fatto (2026-11-23, non committato):** token `--tavolo-fondo` / `--tavolo-testo` in `apps/web/src/tema.css` (nei due
temi); in `packages/carte/src/tavolo/` tutti i componenti del sistema (`TavoloCarte`, `PostoGiocatore`, `ZonaCarte`,
`SegnapostoPosa`, `BarraAzioni`, `RegistroEventi`, `PannelloInfo`) con `tavolo.css`, locali it/en e test (64 in
`@gdt/carte`); `Mano` con `diTurno` e `riepilogo`; dipendenza `lucide-react` in `@gdt/carte`; `@gdt/carte` in
`apps/web`. Pagina di prova `apps/web/prova-tavolo.html` (+ `src/prova-tavolo.tsx`): solo `pnpm dev`, da eliminare
prima del rilascio. Screenshot a 375 px fatti con Edge e Playwright; Burraco a 4 è alto circa 1350 px (con la barra di
prova in cima), quindi non sta ancora in una schermata. Da fare: `PostoGiocatore` fuori dal feltro usa il colore
del feltro (illeggibile sul fondo chiaro), da sistemare; guardare sul telefono.

## Passi proposti

| Passo | Cosa vede l'utente | Rischio |
|---|---|---|
| 0 | Burraco: semi alternati; Sollecita e Simula in basso | Basso |
| 1 | «Tocca a te» con bordo oro sulla mano nei 3 giochi; in Scopa mazzo e prese nella mano; barra azioni comune | Basso |
| 2 | Posti con omino intorno al tavolo, punteggi accanto | Medio |
| 3 | Scopa: segnaposto «Posa qui», selezione sul tavolo, Conferma e Annulla | Alto (vanno riscritti gli e2e di Scopa) |
| 4 | Burraco: combinazioni sul tavolo a colonne, «i» sugli scarti, impostazione scarti visibili | Alto |
| 5 | Briscola, primo gioco che usa solo il sistema: collaudo | Alto |

Raccomandazione dell'analisi: 0 e 1 subito, poi decidere 2 e 3 dopo averli visti. Se Briscola costa più di un
`Tavolo.tsx` di poche decine di righe, il sistema va rivisto prima di migrare Burraco.

Rischi: cambiano tutti gli screenshot in partita (Scopa 3, Burraco 1, Ultima! nessuno in partita); gli e2e di Scopa
usano classi CSS (`scopa-aiuti.ts`, `scopa-bot.spec.ts`) e conviene riscriverli su ruoli e nomi accessibili; la logica,
l'online e i bot non cambiano.

## Decisioni da prendere con l'utente

Decisioni prese con l'utente (2026-11-23):

1. **Partenza: disegnare prima l'interfaccia intera**, poi migrare. (L'analisi raccomandava 0 e 1 subito: scelta non seguita.)
2. **Scopa, presa unica: sempre «Conferma»**. Un'impostazione «presa automatica» per chi vuole velocità resta da valutare.
3. **Forma del tavolo: sempre rettangolo arrotondato** (cambiata il 2026-11-23 dopo la prova a 10 giocatori; prima: ovale da 5
   a 10, che a 375 px costringeva a file di posti). Gli avversari stanno **intorno** al tavolo, chi gioca è in basso con la
   mano: 1-2 avversari tutti sopra; 3-5 uno per lato e il resto sopra; 6-9 due per lato e il resto sopra (10 giocatori:
   2, 5, 2). I lati sono colonne strette accanto alle zone, quindi non aggiungono altezza. Ordine nel DOM: sinistra,
   sopra, destra (senso orario). **Eccezione Burraco:** `disposizione="sopra"`, tutti gli avversari in una riga sopra,
   così le zone delle combinazioni hanno tutta la larghezza (321 px a 375 invece di circa 185). Ultima! e Scopa usano la
   disposizione «intorno» (approvata a 6 e a 10 giocatori).
4. **Segnaposto: omino** (icona di `lucide-react`), iniziali solo se due nomi coincidono.

5. **Registro: accordion in basso** come oggi. Se appesantisce troppo, si valuta un tasto tra le azioni in basso.
6. **Punteggi accanto ai posti**, con «Mano 3 di 6 · a 11» come sottotitolo.
7. **Burraco, scarti: visibili di base**; con scarti nascosti si mostra comunque la cima (il server manda solo la cima).
8. **Burraco, matta: sostituzione.** In una scala 5, 6, matta, 8 il 7 pescato prende il posto della matta, che va in fondo
   alla scala (verso fisso, nessuna impostazione). Il Codice di gara 2026, art. 10, la prevede: la matta «può essere
   sostituita solo dalla carta della quale fa le veci». L'art. 10 non dice dove va la matta dopo, quindi il verso
   in basso è una convenzione nostra. Regole decise: la matta va in fondo; se il fondo è occupato dall'asso va in cima
   (art. 10, vale anche per la matta già in cima: nessun caso a parte). Scala completa (14 carte): sostituzione non
   consentita, con testo d'aiuto. Solo scale, mai tris. Dopo ogni sostituzione si rilegge la combinazione con `scegli`
   (meno matte): un 2 dello stesso seme che torna in posizione 2 diventa naturale e il burraco passa a pulito (es.
   5, 6, 2♥, 8 → arrivano 7, 4, 3 → 2…8 pulito, 200). Con un jolly resta matta. Da coprire con un test. Restano:
   effetto sui bot (mossa nuova, di base conveniente), testo d'aiuto e correzione del README, che oggi dice che la
   sostituzione è rimandata.
9. **Dopo Briscola: Sette e mezzo.** Gioco con banco, mazzo italiano da 40: cambia il modello del turno (giocatori contro
   banco, carte coperte, puntate) e può chiedere una zona o un posto «banco» nel sistema; da tenere presente
   disegnando `TavoloCarte` e `PostoGiocatore`.

Punti di contatto nel codice: `packages/carte/src/ui/Mano.tsx`, `packages/carte/src/ordine.ts`,
`games/scopa/src/ui/Tavolo.tsx` e `composizione.ts`, `games/burraco/src/ui/Tavolo.tsx`, `games/ultima/src/ui/Tavolo.tsx`,
la config di Burraco in `games/burraco/src/online/gioco.ts` (`ConfigOnline`, `leggiConfig`, `vistaPer`).
