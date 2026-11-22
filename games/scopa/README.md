# Scopa

Il classico gioco di carte italiano, con il mazzo da 40 carte. Si gioca **in 2** oppure **in 4 a coppie**, in due modi: **contro i bot** su un solo telefono (anche offline) oppure **ognuno col suo telefono** (stanza con codice). La mano è segreta: per questo a un telefono gli altri sono bot (niente due giocatori sullo stesso telefono, per ora).

Le carte (semi, figure, dorso) sono disegnate in proprio in `@gdt/carte`: nessuna immagine di terzi.

## Regolamento

1. Si gioca con il mazzo italiano da 40 carte (denari, coppe, spade, bastoni; dall'asso al 7, poi fante 8, cavallo 9, re 10). Quattro carte vanno scoperte sul tavolo e ognuno ne riceve tre.
2. Al tuo turno cali una carta. Se sul tavolo c'è una carta dello stesso valore la prendi, e solo quella. Altrimenti, se puoi, prendi carte la cui somma fa il valore della tua (es. un 7 prende 3 e 4). Se non puoi prendere niente, la carta resta sul tavolo.
3. Se le prese possibili sono più d'una scegli tu quale fare. Le carte prese vanno nel tuo mazzetto, coperto fino alla fine del round.
4. Se con una presa svuoti il tavolo fai scopa: vale un punto. Non vale con l'ultima carta del round.
5. Finite le carte in mano se ne danno altre tre a testa, finché il mazzo finisce. Le carte rimaste sul tavolo alla fine vanno a chi ha preso per ultimo.
6. A fine round un punto a chi ha più carte, uno a chi ha più denari, uno a chi ha il settebello (il 7 di denari), uno a chi ha la primiera più alta, più le scope. A pari, quel punto non va a nessuno.
7. Primiera: per ogni seme conta la carta migliore (7 = 21, 6 = 18, asso = 16, 5 = 15, 4 = 14, 3 = 13, 2 = 12, figure = 10) e si sommano i quattro semi; senza un seme la primiera non vale.
8. Vince chi arriva per primo a 11 punti (o 21, se scelto) con più punti dell'altro; a pari si gioca un altro round.

In 4 i compagni siedono di fronte (posti 1 e 3 contro 2 e 4) e sommano carte, punti e scope; il turno gira nell'ordine dei posti. A 2 giocatori le distribuzioni sono 6, a 4 sono 3. Chi apre ruota a ogni round.

Lo stesso testo è in `src/locales/it.ts` (`regolamentoPassi`): se cambi uno, cambia anche l'altro.

### Regole e fonti

Tutte le costanti del regolamento stanno in un file solo, [`src/regole.ts`](src/regole.ts).

Verificato su [Wikipedia, «Scopa (gioco)»](https://it.wikipedia.org/wiki/Scopa_(gioco)) (consultata il 2026-11-21):

- valori della primiera (7 = 21, 6 = 18, asso = 16, 5 = 15, 4 = 14, 3 = 13, 2 = 12, figure = 10, massimo 84);
- primiera nulla senza almeno una carta per seme;
- presa singola obbligatoria con la carta di pari valore, anche se sarebbe possibile una somma;
- la scopa fatta con l'ultima carta giocata non vale;
- le carte rimaste sul tavolo vanno a chi ha preso per ultimo;
- punti del round (carte, denari, settebello, primiera, scope) e pari = nessun punto;
- partita a 11 (a due), a 21 a squadre; a pari si continua.

**Da verificare** (scelte nostre, non trovate scritte o variabili da zona a zona):

- **Soglia a 4**: la fonte indica 21 a squadre; qui di base è 11 anche a 4 (scelta del piano), con 21 selezionabile.
- **Primiera nulla per entrambe**: nessuno prende il punto (deduzione dalla regola, la fonte non lo dice).
- **Tre o quattro re sul tavolo all'inizio**: in alcune regole si ridistribuisce; qui non si ridistribuisce.
- **Primo di mano**: il posto 1 apre il primo round, poi ruota di un posto a ogni round.

Web search non era disponibile durante il lavoro: la verifica è stata fatta solo sulla pagina sopra.

## Contro i bot (un telefono, anche offline)

Su «Come giocate?» si sceglie **Contro i bot**: in 2 (tu contro un bot) o in 4 a coppie (tu e un bot compagno al posto 3 contro due bot), il tuo nome e quello dei bot, il livello, la velocità e i punti per vincere. Le ultime scelte restano salvate sul telefono.

- Il telefono fa da server per sé: usa la stessa macchina a stati dell'online (`src/offline.ts`, molto simile a quello di Ultima!: alla terza copia va estratto un modulo comune). Si vede solo la propria mano; dei bot solo quante carte hanno.
- I bot giocano da soli, uno alla volta: **lenta** 2,2 s, **normale** 1,3 s, **veloce** 0,6 s (`VELOCITA`); si cambia anche in partita.
- **Livelli** (`src/bot.ts`): **facile** gioca a caso tra le giocate lecite; **medio** gioca la migliore 55 volte su 100 (`PERCENTUALE_MEDIO`), senza memoria; **difficile** gioca sempre la migliore e ricorda le carte uscite (`uscite`, pubbliche) per stimare il rischio di lasciare una scopa o il settebello. Il bot guarda solo ciò che vedrebbe quel giocatore.

## Online (ognuno col suo telefono)

L'organizzatore sceglie 2 o 4 giocatori, scrive i nomi e la soglia; gli altri entrano con il codice o il QR e toccano il proprio nome. A 4, in sala, l'organizzatore vede le coppie e può scambiare due giocatori di coppie diverse (tocca il primo, poi il secondo). Se qualcuno non risponde: «Sollecita» e «Simula mossa col bot» (una mossa sola, difficile, annunciata negli eventi).

Segreti: le carte altrui e quelle del mazzo non passano mai sulla rete. Anche le prese restano coperte: durante il round si vede solo **quante** carte ha preso ognuno; l'elenco si vede nel riepilogo di fine round («Vedi le prese»).

### Mossa a due tocchi

Ogni mossa si fa con due tocchi, sempre (anche con una sola presa possibile):

1. **Primo tocco**: una carta della tua mano. Resta selezionata e sul tavolo si evidenziano le carte che puoi prendere con quella (tratteggio e «puoi prenderla» nell'aria, non solo colore). Toccare di nuovo la stessa carta la deseleziona; toccarne un'altra la sostituisce.
2. **Secondo tocco**: una o più carte sul tavolo. Il gioco compone la presa con le carte toccate:
   - se coincide con una presa lecita, la mossa parte;
   - se le carte toccate restano compatibili con più prese (es. con un 7 e sul tavolo 1, 2, 3, 4, 6: toccando il 1 restano «1 + 6» e «1 + 2 + 4»), si sceglie coi pulsanti delle combinazioni;
   - toccare una carta non evidenziata mostra «Non puoi prendere questa carta con quella scelta» e non fa nulla.
   - Con una sola presa possibile, il secondo tocco la fa partire da sola.
3. **Posa a terra**: se la carta non ha prese possibili il pulsante «Posa a terra» la lascia sul tavolo. Se la carta ha prese, la presa è obbligatoria: il pulsante è spento con la spiegazione.
4. **Annulla** (o Esc) lascia la carta in mano.

La composizione della presa è in `src/ui/composizione.ts` (funzione pura, con test). Le prese possibili vengono da `presePossibili` (`logica.ts`), come prima.

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/scopa (anche dal telefono, vedi l'indirizzo "Network")
```

`pnpm dev` avvia il sito e il server di gioco. Passi dettagliati: [provare-in-locale.md](../../docs/provare-in-locale.md); con il PC come server: [guida-giocare-con-il-pc.md](../../docs/guida-giocare-con-il-pc.md). Contro i bot funziona **offline**: `pnpm --filter @gdt/web build`, apri il sito una volta, poi spegni la rete e ricarica. Online serve il server; se non risponde la pagina propone di giocare contro i bot.

## Cosa controllare

- Contro i bot, in 2 e in 4: la partita va avanti da sola fino a «Partita finita», anche con la rete spenta.
- Due tocchi: la carta in mano, poi le carte a terra evidenziate; una carta non evidenziata non fa nulla; «Annulla» (o toccare di nuovo la carta) lascia la carta in mano.
- Presa singola: con un 5 sul tavolo un 5 prende solo il 5, anche se ci sono 2 e 3, e parte al secondo tocco.
- Posa a terra: con una carta senza prese il pulsante c'è; con una carta che ha prese è spento.
- Scopa: svuotando il tavolo compare «fa scopa!» negli eventi e il contatore sale; con l'ultima carta del round no.
- Riepilogo: carte, denari, settebello, primiera (o «nulla»), scope, punti; i pari scritti «pari: nessuno».
- Online a 2 e a 4: le carte degli altri non si vedono; a 4 le coppie e lo scambio in sala; «Simula mossa» solo per l'organizzatore; rientro dopo un refresh.
- A 375 px, tema scuro e chiaro: niente scorrimento orizzontale, carte e pulsanti toccabili.

Test: `pnpm --filter @gdt/scopa test` (logica, prese, punti, bot, offline, online) e `pnpm --filter @gdt/server test` (`scopa.test.ts`). E2E: `apps/web/e2e/scopa-bot.spec.ts`, `scopa-online.spec.ts` e `scopa-veloce.spec.ts`.

## Struttura

```
src/
  regole.ts        tutte le costanti del regolamento (primiera, soglie, scopa all'ultima, presa singola)
  prese.ts         combinazioni di presa (funzione pura)
  punti.ts         punteggio del round: carte, denari, settebello, primiera, scope
  logica.ts        round: distribuzione, giocata, scopa, ultima presa, fine round
  bot.ts           bot a tre livelli (puro, deterministico)
  offline.ts       contro i bot sul telefono
  online/gioco.ts  GiocoOnline: stato, azioni, permessi, vista per posto
  locales/         testi it/en (stesse chiavi)
  ui/              Scopa (scelta modalità), ScopaLocale, ScopaOnline, Tavolo, composizione (due tocchi), Riepilogo, scopa.css
```

Le carte e la mescolata vengono da `@gdt/carte`: la logica importa `@gdt/carte/logica` (senza CSS né React, adatto al server), la UI l'indice.

## Partita veloce

In «Gioca online» il pulsante **Partita veloce** sta in cima, prima di «Ho un codice»: si scrive il nome e si entra nella prima stanza aperta di Scopa, oppure se ne apre una scegliendo punti per vincere (11 o 21), **2 o 4 giocatori**, come formare le coppie (ordine di arrivo, a caso, scelte in sala) e il tempo d'attesa (1, 2, 3 o 5 minuti). Chi si aggancia vede le impostazioni e può solo entrare.

- Dichiarazione: `veloce` in fondo a `scopaOnline` (`src/online/gioco.ts`): `posti: [2, 4]`, `squadre: (n) => (n === 4 ? [[1, 3], [2, 4]] : null)`, `configVeloce(grezza, n)` che completa `posti` e controlla `soglia` con `leggiConfig`. Niente avvio anticipato: una stanza da 4 parte solo piena. `nuovoStato` e `applica` non sono cambiati.
- Le coppie le decide il server prima dell'avvio (posti 1+3 contro 2+4, nell'ordine d'arrivo se si sceglie «in ordine di arrivo»); i posti sono già presi quando parte la partita, quindi non passa dalla sala «Coppie» delle stanze con codice.
- UI: `src/ui/ImpostazioniVeloce.tsx` (soglia), riepilogo `riepilogoConfig` in `ScopaOnline.tsx`, sala e anteprima condivise da `@gdt/collegamento`.
- Provarla: due o quattro schede su `/scopa` → «Ognuno col suo telefono» → «Partita veloce». Test: `apps/server/src/veloce.test.ts` e `apps/web/e2e/scopa-veloce.spec.ts` (progetto `coda-*`, le stanze aperte sono globali).

## Varianti possibili

Ognuna come opzione spenta in `config` (e una costante in `src/regole.ts`), con test e una voce qui: scopa d'assi, fante che vale scopa, re bello (il re di denari vale un punto), napola (asso, 2, 3 di denari), asso piglia tutto, e lo scopone scientifico (gioco quasi a parte). Il 3 giocatori è rinviato: `POSTI_AMMESSI` in `regole.ts` e la distribuzione in `logica.ts`. Per aggiungerne una: costante in `regole.ts`, campo in `ConfigOnline` letto da `leggiConfig`, uso in `logica.ts` o `punti.ts`, testi in `locales`, test.

## Lingue

Italiano e inglese. Per cambiare un testo modifica la chiave in `src/locales/it.ts` e in `en.ts`; il compilatore segnala se manca in una lingua. I nomi delle carte («Sette di denari») vengono da `@gdt/carte`.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md). Il modo contro i bot funziona anche senza server; l'online usa il server di gioco (`apps/server`, le stanze stanno in memoria).
