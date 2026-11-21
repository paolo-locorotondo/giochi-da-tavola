# Piano: due mini giochi per Duello Lampo («Bersagli» e «Il più grande»)

Stato: **progettazione** (fase 1). Nessuna implementazione in questo documento.
Riferimenti letti: `CLAUDE.md`, `docs/decisioni.md` (voci Duello Lampo), `games/duello-lampo/` (README, `docs/aggiungere-un-minigioco.md`, `src/minigiochi/*`, `src/ui/minigiochi/*`, `Partita.tsx`, `Preparazione.tsx`, `duello.css`, locales, `logica.test.ts`), `apps/web/e2e/duello-lampo.spec.ts`, skill `ui-giochi-da-tavola` e `ui-mobile-checklist`.

## 0. Vincoli che valgono per entrambi

- **Equità**: le due metà vedono gli stessi bersagli / gli stessi numeri, nelle stesse posizioni. Tutto passa da `prepara(rng, imp)`; la vista legge solo il `Config`.
- **Misura**: i tempi sono sul telefono, da un istante comune (`inizio`). Ogni giocatore tocca solo la sua metà.
- **Errori**: il framework (`errore?(config, risultato): boolean`) assegna **una sola penalità per round** a chi ha «errore». Non esistono penalità per singolo tocco senza cambiare il contratto di tutti i mini giochi (vedi domanda 1).
- **Registro**: i due giochi vanno in fondo a `MINIGIOCHI`, nell'ordine `[..., memoria, bersagli, piugrande]`. Le scelte già salvate restano valide (un mini gioco nuovo va in fondo, come da guida).
- **Testi**: solo chiavi `mg_<id>_…` in `it.ts` e `en.ts`; la logica non produce frasi, restituisce codici/valori.

---

## 1. «Bersagli» (`id: "bersagli"`)

### 1.1 Regole

Per tutta la durata del round (base **8 s**) compaiono cerchi («bersagli») in una griglia di celle uguale per i due giocatori. Ogni bersaglio resta acceso per un tempo fisso (la sua «vita») e poi sparisce da solo. Si tocca il bersaglio per colpirlo: chi colpisce di più vince.

**Generazione (puro, da `rng`)**:
- Il primo bersaglio compare a **500 ms** dall'inizio; poi uno ogni `ritmoMs`, finché la comparsa è `< durataMs − 400`.
- Per ogni comparsa si sceglie una cella **a caso** tra quelle che non hanno un bersaglio ancora vivo e non è la cella del bersaglio precedente. Se non ce n'è nessuna, quella comparsa **salta** (deterministico, nessun bersaglio sovrapposto).
- Ogni bersaglio è `{ comparsaMs, scadeMs = comparsaMs + vitaMs, cella }`. Nella stessa cella non si sovrappongono mai due bersagli vivi.
- Le due metà usano la **stessa lista**; ognuna ha la sua copia da colpire (un bersaglio colpito da uno non è colpito per l'altro).

**Tocco** (valutato in funzione del tempo `t` dall'inizio, della cella toccata e dei bersagli già colpiti):
- Cella con un bersaglio **vivo** (`comparsaMs ≤ t < scadeMs`) e non ancora colpito → **colpito**. Il tempo di reazione è `t − comparsaMs` (tempo programmato, uguale per i due).
- Bersaglio già colpito → **ignorato** (nessun effetto, non è errore: evita di punire il doppio tocco).
- Qualsiasi altro tocco nella metà (cella vuota, bersaglio scaduto, prima dei 500 ms) → **a vuoto**.

**Fine round**: la vista riporta il risultato allo scadere di `durataMs` (come Raffica). Il round non si chiude prima.

**Vincitore**:
1. Chi ha **più bersagli colpiti** vince.
2. A parità: chi ha la **somma dei tempi di reazione** minore vince (soglia 1 ms: sotto, è pari).
3. Zero colpi per entrambi → pari.

**Errore** (solo con «Gli errori contano −1» attivo): chi ha **almeno un tocco a vuoto** nel round perde 1 punto. Chi colpisce e basta non perde nulla.

**Esito** (`descrivi`): «3 colpiti · 2 a vuoto» (il «a vuoto» compare solo se ce ne sono).

### 1.2 Impostazioni (pannello «Impostazioni»)

| Chiave | Tipo | Valori | Base | Formato | Note |
|---|---|---|---|---|---|
| `durata` | scelta | 5 / **8** / 10 | 8 | `secondi` | durata del round |
| `lato` | scelta | 2 / **3** / 4 | 3 | `griglia` | griglia 2×2, 3×3, 4×4 |
| `vita` | scelta | 0,8 / **1,2** / 1,6 | 1,2 | `secondi` | quanto resta acceso ogni bersaglio |
| `ritmo` | scelta | 0,6 / **0,9** / 1,2 | 0,9 | `secondi` | ogni quanto compare un bersaglio |
| `errori` | interruttore | sì/no | no | — | `IMP_ERRORI` (comune) |

Titoli testo: `mg_bersagli_imp_durata`, `mg_bersagli_imp_lato`, `mg_bersagli_imp_vita`, `mg_bersagli_imp_ritmo`; `errori` usa `imp_errori`.

Il valore `base` dà lo stesso gioco di una sfida salvata. Nessun `massimo` necessario: con 2×2 e vita 1,6 s / ritmo 0,6 s possono essere vivi al massimo 3 bersagli su 4 celle, quindi una cella libera c'è sempre (la regola «salta la comparsa» è solo una garanzia in più). Test: ogni combinazione di valori produce un `Config` coerente.

### 1.3 Modulo di regole (`src/minigiochi/bersagli.ts`)

```ts
export interface ConfigBersagli {
  durataMs: number;          // durata del round (dalle impostazioni)
  lato: number;              // lato della griglia
  bersagli: readonly { comparsaMs: number; scadeMs: number; cella: number }[];
}
export interface RisultatoBersagli {
  colpiti: number;           // bersagli colpiti
  sommaMs: number;           // somma dei tempi di reazione dei colpiti
  vuoti: number;             // tocchi a vuoto
}
// Funzioni pure, testate senza browser:
export function valutaTocco(c: ConfigBersagli, t: number, cella: number, colpitiFinora: ReadonlySet<number>):
  { tipo: "colpito"; indice: number; ms: number } | { tipo: "ignorato" } | { tipo: "vuoto" };
export function attivi(c: ConfigBersagli, t: number): number[]; // indici dei bersagli vivi a t
```

- `prepara(rng, imp)` genera la lista come in 1.1 (tutta la casualità da `rng`, mai `Math.random`).
- `durataMassima: (c) => c.durataMs + 1500` (come Raffica).
- `chiudeAlPrimo: false`.
- `vincitore`: confronto a tre livelli di 1.1 (`colpiti` maggiore, poi `sommaMs` minore con soglia 1 ms, poi pari).
- `errore: (_c, r) => "vuoti" in r && r.vuoti > 0` (una penalità per round, vedi domanda 1).
- `impostazioni`: come in 1.2, con `IMP_ERRORI`.

### 1.4 Vista (`src/ui/minigiochi/BersagliVista.tsx`)

- Riceve `config`, `inizio`, `onRisultato`. Tiene `colpiti: Set<number>`, `conteggio`, `sommaMs`, `vuoti` in ref; uno `useState` solo per ridisegnare.
- Un `setTimeout` per ogni bersaglio (comparsa e scadenza) e un timer di fine a `durataMs` che chiama `onRisultato` **una volta**.
- Zona: `<div className="dl-zona dl-bersagli" onPointerDown>`. Il tocco sulla zona passa a `valutaTocco` leggendo la cella da `data-cella` del bersaglio colpito o del `div` di griglia (tocco in una cella vuota).
- Ogni bersaglio visibile è un `<button data-bersaglio={indice} data-cella={cella} data-suono="no">`, posizionato con `position:absolute` al centro della sua cella (`left/top` in %). Icona lucide `Target` (`aria-hidden`), testo accessibile «Bersaglio N».
- Stato in alto (`role="status"`, sopra la zona): «Colpiti: N» e, per 400 ms, «Colpito!» o «A vuoto». Barra del tempo: `dl-pista` sottile che si riduce con `transform: scaleX` in 8 s; senza movimento resta il testo «N s» che scende.
- `descriviBersagli(r, t)`: `valColpiti` (plurale) + «N a vuoto» se `vuoti > 0`; per `NESSUNO` → `valNessuno`.

### 1.5 UI a 375 px (per ciascuna metà)

Metà in basso (quella in alto è identica, ruotata di 180°). Altezza della zona ≈ 330 px, larghezza ≈ 340 px.

```
+--------------------------------------------+
| Giocatore 1            Round 2 di 6     3  |  <- testa (punti)
| Colpiti: 2  ·  5 s                          |  <- stato, role=status
| +----------------------------------------+ |
| |   (◎)           .           (◎)        | |  <- zona: griglia 3×3
| |          (◎)                 .          | |     cerchi Ø 64 px
| |   .            (◎)                     | |     cella ~ 110 px
| |                       (◎)              | |
| +----------------------------------------+ |
| [▓▓▓▓▓▓▓▓░░░░░░░░░░░░] (barra del tempo)   |
+--------------------------------------------+
  (◎) = bersaglio vivo, (.) = cella vuota
```

- Bersaglio: **64 px** di diametro (`min(4rem, 20cqmin)`), area toccabile **≥ 44 px** (il cerchio intero); distanza tra due celle ≥ 8 px.
- Sopra e sotto la zona resta lo spazio dello stato e della barra: nessuna parte della griglia sta sotto la barra di gioco.
- Font 16 px per il testo di stato; contrasto dal token (`--ac` su `--s1`, `--on-ac` su `--ac2`).
- Il riquadro usa `container-type: size` come `.dl-trova` (unità `cqw`/`cqh` già usate), così 4×4 resta quadrato su telefoni bassi.

### 1.6 Stili, animazioni, suoni

- CSS in `duello.css` solo con token: `--ac` (anello e icona), `--ac2` (colpito), `--s1`/`--s2` (fondo), `--bd-ctrl` (bordo). Nessun colore fisso.
- Comparsa: `transform: scale(0.6) → scale(1)` + `opacity`, 150 ms `ease-out`. Scomparsa per scadenza: solo `opacity`, 150 ms. Colpito: anello che si allarga e svanisce, 250 ms.
- `@media (prefers-reduced-motion: reduce)`: nessuna scala, solo dissolvenza breve (o nulla); barra del tempo ferma, con il solo testo dei secondi. Nessun lampeggio.
- Suoni: nuovo `suonoColpo` in `src/suoni/index.ts` (onda `sine`, una nota alta breve, volume basso). Il suono viene dal tocco di chi ha colpito; i tocchi delle due metà sono eventi distinti, quindi non si raddoppiano (non serve `principale`). I tocchi a vuoto e le celle restano `data-suono="no"`.

### 1.7 Testi

Chiavi in `it.ts` e `en.ts` (stesse chiavi):
- `mg_bersagli_nome`: «Bersagli» / «Targets»
- `mg_bersagli_regola`: «Compaiono cerchi: tocca quelli che appaiono prima che scadano. Chi ne colpisce di più vince; a parità vince chi è più veloce. Chi tocca a vuoto può perdere un punto.» / «Circles appear: tap them before they fade. Most hits wins; on a tie, the faster wins. Tapping empty space may cost a point.»
- `mg_bersagli_imp_durata|lato|vita|ritmo`, `valColpiti` (plurale one/other: «{n} colpito» / «{n} colpiti»), `valVuoti` («{n} a vuoto»), `colpito` («Colpito!»), `aVuoto` («A vuoto»), `bersaglioN` («Bersaglio {n}»).

---

## 2. «Il più grande» (`id: "piugrande"`)

### 2.1 Regole

Dopo il conto alla rovescia compaiono **N numeri** (base **6**) in una griglia; ogni giocatore vede gli stessi numeri nello stesso ordine di posizione. Si tocca il numero **più grande** (per valore, non per lunghezza): chi lo tocca per primo vince il round.

**Generazione (puro, da `rng`)**:
- Numeri **distinti** nell'intervallo delle cifre scelte (2 cifre: 10–99; 3 cifre: 100–999).
- Vincolo di difficoltà: il più grande e il secondo più grande distano **almeno** `distanzaMin`. Si genera con scarto (rifiuto) su `rng`: deterministico dal seme.
- Le posizioni sono una permutazione di `rng.mescola`.

**Tocco**:
- Tocco sul numero **più grande** → giusto; `ms` = tocco − `inizio`.
- Tocco su un altro numero → **sbagliato**: il giocatore perde il round (come Colore giusto e Trova). Il numero sbagliato resta segnato.
- Un giocatore che ha già risposto non risponde più (nessun effetto sul secondo tocco).

**Fine round**: il round si chiude quando entrambi hanno risposto (giusto o sbagliato), oppure allo scadere di **6 s** dalla comparsa (chi non ha risposto è `NESSUNO`).

**Vincitore**:
1. Chi ha risposto **giusto** vince sul sbagliato e su chi non ha risposto.
2. Entrambi giusti: chi ha il **tempo** minore (soglia 1 ms: sotto è pari).
3. Entrambi sbagliati o nessuno risposto → pari (nessun punto).

**Errore** (con «Gli errori contano −1»): chi ha risposto sbagliato perde 1 punto, oltre a perdere il round. Chi non risponde non è errore.

**Esito**: «Giusto: 412 ms» / «sbagliato» / «nessun tocco» (come Colore giusto).

### 2.2 Impostazioni

| Chiave | Tipo | Valori | Base | Formato | Note |
|---|---|---|---|---|---|
| `numeri` | scelta | 4 / **6** / 9 | 6 | `numero` | griglia 2×2, 2×3, 3×3 (colonne: 2, 3, 3) |
| `cifre` | scelta | **2** / 3 | 2 | `numero` | 10–99 oppure 100–999 |
| `distanza` | scelta | 1 / **5** / 10 | 5 | `numero` | scarto minimo tra il più grande e il secondo |
| `errori` | interruttore | sì/no | no | — | `IMP_ERRORI` |

Titoli: `mg_piugrande_imp_numeri`, `mg_piugrande_imp_cifre`, `mg_piugrande_imp_distanza`, `imp_errori`.

Controllo: con 3 cifre e distanza 10 il vincolo è sempre soddisfacibile; con 2 cifre e 9 numeri (valori 10–99, 90 possibilità) anche. Test: ogni combinazione produce numeri distinti e con scarto rispettato.

### 2.3 Modulo di regole (`src/minigiochi/piugrande.ts`)

```ts
export interface ConfigPiuGrande {
  colonne: number;                     // dalle impostazioni, per la vista
  numeri: readonly number[];           // nella posizione della griglia
  indicePiuGrande: number;             // posizione del numero più grande (test e vista)
}
export interface RisultatoPiuGrande { giusto: boolean; ms: number }
```

- `prepara` come in 2.1; `durataMassima: () => 6000` (margine dopo la comparsa, la vista riporta prima se entrambi rispondono).
- `chiudeAlPrimo: false` (come Colore giusto).
- `vincitore`: stesso schema di Colore giusto (`grado` 0 = giusto, 1 = nessuna risposta, 2 = sbagliato; a parità di grado 0 `confronta(ms, "minore", 1)`).
- `errore: (_c, r) => "giusto" in r && !r.giusto`.

Nota: `durataMassima` non dipende dal config; resta una funzione per il contratto (`(c) => 6000`).

### 2.4 Vista (`src/ui/minigiochi/PiuGrandeVista.tsx`)

- Riceve `config`, `inizio`, `onRisultato`; come `ColoreVista`: `rif` con l'ultima callback, `esito` in state, `onRisultato` chiamata una volta.
- Ogni numero è un `<button data-valore={n} data-piu-grande={true|undefined} data-suono="no" aria-label="Numero {n}">`. `onPointerDown` (non `onClick`), e il tasto Invio/Spazio come nelle altre viste.
- Un tocco prende `ms = e.timeStamp − inizio`; `giusto` se è l'indice del più grande.
- Dopo l'esito: il numero scelto mostra ✓ (giusto) o ✗ (sbagliato) con icone lucide `Check`/`X` e testo; gli altri restano senza marcatura (la risposta giusta non si rivela prima della fine del round).
- Stato in alto (`role="status"`): «Tocca il numero più grande» → «Giusto!» / «Sbagliato!». `descriviPiuGrande(r, t)` come Colore giusto.

### 2.5 UI a 375 px (per ciascuna metà)

```
+--------------------------------------------+
| Giocatore 2            Round 3 di 6     1  |  <- testa (punti, ruotata)
| Tocca il numero più grande                  |  <- stato, role=status
| +----------------------------------------+ |
| |  [   47   ]  [   82   ]  [   16   ]    | |  <- griglia 3×3 (9 numeri)
| |  [   91   ]  [   33   ]  [   58   ]    | |     ogni casella ~ 110×80 px
| |  [   24   ]  [   77   ]  [   65   ]    | |
| +----------------------------------------+ |
+--------------------------------------------+
```

- Casella: **min 44 px** di altezza (in pratica 72–80 px), gap 8 px; numero in font titoli 2rem, `lining-nums`, con contrasto `--fg` su `--s1`.
- Con 4 numeri 2×2; con 6, 3 colonne; con 9, 3 colonne (3×3) — stesse regole della memoria (`colonne()`).
- La zona resta dentro la metà, sotto la testa; nessuna scorrimento.

### 2.6 Stili, animazioni, suoni

- Token come in Memoria lampo (`--s1`, `--bd-ctrl`, `--ac` per il bordo quando attiva, `--ac2`/`--on-ac2` per il giusto, `--pericolo` per il sbagliato). Nessun colore fisso.
- Press: `transform: scale(0.98)` in `:active`, disattivato con `prefers-reduced-motion`. Nessun'altra animazione.
- Suoni: nessuno nuovo (domanda 3). Esito con i suoni già esistenti (punto / pari).

### 2.7 Testi

- `mg_piugrande_nome`: «Il più grande» / «The biggest»
- `mg_piugrande_regola`: «Compaiono dei numeri: tocca quello più grande prima degli altri. Se tocchi un numero che non è il più grande perdi il round.» / «Numbers appear: tap the biggest one first. Tapping any other number loses the round.»
- `mg_piugrande_imp_numeri` («Quanti numeri» / «How many numbers»), `mg_piugrande_imp_cifre` («Cifre» / «Digits»), `mg_piugrande_imp_distanza` («Scarto minimo tra i due più grandi» / «Minimum gap between the two biggest»).
- `piuGrandeDomanda` («Tocca il numero più grande» / «Tap the biggest number»), `giusto` («Giusto!» / «Right!»), `numeroN` («Numero {n}» / «Number {n}»).
- Si riusano le chiavi esistenti `valMs`, `valSbagliato`, `valNessuno`, `sbagliato`.

---

## 3. File toccati

### Dentro `games/duello-lampo` (previsti)

| File | Modifica |
|---|---|
| `src/minigiochi/bersagli.ts` | **nuovo**: regole, generazione, `valutaTocco`, `attivi` |
| `src/minigiochi/piugrande.ts` | **nuovo**: regole |
| `src/minigiochi/index.ts` | due import e `bersagli, piugrande` in fondo a `MINIGIOCHI` |
| `src/ui/minigiochi/BersagliVista.tsx` | **nuovo** |
| `src/ui/minigiochi/PiuGrandeVista.tsx` | **nuovo** |
| `src/ui/minigiochi/index.ts` | due righe in `VISTE` |
| `src/ui/duello.css` | classi `.dl-bersagli`, `.dl-bersaglio`, `.dl-piugrande` (solo token) |
| `src/suoni/index.ts` | `suonoColpo` |
| `src/locales/it.ts`, `en.ts` | chiavi di 1.7 e 2.7 (stesse chiavi nelle due lingue) |
| `src/logica.test.ts` | `describe` per Bersagli e Il più grande |
| `README.md` | regolamento (tabella mini giochi, impostazioni), «Cosa controllare», idee (togliere Bersagli e Il più grande), contatore |
| `docs/aggiungere-un-minigioco.md` | nessuna modifica prevista |

### Fuori da `games/duello-lampo` (da segnalare: non sono nel perimetro indicato)

1. **`apps/web/e2e/duello-lampo.spec.ts`**: obbligatorio. Oggi asserisce 8 mini giochi (`details.dl-imp` count 8, array di 8 mani, «In tutto 16 round», mappa `NOMI` a 8 chiavi). Con 10 mini giochi cambiano i conteggi e il totale di default (20 round se restano 2 mani ciascuno). Le sequenze «a caso» dipendono da `Math.random` fisso e dalla lunghezza del registro: alcuni test di ordine potrebbero cambiare.
2. **`apps/web/e2e/__screenshots__/**`** (baseline PNG scuro/chiaro): la preparazione cambia; vanno rigenerate con `pnpm test:e2e:aggiorna` e guardate una per una.
3. **`docs/test.md`**: la riga di `games/duello-lampo` descrive cosa copre la suite (ordine, impostazioni, regole dei mini giochi); va aggiornata (lo chiede la guida del gioco).
4. **`docs/decisioni.md`**: la voce TODO «altri mini giochi (idee: Bersagli, Il più grande)» diventa FATTO; si aggiunge una voce per il nuovo rilascio (la guida di decisioni va aggiornata in ogni commit che cambia le funzioni).
5. **`CHANGELOG.md`** e **`apps/web/package.json`**: solo se si rilascia (vedi sotto).

Nessun file in `packages/*` né in `apps/web/src` va toccato.

---

## 4. Passi di implementazione

1. **Regole Bersagli**: `bersagli.ts`, con `valutaTocco`/`attivi` e il generatore; test unit su generazione, tocchi, vincitore, errore.
2. **Regole Il più grande**: `piugrande.ts`; test unit su generazione (distinti, distanza), vincitore, errore.
3. **Registro e impostazioni**: righe in `index.ts`; test «ogni combinazione di impostazioni dà un `Config` coerente» per entrambi.
4. **Testi** `it`/`en` (il compilatore segnala le chiavi mancanti).
5. **Viste**: `BersagliVista.tsx`, `PiuGrandeVista.tsx`, righe in `VISTE`, CSS con token, suono `suonoColpo`.
6. **Verifica tipi e unit**: `pnpm -r typecheck` e `pnpm --filter @gdt/duello-lampo test`.
7. **E2E**: aggiornare conteggi in `duello-lampo.spec.ts` e aggiungere:
   - Bersagli: impostazioni nel pannello; una sfida con Bersagli 1 round: un bersaglio `data-bersaglio` compare in basso, toccarlo dà «Colpito!»; un tocco a vuoto in alto con «errori» attivi dà −1; a fine round compare l'esito.
   - Il più grande: in basso si tocca il numero con `data-piu-grande` (nel test la regola è letta dal DOM come per `data-bersaglio`), in alto un numero sbagliato → esito «Punto per te!» e dettagli «sbagliato».
   - Screenshot a 375 px, scuro e chiaro, per: preparazione (aggiornata), impostazioni di Bersagli e di Il più grande, Bersagli in corso (con la griglia mascherata durante le comparse, come Trova), Il più grande in corso.
   - `controllaMobile` (bersagli ≥ 44 px) è già in `schermata()`.
8. **Revisione UI** con la checklist `ui-mobile-checklist` e la verifica visiva dei due temi.
9. **Documentazione**: README, `docs/test.md`, `docs/decisioni.md`, CHANGELOG.
10. **Commit** (il push lo fa l'utente).

Ordine consigliato: 1 e 2 insieme (sono indipendenti), poi 3–5, poi 6, 7, 8, 9.

Per il test di tempo reale: Bersagli dura 8 s; la suite e2e tollera l'attesa (come Raffica da 5 s), ma si può ridurre il numero di round nei test per tenere breve la suite.

---

## 5. Domande per l'utente (con risposta consigliata)

1. **Penalità di Bersagli**: «gli errori contano −1» colpisce una volta per round (chi ha almeno un tocco a vuoto), perché il contratto `errore` è un booleano per round. Contare ogni tocco a vuoto richiederebbe di cambiare il contratto di tutti i mini giochi. **Consigliato**: una volta per round.
2. **Tocco sbagliato in Il più grande**: perde il round (come Colore giusto e Trova). L'alternativa (il numero sbagliato si blocca e si può ritentare) è più indulgente ma diversa dagli altri mini giochi. **Consigliato**: perde il round.
3. **Suoni**: Bersagli ha un suono di colpo (`suonoColpo`); Il più grande niente suono nuovo (esito con i suoni esistenti). **Consigliato**: così. Un suono di sbaglio darebbe più chiarezza ma è un suono in più da curare.
4. **Attesa in Il più grande**: i numeri compaiono subito dopo il conto alla rovescia (nessuna attesa). Un'attesa casuale (come Colore giusto) aggiunge suspense, ma va spiegata nella regola. **Consigliato**: nessuna attesa.
5. **Mani di default**: con 10 mini giochi, 2 mani ciascuno fanno 20 round (prima 16). **Consigliato**: restare a 2 per tutti, perché il default resta coerente; in alternativa 0 per i due nuovi (sono i più lunghi: 8 s e 6 s).
6. **Versione**: i due giochi sono una novità, quindi **MINOR** (0.26.0) se si rilasciano insieme nello stesso commit, con il tag `v0.26.0` locale. **Consigliato**: un solo rilascio per entrambi.
7. **Traduzioni inglesi**: propongo le versioni in `en.ts` nel piano (sezioni 1.7 e 2.7); l'utente le può rivedere.

---

## 6. Stima

| Parte | Stima |
|---|---|
| Regole, generatore, test unit (entrambi) | 0,75 g |
| Viste, CSS, suono | 0,75 g |
| Impostazioni, testi, registro, README | 0,25 g |
| E2E, aggiornamento dei conteggi, screenshot in due temi, controllo visivo | 0,75 g |
| Documentazione (`test.md`, `decisioni.md`, CHANGELOG) | 0,25 g |
| **Totale** | **circa 2,5 giornate** (di cui 1 g di test e verifica visiva) |

Rischi principali: la scelta della griglia 4×4 di Bersagli sui telefoni bassi (da verificare a 375 × 667); la rigenerazione degli screenshot esistenti (`preparazione` e i test che dipendono dall'ordine casuale).
