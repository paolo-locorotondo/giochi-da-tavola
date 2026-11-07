# Piano: Tris online («ognuno col suo telefono»)

Stato: completato (passo 5 in 0.11.0). Data piano: 2026-11-07. Questo file è il riferimento se il contesto si riempie:
contiene decisioni, ordine di lavoro e stato di avanzamento.

## Contesto

- Tris (`games/tic-tac-toe`, v0.9.0) oggi è solo a un telefono (contro il telefono o in due).
- `apps/server` è specifico di Impostore: `stanze.ts` importa `@gdt/impostore/online`, il tipo
  `DaClient` / `AzioneClient` / `Stanza.stato` è di Impostore, `eseguiAzione` contiene i permessi
  di Impostore (`occupa`, `libera`, `riprendi`, `avvia`, `avanti`, `visto`, `indizio`, `vota`,
  `tenta`, `nuova`).
- `index.ts` gestisce: HTTP statico, `/salute`, WebSocket `/ws`, messaggi `crea`, `entra`,
  `azione`, `sollecita`, `chiudi`, heartbeat (25 s), connessioni per token, pulizia stanze
  inattive (6 h), limite stanze (300).

## Decisioni

1. **Server generico con registro di giochi** (non un canale separato). Lupus arriverà dopo
   e il server deve già reggere più giochi.
2. Ogni gioco online espone un modulo `games/<gioco>/src/online` con la stessa forma:
   ```ts
   interface GiocoOnline<Stato, Config, Azione, Vista> {
     id: string;
     nuovoStato(nomi: string[], config: Config): Stato;
     // Traduce la richiesta del telefono in azione di gioco, controllando i permessi.
     // Lancia un errore con messaggio (codice) se non è permessa.
     traduci(stato: Stato, ctx: { posto: number | null; host: boolean; connesso: ...; }, richiesta: Richiesta): Azione | Effetto;
     applica(stato: Stato, azione: Azione): Stato;
     vistaPer(stato: Stato, posto: number | null, host: boolean): Vista;
   }
   ```
   Gli effetti che non sono azioni di stato (es. `riprendi`, `libera` in partita, cambio
   organizzatore) restano gestiti in modo comune oppure via un hook `mutaStanza` del gioco.
   Da decidere in fase 1 in base al codice reale di `permessi.test.ts`.
3. Messaggi: `crea` riceve `gioco: string` (default `"impostore"` per compatibilità).
   `Stanza` ha `gioco: string`. Il server cerca il modulo nel registro `GIOCHI_ONLINE`.
4. Codici stanza, token, riconnessione, heartbeat, chiusura, pulizia: **comuni**, invariati.
5. Tris online:
   - Fasi: `sala` (due posti, X e O) → `partita` → `fine` → rivincita.
   - Stato: `Partita` (da `logica.ts`), posto di X, `Punteggio` della serie, chi ha iniziato.
   - Azioni: `occupa` / `libera` (solo in sala), `muovi(casella)` (solo chi ha il turno, dal
     proprio telefono), `rivincita` (richiesta da entrambi, oppure dall'organizzatore: da
     decidere in fase 2; default proposto: entrambi).
   - Rivincita: chi inizia alterna a ogni partita (come dice il TODO in `decisioni.md`).
   - Vista: stato di gioco + posti collegati. Nessun segreto.
   - Spettatori: chi entra senza posto guarda (vista senza posto).
   - Avversario caduto: rientra con il token. Se non torna: messaggio «In attesa di …» con
     opzione «Continua contro il telefono» (riuso di `mossaTelefono`). Fase 3.
6. Fuori scopo per ora: partita veloce con coda (idea del vecchio progetto `../tic-tac-toe`),
   timer per mossa.

## Ordine di lavoro

1. **Server generico**: interfaccia `GiocoOnline`, registro, `stanze.ts` e `index.ts` senza
   riferimenti a Impostore; Impostore spostato dietro il modulo `games/impostore/src/online`.
   Test esistenti (`permessi.test.ts`, `stanze.test.ts`) devono passare senza modifiche di
   comportamento.
2. **Modulo online del Tris** `games/tic-tac-toe/src/online` (stato, azioni, permessi, vista)
   + test sulla logica pura (vitest).
3. **UI online del Tris**: sala a due posti, griglia, rivincita, stato collegamento. Testi in
   `locales/{it,en}.ts`. Verifica visiva a 375 px, tema scuro e chiaro, checklist
   `ui-mobile-checklist`.
4. **README** del gioco (come provarlo in due, Deploy) e chiusura del TODO in
   `docs/decisioni.md`. Voce in «Non rilasciato» di `CHANGELOG.md`.
5. Più avanti: partita veloce con coda.

## Vincoli di progetto (da CLAUDE.md)

- Logica pura e deterministica, separata dalla UI. Nessun testo visibile nei `.tsx` né nella logica.
- Versione: modifica grande → decidere alla fine se rilasciare (SemVer, `CHANGELOG.md`).
- Commit in autonomia, **push solo l'utente**.
- Verifica: typecheck, test e build non bastano per la UI; screenshot 375 px scuro/chiaro.

## Stato di avanzamento

- [x] 1. Server generico (contratto `GiocoOnline` in `packages/engine/src/online.ts`, registro `apps/server/src/giochi.ts`, Impostore in `games/impostore/src/online/modulo.ts`; posti occupa/libera/riprendi restano nel server)
- [x] 2. Modulo online Tris + test (`games/tic-tac-toe/src/online/gioco.ts`, registrato in `apps/server/src/giochi.ts`; test in `gioco.test.ts` e `apps/server/src/tris.test.ts`). Messaggi: `crea` con `gioco: "tris"`, `nomi` di 2 giocatori, `config` ignorata; azioni `occupa`, `libera`, `avvia` (host), `muovi {casella}`, `rivincita`. Errori = codici `ErroreTris` (da tradurre nella UI come `errore_<codice>`).
- [x] 3. UI online Tris (`games/tic-tac-toe/src/ui/Tris.tsx`, `online/TrisOnline.tsx`; hook condiviso in `packages/collegamento`; e2e `apps/web/e2e/tris-online.spec.ts`)
- [x] 4. README, decisioni.md, CHANGELOG (rilasciato 0.10.0)
- [x] 5. Partita veloce con coda (rilasciata 0.11.0: `apps/server/src/coda.ts`, `coda` in `GiocoOnline`, `PartitaVeloce` in `TrisOnline.tsx`, e2e `tris-coda.spec.ts`; nomi uguali → suffisso «(2)»; scadenza 2 min)

## Passo 5 (fatto): partita veloce con coda

Stato al 2026-11-07: Tris online rilasciato in 0.10.0 (commit bcf82cf, tag v0.10.0, push a carico dell'utente). Qui sotto lo schema di partenza, da rivedere guardando il codice.

Idea (dal vecchio progetto `../tic-tac-toe`, solo l'idea): in `/tris`, modalità online, un pulsante «Partita veloce». Si scrive solo il proprio nome; il server accoda il telefono e, appena ce ne sono due in attesa, crea la stanza, li siede (il primo in coda = X e organizzatore) e avvia la partita. Nessun codice da condividere.

Schema tecnico proposto:
- Nuovi messaggi `DaClient`: `{ t: "coda", gioco, nome, token? }` e `{ t: "esciDaCoda" }`; risposta `{ t: "inCoda" }` e poi il solito `benvenuto` + `vista` quando è stato abbinato.
- `apps/server`: coda in memoria per gioco (`Map<gioco, { token, nome, connessione }[]>`), abbinamento a coppie nell'ordine di arrivo. Il gioco dichiara se supporta la coda (campo opzionale su `GiocoOnline`, es. `coda?: { giocatori: 2 }`, e un `nuovoStatoDaCoda`/uso di `nuovoStato(nomi)` + `occupa` dei posti + `avvia`).
- Va tolto dalla coda chi chiude la connessione, chi esce, chi aspetta troppo (es. 2 minuti: messaggio «Nessun avversario, riprova o gioca contro il telefono»). Due nomi uguali: il server li distingue (es. suffisso) oppure l'UI li accetta perché i posti sono per posto, non per nome (da decidere: `nuovoStato` oggi rifiuta nomi uguali).
- Limite alla coda (es. 50 voci) e stessa pulizia delle stanze.
- UI: pulsante nella schermata «Crea» (secondario, non primario), stato «In coda…» con «Annulla», poi entra nella partita già avviata. Testi in `locales/{it,en}.ts`, e2e con due contesti che premono «Partita veloce».
- Test: server (abbinamento, uscita, disconnessione, scadenza), e2e, README del gioco, CHANGELOG (MINOR 0.11.0 se rilasciato).
