# Coordinamento del lavoro in parallelo (5 filoni)

File di stato per riprendere il lavoro in qualsiasi momento (anche in una nuova sessione).
Chi riprende: leggi questo file, poi `git branch -a`, `git worktree list` e `git log --oneline -15`
per vedere a che punto siamo; aggiorna la sezione «Stato» ogni volta che cambia qualcosa.

## Filoni e piani

| # | Filone | Piano |
|---|---|---|
| 1 | Partita veloce a stanze aperte | [piano-partita-veloce.md](piano-partita-veloce.md) |
| 2 | Burraco | [piano-burraco.md](piano-burraco.md) |
| 3 | Scopa | [piano-scopa.md](piano-scopa.md) |
| 4 | Duello Lampo: Bersagli e Il più grande | [piano-duello-lampo-minigiochi.md](piano-duello-lampo-minigiochi.md) |
| 5 | Ultima!: varianti | [piano-ultima-varianti.md](piano-ultima-varianti.md) |
| 0 | Basi comuni: contratto `veloce` in `@gdt/engine`, `ctx.ora()`, pacchetto `@gdt/carte` | sezioni dei piani 1, 2, 3, 5 |

## Regole di coordinamento

- Il coordinatore (sessione principale) è l'unico che unisce a `main`, sceglie le versioni, crea i tag
  e tocca `pnpm-lock.yaml`, `apps/web/src/App.tsx`, `apps/server/src/giochi.ts`, `apps/web/package.json`
  (versione) e `CHANGELOG.md` (spostamento da «Non rilasciato» a una versione).
- Ogni agente lavora in un proprio **git worktree** e su un proprio branch, **committa spesso** sul suo branch
  (così nulla si perde se la sessione si interrompe), non alza versioni, non crea tag, non fa push.
- Gli agenti scrivono nel CHANGELOG solo sotto «Non rilasciato».
- Se un agente deve cambiare codice comune (engine, server, collegamento, tema, pacchetti condivisi) si ferma e lo segnala
  al coordinatore: la modifica si fa una volta su `main` e gli altri fanno rebase.
- Il push lo fa sempre e solo l'utente (anche `git push --tags`).
- Ogni worktree ha il suo `pnpm install` e porte diverse per Vite, server e Playwright.

## Decisioni dell'utente (2026-11-21)

Tutte «come consigliato nei piani» salvo dove indicato.

**Partita veloce** (domande 1–14 del piano partita veloce):
- Tempo scaduto sotto il minimo: niente bot; l'organizzatore sceglie «Aspetta ancora» / «Gioca con un solo telefono» / «Chiudi la stanza»; senza risposta la stanza si chiude dopo 60 s.
- Organizzatore che esce: passa al prossimo in ordine di arrivo; la stanza si chiude solo se esce l'ultimo.
- Tempo d'attesa scelto dall'organizzatore: 1, 2, 3, 5 minuti, base 2.
- «Annulla» nei 10 s di conto: riparte un tempo d'attesa intero. Posti riempiti durante il conto: parte subito.
- Squadre: «in ordine di arrivo» = 1°+3° contro 2°+4°; «a caso»; «scelte in sala». Per «scelte in sala» il conto a sala piena è di **30 s** (non 10); se scade senza scelta si usa l'ordine di arrivo. Se l'organizzatore sistema le coppie prima, parte subito.
- Avvio anticipato solo per giochi senza squadre (Ultima!). Impostazioni viste prima di agganciarsi: solo «Entra» / «Indietro». Posto tenuto 30 s con schermo bloccato. Nomi uguali «Anna (2)».
- Tris: l'URL mostra il codice già in attesa, il refresh non fa perdere il posto.
- Impostore: niente partita veloce per ora, **da segnare come TODO nel README di Impostore e in decisioni.md**.
- Architettura confermata: la sala vive nel server, i giochi ricevono tutti i nomi insieme all'avvio.
- Le **varianti** (Ultima! e simili) sono impostazioni iniziali della stanza, scelte dall'organizzatore che apre la partita veloce; chi si aggancia le accetta (come le impostazioni di Lupus).

**Ultima! varianti**: +2/+4 incrociati no; «Più carte uguali» include Salta e +2 oltre ai numeri; taglio 3 s e il taglio altrui non chiude la finestra «Ultima!»; Scambio e Rotazione: due copie ciascuna (mazzo 112), colore scelto da chi le cala, 50 punti, nomi Scambio/Rotazione (Swap/Rotate), icone `Handshake` e `RotateCw`.

**Burraco**: come consigliato (2 e 4, 2005, pila bloccata con opzione «pila libera», niente burraco di tris, compagno bot, rimandati sostituzione matta e trascinamento, stanza veloce con scadenza più lunga e avvio solo dell'organizzatore). Le voci `[verificare]` le controlla l'agente (web); dove non riesce restano quelle consigliate, segnate «da verificare» nel README.

**Scopa**: come consigliato; cifre verificate se possibile, altrimenti segnate «da verificare» nel README.

**Duello Lampo**: come consigliato (penalità una per round, il tocco sbagliato in «Il più grande» fa perdere il round, suono per il colpo, niente attesa casuale, 2 mani per mini gioco = 20 round, un solo rilascio MINOR).

**`@gdt/carte`**: si crea subito nelle basi comuni, prima di Burraco e Scopa.

## Ordine di lavoro

0. Basi comuni (merge su `main` prima degli altri): (a) contratto `veloce` e tipi in `@gdt/engine` + `ctx.ora()`, senza cambi di comportamento; (b) pacchetto `@gdt/carte`.
1. Subito in parallelo, indipendente: Duello Lampo (filone 4).
2. Dopo le basi: server e UI della partita veloce (1), varianti di Ultima! (5), logica e bot contro i bot di Scopa (3) e Burraco (2).
3. Poi in sequenza: online di Scopa e Burraco, adozione della partita veloce in Tris e Ultima!, taglio e più carte uguali di Ultima!.

## Come si lavora (worktree manuali)

Lo strumento automatico dei worktree non funziona su questo PC (confonde `f:` e `F:`), quindi i worktree
si creano a mano, **fuori dal repo**, in `F:\Paolo_Work\MyProjects\gdt-worktrees\<nome>`:

```
git worktree add ../gdt-worktrees/<nome> -b lavoro/<nome> main
```

Gli agenti si lanciano senza isolamento automatico, con il percorso del worktree scritto nel prompt.
Per vedere lo stato: `git worktree list`, `git log --oneline main..lavoro/<nome>` in ogni branch.
Gli e2e usano le porte 5199 e 8081: **un solo agente alla volta** li lancia.

## Come riprendere dopo un'interruzione

1. `git worktree list` e, per ogni `lavoro/*`, `git status` e `git log --oneline main..HEAD`: i commit sono già salvati; il lavoro non committato sta nella cartella del worktree.
2. Un agente interrotto si rilancia con lo stesso prompt del filone più «Riprendi dal punto in cui è arrivato: guarda `git log` e `git status` del tuo worktree».
3. Aggiorna la tabella qui sotto.

## Stato

Aggiorna questa tabella a ogni passo (da fare / in corso / pronto da unire / unito a main).

| Blocco | Branch / worktree | Stato |
|---|---|---|
| Piani (5 file) | main | unito |
| 0a Contratto `veloce` + `ctx.ora()` in engine | lavoro/base-engine | in corso (2026-11-21) |
| 0b `@gdt/carte` | lavoro/base-carte | in corso (2026-11-21) |
| 4 Duello Lampo (Bersagli, Il più grande) | lavoro/duello-lampo | in corso (2026-11-21) |
| 1 Partita veloce (server + UI) | — | da fare, dopo 0a |
| 5 Ultima! varianti | — | da fare, dopo 0a |
| 3 Scopa | — | da fare, dopo 0a e 0b |
| 2 Burraco | — | da fare, dopo 0a e 0b |
