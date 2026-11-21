# Ultima!

Gioco di carte a colori e numeri. Due modi: **contro i bot** su un solo telefono (da 1 a 9 bot, anche offline) oppure **ognuno col suo telefono** da 2 a 10 giocatori. La mano è segreta: per questo a un telefono gli avversari sono bot. Chi resta con una carta in mano deve dire «Ultima!».

Le regole sono simili ai classici giochi di carte a colori e numeri. Il nome e le carte sono originali: nel progetto non compaiono marchi di terzi.

## Regolamento

1. Ognuno riceve 7 carte e la prima carta del mazzo va scoperta. Si gioca ognuno dal proprio telefono: la mano è segreta.
2. Al tuo turno cali una carta dello stesso colore, numero o simbolo di quella scoperta, oppure un Jolly. Se non puoi, peschi una carta: se si può giocare la cali subito, altrimenti passi.
3. Salta fa saltare il turno al prossimo. Inverti cambia il verso (in due vale come Salta). +2 fa pescare 2 carte al prossimo, che salta il turno. Jolly ti fa scegliere il colore. Jolly +4 fa scegliere il colore, il prossimo pesca 4 e salta il turno.
4. Il Jolly +4 si può giocare solo senza carte del colore in corso. Chi lo subisce può sfidare: se aveva ragione, chi l'ha giocato pesca 4; se aveva torto, lo sfidante pesca 6.
5. Quando resti con una carta devi premere «Ultima!». Se un altro preme «Beccato!» prima che il giocatore dopo di te giochi o peschi, pesci 2 carte.
6. Vince il round chi finisce le carte. A punti, il vincitore prende i punti delle carte rimaste agli altri: numeri = il loro valore, Salta, Inverti e +2 = 20, Jolly e Jolly +4 = 50.

Contro i bot (anche offline) o online da 2 a 10 giocatori. Alla creazione si sceglie un solo round oppure una partita a punti (di base fino a 500, da 50 a 2000). Se qualcuno non risponde, l'organizzatore può toccare «Simula mossa col bot» (vedi sotto).

Il mazzo è di 108 carte: per ogni colore (rosso, giallo, verde, blu) uno `0`, due per ciascun `1–9`, due Salta, due Inverti, due +2; più 4 Jolly e 4 Jolly +4. Ogni colore ha anche un simbolo (fiamma, sole, foglia, goccia) e il nome scritto: il colore non è mai l'unico segnale.

### Scelte di regola (dove il regolamento lascia margine)

- **Prima carta speciale**: vale per il primo giocatore. Salta lo fa saltare; +2 gli fa pescare 2; Inverti cambia verso (in due vale come Salta); un Jolly lo fa scegliere a lui. Un Jolly +4 scoperto si rimette nel mazzo e se ne gira un'altra. Il primo di mano ruota a ogni round.
- **Pesca**: una carta sola per turno. Dopo aver pescato si può calare **solo la carta pescata**; altrimenti si passa.
- **Jolly +4 illecito**: il server lo accetta (chi bluffa può farlo) e lo scopre la sfida: la legalità non viaggia mai sulla rete. È pubblico solo se chi l'ha giocato aveva appena pescato.
- **«Ultima!» e «Beccato!»**: la finestra si apre quando si cala la penultima carta e si chiude appena il giocatore dopo gioca o pesca. Chi la lascia aperta può essere beccato da chiunque altro.
- **Mazzo esaurito**: si rimescola lo scarto tranne la carta in cima. Se mazzo e scarto sono finiti si pesca a vuoto e si passa.
- **Partita a punti**: dopo ogni round l'organizzatore tocca «Prossimo round»; la partita finisce quando qualcuno arriva alla soglia.

## Contro i bot (un telefono, anche offline)

Su «Come giocate?» si sceglie **Contro i bot**. Si scrivono il proprio nome e da 1 a 9 bot (con nomi modificabili, di base «Bot 1», «Bot 2»…), il livello, la velocità e come si vince. Le ultime scelte restano salvate sul telefono.

- Il telefono fa da server per sé: usa la stessa macchina a stati dell'online (`src/offline.ts`). Si vede solo la propria mano; dei bot solo quante carte hanno.
- I bot giocano da soli, uno alla volta, con una pausa: **lenta** 2,2 s, **normale** 1,3 s, **veloce** 0,6 s (`VELOCITA`). La velocità si cambia anche in partita.
- **Livelli** (come Tris): **facile** gioca carte lecite a caso; **medio** gioca la mossa migliore 55 volte su 100 (`PERCENTUALE_MEDIO`); **difficile** gioca sempre la mossa migliore. A ogni livello cambiano anche le probabilità di dire «Ultima!» (50 / 85 / 100 %, `PROB_ULTIMA`) e di beccare chi lo dimentica (60 / 90 / 100 %, `PROB_BECCA`).
- Se dimentichi «Ultima!» i bot ti possono beccare, ma prima ti lasciano almeno 1,8 s per dirlo (`RITARDO_BECCATO_MS`), anche alla velocità più alta.
- Fine round, classifica e «Prossimo round» come online; «Esci dalla partita» (con conferma) torna alla creazione.

## Il bot online («Simula mossa col bot»)

Solo l'organizzatore lo vede, per il giocatore di turno (anche per rispondere a un +4 o per «Ultima!»). Fa **una mossa sola** e nell'elenco degli eventi compare «Mossa simulata dal bot per X». Nessun bot automatico.

Usa solo ciò che quel giocatore vedrebbe (la sua mano e lo stato pubblico), così non «bara». Priorità, in `src/bot.ts`:

1. se il prossimo giocatore ha poche carte (`POCHE_CARTE`, 3), prima le carte che lo colpiscono (+2, Salta, Inverti);
2. altrimenti scarica prima le carte che valgono di più;
3. tiene i Jolly per ultimi; il +4 solo se è lecito (non bluffa);
4. a parità preferisce il colore di cui ha più carte.

Senza carte giocabili pesca; se la carta pescata si può giocare la gioca. Sceglie come colore quello di cui ha più carte. Sfida un +4 solo se chi l'ha giocato aveva appena pescato, altrimenti lo accetta. Becca chi ha una carta sola e non ha detto «Ultima!» (se la finestra è aperta: una mossa per pressione). Dichiara sempre «Ultima!» appena cala la penultima carta (resta negli eventi): per questo contro il bot non compare «Beccato!».

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/ultima (anche dal telefono, vedi l'indirizzo "Network")
```

Servono il sito **e** il server di gioco: `pnpm dev` li avvia insieme. Passi dettagliati, firewall e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md); con il PC come server: [guida-giocare-con-il-pc.md](../../docs/guida-giocare-con-il-pc.md). Contro i bot funziona **offline**: `pnpm --filter @gdt/web build`, apri il sito una volta, poi spegni la rete e ricarica. Online serve il server; se non risponde la pagina propone di riprovare o di giocare contro i bot.

## Cosa controllare

- Creazione: da 2 a 10 nomi, nomi uguali rifiutati, soglia fuori da 50–2000 rifiutata.
- Sala: l'organizzatore avvia solo quando tutti hanno scelto il nome; il link `/ultima/CODICE` e il QR portano nella stanza.
- Tavolo (con tre telefoni): ognuno vede solo la propria mano e **quante** carte hanno gli altri; le carte non giocabili sono attenuate; fuori turno non si può giocare né pescare.
- Jolly: appaiono quattro pulsanti con colore, simbolo e nome; il +4 apre la sfida al giocatore dopo.
- «Ultima!» (per chi resta con una carta) e «Beccato!» (per gli altri) finché il giocatore dopo non agisce.
- «Simula mossa col bot» e «Sollecita» solo per l'organizzatore.
- Fine round: punti e classifica; «Prossimo round» solo all'organizzatore; a fine partita «Ricomincia».
- Refresh o schermo bloccato: si rientra nel proprio posto, con la propria mano.
- Contro i bot: da 1 a 9 bot con nomi modificabili; i bot giocano da soli alla velocità scelta; con la rete spenta la partita va avanti; se dimentichi «Ultima!» un bot difficile ti becca dopo un attimo; «Esci dalla partita» chiede conferma.
- Tema chiaro e scuro, inglese, nessuno scroll orizzontale a 375 px.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: mazzo, giocabilità, effetti, sfida del +4, «Ultima!»/«Beccato!», rimescolo e punteggio di un round. Puro e deterministico (il caso arriva da `Rng`); gli errori sono codici (`ErroreUltima`).
- `src/bot.ts`: `mossaBot(stato, n, posto)`, i livelli (`mossaBotLivello`) e `eseguiMossa`; usa solo ciò che vedrebbe quel giocatore.
- `src/offline.ts`: la partita contro i bot sul telefono (`nuovaPartitaLocale`, `agisci`, `muoviBot`, `pausaBot`, `vistaLocale`), con test in `offline.test.ts`.
- `src/online/gioco.ts`: stato della stanza (round, punti, soglia), azioni, permessi (`traduci`) e `vistaPer` (mai le carte altrui né l'esito segreto della sfida); registrato in `apps/server/src/giochi.ts`. Il seme di ogni mossa deriva dal seme del round, così con lo stesso seme la partita si ripete identica.
- `src/locales/{it,en}.ts` e `src/manifest.ts`: tutti i testi e il regolamento.
- `src/ui/`: `Ultima.tsx` (scelta della modalità), `UltimaLocale.tsx` (contro i bot), `UltimaOnline.tsx` (usa `@gdt/collegamento`), `Tavolo.tsx` (il tavolo, comune alle due modalità), `Carta.tsx` e `ultima.css` (solo token del tema).
- Test: `logica.test.ts`, `bot.test.ts`, `online/gioco.test.ts`, `apps/server/src/ultima.test.ts` ed e2e in `apps/web/e2e/ultima-online.spec.ts` (tre telefoni) e `ultima-bot.spec.ts` (contro i bot, anche offline).
- Le carte sono fisse (le regole stanno nel codice): non c'è una cartella `data/`.

## Partita veloce

Dalla schermata di creazione online, «Partita veloce»: ognuno scrive solo il suo nome. Se c'è già una stanza aperta di Ultima! con posti liberi se ne vede la scheda («Stanza di Anna · 1 posto su 4 · A punti, fino a 200 · Attesa 2 minuti») e si tocca «Entra nella stanza»; altrimenti chi tocca sceglie le impostazioni e apre la sua: **quanti giocatori** (da 2 a 10), **come si vince** (round singolo o a punti, le stesse impostazioni di «Crea la partita») e il **tempo d'attesa** (1, 2, 3 o 5 minuti), e ne diventa l'organizzatore. Chi entra accetta le impostazioni.

Nella sala d'attesa tutti vedono chi c'è e il tempo che resta. La partita parte da sola a stanza piena; l'organizzatore può aprire prima («Apri adesso con 3 giocatori») con almeno 2. Scaduto il tempo con almeno 2 giocatori parte un avviso di 10 secondi («Apri adesso» / «Continua ad aspettare»); con meno di 2 l'organizzatore sceglie «Aspetta ancora» o «Chiudi la stanza», e dopo 60 secondi senza risposta la stanza si chiude. Se l'organizzatore esce lo diventa il giocatore arrivato dopo di lui. Un telefono scollegato tiene il posto 30 secondi.

Dichiarazione in `src/online/gioco.ts`: `veloce: { posti: intervalloPosti(2, 10), anticipato: true, configVeloce: leggiConfig }`; le impostazioni scelte all'apertura sono in `src/ui/ImpostazioniVeloce.tsx`. Le **nuove varianti** della partita sono chiavi di `leggiConfig`: basta aggiungerle anche a quel componente per averle nella partita veloce.

## Varianti possibili

Non ci sono nella prima versione (solo regole ufficiali). Ognuna diventerebbe un'opzione della stanza, spenta di base:

- **Somma dei +2** (e dei +4): chi riceve un +2 può rispondere con un +2 e il totale passa al successivo.
- **Più carte uguali insieme**: si calano in una volta tutte le carte con lo stesso numero.
- **Pesca finché non puoi giocare** invece di una carta sola.
- **Sette e zero**: con il 7 si scambia la mano con un altro, con lo 0 tutte le mani passano nel verso del gioco.
- **Taglio**: chi ha una carta identica a quella appena calata può giocarla anche fuori turno.
- **+4 senza sfida** (si gioca sempre, niente controllo).
- **Penalità per «Ultima!»** diversa da 2.

## Lingue

Italiano («Ultima!») e inglese («Last One!», «Caught!»). Per cambiare un testo modifica la chiave in `src/locales/it.ts` e in `en.ts`; il compilatore segnala se manca in una lingua. Nel codice niente frasi: il TSX usa `t("chiave")` e la logica restituisce codici.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md). Serve il server di gioco (le stanze stanno in memoria sul server).
