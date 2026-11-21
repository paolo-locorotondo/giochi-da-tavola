# Giocare con il PC come server (WiFi o hotspot)

Per giocare "ognuno col suo telefono" senza internet: il tuo PC fa da server e i telefoni si collegano.
Serve una **rete locale** (non internet): il WiFi di casa degli amici oppure l'hotspot di un telefono.

## Docker o `pnpm dev`?

Per giocare in rete locale vanno bene entrambi, e in nessuno dei due si consumano dati: il traffico resta tra PC e telefoni.

| | Docker (`docker compose up`) | `pnpm dev` |
|---|---|---|
| Cosa serve sul PC | Solo Docker Desktop e il progetto | Node, pnpm e `pnpm install` |
| Versione | Quella di produzione, già compilata: come sarà pubblicata | Codice di sviluppo, non compilato: pagine più pesanti e avvio più lento |
| Indirizzo per i telefoni | `http://IP-DEL-PC:8080` | `http://IP-DEL-PC:5173` (il sito inoltra da solo il gioco online al server) |
| Porta da aprire nel firewall | 8080 | 5173 |
| Quando usarlo | Per giocare tra amici e per provare la versione vera | Per sviluppare: le modifiche al codice si vedono subito |

Il resto della guida descrive Docker; con `pnpm dev` cambiano solo l'indirizzo e la porta.

## Prima di partire (con internet, a casa)

1. Installa **Docker Desktop** e avvialo.
2. Nella cartella del progetto: `docker compose build`. Scarica e prepara tutto; va rifatto solo se il codice cambia.

## Dagli amici

1. Collega il PC alla rete (WiFi di casa o hotspot di un telefono). Gli altri telefoni alla **stessa rete**.
2. Avvia Docker Desktop, poi nella cartella del progetto: `docker compose up`.
3. Trova l'indirizzo del PC: apri PowerShell e scrivi `ipconfig`; cerca **Indirizzo IPv4** (es. `192.168.1.20`).
   L'indirizzo che stampa il programma dentro Docker (`172.x.x.x`) **non** va bene.
   Facoltativo: per vedere l'indirizzo giusto scritto nel terminale all'avvio, indicalo prima di partire:
   `$env:HOST_IP="192.168.1.20"; docker compose up` (PowerShell). Docker non può leggerlo da solo perché
   il programma gira in una rete virtuale.
4. Sui telefoni apri `http://192.168.1.20:8080` (con il tuo indirizzo), poi tocca Impostore → "Ognuno col suo telefono".
5. L'organizzatore crea la partita; gli altri aprono lo stesso indirizzo e scelgono "Ho un codice: entra", oppure
   scrivono `http://192.168.1.20:8080/impostore/CODICE`.

Per fermare: Ctrl+C nel terminale.

## Limiti da conoscere

- **Firewall di Windows**: se i telefoni non raggiungono l'indirizzo del PC, quasi sempre è il firewall che blocca la porta 8080 (la finestra di consenso spesso non compare con Docker). Apri **PowerShell come amministratore** (tasto destro su Start → "Windows PowerShell (amministratore)") e scrivi:

  ```
  New-NetFirewallRule -DisplayName "Giochi da tavola 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private
  ```

  Si fa una volta sola. `-Profile Private` vale solo per le reti che Windows considera private (il WiFi di casa di solito lo è): se dagli amici la rete risulta "Pubblica" non funzionerà. Per vedere come Windows classifica la rete: `Get-NetConnectionProfile`; per cambiarla, sempre da amministratore: `Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private`.
  Per togliere la regola: `Remove-NetFirewallRule -DisplayName "Giochi da tavola 8080"`.
  Per controllare che il problema sia davvero il firewall, dal PC apri `http://192.168.1.20:8080` (con il tuo IP): se qui funziona e dal telefono no, è il firewall o la rete.
- **Router che isola i dispositivi** (hotel, locali pubblici, alcune reti ospiti): i telefoni non vedono il PC. In casa di solito va bene. Alternativa: hotspot.
- **Hotspot di un telefono**: il gioco non usa internet, il traffico resta tra i dispositivi. Ma il contatore dei dati dell'hotspot conta **tutto** ciò che passa dal telefono: WhatsApp, aggiornamenti e sincronizzazioni dei dispositivi collegati (PC compreso, anche Docker Desktop e Windows Update) usano internet attraverso quel telefono e fanno salire il consumo anche senza giocare. **Per non consumare dati, chi ha l'hotspot acceso deve disattivare i dati mobili** (su alcuni telefoni l'hotspot non si accende senza dati o senza SIM: in quel caso il consumo di fondo non si può evitare). Regge circa 8–10 dispositivi.
  *Prova fatta (2026-11-21)*: PC collegato all'hotspot del telefono, dati mobili del telefono disattivati, partita a Ultima! giocata normalmente: il contatore dell'hotspot è rimasto fermo. Il PC collegato invece al WiFi di casa ha il suo traffico: controlla di essere sulla rete giusta (con la rete sbagliata i telefoni vedono «Connessione persa»).
- **Niente HTTPS** su `http://192.168...`: il tasto "Condividi" e l'installazione dell'app non funzionano. L'invito si fa con il **QR code** che l'organizzatore trova nella stanza (apre il link, senza bisogno di "Condividi"), oppure leggendo il codice o l'indirizzo a voce.
- **Se il PC si riavvia o si ferma il programma**, le partite in corso si perdono (sono in memoria).
- **Nessuna rete, nemmeno hotspot**: usa "Un solo telefono" (funziona anche in modalità aereo, se l'app è già stata aperta una volta con internet).
