# Provare l'app sul computer e sul telefono

Guida passo passo, valida per tutti i giochi. I comandi in sintesi sono in [sviluppo.md](sviluppo.md).

## Sul computer

**La prima volta** (e dopo un aggiornamento delle dipendenze):

1. Apri Visual Studio Code nella cartella `giochi-da-tavola`.
2. Menu **Terminale → Nuovo terminale**.
3. Scrivi `pnpm install` e premi Invio. Aspetta che riappaia la riga dei comandi.

**Ogni volta**:

1. Nel terminale scrivi `pnpm dev` e premi Invio.
2. Compare `➜  Local:   http://localhost:5173/`: **Ctrl + clic** sull'indirizzo (o incollalo nel browser).
3. Si apre **Giochi da tavola**: scegli il gioco.

Per fermare tutto: clicca nel terminale e premi **Ctrl + C**. Se modifichi il codice a pagina aperta, la pagina si aggiorna da sola.

`pnpm dev` avvia insieme il sito e il server di gioco (porta 8081, così non confligge con Docker): funziona anche **"ognuno col suo telefono"**.
Per giocare davvero (o provare installazione e offline) usa invece `docker compose up`: [guida-giocare-con-il-pc.md](guida-giocare-con-il-pc.md).

## Sul telefono (stessa rete WiFi)

Il telefono e il computer devono essere sulla **stessa rete WiFi**.

### Prima volta: autorizza il firewall di Windows

**Perché.** Con `pnpm dev` il computer diventa per qualche minuto un piccolo sito visibile dentro casa. Il firewall di
Windows rifiuta di default le connessioni che arrivano da altri dispositivi: senza questo passaggio il telefono resta in
attesa e dice "impossibile raggiungere il sito". Di solito Windows chiede il permesso da solo, ma se la finestra viene
chiusa o rifiutata il blocco resta.

**Cosa autorizziamo.** Una regola che permette **solo a Node.js** di ricevere connessioni, **solo sulle reti "Private"**
(WiFi di casa). Su reti di bar o hotel non vale. Non si installa nulla e si può togliere quando vuoi.

**Come** (una volta sola):

1. Tasto **Windows**, scrivi `PowerShell`.
2. Clic destro su **Windows PowerShell → Esegui come amministratore → Sì** (servono i permessi perché cambi una protezione del computer).
3. Incolla, **tutto su una riga**, e premi Invio:

   ```
   New-NetFirewallRule -DisplayName "Node.js sviluppo (rete di casa)" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow -Profile Private
   ```

4. Se compare un elenco con `Enabled : True`, è fatto.

Per toglierla: `Remove-NetFirewallRule -DisplayName "Node.js sviluppo (rete di casa)"` (sempre da PowerShell amministratore).

### Ogni volta

1. Nel terminale: `pnpm dev`.
2. Compaiono più indirizzi, per esempio:

   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.20:5173/
   ➜  Network: http://172.20.0.1:5173/
   ```

   Serve quello `Network` che **inizia con `192.168.`**. Gli altri (per esempio `172.`) sono reti interne del computer; `Local` funziona solo sul computer.
3. Scrivi quell'indirizzo, completo di `http://` e `:5173`, nel browser del telefono e scegli il gioco.

### Se sul telefono non si apre nulla

1. **Stessa WiFi**: il telefono non deve usare i dati mobili.
2. **Firewall**: hai fatto la parte "Prima volta"? È la causa più comune.
3. **Indirizzo**: deve iniziare con `192.168.` ed essere scritto per intero.
4. **WiFi ospiti / hotel / locali**: spesso i dispositivi non si vedono tra loro e questo metodo non funziona.
5. **Il comando è ancora in esecuzione?** Se hai premuto Ctrl + C o chiuso il terminale, rilancia `pnpm dev`.

### Cosa non si può provare così

Installare l'app e usarla **senza internet**: serve la build vera (`docker compose up`, solo su `localhost`) oppure il sito pubblicato.
Dettagli: [app-installabile.md](app-installabile.md).

## Se qualcosa non funziona

| Cosa vedi | Cosa fare |
|---|---|
| `pnpm` non è riconosciuto | Chiudi e riapri Visual Studio Code, poi riprova |
| `pnpm dev` dà un errore | Prova `pnpm install`, poi di nuovo `pnpm dev`. Se resta, copia il messaggio |
| La pagina non si apre | Controlla che il terminale mostri ancora l'indirizzo e che non l'abbia fermato con Ctrl + C |
| "Porta già in uso" | C'è già un altro terminale con `pnpm dev`: chiudilo con Ctrl + C |
