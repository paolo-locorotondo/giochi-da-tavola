# Impostore

Un gioco da fare in compagnia, con un solo telefono che passa di mano.
Servono **almeno 3 persone**.

## Come si gioca

Tutti ricevono la stessa **parola segreta**, tranne uno (o più): **l'impostore**, che non la conosce.

1. Il telefono passa di mano. Ognuno guarda la propria carta in segreto: vede la parola, oppure scopre di essere l'impostore.
2. Si parte da chi indica l'app e si va in cerchio. Ognuno dice a voce **un indizio** sulla parola, senza dirla. L'impostore deve bluffare e fingere di conoscerla.
3. Si discute e si **vota** chi sembra l'impostore.
4. Se i giocatori **sbagliano** e votano un innocente, vince l'impostore.
5. Se **scoprono** l'impostore, lui ha un'ultima occasione: se **indovina la parola** vince lui, altrimenti vincono gli altri.

---

## Provarlo sul computer

Questi passi servono per vedere il gioco funzionare mentre lo sviluppiamo.

### La prima volta

1. Apri **Visual Studio Code** nella cartella `giochi-da-tavola`.
2. Dal menu in alto scegli **Terminale → Nuovo terminale**. In basso si apre una finestra nera (o scura) dove si scrivono i comandi.
3. Scrivi questo comando e premi **Invio**. Serve a scaricare ciò che il gioco richiede, e va fatto solo la prima volta (e dopo che ti dico di aver aggiunto qualcosa di nuovo):

   ```
   pnpm install
   ```

   Aspetta che finisca: di solito pochi secondi. Quando riappare la riga dove puoi scrivere, è finito.

### Ogni volta che vuoi giocare

1. Nel terminale scrivi e premi **Invio**:

   ```
   pnpm dev
   ```

2. Dopo un attimo compare un messaggio simile a questo:

   ```
   ➜  Local:   http://localhost:5173/
   ```

3. Tieni premuto **Ctrl** e clicca su quell'indirizzo (oppure copialo e incollalo nel browser).
4. Si apre la pagina **Giochi da tavola**. Tocca **Impostore**: la partita comincia da qui.

**Per fermare tutto**: clicca nel terminale e premi **Ctrl + C**. Poi puoi chiuderlo.

> Se modifichiamo il gioco mentre la pagina è aperta, si aggiorna da sola. Non serve rifare nulla.

---

## Provarlo sul telefono

Il telefono e il computer devono essere collegati **alla stessa rete WiFi**.

1. Nel terminale scrivi e premi **Invio**:

   ```
   pnpm dev:telefono
   ```

2. Compare un messaggio con due indirizzi. Quello che ti serve è il secondo, che inizia con `Network` e assomiglia a questo:

   ```
   ➜  Network: http://192.168.1.25:5173/
   ```

3. Scrivi quell'indirizzo, preciso e completo, nel browser del telefono.
4. Tocca **Impostore**.

**Se sul telefono non si apre nulla**
- Controlla che i due dispositivi siano sullo stesso WiFi (non uno sui dati mobili).
- Quando avvii il comando, Windows può chiedere se permettere l'accesso alla rete: rispondi **Consenti** (anche per le reti private).
- Sul WiFi di hotel o locali la comunicazione tra dispositivi è spesso bloccata: in quel caso non funzionerà.

**Cosa non puoi provare così**: installare l'app sul telefono e usarla senza internet. Queste due cose funzionano solo sul sito pubblicato (vedi in fondo), non con questo metodo.

---

## Cosa controllare quando lo provi

Fai una partita di prova e verifica queste cose. Se una non va come descritto, dimmelo.

- [ ] Se scrivi meno di 3 nomi, compare un messaggio di errore e la partita non parte.
- [ ] Se metti troppi impostori per il numero di giocatori, compare un messaggio di errore.
- [ ] Ogni giocatore vede il proprio nome, tocca per vedere la carta e poi passa il telefono. La carta non resta visibile alla persona dopo.
- [ ] L'impostore vede "Sei l'impostore" e non vede la parola. Tutti gli altri vedono la stessa parola.
- [ ] Finite le carte, l'app dice chi deve dare il primo indizio.
- [ ] Votando una persona **innocente**, la partita finisce e vincono gli impostori.
- [ ] Votando **l'impostore**, compare un campo dove scrivere la parola.
- [ ] Scrivendo la parola giusta vincono gli impostori. Scrivendo una parola sbagliata vincono gli altri.
- [ ] La parola giusta vale anche con le maiuscole, senza accenti o con spazi in più (per esempio "TIRAMISU" per "tiramisù").
- [ ] A fine partita compaiono la parola e i nomi degli impostori. Toccando **Nuova partita** si torna all'inizio.
- [ ] Giocando più partite di seguito nella stessa categoria, la parola non si ripete subito.

---

## Se qualcosa non funziona

| Cosa vedi | Cosa fare |
|---|---|
| `pnpm` non è riconosciuto | Chiudi e riapri Visual Studio Code, poi riprova. Se non basta, scrivimelo. |
| Il comando `pnpm dev` dà un errore | Prova prima `pnpm install`, poi di nuovo `pnpm dev`. Se l'errore resta, copiami il messaggio. |
| La pagina non si apre | Controlla che il terminale mostri ancora l'indirizzo e che non l'abbia fermato con Ctrl + C. |
| "Porta già in uso" | C'è già un altro terminale aperto con `pnpm dev`. Chiudilo con Ctrl + C. |

---

## Pubblicare il gioco online

Impostore non ha un sito suo: è dentro l'app **Giochi da tavola**, che si pubblica **una volta sola per tutti i giochi**. I passi sono nel [README principale](../../README.md#pubblicare-online).

---

## Per chi sviluppa

### Struttura

```
src/logic/partita.ts    regole pure: partita dal seme, carta, tentativo, voto
src/logic/fasi.ts       fasi (distribuzione, indizi, voto, tentativo, fine) e vincitore
src/logic/sessione.ts   stato della partita a un telefono, riduttore testato
src/ui/                 schermate React e memoria delle parole recenti
src/parole.ts           accesso alle parole e VERSIONE_DATI
data/it/parole.json     parole per categoria
src/manifest.ts         id, nome e descrizione per il menu
```

### Test automatici

```
pnpm --filter @gdt/impostore test
```

### Aggiungere o cambiare parole

Modifica [data/it/parole.json](data/it/parole.json): una lista per categoria, senza duplicati e con almeno 20 voci (lo verifica un test). Una nuova categoria va aggiunta anche a `NOME_CATEGORIA` in `src/ui/ImpostoreApp.tsx`.

Se cambi l'ordine o il contenuto di categorie già esistenti, incrementa `VERSIONE_DATI` in `src/parole.ts`. Serve alla futura modalità con codice condiviso, dove telefoni con elenchi diversi darebbero parole diverse. La modalità a un telefono non ne risente.
