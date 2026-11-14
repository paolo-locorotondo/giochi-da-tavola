# Piano: Lupus, personaggi e regole ufficiali

Stato: in corso (passi 1-4 fatti). Data piano: 2026-11-14. Riferimento se il contesto si riempie: decisioni, ordine di lavoro, avanzamento.

Fonte: il regolamento cartaceo del gioco da tavola che l'utente possiede. **Non è nel repo** (testo protetto): qui ci sono solo le regole, spiegate con parole nostre. I testi dei personaggi e del regolamento in `data/` e `locales/` si scrivono da zero.

## Decisioni (utente, 2026-11-14)

1. **Medico → poteri della Guardia del corpo**, nome visibile «Medico» e chiave `medico` nel codice (parole comuni, non protette; così restano i suoni e le partite salvate si riconoscono).
2. **Solo il voto ufficiale** (due turni). Il vecchio voto con ballottaggio sparisce.
3. **Da 8 giocatori** (massimo 24), come da regolamento.
4. Nomi restano **Contadino** e **Lupo**; gli altri nomi sono parole comuni italiane.
5. Chiarimenti:
   - Gufo Letale (20+): il «gufato» muore all'inizio del giorno se non è un mannaro (lupo o criceto).
   - Il veggente che guarda il Criceto legge «È un criceto mannaro: morirà insieme allo sbranato dai lupi». A morire è il Criceto (non il veggente), quindi la frase è in terza persona.
   - La Guardia può proteggere la stessa persona più notti di fila, mai se stessa.
   - **Primo giorno**: la prima notte nessuno muore (la vittima è il moderatore, cioè il telefono; resta come opzione, attiva di default). Il giorno dopo si discute **e si vota normalmente**: si linciano comunque. Nello spareggio il «Benvenuto!» ce l'ha il moderatore, che siede prima del primo nome: l'elenco dei nomi è in **ordine orario** e il primo in elenco è il primo dopo il moderatore, quindi vince lo spareggio (si chiede di scrivere i nomi in senso orario).

## Regole da implementare

**Composizione.** Lupi: 2 da 8 a 15 giocatori, 3 da 16. Un veggente. Gli speciali compaiono dal numero minimo: Medium 9, Indemoniato 10, Medico (Guardia) 11, Gufo 12, Massoni 13 (sempre 2), Criceto 15, Mitomane 16. Il resto Contadini. Composizione automatica con possibilità di togliere o aggiungere gli speciali nella schermata iniziale.

**Notte** (ordine scelto da noi: il regolamento fissa solo veggente prima dei lupi e guardia prima dei lupi): Medium (dalla 2ª notte) → Massoni (solo la 1ª) → Gufo → Medico → Veggente → Lupi → Mitomane (fine della 2ª notte). Ogni fase si gioca anche se chi ha il ruolo è morto, senza mostrare risultati.
- Prima notte senza vittima (opzione): i lupi si riconoscono soltanto.
- Medico: dalla 2ª notte, protegge uno che non sia lui; se i lupi scelgono il protetto, nessuno muore.
- Medium: «sì/no» sul linciato del giorno prima (il Criceto conta come umano).
- Veggente: vede «lupo / non lupo»; per il Criceto un messaggio dedicato. Il Mitomane diventato lupo si vede come lupo.
- Criceto: non si può sbranare (se lo scelgono nessuno muore); se il veggente lo guarda muore all'alba insieme allo sbranato (lettura letterale: se quella notte nessuno muore, non muore nemmeno lui).
- Gufo: indica uno a ogni notte; Gufo Letale (20+) lo uccide all'alba se non è mannaro. Due morti in una notte: il «Benvenuto!» va allo sbranato dai lupi.
- Mitomane: una sola volta, indica un vivo; lupo → diventa lupo, veggente → diventa veggente, altrimenti resta umano. Da lì si sveglia con quel ruolo e la scelta è comune.

**Giorno.** Discussione (timer di 3 minuti, facoltativo, nessun blocco). Poi:
1. **Primo turno**: votano tutti, **anche i fantasmi** (cioè i morti). I due più votati sono gli indiziati; pareggi risolti da chi è più vicino, in senso orario, a chi ha il «Benvenuto!» (l'ultimo morto, o il primo nome dell'elenco il primo giorno).
2. Il Gufo (non letale) aggiunge il «gufato» tra gli indiziati; se era già indiziato non cambia nulla.
3. Arringhe dei due indiziati.
4. **Secondo turno**: votano solo i vivi non indiziati, in segreto e insieme; chi ha più voti è linciato; parità risolta ancora dal «Benvenuto!».
- I morti non parlano; non rivelano il ruolo (opzione «il narratore dice il ruolo di chi muore» da tenere ma **spenta di default**).

**Fine.** Umani: muoiono tutti i lupi. Lupi: sono almeno quanti gli altri vivi (Indemoniato e Criceto contano come umani). Vincono anche i morti della fazione. L'Indemoniato vince con i lupi. **Il Criceto, se vivo a fine partita, vince da solo** (nessun altro vince).

## Ordine di lavoro

Ogni passo è un commit. Versione: dal passo 2 in poi MINOR a fine passo (SemVer, `CHANGELOG.md`); il passo 1 è interno.

1. **Riorganizzare il motore, senza cambiare il gioco**: fasi notturne come elenco ordinato di descrittori (quando si sveglia, chi può scegliere, effetto), invece di `dopoLupi`/`dopoVeggente`; `fazione(ruolo)`; vittoria come «fine partita + elenco dei vincitori»; `ruoliIniziali` accanto a `ruoli`; UI (`Notte`, `TITOLO_NOTTE`, `FINE_TURNO`, narratore) guidata dai descrittori. I test di `regole.test.ts` restano verdi.
2. **Preparazione**: 8–24 giocatori, 2/3 lupi, composizione per numero di giocatori e schermata per modificarla, veggente prima dei lupi, prima notte senza vittima, regole del Medico (Guardia), ruolo dei morti spento di default. Partite salvate di versioni precedenti: se incompatibili si riparte da zero.
3. **Voto ufficiale** a due turni (fantasmi, indiziati, arringhe, voto segreto, «Benvenuto!», timer, primo nome dell'elenco = prima posizione). Come si fa su un telefono: primo turno con contatori (+/−) per tutti i giocatori; secondo turno solo tra i due indiziati, con i voti raccolti dal narratore.
4. **Personaggi semplici**: Indemoniato, Massoni, Medium.
5. **Criceto mannaro**: terzo vincitore e incroci con veggente, medico, lupi.
6. **Gufo e Gufo Letale**.
7. **Mitomane** (cambio di ruolo in partita).

Per ogni ruolo nuovo: testi nostri in `data/{it,en}/personaggi.json` e `locales/{it,en}.ts`; frasi del narratore; verso di morte in `SUONO_MORTO` (anche riusando uno esistente); test degli incroci con gli altri ruoli; `README` (elenco ruoli, «Personaggi: cosa si cambia», Cosa controllare); screenshot a 375 px, scuro e chiaro, checklist `ui-mobile-checklist`.

## Punti ancora da decidere (non bloccanti)

- Nessuno aperto al momento. Se nel provare emergono dubbi sulle regole (es. Criceto e notte senza morti), si annotano qui.

## Stato di avanzamento

- [x] 1. Motore a descrittori (`FASI_NOTTE`, `fazione`, `finePartita`, `ruoliIniziali` in `logica.ts`; la UI della notte ne deriva; le frasi del narratore restano per fase)
- [x] 2. Preparazione (8–24 giocatori, composizione modificabile, veggente prima dei lupi, prima notte senza vittima, Medico = Guardia)
- [x] 3. Voto ufficiale
- [x] 4. Indemoniato, Massoni, Medium
- [x] 5. Criceto mannaro
- [ ] 6. Gufo
- [ ] 7. Mitomane
