# Cos'è l'app installata (PWA)

"Aggiungi a schermata Home" non installa un programma: crea un'icona che apre **lo stesso sito**, ma
a schermo intero, senza barra degli indirizzi né schede, come un'app. Dietro ci sono tre pezzi, tutti
configurati in `apps/web/vite.config.ts` (tramite `vite-plugin-pwa`):

| Pezzo | Cos'è | Cosa fa qui |
|---|---|---|
| **Web app manifest** (`manifest.webmanifest`) | Un piccolo file con nome, icona, colori e `display: standalone` | Dice al telefono come presentare l'icona e che l'app si apre senza barra del browser |
| **Service worker** (`sw.js`) | Uno script che il browser tiene attivo e che intercetta le richieste di rete | Al primo caricamento salva in una cache sul telefono tutti i file dell'app (HTML, JS, CSS, icona); dopo, li serve da lì, quindi l'app si apre **anche senza internet** |
| **HTTPS** | Connessione cifrata | Il browser concede service worker e installazione solo su HTTPS (o `localhost`) |

Quindi: sì, in sostanza è una pagina del browser (Chrome o Safari) senza la sua interfaccia, ma con un
file di cache offline. Non ha accesso a niente di più di una pagina web: nessun permesso speciale, nessun
accesso ai file o ai contatti. Non passa dagli store e si toglie come qualsiasi icona. I dati salvati
(per esempio il token del posto in una partita) stanno nel browser del sito, non nell'icona: vedi
[architettura-tecnica.md](architettura-tecnica.md).

Cosa significa nella pratica:
- **Aggiornamenti.** Quando pubblichi una nuova versione, il service worker scarica i file nuovi in
  background (`registerType: "autoUpdate"`). Il telefono può mostrare ancora la versione vecchia fino a
  quando l'app viene chiusa e riaperta (a volte due volte). Se qualcosa sembra non aggiornato, chiudi l'app
  del tutto e riaprila.
- **Offline vale per i file, non per le partite in rete.** Senza internet si aprono l'app e i giochi "un solo
  telefono". "Ognuno col suo telefono" ha comunque bisogno del collegamento al server di gioco (WebSocket),
  che il service worker non mette in cache.
- **Sul WiFi locale (`http://192.168…`) non è una vera installazione.** Senza HTTPS il browser non attiva il
  service worker: non c'è cache offline, e Chrome al massimo crea un collegamento al sito, non un'app.
  L'installazione completa si ottiene dall'indirizzo online (HTTPS).
- **L'icona apre sempre la pagina iniziale** (`start_url: "/"`), non un invito: per entrare in una partita
  si apre il link o si inquadra il QR dal browser.
- **Per toglierla o per ripartire da zero** disinstalla l'icona; per cancellare anche la cache e i dati,
  cancella i dati del sito dalle impostazioni del browser.
