# Piano di progetto — «Scopa» (gioco di carte italiano)

Stato: **progettazione (fase 1)**. Nessuna riga di codice scritta. Modello: [piano-ultima.md](piano-ultima.md) e `games/ultima`. Origine: richiesta dell'utente; le domande aperte sono nella sezione 8.

Obiettivo: il gioco della Scopa con le regole classiche italiane, a 2 giocatori e a 4 (a coppie), in tre modi: **online** (ognuno col suo telefono, stanza con codice), **contro i bot su un telefono** (anche offline, come Ultima!), **partita veloce** a stanze aperte (da fare dopo l'accordo sul contratto comune).

---

## 1. Regole della Scopa classica italiana

Il regolamento di riferimento va fissato con l'utente (domanda D1). Qui si descrive la versione proposta; le cifre sono quelle usate di solito, ma **vanno verificate con una fonte scritta prima di scrivere il README** (il web non era disponibile durante la progettazione).

### 1.1 Mazzo e carte

- 40 carte, 4 semi: **denari, coppe, spade, bastoni**; per ogni seme valori 1 (asso), 2–7, 8 (fante), 9 (cavallo), 10 (re).
- Il valore dell'asso è 1. Figure: 8 fante, 9 cavallo, 10 re (nomi dei valori in `locales`, vedi §3.4).
- Nel modello: `valore: 1..10`, `seme`, `id: 0..39` in ordine fisso (come `mazzoCompleto` di Ultima!).

### 1.2 Distribuzione e mani

- **2 giocatori**: 4 carte scoperte sul tavolo; poi 3 carte a testa per volta, per 6 distribuzioni (36 carte). Il mazzo finisce in 6 «mani» di 6 giocate a testa, cioè 6 round di 3 carte.
- **4 giocatori (a coppie)**: 4 carte scoperte; poi 3 carte a testa per volta, per 3 distribuzioni (9 carte a testa). Compagni = posti di fronte (1 e 3 contro 2 e 4, con il turno che alterna i posti).
- Il primo di mano è il giocatore alla destra del mazzettatore (nel gioco online: il posto 1, poi ruota a ogni mano; come `primo` di Ultima!).
- **Ordine del turno**: in senso orario, cioè il posto successivo.

### 1.3 Presa

Chi è di turno gioca una carta dalla mano:

1. **Presa singola obbligatoria**: se sul tavolo c'è una carta di **pari valore**, la presa va fatta con quella (e solo con quella). Due carte di pari valore sul tavolo possono esserci solo dalla distribuzione iniziale (dopo, chi cala quel valore è obbligato a prenderla): in quel caso si sceglie quale delle due prendere, con la stessa UI della scelta della presa.
2. **Presa per somma**: altrimenti, se esistono una o più combinazioni di carte sul tavolo la cui somma di valori è uguale al valore della carta giocata (es. 7 preso con 3+4, 2+5, 1+2+4), si **deve** prendere una di quelle combinazioni, a scelta di chi gioca.
3. **Nessuna presa possibile**: la carta resta sul tavolo.

Chi prende mette la carta giocata e le carte prese nel proprio mazzetto delle prese (coperto).

Nota: la regola 1 prevale anche quando sarebbe possibile una presa per somma (es. con un 7 sul tavolo e anche 3+4, il 7 giocato prende solo il 7). Da confermare (D2).

**Distribuzione iniziale con tre o quattro re** (o figure) sul tavolo: in molte regole si ridistribuisce. Proposta: nessuna ridistribuzione in v1, da confermare (D9).

### 1.4 Scopa

- Si fa **scopa** quando una presa **svuota il tavolo**: vale **1 punto** per ogni scopa.
- La scopa **non vale** se è l'ultima giocata dell'ultima mano (la carta finale chiude il round senza contare la scopa).
- Varianti sulla scopa (asso, fante, ecc.): §4.

### 1.5 Fine mano e fine round

- Quando le mani sono finite, chi ha fatto **l'ultima presa** prende le carte rimaste sul tavolo (senza scopa).
- Ogni mano successiva inizia con nuove distribuzioni finché il mazzo è finito.
- Un round finisce quando tutte le carte sono prese: si calcolano i punti (§1.6).

### 1.6 Punti del round

Per ogni squadra (a 2 giocatori: il singolo; a 4: la coppia):

| Punto | Vale | In caso di pari |
|---|---|---|
| **Carte** | 1 a chi ha prese **più carte** (su 40) | nessuno |
| **Denari** | 1 a chi ha più carte di denari | nessuno |
| **Settebello** | 1 a chi ha il 7 di denari | (non c'è pari) |
| **Primiera** | 1 a chi ha la primiera più alta | nessuno |
| **Scope** | 1 per ogni scopa fatta | — |

**Primiera** (da confrontare con il regolamento scelto, D4): si sceglie per ogni seme la carta di valore primiero più alto presa dalla squadra (se manca un seme, quel seme vale 0); la somma dei quattro valori decide.

| Valore | 7 | 6 | 1 (asso) | 5 | 4 | 3 | 2 | 8, 9, 10 |
|---|---|---|---|---|---|---|---|---|
| Punti primiera | 21 | 18 | 16 | 15 | 14 | 13 | 12 | 10 |

Ogni round dà **4 punti + scope** in tutto (al massimo), se nessun pari. Invariante utile nei test: la somma dei punti assegnati nel round ≤ 4 + scope.

### 1.7 Partita

- La partita va a **11 punti** (di base) oppure **21** (scelta alla creazione, D5). Chi arriva alla soglia (o la supera) per primo vince; a pari punti dopo un round, si gioca un altro round (proposta, D6).
- A punti pari, nessuno prende la vittoria finché non c'è una squadra davanti. Regola da confermare.

### 1.8 Numero di giocatori

- **2 giocatori**: regole sopra.
- **4 giocatori a coppie**: regole sopra, con i compagni di fronte.
- **3 giocatori**: non in prima versione (regole diverse e più varianti: D7). Nel modello (`posti: 2 | 3 | 4`) il 3 si aggiunge dopo.

### 1.9 Varianti diffuse (da proporre come opzioni)

Ognuna diventa un'opzione della stanza, spenta di base. Le definizioni variano da regione a regione: la forma va fissata prima di implementarle.

| Variante | Cosa fa | Complessità | Quando |
|---|---|---|---|
| **Scopa d'assi** | Ogni asso preso vale 1 punto extra (o un'altra regola da scegliere) | bassa | blocco 6 (opzioni) |
| **Asso piglia tutto** | L'asso preso porta via tutto il tavolo (conta come scopa per regola locale) | bassa | blocco 6 |
| **Fante / figure che valgono scopa** | Il fante (o il cavallo) preso dà scopa | bassa | blocco 6 |
| **Napola** | Tre denari consecutivi presi (asso, 2, 3 di denari, in sequenza) danno 3 punti | media | blocco 6 |
| **Re bello** | Il re di denari vale 1 punto a parte | bassa | blocco 6 |
| **Scopone scientifico** | 4 giocatori in coppie, 10 carte a testa (o regole di distribuzione diverse), senza carte scoperte, con regole di punteggio proprie (napola, re bello, scope) | alta: è un gioco a parte | blocco 7, dopo verifica delle regole |
| **Scopa a 11 o 21** | Soglia della partita | nessuna | già in v1 (§1.7) |

**Cosa conviene fare subito**: il punteggio classico (2 e 4 giocatori) e l'opzione soglia 11/21. Le varianti semplici (asso, fante, re bello, napola) si aggiungono come opzioni spente dopo la v1, quando le regole base sono verificate al tavolo. Lo **scopone scientifico** è un gioco diverso: va in una fase a sé, con regole verificate prima.

---

## 2. Modalità e scelte di prodotto

### 2.1 Modalità

| Modalità | Cosa serve | Note |
|---|---|---|
| **A. Online, ognuno col suo telefono** | Server (stanza con codice, come Ultima!) | Mano segreta: la vista è per posto. 2 o 4 posti scelti alla creazione; nomi come in Ultima! oggi (tutti alla creazione), cioè **già possibile senza modifiche al contratto** |
| **B. Contro i bot, un telefono, offline** | Solo il telefono | Come Ultima!: il telefono fa da server per sé, `src/offline.ts`. Da 1 a 3 bot (2 o 4 posti in tutto) |
| **C. Partita veloce a stanze aperte** | Server + contratto comune nuovo | Da fare quando il contratto comune è definito (§7, blocco 5). 4 a coppie di default; posti 2 come opzione |

### 2.2 Due giocatori sullo stesso telefono?

**Consiglio: no, non in prima versione.** Motivi:
- La mano è segreta e in Scopa lo è anche la presa: a un telefono i due giocatori si vedrebbero le carte, a meno di passare il telefono con uno schermo di copertura (come Impostore e Duello Lampo). È fattibile, ma è una modalità in più da testare su tutte le schermate.
- Chi ha due giocatori può già giocare **online** con due telefoni (la modalità più naturale: uno per ciascuno) oppure **contro un bot** sul proprio telefono.
- Il costo è basso se la UI del tavolo è un componente comune: si aggiunge un «passa il telefono» tra un turno e l'altro. Quindi è una scelta da fare dopo, senza rifare la logica.

### 2.3 Chi decide cosa, online (decisione proposta)

- Il **primo** che entra e l'organizzatore hanno i pulsanti di sala; il gioco chiede **2 o 4** alla creazione. A 4 l'organizzatore vede «Coppie»: per default in ordine di arrivo (posti 1 e 3, 2 e 4), oppure scelte in sala, con «Scambia» (§3.6).
- Il **nome** arriva dal telefono come in Ultima! (il giocatore tocca il proprio posto).
- L'avvio è dell'organizzatore (come oggi), con tutti i posti occupati.
- «Simula mossa col bot» per chi non risponde: stesso meccanismo di Ultima! (solo l'organizzatore, una mossa sola, evento visibile).

### 2.4 Impostazioni della partita (alla creazione)

- Posti: 2 o 4 (a 4: coppie).
- Soglia: 11 o 21 (D5).
- Varianti: spente, dal blocco 6 in poi.

---

## 3. Progetto della logica

### 3.1 Cartelle (seguendo `games/ultima`)

```
games/scopa/
├── package.json        name @gdt/scopa, exports ".", "./online"; dipende da @gdt/engine, @gdt/i18n, @gdt/collegamento
├── tsconfig.json       extends ../../tsconfig.base.json, include src
├── README.md           provare, controllare, struttura, Deploy, varianti, come cambiare i testi
└── src/
    ├── logica.ts       tipi Carta/Seme, mazzo, distribuzione, giocabilità, prese, scopa, mano/round
    ├── prese.ts        combinazioni di presa (funzione pura, con test dedicati)
    ├── punti.ts        punteggio di un round: carte, denari, settebello, primiera, scope
    ├── bot.ts          mossaBot per livello, eseguiMossa (puri, deterministici)
    ├── offline.ts      partita contro i bot sul telefono (come ultima/src/offline.ts)
    ├── online/
    │   ├── gioco.ts    GiocoOnline: nuovoStato, applica, traduci, vistaPer, mancanti, momento
    │   └── index.ts    export `scopaOnline`
    ├── manifest.ts, errori-ui.ts, index.ts, css.d.ts
    ├── locales/{it,en,index}.ts     tutti i testi, seme, valori, regolamento
    └── ui/
        ├── Scopa.tsx           scelta della modalità («Come giocate?»)
        ├── ScopaLocale.tsx     contro i bot sul telefono
        ├── ScopaOnline.tsx     online (usa @gdt/collegamento)
        ├── Tavolo.tsx          il tavolo, comune alle due modalità
        ├── Carta.tsx           carta a seme (SVG), dorso, carte scoperte
        ├── Presa.tsx           scelta della presa con più combinazioni
        ├── Prese.tsx           mazzetto delle prese e scope
        ├── Riepilogo.tsx       punti di fine mano
        ├── scopa.css           solo token del tema
        └── assets/semi/*.svg   i quattro semi (vedi §3.7)
```

Nessun `data/`: le carte sono 40 fisse e le regole stanno nel codice (come Ultima!). I testi stanno in `locales`. Nota: il `Carta.tsx` di Ultima! **non** si importa (gioco su gioco): si copia il pattern, poi si decide il pacchetto comune (§5).

### 3.2 Tipi

```ts
export type Seme = "denari" | "coppe" | "spade" | "bastoni";
export interface Carta { id: number; seme: Seme; valore: number } // 1..10
export type Squadra = 0 | 1; // a 2 giocatori: posto 1 → 0, posto 2 → 1

export interface Partita {
  mazzo: Carta[];           // la cima è l'ultimo elemento (come Ultima!)
  tavolo: Carta[];          // carte scoperte, in ordine di arrivo
  mani: Carta[][];          // mani[posto-1]: segreto, solo il server
  prese: Carta[][];         // prese[posto-1]: mazzetto, coperto in corso
  scope: number[];          // scope[posto-1]: numero di scope nel round
  uscite: Carta[];          // tutte le carte mai scoperte sul tavolo: pubblico, serve al bot
  turno: number;            // posto di turno (1..n)
  mano: number;             // 1..distribuzioni (per i conteggi)
  primo: number;            // chi ha aperto la mano, ruota a ogni mano
  ultimaPresa: number | null;
  fine: { punti: Record<Squadra, number> } | null;  // a fine round
  eventi: Evento[];         // pubblici, come Ultima!
}
```

- Stato di gioco e punteggio di partita (`StatoOnline`): `nomi`, `config {posti, soglia}`, `squadre` (per posto), `punti` per squadra, `round`, `seme`, `mosse`, come `StatoOnline` di Ultima!.
- `Evento`: `gioca { posto, carta, prese: Carta[] }`, `scopa { posto }`, `pesca` non c'è, `fineMano`, `fineRound`, `bot`, `nuovoRound`. **Le carte prese non vanno in chiaro durante la mano**: l'evento `gioca` dice solo «ha preso 2 carte» (decisione D8 proposta). Il dettaglio va nel riepilogo di fine round.

### 3.3 Azioni

| Azione | Chi | Effetto |
|---|---|---|
| `gioca(carta, presa?)` | chi è di turno | cala la carta; `presa` è l'elenco di id da prendere quando le combinazioni sono più di una |
| `avvia` | organizzatore, in sala | tutti i posti occupati |
| `squadre(assegnazione)` | organizzatore, in sala, solo a 4 | cambia le coppie (es. scambia due posti) |
| `prossimoRound`, `ricomincia` | organizzatore | come Ultima! |
| `mossaBot(posto)` | organizzatore | «Simula mossa col bot» |

Regola della presa: se `combinazioniPresa(tavolo, carta)` ha **una** sola combinazione (anche vuota), il server la applica da solo. Con **più** combinazioni, `gioca` senza `presa` lancia `sceltaPresaMancante` e la UI apre la scelta (§4.3). Questo è il punto che la UI usa per «scelta della presa».

### 3.4 Funzioni pure principali

- `mazzoCompleto(): Carta[]` (40 carte, id 0..39).
- `distribuisci(rng, n) → Partita` (4 scoperte sul tavolo; ridistribuzione con tre re solo se l'utente la vuole, D9).
- `combinazioniPresa(tavolo, carta): Carta[][]`: se ci sono carte di pari valore, ritorna solo quelle, una per combinazione (`[[pari1]]` o `[[pari1], [pari2]]`); altrimenti tutte le combinazioni di carte del tavolo con somma = valore (DFS con potatura sulla somma, ordine stabile per id). Vuoto = nessuna presa, la carta va sul tavolo. Il caso limite `tavolo` grande (in pratica sempre < 15 carte) è testato.
- `gioca(p, n, chi, id, presa, opzioni)`: applica la presa, conta la scopa, passa il turno, chiude la mano e distribuisce la successiva; restituisce `Partita` nuova (come `gioca` di Ultima!).
- `scopaValida(tavolo_prima, tavolo_dopo, ultimaMossaDelRound)`: scopa se il tavolo è vuoto dopo la presa e non è l'ultima giocata del round.
- `puntiRound(prese, scope, squadre)` in `punti.ts`: carte, denari, settebello, primiera (`valorePrimiera`, `sommaPrimiera`), scope; ritorna `{ squadra: { carte, denari, settebello, primiera, scope, totale } }` (per il riepilogo) con pari = 0 per tutti.
- `primieraSquadra(carte)`: somma dei migliori valori per seme.

Errori: codici come in Ultima! (`ErroreScopa`): `nonTocca`, `nonGiocabile`… (in Scopa ogni carta in mano è giocabile: il controllo è solo su quella in mano), `presaNonValida`, `sceltaPresaMancante`, `roundFinito`, `nonInCorso`.

### 3.5 Bot (`bot.ts`)

Tre livelli, come Ultima! e Tris (`facile`, `medio`, `difficile`), con `PERCENTUALE_MEDIO = 0.55` e `mossaBotLivello`.

- **Priorità comune (medio)**: 1) scopa se possibile; 2) presa che porta più punti (denari, settebello, primiera, carte); 3) presa con più carte; 4) altrimenti scarta la carta che lascia **meno** punti all'avversario: non lasciare sul tavolo una somma che l'avversario può prendere con una scopa, non lasciare il 7 di denari a portata, non scartare un asso o un denaro se si può evitare; 5) a parità, la carta più bassa.
- **Difficile (memoria)**: usa `uscite` (pubblico) e la propria mano: sa quali carte **mancano** agli avversari (le carte non uscite né in mano sua, cioè nel mazzo o nelle mani altrui). Usa questo per: stimare la primiera e il settebello dell'avversario, evitare di lasciare carte che l'avversario può completare, e in coppia non rubare la presa al compagno quando è già in vantaggio (quando possibile). Il calcolo è deterministico (nessun campionamento).
- **Facile**: sceglie a caso tra le giocate lecite e tra le prese possibili (con rng, come Ultima!).
- Il bot **non guarda mani altrui e non bluffa** (non c'è bluff nella Scopa, ma il bot tiene le carte coperte).
- Test di sanità: con seme fisso, il difficile batte il medio e il medio il facile su molte partite (soglia larga, non rigida).

### 3.6 Vista e segreti

- `vistaPer(posto)`: la propria mano; degli altri solo quante carte hanno; mazzo solo come numero; tavolo, `uscite`, scope per posto, squadre, punti: **pubblici**. `prese`: solo il **numero** in corso per tutti (incluso il proprio, che si può contare nel mazzetto); l'elenco arriva nel riepilogo di fine round (D8).
- Organizzatore: più `mancanti` (chi deve giocare) e, in sala, il pulsante «Scambia coppie».

### 3.7 Testi e carte

- `locales/it.ts` e `en.ts`: nomi dei semi (`seme_denari`: «denari» / «coins»; `seme_coppe`: «coppe» / «cups»; `seme_spade`: «spade» / «swords»; `seme_bastoni`: «bastoni» / «clubs»), valori (`valore_1`: «asso» / «ace», `valore_8`: «fante» / «jack», `valore_9`: «cavallo» / «knight», `valore_10`: «re» / «king»). Sono i nomi usati nei lettori di schermo e nel testo degli eventi.
- Nel codice, mai una frase: solo codici (come Ultima!).

---

## 4. Interfaccia (375 px, tema scuro e chiaro)

### 4.1 Schema del tavolo (2 giocatori, 375 px)

Larghezza utile 343 px (gutter 16 px), carta 58 × 90 px (rapporto italiano ~1 : 1,6).

```
+-------------------------------------+
| Tocca a te · Mano 2 di 6            |  stato (come Ultima!)
| Noi 4 · Loro 7  (a 11)              |  punti squadre
+-------------------------------------+
| Bot Lucia  carte ▮▮▮  prese 9 · scope 1 |  avversario (riga)
+-------------------------------------+
| Tavolo                              |
|  [7 denari] [3 coppe] [asso spade]  |  carte scoperte, griglia 5 per riga
|  [re bastoni] [2 denari]            |
|                                     |
|  [mazzo ▮ 14]     [mie prese ▮ 6]  |  mazzo: solo contatore (non si pesca)
+-------------------------------------+
| La tua mano                         |
|  [ 6 coppe ] [ 9 spade ] [ 4 denari ] |  3 carte, toccando si gioca
|   scope: 0   ·  Tocca una carta      |
+-------------------------------------+
| Hai preso una combinazione? (scelta: vedi 4.3) |
+-------------------------------------+
| [ Riepilogo ]  [ Esci ]             |  secondari
+-------------------------------------+
```

Mano di 3: tre carte grandi (58 × 90 px) in fila, senza scroll orizzontale. A 4 giocatori: due righe di avversari/compagno sopra il tavolo (compagno in alto, nome e «compagno»), una riga per ogni avversario; la mano resta in basso.

### 4.2 Regole di UI

- **Carte giocabili** (tutte in Scopa) restano piene; le carte fuori turno sono attenuate (come Ultima!). Toccando una carta a turno: se la presa è unica (o non c'è), si gioca subito con un'animazione breve; se ci sono più prese, si apre la scelta (4.3).
- **Carte sul tavolo** toccabili solo nella scelta della presa (sono evidenziate dal bordo `--ac`).
- **Mazzetto delle prese**: una pila coperta con il numero di carte; le scope con un contatore e l'icona. Il contatore delle carte è pubblico per ognuno.
- **Scope** dell'avversario: evento in elenco («Lucia ha fatto scopa»), con icona e testo (non colore).
- **Il colore del seme non è l'unico segnale**: ogni seme ha forma (denari = disco, coppe = calice, spade = lama, bastoni = bastone) e il nome scritto sotto la carta in piccolo (come `ul-nome`).
- **Dorso** del mazzo: pulsante non attivo (la pesca non esiste); il mazzo è solo un contatore.
- Tema scuro e chiaro, token CSS. Dorso e carta usano token nuovi (§5.2).

### 4.3 Scelta della presa con più combinazioni

Quando `combinazioniPresa` ha più di una combinazione (es. un 7 con 3+4 e 2+5 e 1+2+4):

- Sotto la mano compare un **pannello** (non una modale a tutto schermo) con titolo «Con il 7 prendi:» e un elenco di **pulsanti grandi** (≥ 48 px, a griglia `auto-fit`), uno per combinazione, con le carte in piccolo: «3 + 4», «2 + 5», «1 + 2 + 4». Ogni combinazione è un pulsante con il testo completo (per lettori di schermo: «Prendi 3, 4»).
- Le carte prese in combinazione si **evidenziano** sul tavolo quando si passa sopra o si tocca il pulsante (preview).
- Alternativa scartata: toccare le carte sul tavolo e sommarle. Più libera, ma difficile da usare a 375 px e con errori di somma; resta un'opzione per il futuro.
- Una sola combinazione: presa automatica, con un evento «Lucia ha preso 3 e 4» e nessun pannello.
- Nessuna combinazione: la carta resta sul tavolo.
- Bottone «Annulla» per tornare alla mano (la carta resta in mano). Nel telefono, se si preme indietro del sistema, lo stesso.

### 4.4 Riepilogo punti a fine mano e a fine round

- **Fine mano** (ogni distribuzione): un riquadro in alto con il **numero di carte** e le scope; la presa finale è spiegata («Ultima presa: Anna, prende il tavolo»).
- **Fine round**: tabella a due colonne (squadre). Righe: carte (n), denari (n), settebello (sì/no), primiera (somma), scope (n), **totale**. Il pari su carte/denari/primiera è scritto («pari: nessuno»), non solo grigio. Sotto: «Punti: Noi 4 · Loro 7 (a 11)», con il pulsante primario «Prossimo round» (solo organizzatore, come Ultima!).
- A **fine partita**: classifica e «Ricomincia» (solo organizzatore).
- Elenco prese (le carte di ognuno, scoperte) mostrato **solo** nel riepilogo, come pannello apribile («Vedi le prese»).

### 4.5 Icona e logo

- Icona nel set lucide-like (24 px, tratto 2 px, come `carte-con-uno` di Ultima!). Proposta: **un ventaglio di tre carte** con un numero o con il simbolo del bastone, distinguibile da Ultima! (che ha il «1»): **«carte a ventaglio con la scopa»** (un ramo di scopa). Da fissare con l'utente (D10).

---

## 5. Parti comuni e riuso

### 5.1 Cosa si riusa da `games/ultima` (copia o import)

| Parte | Stato | Azione |
|---|---|---|
| `logica.ts` (mazzo, mescolata, `ErroreUltima`, `avanza`) | specifico | non riusabile, la Scopa ha un mazzo e regole diverse. Si copia il pattern (classe errore, `clona`, `registra`) |
| `bot.ts` (livelli, `PERCENTUALE_MEDIO`, `eseguiMossa`) | specifico nella priorità | il **pattern** (livelli, rng, `mossaBotLivello`) si copia; i numeri si ricalibrano |
| `online/gioco.ts` (`applica`, `traduci`, `vistaPer`, `StatoOnline`) | specifico | pattern da copiare |
| `offline.ts` (`nuovaPartitaLocale`, `agisci`, `muoviBot`, `pausaBot`, `vistaLocale`) | quasi identico | candidato a un modulo comune (§5.3), ma si copia per primo |
| `ui/Tavolo.tsx` (stato, mano, eventi, pulsanti) | molto legato alle carte Ultima! | pattern da copiare; la Scopa ha un tavolo a griglia e la scelta della presa |
| `ui/Carta.tsx`, `ultima.css` | legati ai colori Ultima! | non riusabili; la carta Scopa è a seme SVG |
| `packages/collegamento` (hook WebSocket) | **già comune** | riuso diretto |
| `packages/engine` (`creaRng`, `GiocoOnline`, `limitaTesto`) | **già comune** | riuso diretto |
| `packages/i18n` | comune | riuso diretto |
| `packages/suoni` | comune | riuso diretto (click e suono di presa, opzionale) |

### 5.2 File condivisi da toccare

| File | Modifica | Quando |
|---|---|---|
| `apps/web/src/tema.css` | **nuovi token**: `--carta-fondo`, `--carta-bordo`, `--carta-fg`, `--carta-dorso` (scuro e chiaro, contrasto verificato); il testo sul dorso `--on-ac`. Oggi non esistono token per la carta di carta: la Scopa non deve scrivere colori a mano | blocco 2 |
| `apps/web/src/App.tsx` | import `ScopaApp`, `manifest as scopa`, voce `{ ...scopa, Componente: ScopaApp }` nell'elenco, voce in `ICONE_GIOCHI` | blocco 2 |
| `apps/web/src/Icona.tsx` | icona `ventaglio` (o nome scelto) con `createLucideIcon` | blocco 2 |
| `apps/web/package.json` | dipendenza `"@gdt/scopa": "workspace:*"` | blocco 2 |
| `apps/web/vite.config.ts` | se le SVG dei semi non sono nel bundle precache, aggiungere `svg` a `globPatterns` (offline) | blocco 2 |
| `apps/server/package.json` | dipendenza `"@gdt/scopa": "workspace:*"` | blocco 3 |
| `apps/server/src/giochi.ts` | `[scopaOnline.id]: scopaOnline` | blocco 3 |
| `pnpm-lock.yaml` | rigenerato da `pnpm install` (lo fa il primo agente che installa, non questo piano) | blocco 2 |
| `apps/web/e2e/scopa-*.spec.ts` | nuovi test e2e (non modifica di file esistenti) | blocchi 2–4 |
| `apps/server/src/scopa.test.ts` | nuovo test del server | blocco 3 |
| `CHANGELOG.md`, `docs/decisioni.md`, `docs/test.md` (cosa copre la suite), `README.md` alla radice (elenco giochi, se c'è) | voci; `decisioni.md` nella sezione giochi e nei FATTO | ogni rilascio |
| `apps/web/package.json` `version` | **0.26.0** (nuovo gioco = MINOR) al primo rilascio visibile | blocco 2 |
| `games/scopa/README.md` | regole, provare, controllare, struttura, Deploy, varianti, come cambiare i testi | blocco 2 e poi |

Non cambiano: `packages/engine/src/online.ts` (il contratto resta com'è per il blocco 3), `Dockerfile`, `docker-compose.yml`.

### 5.3 Proposta: `packages/carte` (condiviso con il Burraco)

Il Burraco usa il mazzo francese (52 + 2 jolly), la Scopa quello italiano (40). Un pacchetto comune serve a:
- `mescola`, mazzi di base (`mazzoItaliano40`, `mazzoFrancese52`), `Carta` generica (`id`, `seme`, `valore`), `dorso`;
- `CartaView` (il componente grafico della carta con token, dorso, nome accessibile), usato da Scopa, Burraco e poi Ultima!;
- `combinazioni` generiche (somma con potatura) riusabili anche da altri giochi.

**Consiglio**: **non crearlo nel blocco 1**. Scopa parte con la propria `logica.ts` e `Carta.tsx`. Quando anche il Burraco avrà le sue carte (il suo piano ne dirà la forma), si estrae **un pacchetto solo** dalle due copie, con una riga di commit dedicata e test di regressione. Creare il pacchetto prima, senza un secondo consumatore, produce un'astrazione sbagliata. Coordinatore: decidere se il Burraco parte prima o se Scopa fa da prima copia.

### 5.4 Proposta: modulo offline comune

`offline.ts` di Ultima! e di Scopa sono quasi uguali. Non si estrae ora: alla terza copia (Burraco o Briscola) si decide un modulo comune (es. `packages/carte-bot` o `packages/offline-bot`). Ora si copia e si annota la somiglianza nel README della Scopa.

---

## 6. Passi di implementazione

Ogni blocco è rilasciabile e ha test verdi. Il numero di versione lo decide il coordinatore; qui è proposto.

### Blocco 1 — Logica pura (nessuna UI, nessuna versione)
- `logica.ts`, `prese.ts`, `punti.ts` con i test (§7).
- Nessuna voce in `apps/web`; il pacchetto esiste ma non è registrato. Versione: no (voce in «Non rilasciato»).

### Blocco 2 — Contro i bot su un telefono (offline) — **rilascio 0.26.0**
- `bot.ts` (tre livelli, con memoria dal blocco 2 o dal 3: qui il difficile usa le carte `uscite`), `offline.ts`, `manifest.ts`, `locales/{it,en}.ts`, `ui/Scopa.tsx`, `ScopaLocale.tsx`, `Tavolo.tsx`, `Carta.tsx`, `Presa.tsx`, `Prese.tsx`, `Riepilogo.tsx`, `scopa.css`, `SVG dei semi`.
- Token nuovi in `tema.css`, icona in `Icona.tsx`, registrazione in `App.tsx`, `package.json` della web.
- Test: `ultima-bot.spec.ts`-come: `scopa-bot.spec.ts` a 375 px scuro e chiaro, con screenshot, e partita intera contro i bot.
- Da fare subito in questo blocco: **la scelta della presa** (4.3) e il riepilogo (4.4), perché sono il cuore della UI.

### Blocco 3 — Online, 2 giocatori (stanza con codice) — **rilascio 0.27.0**
- `online/gioco.ts`: `nuovoStato(nomi, config)` con `config.posti = 2`; azioni come in Ultima!; `vistaPer` (senza carte altrui); `ScopaOnline.tsx`; registrazione in `apps/server/src/giochi.ts`; `apps/server/src/scopa.test.ts`; e2e a due contesti (`scopa-online.spec.ts`).
- Nessuna modifica al contratto comune.

### Blocco 4 — Online, 4 giocatori a coppie — **rilascio 0.28.0**
- `config.posti = 4`, `squadre` assegnate in arrivo (posti 1+3 contro 2+4), azione `squadre` in sala (solo organizzatore, «Scambia»), `puntiRound` per coppia.
- Riepilogo e tabella a coppie. Test e2e a quattro contesti (come `tris-online.spec.ts`).
- Ancora senza modifiche al contratto (i nomi sono ancora tutti alla creazione: a 4 si scrivono tutti insieme).

### Blocco 5 — Partita veloce a stanze aperte (dopo il contratto comune) — **rilascio 0.29.0**
- Dipende dalla decisione sul contratto comune (§7): nomi uno alla volta, avvio dalla sala, `coda: { posti: 4 }` (e 2 come opzione).
- Il modulo di gioco cambia poco: `nuovoStato(config)` senza nomi, `occupa` con nome, `puoAvviare`. Va fatto per ultimo tra i grandi, perché il contratto arriva dall'altro agente.

### Blocco 6 — Varianti (opzioni spente)
- Scopa d'assi, asso piglia tutto, fante, re bello, napola: ognuna come opzione in `config.varianti` (spente di base), con test e voce nel README. Ordine di priorità: da decidere dopo D2 e D4 (le regole vanno verificate).

### Blocco 7 — Scopone scientifico (opzionale, a sé)
- Modalità a 4, distribuzione diversa e punteggi propri: solo dopo verifica delle regole con l'utente. Forse un `config.variante = "scopone"` oppure un gioco a parte.

### Blocco 8 — Due giocatori sullo stesso telefono (opzionale)
- Solo se l'utente lo chiede (D11): «passa il telefono» tra i turni con schermo di copertura. Riusa il tavolo e la logica offline.

### Blocco 9 — Verifica e documentazione
- Prova su telefono vero (WiFi, hotspot), README finale, `decisioni.md` con voce FATTO, `test.md`, CHANGELOG.

---

## 7. Piano di test

### 7.1 Test unitari (`games/scopa/src`, Vitest)

**`logica.test.ts`**
- Mazzo: 40 carte, id 0..39 unici, 4 semi × 10 valori, nessun duplicato.
- Distribuzione: 4 scoperte sul tavolo; 2 giocatori = 6 distribuzioni di 3 a testa; 4 giocatori = 3 distribuzioni di 3 a testa; il mazzo finisce vuoto a fine round.
- Presa singola obbligatoria: con un 5 sul tavolo, un 5 giocato prende solo quello (anche se altre combinazioni esistono).
- Presa per somma: 7 con tavolo {1, 2, 3, 4, 5} dà {3+4, 2+5, 1+2+4}; tutte le combinazioni trovate, nessuna doppia. Due 5 sul tavolo dalla distribuzione: un 5 giocato offre due prese singole.
- Nessuna presa: la carta resta sul tavolo.
- Scopa: tavolo vuoto dopo la presa → +1; non vale nell'ultima giocata del round; non vale se sul tavolo non c'era niente da prendere e la carta è rimasta.
- Scelta della presa: più combinazioni senza `presa` → `sceltaPresaMancante`; con `presa` valida → applicata; `presa` non valida → `presaNonValida`.
- Turno: fuori turno → `nonTocca`; carta non in mano → `cartaNonInMano`.
- Ultima presa: le carte rimaste sul tavolo vanno a chi ha fatto l'ultima presa.
- Invariante: 40 carte sempre contate (mani + mazzo + tavolo + prese) a ogni mossa, in partite complete con molti semi.
- Primo di mano: ruota a ogni mano e a ogni round.

**`prese.test.ts`**
- Combinazioni: per somma con valori noti (tabella di esempi), ordine stabile, nessuna combinazione ripetuta.
- Tavolo grande (12–15 carte, prevalentemente piccole): tempo di calcolo sotto soglia e risultati corretti.

**`punti.test.ts`**
- Tabella dei valori della primiera (7=21, 6=18, asso=16, 5=15, 4=14, 3=13, 2=12, 8/9/10=10).
- Primiera: squadra con tutti i semi; squadra senza un seme (il seme vale 0); pari → nessuno.
- Carte: più carte → 1; pari 20–20 → nessuno (a 40 carte).
- Denari: più denari → 1; pari (5–5) → nessuno.
- Settebello: 7 di denari → 1.
- Scope: somma delle scope.
- Invariante: il totale di punti del round ≤ 4 + scope, e con nessun pari esattamente 4 + scope.

**`bot.test.ts`**
- Ogni mossa del bot è lecita (la logica la accetta) per tutti i livelli, con molti semi.
- Priorità: fa scopa se può; prende la presa di più punti (con denari e settebello); non lascia il 7 di denari a portata quando può evitarlo.
- Memoria (difficile): con carte `uscite` note sceglie la presa che non lascia la somma completabile dall'avversario (caso costruito a mano).
- Facile: sceglie tra le mosse lecite e usa solo `rng` (stesso seme, stessa mossa).
- Partite intere solo bot con molti semi, a 2 e a 4 giocatori: finiscono sempre, nessuna mossa illegale, 40 carte conservate.
- Statistica di sanità (soglia larga): difficile > medio > facile su 200 partite con semi fissi.

**`offline.test.ts`** (come Ultima!)
- Partita creata con 2 o 4 posti; il telefono è sempre il posto 1; nessun bot gioca per me; vista senza mani altrui.
- Partita intera a ogni livello, a 2 e a 4 posti (io con un bot compagno contro due bot).
- Pausa tra mosse dei bot (`pausaBot`) rispettata; `muoviBot` non tocca lo stato se non è il turno di un bot.

**`online/gioco.test.ts`**
- `nuovoStato`: 2 o 4 posti; nomi duplicati rifiutati; configurazione non valida rifiutata (posti 3 rifiutato in v1, soglia 11/21).
- Permessi: solo l'organizzatore avvia, fa `squadre`, `prossimoRound`, `ricomincia`, `mossaBot`; in sala `squadre` solo a 4 posti; in partita `squadre` rifiutata.
- Vista: nessuna carta altrui, solo il numero; `uscite` e tavolo visibili; `prese` solo come numero; scope pubbliche.
- Partita completa con seme fisso (riproducibile); stesso seme → stessa partita.
- Coppie: posti 1+3 e 2+4; `squadre` cambia le coppie senza cambiare il turno.

### 7.2 Server (`apps/server`)
- `scopa.test.ts`: crea stanza a 2 e a 4 posti, nomi uno alla volta (blocco 3: a 2; blocco 4: a 4), rientro con token, sollecito, «Simula mossa col bot» solo per l'organizzatore, chiusura partita.
- Il `coda.test.ts` e `ultima.test.ts` esistenti restano verdi (nessuna modifica attesa).

### 7.3 E2E Playwright (`apps/web/e2e`)
- `scopa-bot.spec.ts`: contro i bot a 375 px, scuro e chiaro (screenshot), scelta della presa con più combinazioni, riepilogo di fine mano; con la rete spenta la partita va avanti.
- `scopa-online.spec.ts`: due contesti (blocco 3), quattro contesti (blocco 4), mano segreta (la carta altrui non è nel DOM), «Simula mossa», rientro dopo refresh.
- `scopa-partita-veloce.spec.ts` (blocco 5): quattro telefoni che si mettono in coda, le coppie, l'avvio dalla sala.
- Screenshot a 375 px in tema scuro e chiaro, checklist `ui-mobile-checklist` (vedi `verification-before-completion`).

### 7.4 Verifica visiva obbligatoria
Prima di chiudere ogni blocco con UI: screenshot a 375 px in scuro e chiaro di: scelta della modalità, tavolo (mano di 3, tavolo con almeno 8 carte), scelta della presa (3 combinazioni), riepilogo di fine mano, riepilogo di fine round, classifica. Passare la checklist di `ui-mobile-checklist`. Typecheck e build non bastano.

---

## 8. Domande per l'utente (con la risposta consigliata)

| # | Domanda | Consiglio |
|---|---|---|
| D1 | **Quale regolamento** di riferimento per la Scopa classica (le cifre di §1 vanno verificate con una fonte scritta)? | Fissare un testo (es. quello di una federazione o di un libro) e citarlo nel README |
| D2 | **Presa singola obbligatoria** se sul tavolo c'è una carta di pari valore, e obbligo di presa per somma? | Sì, come da richiesta |
| D3 | **Numero di giocatori in v1**: 2 e 4 a coppie, 3 dopo? | Sì: 2 e 4 subito, 3 in un blocco successivo |
| D4 | **Primiera**: valori della tabella di §1.6, pari = nessun punto, seme mancante = 0? | Sì |
| D5 | **Soglia della partita**: 11 di base e 21 selezionabile, o viceversa? | 11 di base, 21 selezionabile alla creazione |
| D6 | **Pari a fine partita** (es. 11–11 dopo un round): si gioca un altro round? | Sì, finché una squadra è davanti |
| D7 | **Tre giocatori**: come distribuire (40 carte non si dividono per 3)? | Rimandare: si decide quando si fa il blocco 3-giocatori |
| D8 | **Prese coperte**: in corso si vede solo il numero delle carte prese, e l'elenco solo a fine mano? | Sì (come nel gioco reale) |
| D9 | **Scopa non vale all'ultima giocata del round**, e **niente ridistribuzione** se escono tre o quattro re sul tavolo? | Sì a entrambe in v1 |
| D10 | **Icona e nome**: un ventaglio di carte (nessun testo) o altro? Il nome resta «Scopa» in entrambe le lingue? | Ventaglio di tre carte con un ramo di scopa; «Scopa» / «Scopa» (in inglese il nome è lo stesso, con la descrizione «Italian card game») |
| D11 | **Due giocatori sullo stesso telefono**: serve? | No in v1; sì come blocco 8 se lo chiedi |
| D12 | **Carte grafiche**: disegnate da noi (consiglio), oppure i quattro semi da fonti di pubblico dominio (vedi sotto) con le figure disegnate da noi? | Vedi sotto |
| D13 | **Varianti**: quali nel blocco 6 e in quale ordine? | Scopa d'assi, fante, re bello, napola; l'asso piglia tutto solo dopo verifica |
| D14 | **Partita veloce di Scopa**: 4 a coppie di default, 2 come opzione? | Sì |

### Carte grafiche (D12): indagine

- **Wikimedia Commons, «Seme denari carte napoletane.svg»** (autore Florixc): dichiarato **pubblico dominio** («PD-self»), verificato sulla pagina del file. Esistono anche file analoghi per coppe, spade e bastoni (**da verificare uno per uno** sulla pagina di ciascun file prima di usarli). Sono solo i **quattro semi**, non un mazzo completo: nessun file SVG di un mazzo intero di 40 carte.
- Commons ha SVG di semi tarocco (piemontesi e siciliani) con licenze da controllare per file. Non sono un mazzo completo.
- Le **foto** di carte napoletane su Commons (es. «Naples deck» con 40 file JPG) hanno licenze e autori diversi per file: troppo costose da controllare, e sono immagini raster di figure che non si adattano a un tema vettoriale.
- **Proposta**: disegnare **in proprio** (SVG, un tratto) i quattro semi e le carte, con **le figure stilizzate** (fante, cavallo, re) come silhouette semplici o con il solo nome e il numero. È il modo più pulito per la licenza del repo (pubblico) e per il tema a token. I semi del Commons si possono usare **solo dopo** aver verificato la licenza di ciascun file; in quel caso la citazione va in `games/scopa/CREDITI.md` come per i suoni dei Dadi.
- **Non usare** immagini di mazzi commerciali o di tipografie moderne senza licenza.

---

## 9. Stima delle dimensioni

Ordine di grandezza, a partire da Ultima! (circa 2.000 righe tra logica, bot, online, offline, UI, test).

| Blocco | Righe (codice + test, circa) | Note |
|---|---|---|
| 1. Logica, prese, punti | 700 | la parte più delicata; test densi |
| 2. Bot e offline + UI tavolo, presa, riepilogo, CSS, SVG | 1.500 | la UI della presa è il pezzo più lungo |
| 3. Online a 2 | 600 | come Ultima! online, più piccolo |
| 4. Online a 4 (coppie) | 300 | incremento |
| 5. Partita veloce | 300 + modifiche al contratto | dipende dall'altro agente |
| 6. Varianti | 400 | dopo la verifica delle regole |
| 7. Scopone (opzionale) | 1.000 | gioco quasi a parte |
| 8. Stesso telefono (opzionale) | 300 | |

Totale senza blocchi 7 e 8: **circa 4.000 righe** tra codice, test e testi (it/en). Gli interventi condivisi sono piccoli (una riga per file in `App.tsx`, `giochi.ts`, `package.json`, più i token in `tema.css`).

---

## 10. Contratto comune: cosa serve alla Scopa (per il coordinatore)

Oggi il contratto `GiocoOnline` (`packages/engine/src/online.ts`) e il server funzionano così: `nuovoStato(nomi, config)` riceve tutti i nomi alla creazione; il server occupa i posti; `coda: { giocatori }` abbina gruppi di dimensione fissa e avvia da solo.

**Per la Scopa in versione stanza con codice (blocchi 2–4): nessuna modifica.** Basta `config.posti` (2 o 4) e tutti i nomi alla creazione, come Ultima! oggi. L'azione `squadre` (solo in sala, solo a 4) è un'azione del gioco, passa da `traduci` e `applica`.

**Per la partita veloce (blocco 5) servono, dal contratto comune:**
1. **Creazione con zero nomi**: `nuovoStato(config)` (o `nomi: []`) e i nomi che arrivano uno alla volta con `occupa` (che porta anche il nome) o con un'azione di iscrizione.
2. **Avvio deciso dalla sala**: nessun avvio automatico al raggiungimento dei posti; il gioco dichiara quando è pronto (es. `puoAvviare(stato)`), e `avvia` resta dell'organizzatore.
3. **Posti scelti in creazione o in coda**: `coda: { posti: 4 }` oppure `{ min, max }` (la Scopa vuole 4, opzione 2; Ultima! vuole 2–10).
4. **Coppie**: nessuna regola comune; il gioco decide le squadre dall'ordine di arrivo (`squadre` iniziale) e l'organizzatore le cambia in sala. Il server deve solo rispettare l'ordine di arrivo come ordine dei posti (già così in `coda.ts`).
5. **Uscita dalla sala prima dell'avvio**: il posto si libera (come `libera` già oggi).

Nota per l'agente della partita veloce: la Scopa a 4 usa il modello «ordine di arrivo = posti 1..4, coppie 1+3 e 2+4», quindi la regola di abbinamento della coda deve restare «primi arrivati, primi posti».
