# Piano — pagina di prova per ogni gioco («laboratorio»)

Stato: **da progettare con l'utente** (2026-11-27). Base: la pagina `prova-carte.html` di Burraco, già funzionante.
Quando il lavoro è finito le scelte vanno in [decisioni.md](decisioni.md) e questo file si elimina. Come la pagina
resta fuori dal rilascio: [pagina-prova.md](pagina-prova.md).

## Perché

I bug veri nascono in situazioni rare (uno stallo in chiusura, una scala lunga, una matta che scorre) che a mano si
raggiungono solo giocando partite intere. La pagina di prova di Burraco ha dimostrato di servire: si descrive la
situazione, si preme «Prepara» e si gioca **con le regole vere**, anche i turni degli altri, per riprodurre il caso e
verificare la correzione. Va estesa a ogni gioco, con lo stesso schema e senza copiare codice.

## Cosa c'è oggi (Burraco)

| Pezzo | File |
|---|---|
| Pagina e ingresso | `apps/web/prova-carte.html`, `apps/web/src/prova-carte.tsx` |
| Costruzione della partita da una descrizione | `games/burraco/src/prova.ts` (`partitaDiProva`, `DescrizioneProva`) |
| Esportazione solo per la prova | `games/burraco/package.json` → `"./prova": "./src/prova.ts"` |
| Guardia contro la produzione | `packages/engine/src/prova-fuori-dalla-build.test.ts` |
| Gioco con le regole vere | `agisci` e `muoviBot` di `games/burraco/src/offline.ts`, `Tavolo` di `ui/Tavolo.tsx` |

Funziona perché Burraco ha già un modulo `offline.ts` che fa girare la macchina a stati online sul telefono: la
prova costruisce solo lo stato iniziale diverso e poi riusa tutto.

## L'idea comune

Una pagina sola, `apps/web/prova.html`, con un elenco dei giochi; per ognuno un **laboratorio**:

1. **Contesto** — un modulo di ingresso (`<gioco>/src/prova.ts`) dice come si descrive la situazione di partenza
   (carte in mano e sul tavolo per i giochi di carte; ruoli, fase e notte per Lupus; la griglia per Tris; parola e
   indizi per Impostore…) e la trasforma in uno stato vero del gioco.
2. **Gioco** — si gioca davvero: il proprio turno e anche quelli degli altri, con le stesse regole e gli stessi
   errori della partita normale.
3. **Salvataggio** — la situazione si può salvare e ricaricare (testo copiabile e, in `localStorage` della pagina di
   prova, un elenco di casi con nome), così un bug trovato diventa un caso da rilanciare.
4. **Casi pronti** — pulsanti per i casi già noti (lo stallo di Burraco, la matta, «tanti tris»), ciascuno anche come
   test automatico (vedi sotto).

### Il contratto di un laboratorio

```ts
export interface Laboratorio<Descrizione, Stato, Vista> {
  id: string;                       // «burraco», «lupus»…
  titolo: string;
  /** Descrizione di partenza e suo editor (campi di testo, selezioni). */
  iniziale: Descrizione;
  Editor: (p: { valore: Descrizione; onCambia: (d: Descrizione) => void }) => ReactNode;
  /** Stato vero del gioco dalla descrizione; lancia un errore leggibile se qualcosa non torna. */
  prepara: (d: Descrizione) => Stato;
  /** Chi gioca adesso e come si fa una mossa a nome suo (anche degli altri, per riprodurre il caso). */
  vista: (s: Stato, comeChi: number) => Vista;
  muovi: (s: Stato, comeChi: number, richiesta: unknown) => Stato;
  /** Casi pronti. */
  casi: { id: string; titolo: string; descrizione: Descrizione }[];
}
```

Il punto chiave è **«giocare come chi si vuole»**: oggi in Burraco i bot muovono da soli; per riprodurre un caso serve
poter scegliere in ogni momento da quale posto si guarda e si muove (un selettore «Gioco come: Tu / Bot 1 / …»), e
tenere i bot automatici come opzione, spenti di base.

## Cosa cambia per tipo di gioco

| Gioco | Contesto da descrivere | Cosa serve in più |
|---|---|---|
| Burraco | mani, combinazioni, scarti, turno, pozzetti (già fatto) | selettore «gioco come», bot opzionali, salvataggio |
| Scopa | mani, carte a terra, prese e scope, turno | come Burraco, stesso editor di carte |
| Ultima! | mani, scoperta, colore, verso, cumulo, taglio | editor delle carte colorate (non francesi) |
| Tris | griglia, chi muove | editor a griglia |
| Lupus | giocatori, ruoli, fase e giorno | selettore del ruolo di chi guarda; narratore |
| Impostore | giocatori, parola, impostori, fase, indizi | come Lupus |
| Tabù, Dadi, Duello Lampo | da valutare: poco stato nascosto, forse non servono | decidere se servono |

L'**editor di carte** (testo come «7c aq 10f j» e le regole dei doppi mazzi) è la parte da riusare: va spostato in un
pacchetto comune, `@gdt/prova` (o dentro `@gdt/carte`, nel file `prova.ts`), e usato da Burraco, Scopa e Ultima!.

## Passi proposti

| Passo | Cosa | Rischio |
|---|---|---|
| 1 | Pacchetto comune `@gdt/prova`: contratto `Laboratorio`, pagina unica `prova.html` con l'elenco, casi salvati, «gioco come». Burraco migrato. | Medio |
| 2 | Editor di carte condiviso (lettore del testo, controllo delle copie del doppio mazzo, messaggi chiari). | Basso |
| 3 | Scopa e Ultima! (stessa famiglia: carte). | Medio |
| 4 | Tris e Impostore (stato semplice). | Basso |
| 5 | Lupus (ruoli e fasi; il narratore). | Medio |
| 6 | Casi pronti come **test automatici**: ogni caso salvato diventa un test unitario del gioco che lo ricrea e verifica la regola. | Basso |
| 7 | Eliminare `prova-tavolo.html` (vecchia prova del solo tavolo) e aggiornare [pagina-prova.md](pagina-prova.md). | Basso |

## Esclusione dal rilascio (resta valida per tutti i passi)

- Le pagine `prova*.html` non stanno nel `rollupOptions.input` della build: Vite costruisce solo `index.html`.
- I moduli `games/*/src/prova.ts` si importano **solo** dalle pagine `apps/web/src/prova*.tsx`; il test
  `packages/engine/src/prova-fuori-dalla-build.test.ts` fallisce se un file di produzione li importa.
- Una verifica in più per il rilascio (passo da aggiungere a `docs/test.md` o allo script di release): dopo `pnpm build`,
  nessun file in `apps/web/dist` contiene «prova» (`grep -ril "prova-" apps/web/dist` deve essere vuoto).

## Decisioni da prendere con l'utente

1. **Una pagina per gioco o una pagina unica** con elenco (raccomandato: unica).
2. **«Gioco come»**: selettore sempre visibile, e bot automatici spenti di base.
3. **Salvataggio dei casi**: solo `localStorage` della pagina o anche file `.json` nel repo (in
   `games/<gioco>/prove/`), da cui generare i test del passo 6 (raccomandato: file nel repo per i casi che diventano test).
4. **Quali giochi** servono davvero (Tabù, Dadi e Duello Lampo hanno poco stato da riprodurre).
5. **Nome**: «Laboratorio» o «Prova» nell'interfaccia di sviluppo (non compare in produzione).
