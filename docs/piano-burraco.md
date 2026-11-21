# Piano di lavoro — «Burraco» (fase 1: progettazione)

Stato: **proposta, nessuna implementazione**. Da unire dal coordinatore ai piani di partita veloce a stanze aperte, Scopa, Duello Lampo e varianti di Ultima!. Modello seguito: [piano-ultima.md](piano-ultima.md) e `games/ultima`.

Nota di metodo: durante la progettazione la ricerca sul web non era disponibile. Le regole qui sotto sono quelle del Burraco italiano (regolamento FIBUR e uso comune da tavolo) scritte a memoria. I punti marcati **[verificare]** vanno confrontati con il regolamento ufficiale prima di scrivere la logica (le costanti stanno in un solo file, `regole.ts`, così correggerle costa poco).

## 1. Regole

### Mazzo e giocatori

- **108 carte**: due mazzi francesi da 52 (cuori, quadri, fiori, picche, da A a K) più 4 jolly. Nel codice `id` da 0 a 107, ordine fisso.
- **Matte** (carte jolly di fatto): i 4 **jolly** e i **2** (le «pinelle»). Un 2 del seme giusto al suo posto in una scala (A-2-3) è una carta naturale, non una matta.
- **Giocatori supportati: 2 e 4 a coppie.** Entrambi hanno la stessa struttura: due **squadre** (4 giocatori: 1+3 contro 2+4, compagni seduti di fronte; 2 giocatori: una squadra a testa) e un pozzetto per squadra. Il **3 giocatori** non è supportato: non c'è una regola standard (varianti da tavolo diverse tra loro) e il server a posti fissi lo renderebbe un caso speciale. Si valuta solo se l'utente lo chiede.
- La logica ragiona sempre per **squadra** (`squadra(posto)`), così 2 e 4 giocatori sono lo stesso codice.

### Distribuzione

- 11 carte a testa, due **pozzetti** da 11 carte (uno per squadra, coperti), una carta scoperta dal mazzo come primo scarto. Il resto è il mazzo (4 giocatori: 108 − 44 − 22 − 1 = 41 carte; 2 giocatori: 108 − 22 − 22 − 1 = 63).
- Gioca per primo il giocatore dopo il mazziere; il mazziere ruota a ogni mano.

### Turno

1. **Pescare**: una carta dal mazzo, **oppure** prendere tutta la pila degli scarti (vedi sotto).
2. **Giocare** (facoltativo, anche più volte nello stesso turno): calare combinazioni nuove o attaccare carte a quelle della propria squadra (anche a quelle del compagno).
3. **Scartare** una carta sulla pila. Il turno passa.

### Combinazioni

- **Tris**: da 3 carte dello stesso valore (semi anche uguali, ci sono due mazzi), con al massimo una matta. Non si fanno tris di 2 **[verificare]**.
- **Scala**: da 3 carte consecutive dello stesso seme, con al massimo una matta. L'asso vale 1 (A-2-3) oppure 14 (Q-K-A), ma **non si gira l'angolo** (K-A-2 no). La scala più lunga è A-2-…-K-A (14 carte).
- **Una sola matta per combinazione.** Una matta già calata si può spostare solo con la sostituzione (variante, vedi punto 1.8).
- Le combinazioni calate appartengono alla squadra; si attacca solo alle proprie, mai a quelle avversarie.

### Prima calata (apertura)

Finché la squadra non ha calato niente, la **prima calata** (tutte le combinazioni calate nello stesso turno, anche con la carta presa dalla pila) deve valere almeno un minimo di punti (somma dei valori delle carte, senza bonus):

| Punti della squadra a inizio mano | Minimo |
|---|---|
| negativi | 15 |
| da 0 a 1499 | 50 |
| da 1500 a 2999 | 90 |
| da 3000 | 120 |

**[verificare]** soglie e valore per i punteggi negativi. Il minimo non vale per il compagno una volta che la squadra ha aperto.

### Pila degli scarti

- Chi prende la pila la prende **tutta** e deve **usare subito la carta in cima** in una combinazione (nuova o attaccata) nello stesso turno; poi cala e scarta come al solito. Tutte le altre carte vanno in mano.
- Se la squadra non ha aperto, la combinazione con la carta della pila deve già raggiungere il minimo di apertura.
- **Pila bloccata** (regola FIBUR di base): se nella pila c'è una matta, per prenderla servono **due carte naturali dello stesso valore della cima** in mano, con cui si fa un tris nuovo (non si attacca a combinazioni esistenti) **[verificare]**. Opzione «pila sempre libera» (regola casalinga): nessun blocco.
- Mazzo finito: chi deve pescare **deve** prendere la pila, se può farlo secondo le regole; se non può (o la pila è vuota), la mano finisce senza bonus di chiusura.

### Pozzetto

- Chi resta **senza carte in mano** prende il pozzetto della sua squadra, **una volta sola per squadra**.
  - Se ha finito **calando** (non ha ancora scartato): prende il pozzetto subito e continua il turno, finendo con uno scarto.
  - Se ha finito **scartando l'ultima carta**: prende il pozzetto all'inizio del suo turno successivo, prima di pescare.
- In 4 giocatori il pozzetto è della coppia: lo prende il primo dei due che resta senza carte; il compagno continua con la propria mano.

### Chiusura

- Si chiude restando senza carte **dopo che la squadra ha preso il pozzetto**, e solo se la squadra ha **almeno un burraco** (pulito o sporco). Senza burraco non si può svuotare la mano dopo il pozzetto: la mossa viene rifiutata (`serveBurraco`).
- Si può chiudere con lo scarto dell'ultima carta o calando tutte le carte (in quel caso senza scarto). Non si può chiudere scartando una matta **[verificare]**.
- La mano finisce subito alla chiusura; finisce senza chiusura quando il mazzo è finito e nessuno può prendere la pila.

### Burraco

Una scala (o un tris, vedi variante) di **7 o più carte**.
- **Pulito**: nessuna matta, oppure con il 2 al suo posto naturale in scala.
- **Sporco**: contiene una matta (jolly o 2 fuori posto).
- Per la scala nell'analisi si sceglie sempre l'interpretazione con meno matte, così il burraco risulta pulito quando può esserlo.
- Nella prima versione **solo le scale** fanno burraco; il burraco di tris (7+ carte uguali) è una variante **[verificare]** se la FIBUR lo prevede.

### Punteggio di una mano

Per ciascuna squadra:

| Voce | Punti |
|---|---|
| Carte calate (sul tavolo della squadra) | somma dei valori |
| Burraco pulito | +200 |
| Burraco sporco | +100 |
| Chiusura | +100 alla squadra che chiude |
| Carte rimaste in mano (di tutti i componenti) | meno la somma dei valori |
| Pozzetto mai preso | −100 |

Valori delle carte: **jolly 30**, **2 (pinella) 20**, **asso 15**, **K, Q, J, 10, 9, 8 = 10**, **7, 6, 5, 4, 3 = 5**. Un 2 vale 20 anche al suo posto in scala **[verificare]**.

### Partita a punti

- Si gioca a mani successive fino a un **punteggio obiettivo**: **2005** di base (opzioni 1505 e 3005, più «mano singola»).
- Vince la squadra che a fine mano ha raggiunto o superato l'obiettivo; se lo superano entrambe vince quella con più punti; a pari punti si gioca un'altra mano.

### Varianti proposte come opzioni della stanza

Tutte nel `config`, con i valori di base della regola ufficiale. Nella prima versione solo le prime tre:

1. **Punteggio obiettivo**: mano singola, 1505, **2005**, 3005.
2. **Pila**: bloccata dalle matte (base) oppure sempre libera.
3. **Formazione delle coppie** (solo 4 giocatori): ordine di arrivo, a caso, scelte in sala (vedi punto 2.3).
4. **Sostituzione della matta** (dopo): chi ha la carta naturale prende la matta da una combinazione e la riusa. Il modello dati la prevede (ogni carta ha il valore assegnato), l'azione no.
5. **Burraco di tris** (dopo).
6. **Burraco a 3** (dopo, solo se richiesto).
7. **Chiusura con matta in scarto** consentita (dopo).

## 2. Modalità

| Modalità | Prima versione | Note |
|---|---|---|
| **Contro i bot**, un telefono, anche offline (come Ultima!) | **Sì, è il primo rilascio** | Tu al posto 1. Da 1 bot (2 giocatori) a 3 bot (4 giocatori: il tuo compagno è un bot e gioca sulla tua squadra). Tre livelli e velocità come Ultima!. |
| **Online con codice**, ognuno il suo telefono | **Sì, secondo rilascio** | Funziona già con il contratto di oggi: stanza creata con 2 o 4 nomi, come Ultima!. |
| **Partita veloce** a stanze aperte | **Dopo**, quando il contratto comune sarà deciso | Il modulo online è scritto subito in modo compatibile (punto 2.3). |
| Un telefono passato di mano | **No** | La mano è segreta e lunga: passarsi il telefono ogni turno è scomodo e rivela le carte a chi guarda. |

Motivo dell'ordine: la parte più rischiosa è la logica di calate e chiusura più la UI della mano lunga; il gioco contro i bot permette di provarle da soli (e anche offline) senza dipendere dal contratto della partita veloce, che è in discussione. L'online con codice riusa tutto e si aggiunge con poco.

### 2.1 Online (ognuno il suo telefono)

- 2 o 4 posti fissi. La mano è segreta; degli altri si vede il numero di carte; i pozzetti si vedono solo come «da prendere» o «preso» (mai il contenuto); la pila degli scarti è **pubblica per intero** (nel Burraco si tiene aperta e le carte che conta chi gioca bene).
- «Sollecita» e «Simula mossa col bot» solo per l'organizzatore come in Ultima!. Una «mossa» del bot è **un passo del turno** (pescare, oppure calare, oppure scartare), non l'intero turno: i passi sono azioni separate anche per i telefoni umani.

### 2.2 Contro i bot

Riusa lo schema di `games/ultima/src/offline.ts`: lo stesso modulo online fa da macchina a stati sul telefono (`nuovaPartitaLocale`, `agisci`, `muoviBot`, `pausaBot`, `vistaLocale`). Pausa tra i passi dei bot (lenta/normale/veloce) con un passo alla volta, così si vedono pesca, calata e scarto.

### 2.3 Cosa serve dal contratto comune della partita veloce

Burraco è il caso «posti fissi, squadre, nomi uno alla volta, avvio deciso dalla sala». Richieste al contratto (da portare nel piano della partita veloce):

1. **`coda` con posti fissi e avvio manuale**: per esempio `coda: { posti: number | readonly number[]; avvio: "manuale" }`. Burraco dichiara `posti: [2, 4]` (il numero vero lo sceglie l'organizzatore nel `config`); il server **non** avvia da solo. L'avvio è l'azione `avvia` dell'organizzatore, accettata dal gioco solo se i posti sono pieni.
2. **Nomi che arrivano uno alla volta**: `nuovoStato(nomi, config)` deve poter essere chiamato con `nomi = []` (o con il solo organizzatore) e `config`; i nomi entrano con `{ tipo: "occupa", posto, nome }` (oggi `occupa` non porta il nome). Il server sceglie il posto (primo libero) e passa il nome ripulito/distinto (`nomiDistinti`).
3. **`libera` in sala** libera il posto e il nome (già così); a partita avviata resta il comportamento attuale.
4. **Configurazione modificabile in sala**: lo stato di sala contiene il `config`, e l'organizzatore lo cambia con azioni del gioco (`config`, `scambia`, `assegna`): il server non deve saperne nulla, basta che `traduci` le accetti. Se il numero dei posti dipende dal `config` (2 o 4), il gioco lo comunica nella vista di sala (`posti`), perché anche la UI «Partita veloce» possa mostrare quanti ne mancano.
5. **Scadenza della stanza aperta** non piena: decisa dal piano della partita veloce; per il Burraco 2 minuti sono pochi (4 persone da trovare). Proposta: scadenza più lunga per giochi con `avvio: "manuale"`, o stanza che resta aperta finché l'organizzatore non la chiude.
6. **Squadre**: la formazione (arrivo / a caso / scelte in sala) sta tutta nel gioco (`config.formazione` + azioni host `assegna`). Il server vede solo posti.
7. `momento()` resta `sala | inCorso | fine`; `inGioco()` in sala è vuoto, a partita avviata sono i posti seduti.

Il gioco funziona anche **senza** queste modifiche (stanza con codice e nomi alla creazione), quindi il modulo non è bloccato dal contratto.

## 3. Progetto della logica

Cartella `games/burraco`, struttura copiata da Ultima. Logica pura e deterministica, errori come codici (`ErroreBurraco`), nessuna frase. Il caso (mescolata) arriva da `Rng` di `@gdt/engine`; dopo la distribuzione non c'è più caso (il mazzo ha già l'ordine), quindi il seme serve solo ad `avvia` / `prossimaMano` / `ricomincia` e la partita con lo stesso seme si ripete identica.

### Tipi

```ts
export const SEMI = ["cuori", "quadri", "fiori", "picche"] as const;
export type Seme = (typeof SEMI)[number];

/** Carta francese; il jolly non ha seme né valore. id da 0 a 107. */
export type Carta =
  | { id: number; tipo: "carta"; seme: Seme; valore: number } // 1 = asso ... 13 = K
  | { id: number; tipo: "jolly" };

/** Una carta dentro una combinazione: che valore occupa e se fa da matta. */
export interface Posata { carta: Carta; come: number; matta: boolean } // come: 1..14 (asso alto = 14), per un tris il valore del tris
export interface Combinazione {
  id: number;
  squadra: number;                  // 1 o 2
  tipo: "tris" | "scala";
  seme: Seme | null;                // solo scala
  carte: Posata[];                  // in ordine di posizione
  burraco: "pulito" | "sporco" | null;
}

export interface Partita {
  mazzo: Carta[];                   // cima = ultimo
  scarti: Carta[];                  // cima = ultimo; pubblica
  mani: Carta[][];                  // mani[posto-1]; solo il server
  pozzetti: (Carta[] | null)[];     // per squadra; null = già preso
  combinazioni: Combinazione[];
  aperto: boolean[];                // per squadra: ha già fatto la prima calata
  turno: number;
  fase: "pescare" | "giocare";      // giocare = ha pescato e può calare/scartare
  pozzettoDaPrendere: number | null;// posto che lo prende all'inizio del prossimo turno
  fine: FineMano | null;
  eventi: Evento[];
}
```

### Funzioni (file e responsabilità)

- `carte.ts`: `mazzoCompleto()`, `valorePunti(carta)`, `eMatta(carta)` (jolly o 2), ordinamenti della mano (`ordinaPerSeme`, `ordinaPerValore`).
- `regole.ts`: costanti (11 carte, valori dei punti, minimi di apertura, bonus, obiettivi 1505/2005/3005).
- `combinazioni.ts`: il cuore.
  - `interpreta(carte: Carta[], opzioni): Interpretazione[]`: restituisce **tutti** i modi validi di leggere quell'insieme (tris o scala; per ogni scala la posizione della matta e l'uso dell'asso alto/basso). Vuoto = non valido. Algoritmo: per un tris, tutte le carte naturali dello stesso valore (non 2) più al massimo una matta, almeno 3 carte. Per una scala: scartati i jolly, il seme è quello delle carte naturali (tutte uguali, altrimenti si prova che la carta di un altro seme sia un 2 usato come matta); per ogni posizione iniziale `s` da 1 a 13 e lunghezza `n = carte.length` (con `s + n - 1 ≤ 14`) si assegnano le carte alle posizioni: una posizione è coperta da una carta naturale del seme e valore giusto (l'asso copre 1 e 14, il 2 del seme copre la posizione 2) oppure, al massimo una volta, da una matta. Se tutte le posizioni sono coperte e non avanza niente è un'interpretazione valida. Le carte sono al massimo 14: la ricerca è banale e va provata contro una ricerca esaustiva nei test.
  - `scegli(interpretazioni)`: l'interpretazione con meno matte (burraco pulito se possibile), a parità la prima per posizione; la UI mostra la scelta solo se due interpretazioni con lo stesso numero di matte danno risultati diversi (es. 5-6-matta: la matta può essere il 4 o il 7).
  - `punti(posate)`, `burraco(combinazione)`.
  - `attacca(combinazione, carte)`: interpreta l'unione di carte vecchie e nuove (così se la matta deve spostarsi, si sposta da sola quando l'interpretazione lo permette; non è sostituzione, è la stessa combinazione riletta).
- `logica.ts`: `nuovaMano(n, rng, primo, punti)`, `pesca`, `prendiPila`, `cala`, `scarta` e passaggi di turno, pozzetto, chiusura, `punteggioMano`, `giocabili`/`anteprimaCala` (puro, per la UI), `ErroreBurraco`.
- `bot.ts`, `offline.ts`: vedi sotto.

### Azioni (modulo online `online/gioco.ts`)

`occupa{posto, nome?}`, `libera{posto}`, `config` (host, in sala), `assegna{posto, squadra}` / `scambia` (host, in sala), `avvia{seme}` (host), `pesca{chi}`, `prendiPila{chi, gruppi}`, `cala{chi, gruppi}`, `scarta{chi, carta}`, `bot{posto, livello?}`, `prossimaMano{seme}`, `ricomincia{seme}`.

`gruppi` è una lista di `{ carte: number[]; su?: number; scelta?: number }`: gli id delle carte in mano da usare; `su` = id di una combinazione della propria squadra a cui attaccare (assente = combinazione nuova); `scelta` = indice dell'interpretazione scelta dall'utente quando è ambigua. Tutto controllato campo per campo (arriva dalla rete).

Regole di validazione di `cala` / `prendiPila` (in ordine, ognuna con il suo codice errore):
1. fase e turno (`nonTocca`, `devePescare`);
2. le carte sono in mano e senza duplicati (`cartaNonInMano`);
3. ogni gruppo è una combinazione valida o un'estensione valida (`combinazioneNonValida`);
4. apertura: se la squadra non ha aperto, la somma dei punti dei gruppi di questa azione raggiunge il minimo (`aperturaTroppoBassa`, con il minimo nel codice). La prima calata si fa in **una sola azione `cala`** (o `prendiPila`) con tutti i gruppi: così non esistono combinazioni «provvisorie» da annullare. Dopo l'apertura, nello stesso turno, si può calare e attaccare con altre azioni;
5. `prendiPila`: la cima è usata in un gruppo, le due carte naturali per la pila bloccata ci sono, la pila non è vuota;
6. dopo l'azione la mano non può restare vuota se il pozzetto è già preso e manca un burraco (`serveBurraco`); con pozzetto da prendere, mano vuota è lecita e fa scattare il pozzetto.

`scarta`: fase `giocare`, la carta è in mano; se è l'ultima carta e il pozzetto è già preso serve un burraco e la carta non può essere una matta (`nonChiudereConMatta`). L'obbligo di usare la cima della pila non serve nello stato: `prendiPila` è un'azione sola che prende la pila **e** cala il gruppo con la cima (controllo del punto 5).

Dopo ogni azione `dopoMossa` (come in Ultima!) controlla: mano vuota → pozzetto o chiusura; mazzo finito → fine mano; fine mano → `punteggioMano`.

### Stato della stanza (come `StatoOnline` di Ultima!)

`fase: "sala" | "partita" | "fineMano" | "fine"`, `nomi`, `occupati`, `config` (`obiettivo`, `pila`, `giocatori` 2|4, `formazione`), `squadre` (posto → 1|2), `ordine` (ordine di turno: nel 4 giocatori i compagni sono opposti), `partita`, `punti` per squadra, `mano` (numero), `primo`, `vincitore`, `seme`. `vistaPer` come in Ultima!: mano propria, per gli altri il numero di carte, per i pozzetti solo `preso` o no, le combinazioni di tutti (pubbliche), la pila intera, mai un segreto altrui.

### Punteggio

`punteggioMano(partita)` → per squadra `{ calate, burraco, chiusura, inMano, pozzetto, totale }`, così a fine mano la UI mostra il dettaglio riga per riga (utile anche per capire gli errori delle regole).

## 4. Bot

Livelli come Ultima!: **facile**, **medio**, **difficile**. `mossaBot(p, n, posto)` restituisce **un passo** e usa solo la propria mano e lo stato pubblico (combinazioni, pila, numero di carte altrui). Non guarda mani né pozzetti altrui.

- **Pesca o pila.** Prende la pila se la cima (e le carte che la rendono giocabile) entra in una combinazione e il vantaggio stimato (punti + carte utili) supera la pena di raccogliere molte carte; altrimenti pesca. Difficile valuta anche se la pila è piccola; facile prende la pila quasi mai.
- **Cala.** Cerca la migliore partizione della mano in combinazioni disgiunte con una ricerca a ritroso sulle combinazioni candidate (le carte uguali sono intercambiabili, si lavora sui conteggi per valore e seme: l'insieme dei candidati è piccolo). Rispetta il minimo di apertura; se la squadra ha già aperto attacca ogni carta che si può attaccare. Tiene sempre almeno una carta da scartare, tranne quando può chiudere. Difficile non apre se perderebbe la flessibilità (e il minimo non è raggiunto) ma prepara la scala lunga; facile cala la prima cosa valida.
- **Scarta.** Scarto di minor valore atteso: non pinelle né jolly (a meno di essere obbligato), non carte che completano una coppia o un'adiacenza della stessa mano, e (difficile) **non regala** carte che si attaccano alle combinazioni avversarie o che sbloccano la pila. Con la pila bloccata sceglie la carta che meno aiuta.
- **Compagno.** In 4 giocatori il bot gioca sulle combinazioni della squadra come ogni giocatore: non sa cosa ha in mano il compagno.
- **Chiusura.** Chiude appena può (burraco + pozzetto preso), a ogni livello: ritardarla per fare più punti è una strategia possibile, ma nella prima versione si sceglie la prevedibilità.
- I livelli facile/medio scelgono una mossa lecita a caso con la stessa probabilità di Ultima! (`PERCENTUALE_MEDIO`), con lo stesso schema `mossaBotLivello`.

Per l'online, «Simula mossa col bot» usa il livello difficile e annota un evento visibile a tutti.

## 5. Interfaccia (375 px)

Riferimenti obbligatori: `ui-giochi-da-tavola`, `ui-mobile-checklist`, `web-design-guidelines`; verifica con screenshot a 375 px in scuro e chiaro. Solo token (`--s1`, `--ac`, `--c-rosso`, `--fg`…): nessun colore nuovo.

### Le carte (disegnate in proprio)

Componente SVG/CSS, nessun asset esterno:
- Fronte: indice in alto a sinistra (valore + seme piccolo), seme grande al centro; per J, Q, K una lettera grande (nessuna immagine di figure). Semi come **forme SVG nostre** (cuore, quadro, fiori, picche), così il seme non dipende dal colore: cuori e quadri in `--c-rosso`, fiori e picche in `--fg`; il colore non è l'unico segnale. Dorso con motivo a righe in `--ac` su `--s2`.
- Jolly: stella a 5 punte con scritta «Jolly» (non emoji).
- Una carta usata da matta in una combinazione porta un piccolo segno «M» in un cerchietto: si capisce quale 2 o jolly è matta e quale è al suo posto.
- Dimensioni: mano 44×64 px (bersaglio ≥ 44 px), tavolo 26×38 px a sovrapposizione, scarti e mazzo 56×80 px.

### Schema della schermata del giocatore

```
+--------------------------------------+
| Mano 3 · fino a 2005                 |  testo di stato, aria-live
| Tocca a te: pesca                    |
+--------------------------------------+
| Noi 640            Loro 410          |  punteggi di squadra
| Pozzetto: preso    Pozzetto: da pr.  |
+--------------------------------------+
| (4 giocatori)                        |
| Bruno 11 car.  *Carla 13 car.  Dario |  chip dei giocatori, * = di turno,
|   (loro)         (noi)          9    |  pallino collegato + testo
+--------------------------------------+
| > Loro: 3 combinazioni               |  accordion, chiuso di base
+--------------------------------------+
| Noi: 2 combinazioni                  |
| [S 4 5 6 7 8 9 10 J ]  Burraco sporco|  sequenze sovrapposte, 1 riga ognuna
| [K K K]                              |  toccare = bersaglio per "Attacca"
+--------------------------------------+
| [MAZZO 41]      [SCARTI 7  | 9 pic.] |  pila: mostra la cima, "vedi pila"
| [Pesca]         [Prendi la pila]     |
+--------------------------------------+
| La tua mano (13)     Ordina: Seme|Val|
| [] [] [] [] [] [] []                 |  griglia 7 colonne, righe che vanno
| [] [] [] [] [] []                    |  a capo (fino a 3 righe con 21 carte)
+--------------------------------------+
| 3 scelte · 35 punti · Scala valida   |  barra azioni in fondo (sticky)
| [Cala]  [Attacca a...]  [Scarta]     |
+--------------------------------------+
```

### Mano lunga

- Griglia con **7 carte per riga** (7 × 44 + 6 × 4 = 332 px, sta in 343 px utili), a capo senza scroll orizzontale: 11 carte = 2 righe, 21 = 3 righe. Niente ventaglio sovrapposto: tutte le carte restano bersagli da 44 px.
- **Selezione multipla**: un tocco seleziona o deseleziona; la carta scelta si alza di 6 px (solo `transform`) e mostra un segno di spunta nell'angolo (il segnale non è solo la posizione). Contatore e punti nella barra.
- **Riordino** (v1): pulsanti «Per seme» e «Per valore», la scelta resta in `localStorage` (con `try/catch`). Il riordino a mano con trascinamento è una variante **dopo**: serve comunque un pulsante equivalente (regola della checklist), quindi non è nella v1.
- Dopo una pesca, le carte nuove appaiono in coda e per un attimo sono evidenziate (bordo `--ac`), così non si perdono tra le altre.
- Il pozzetto, quando lo si prende, arriva in mano con un avviso («Hai preso il pozzetto: 11 carte»).

### Calare e attaccare

- La barra in fondo ragiona sulla selezione, con **anteprima locale** (`anteprimaCala`, puro): «Scala di cuori da 4 a 8, 25 punti» oppure «Non è una combinazione valida»; per la prima calata mostra «Punti per aprire: 35 su 50». I controlli sono quelli del server (la UI non è l'autorità).
- **Cala**: crea una combinazione con le carte selezionate (se ambigua, due pulsanti «Matta come 4» / «Matta come 7»). Per la prima calata si possono accumulare più gruppi in una **bozza** (elenco «da calare», con «Togli») e confermare con un solo «Apri con 52 punti»: un'unica azione `cala`.
- **Attacca a…**: con carte selezionate, il tocco su una combinazione della propria squadra la marca come bersaglio e compare «Attacca qui». Se la combinazione ha una sola interpretazione valida con le carte aggiunte, si procede subito.
- **Scarta**: attivo solo con una carta selezionata e solo in fase «giocare». Se è l'ultima e c'è la chiusura, il pulsante diventa «Chiudi la mano» (con conferma, come tutte le azioni irreversibili).
- Un solo pulsante primario per schermata, come da checklist; le azioni di fase (Pesca / Prendi la pila) sono secondarie finché non è il loro momento.

### Tavolo e pila

- **Combinazioni**: ogni combinazione è una riga a sé, carte sovrapposte per 55 %; una scala da 14 carte a 18 px di passo sta in 280 px. Etichetta: «Scala di cuori» / «Tris di K» e, se burraco, un badge con icona e testo «Burraco pulito +200» o «Sporco +100».
- **Squadra avversaria**: in un accordion chiuso, per non rubare spazio; mostra comunque il numero di combinazioni e i burraco.
- **Scarti**: la cima in evidenza; l'accordion «Vedi la pila» apre la pila intera in una griglia a piccole carte (utile per decidere se prenderla). Se la pila è bloccata da una matta, avviso testuale «Pila bloccata: servono due carte uguali alla cima».
- **Pozzetto**: segnaposto con stato testuale («Pozzetto: da prendere / preso»).

### Fine mano e partita

Tabella per squadra con le righe del punteggio (calate, burraco, chiusura, carte in mano, pozzetto, totale) e classifica a punti verso l'obiettivo; «Prossima mano» (host); a fine partita «Ricomincia». Stesso schema di `FineRound` di Ultima!.

### Accessibilità e movimento

Le carte hanno `aria-label` parlato («Sette di cuori», «Jolly», «Due di fiori, matta»); la selezione usa `aria-pressed`; gli eventi in un accordion; `prefers-reduced-motion` rispettato (solo `transform`/`opacity`). Nessun trascinamento.

## 6. Parti comuni

### Cosa riusare da `games/ultima`

| Elemento | Decisione |
|---|---|
| `offline.ts` (macchina a stati sul telefono, pausa dei bot, `vistaLocale`) | **Copiare lo schema** in `games/burraco/src/offline.ts`. Estrarre un modulo generico (`@gdt/engine`: `giocoLocale(gioco, bot)`) è possibile ma dopo il secondo caso reale (Scopa avrà lo stesso schema). Si segnala come refactor, non si fa ora. |
| `bot.ts` (livelli, `mossaBotLivello`, `PERCENTUALE_MEDIO`) | **Stessa forma**: `LIVELLI`, `Livello`, `PERCENTUALE_MEDIO` oggi sono in Ultima!. Si propone di spostare **solo** `LIVELLI`/`Livello` e la scelta «mossa casuale a livello facile/medio» in `@gdt/engine` quando c'è il secondo gioco di carte con bot: nella prima versione li ridefinisce Burraco (poche righe), per non toccare Ultima! mentre altri agenti ci lavorano (varianti). |
| `Tavolo.tsx` | **Non riusabile**: ha dentro Jolly, colori, sfida del +4. Si riusano i **pezzi di contorno** copiandone il disegno: elenco eventi, `FineRound`, scelta velocità. |
| `Carta.tsx` | **Non riusabile**: carta a colori e numeri. |
| `ultima.css` (`.ul-avviso`, `.ul-azioni`, `.ul-segmento`, `.ul-opzione`) | Le classi sono quasi generiche. Proposta: nuove classi `bu-…` in `burraco.css`; se il coordinatore lo vuole, in un passo a parte si estraggono le generiche in un CSS condiviso. |
| `UltimaLocale.tsx` (form di creazione contro i bot, `Opzioni`) | Copia adattata. |
| Collegamento WebSocket (`@gdt/collegamento`, `collegamento.ts`) | **Riuso diretto**, come Ultima!. |

### Pacchetto condiviso `@gdt/carte` (proposto)

Serve a Burraco (mazzo francese + jolly) e a Scopa (mazzo italiano da 40). Contenuto:
- `tipi.ts`: tipi comuni (`CartaBase { id: number }`), mazzi nominati.
- `mazzi.ts`: `mazzoFrancese({ mazzi, jolly })` (52 × n + jolly), `mazzoItaliano()` (40: denari, coppe, spade, bastoni; da 1 a 7 e fante, cavallo, re). I due mazzi sono dati puri, senza UI.
- `ui/CartaGrafica.tsx`: componente carta (SVG/CSS) con proprietà `mazzo: "francese" | "italiano"`, `seme`, `valore`, `dorso`, `dimensione`, `selezionata`, `onClick`, `etichetta`; semi disegnati da noi (francese in questo piano; semi italiani li disegna il piano di Scopa).
- `ui/Mano.tsx`: griglia della mano con selezione multipla e riordino (la usa anche Scopa, che di solito ha solo 3 carte: stesso componente, meno carte).
- `ui/carte.css`: solo token.

**Chi lo crea**: il primo dei due giochi che parte, in un blocco 0 (qui lo scriviamo come blocco 0 di Burraco) con l'API sopra concordata dal coordinatore; Scopa vi aggiunge `mazzoItaliano` e i semi italiani. Se Scopa parte prima, Burraco aggiunge i semi francesi. **Ultima! non viene toccata** (è già in produzione): non usa il pacchetto finché non serve.

Ragione per un pacchetto invece di `games/burraco`: due giochi di carte nuovi con mano segreta e selezione condividono UI, riordino e disegno; copiarli duplicherebbe circa 500 righe e le correzioni di accessibilità andrebbero fatte due volte.

### File condivisi da toccare (rischio di conflitto tra i piani)

| File | Modifica |
|---|---|
| `apps/web/src/App.tsx` | import `BurracoApp, manifest`, voce in `giochi`, voce in `ICONE_GIOCHI` |
| `apps/web/src/Icona.tsx` | nuova icona del Burraco (una delle lucide `Spade`/`Club` oppure una `createLucideIcon` con un asso e un 7; da distinguere da Ultima! e da Scopa: l'icona di ogni gioco di carte deve essere diversa) |
| `apps/web/package.json`, `apps/server/package.json` | dipendenze `@gdt/burraco` e (se creato) `@gdt/carte` |
| `apps/server/src/giochi.ts` | una riga: `[burracoOnline.id]: burracoOnline` |
| `pnpm-lock.yaml` | si rigenera con `pnpm install`: **conflitto quasi certo** se due piani lo toccano; farlo uno alla volta |
| `CHANGELOG.md`, `apps/web/package.json` (`version`) | voce e SemVer a ogni rilascio (vedi punto 7) |
| `docs/decisioni.md` | elenco giochi (nuovo numero), struttura attuale (`games/burraco`, `packages/carte`), voce FATTO |
| `docs/test.md` | cosa copre la suite |
| `README.md` radice | elenco giochi |
| `packages/engine/src/online.ts` | **solo se** la partita veloce cambia il contratto (punto 2.3) |
| `apps/server/src/coda.ts`, `stanze.ts`, `index.ts` | **solo** dal piano della partita veloce |
| `apps/web/e2e/…` | file nuovi `burraco-bot.spec.ts`, `burraco-online.spec.ts` (nessun conflitto) |

`apps/web/src/tema.css`: nessuna modifica prevista (si usano `--c-rosso`, `--fg`, `--s1`, `--s2`, `--ac`). Se serve un colore per il seme nero in scuro, si valuta un token nuovo prima di scriverlo a mano.

## 7. Passi (a blocchi rilasciabili)

Ogni blocco chiude con `pnpm typecheck`, test e commit. Il numero di versione lo decide il coordinatore (probabilmente 0.26.0 per il blocco C, 0.27.0 per D).

**Blocco A — Fondamenta (interno, nessuna versione).**
1. Pacchetto `@gdt/carte` (dati dei mazzi, `CartaGrafica` francese, `Mano` con selezione e riordino) con test dei mazzi e prova a schermo.
2. `games/burraco`: `package.json`, `tsconfig`, `src/carte.ts`, `src/regole.ts`.

**Blocco B — Logica pura con test (interno).**
3. `combinazioni.ts`: `interpreta`, `scegli`, punti, burraco; test contro ricerca esaustiva.
4. `logica.ts`: distribuzione, pesca, pila (bloccata e libera), calata, apertura, pozzetto (entrambi i casi), chiusura, fine mazzo, punteggio, `anteprimaCala`.
5. `bot.ts` (tre livelli) con test, compresa una partita completa solo bot (2 e 4 giocatori) per molti semi.

**Blocco C — Contro i bot, anche offline (rilascio MINOR).**
6. `online/gioco.ts` (stato di sala, azioni, `traduci`, `vistaPer`) con test: serve già per l'offline, perché `offline.ts` lo riusa.
7. `offline.ts`, manifest, locali it/en, `ui/Tavolo`, `ui/BurracoLocale`, icona, registrazione in `App.tsx`, README del gioco (provarlo, cosa controllare, struttura, Deploy, varianti), CHANGELOG, `decisioni.md`, versione e tag.
8. Verifica visiva a 375 px scuro e chiaro (mano di 11 e di 21 carte, scala di 14, pila bloccata, fine mano) con screenshot letti, checklist `ui-mobile-checklist`.

**Blocco D — Online con codice (rilascio MINOR).**
9. Registrazione in `apps/server/src/giochi.ts`, test del server, `UltimaOnline`-like `BurracoOnline` (creazione, sala, QR, rientro), «Sollecita» e «Simula mossa col bot».
10. e2e con 4 contesti del browser; README e CHANGELOG.

**Blocco E — Partita veloce (dipende dal contratto comune).**
11. Adeguamento di `online/gioco.ts` alle richieste del punto 2.3, UI della sala aperta con formazione delle coppie e `config` modificabile; e2e con 4 telefoni che entrano uno alla volta.

**Blocco F — Rifiniture (a richiesta).**
12. Sostituzione della matta, burraco di tris, riordino manuale della mano, statistiche.

## 8. Test

- **Unit della logica** (`logica.test.ts`, `combinazioni.test.ts`):
  - `interpreta`: tutti i casi di tris, scala con matta, 2 al suo posto, asso basso e alto, angolo rifiutato, scala da 14, più di una matta, semi misti; confronto con una ricerca esaustiva su insiemi casuali (≤ 8 carte).
  - Distribuzione: 108 carte conservate, id unici, 11 + 11 + 11 + mazzo.
  - Turno: pescare prima di giocare, scarto obbligatorio, `nonTocca`.
  - Pila: presa regolare, bloccata da matta, pila libera, cima non usata, pila vuota, mazzo finito.
  - Apertura: minimi per fascia di punteggio, calata in un'unica azione, compagno dopo l'apertura.
  - Pozzetto: finito calando (continua), finito scartando (prossimo turno), una volta sola per squadra, compagno in 4 giocatori.
  - Chiusura: senza burraco rifiutata, con matta in scarto rifiutata, con burraco accettata, con calata di tutte le carte.
  - Punteggio: tabella dei valori, burraco pulito e sporco, chiusura, mano residua, pozzetto non preso; obiettivi 1505/2005/3005, pareggio.
- **Bot**: ogni passo è lecito; usa solo dati pubblici (test che il risultato non cambia se si mescolano le mani avversarie); partite complete solo bot per 200 semi, 2 e 4 giocatori, tutte finiscono (nessun ciclo infinito: tetto di turni nel test); livelli a confronto (difficile batte facile nella maggioranza).
- **Online** (`online/gioco.test.ts`): nessuna carta altrui né contenuto del pozzetto nelle viste; permessi (solo l'organizzatore avvia/configura); `config` validato; partita completa con seme fisso identica a se stessa; `libera`/`occupa` in sala.
- **Server** (`apps/server/src/burraco.test.ts`): creazione stanza con 2 e 4 nomi, rientro con token, sollecito, azioni di host rifiutate agli altri.
- **UI**: test di componenti per l'anteprima e la selezione se previsti nel progetto; e2e Playwright: `burraco-bot.spec.ts` (una mano contro i bot, anche offline, sale a un esito), `burraco-online.spec.ts` (4 contesti del browser: ognuno vede la propria mano, calata e attacco visibili alla squadra, chiusura). Screenshot a 375 px nel tema scuro e chiaro nella cartella `__screenshots__` come per gli altri giochi.

## 9. Domande per l'utente (con risposta consigliata)

1. **Quanti giocatori?** Consigliato: **2 e 4 a coppie**, niente 3 giocatori.
2. **Punteggio obiettivo di base?** Consigliato **2005**, con 1505, 3005 e «mano singola» come scelte.
3. **Pila**: regola FIBUR (bloccata da una matta, due carte naturali per prenderla) o «sempre libera»? Consigliato **FIBUR di base** con l'opzione «pila libera» perché molti tavoli giocano casalingo.
4. **Burraco di tris (7+ carte uguali)**: conta? Consigliato **no** nella prima versione.
5. **Primo rilascio**: contro i bot (anche offline) prima, online dopo, partita veloce a contratto deciso? Consigliato **sì**.
6. **Compagno bot** nel 4 giocatori contro i bot: sì, tre bot (compagno e due avversari). Consigliato **sì**; il livello dei bot è lo stesso per tutti, come in Ultima!.
7. **Sostituzione della matta** e riordino a trascinamento: rimandarli? Consigliato **sì**, rimandare.
8. **Pacchetto `@gdt/carte`**: crearlo ora e condividerlo con Scopa? Consigliato **sì**; il primo gioco che parte lo crea, l'altro lo estende.
9. **Regole da verificare**: l'utente (o un giocatore di burraco) controlla le voci marcate **[verificare]** (soglie di apertura, tris di 2, pila bloccata, chiusura con matta, valore del 2 in scala). Consigliato farlo **prima del blocco B**.
10. **Partita veloce**: per il Burraco scadenza della stanza aperta più lunga di 2 minuti e avvio solo dall'organizzatore? Consigliato **sì** (4 persone da radunare), da riportare al piano comune.

## 10. Dimensioni (stime)

| Parte | Righe circa |
|---|---|
| `@gdt/carte` (mazzi, `CartaGrafica`, `Mano`, css) | 500 |
| `combinazioni.ts` + `regole.ts` + `carte.ts` | 500 |
| `logica.ts` | 600 |
| `bot.ts` | 450 |
| `offline.ts` | 100 |
| `online/gioco.ts` | 500 |
| UI (`Tavolo`, `BurracoLocale`, `BurracoOnline`, `Burraco.tsx`, css) | 1500 |
| Locali it + en | 600 |
| Test unitari, server, e2e | 2500 |
| README, CHANGELOG, `decisioni.md`, `test.md` | 250 righe di documenti |

In totale circa 7.500 righe (di cui un terzo di test). Con lo stesso ritmo di Ultima! (piano 0.24.0, offline 0.25.0): blocchi A+B come una sessione lunga o due, C una sessione, D una mezza, E dipende dal contratto, F opzionale. Il rischio maggiore sta in `interpreta`, in pozzetto e chiusura (molte casistiche) e nella verifica visiva della mano lunga.
