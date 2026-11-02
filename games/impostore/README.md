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

### Prima volta: autorizza il telefono a collegarsi al computer

**Cosa stiamo facendo.** Quando lanci `pnpm dev:telefono`, il tuo computer diventa
per qualche minuto un piccolo "sito web" visibile dentro casa: il telefono lo apre
come aprirebbe un qualunque sito. Ma Windows ha una protezione (il *firewall*) che
rifiuta di default le connessioni che arrivano da altri dispositivi, perché in generale
potrebbero essere pericolose.

**Perché serve.** Senza questo passaggio il telefono resta in attesa e alla fine
dice "impossibile raggiungere il sito", anche se tutto il resto è giusto. Di solito
Windows chiede da solo il permesso, ma se quella finestra viene chiusa o rifiutata
il blocco resta e non riappare più.

**Cosa autorizziamo, e cosa no.** Creiamo una regola che permette **solo a
Node.js** (il programma che fa girare il gioco in sviluppo) di ricevere
connessioni, e **solo sulle reti "Private"** (il WiFi di casa). Sul WiFi di un bar,
di un hotel o di un locale la regola non vale, quindi il computer resta protetto.
Non viene installato nulla e la regola si può togliere in qualsiasi momento.

**Come si fa** (una volta sola, poi non serve più):

1. Premi il tasto **Windows** sulla tastiera e scrivi `PowerShell`.
2. Clic destro su **Windows PowerShell** → **Esegui come amministratore** → **Sì**.
   (Servono i permessi di amministratore perché stai cambiando una protezione del
   computer: per questo Visual Studio Code non può farlo al posto tuo.)
3. Nella finestra blu che si apre, incolla questo comando, **tutto su una riga**, e
   premi **Invio**:

   ```
   New-NetFirewallRule -DisplayName "Node.js sviluppo (rete di casa)" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow -Profile Private
   ```

4. Se compare un elenco con `Enabled : True`, la regola è creata. Chiudi la finestra blu.

*Per toglierla in futuro:* apri PowerShell come amministratore e incolla
`Remove-NetFirewallRule -DisplayName "Node.js sviluppo (rete di casa)"`.

### Ogni volta: apri il gioco sul telefono

1. Nel terminale di Visual Studio Code scrivi e premi **Invio**:

   ```
   pnpm dev:telefono
   ```

2. Compare un messaggio con più indirizzi, per esempio:

   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.145:5173/
   ➜  Network: http://172.20.208.1:5173/
   ```

   Ti serve l'indirizzo `Network` che **inizia con `192.168.`** (qui: `192.168.1.145`):
   è quello con cui il computer si presenta sul WiFi di casa. Gli altri `Network`
   (per esempio quelli che iniziano con `172.`) sono reti interne del computer e il
   telefono non le raggiunge: ignorali. L'indirizzo `Local` funziona solo sul computer.
   I numeri sul tuo computer saranno diversi: cerca sempre quello che inizia con `192.168.`

3. Scrivi quell'indirizzo, preciso e completo (con `http://` e `:5173`), nel browser del telefono.
4. Tocca **Impostore**.

### Se sul telefono non si apre nulla

Controlla nell'ordine:

1. **Stessa WiFi**: il telefono deve essere sul WiFi di casa, non sui dati mobili.
2. **Autorizzazione fatta?** Se non hai ancora fatto la parte "Prima volta" qui sopra,
   falla: è la causa più comune.
3. **Indirizzo giusto?** Deve iniziare con `192.168.` ed essere scritto per intero.
4. **Rete degli ospiti**: su un WiFi "ospiti" o di un hotel/locale i dispositivi spesso non
   possono vedersi tra loro e questo metodo non funziona.
5. **Il comando è ancora in esecuzione?** Se hai premuto Ctrl + C o chiuso il terminale,
   il "sito" non esiste più: rilancia `pnpm dev:telefono`.

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
