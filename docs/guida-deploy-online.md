# Mettere online il gioco (quando non puoi portare il PC)

L'app e il server di gioco sono **un unico programma** (lo stesso del `docker compose up`).
Per avere un indirizzo pubblico serve un servizio che tenga acceso un contenitore Docker.
**Vercel da solo non basta**: non può tenere aperte le connessioni WebSocket delle partite (vedi `docs/decisioni.md`).

## Cosa serve al servizio che scegli

- esegue un **Dockerfile** (c'è nella radice del repo);
- supporta i **WebSocket** e un'unica istanza sempre attiva (le partite stanno in memoria);
- passa la variabile `PORT` (il server la legge da solo).

## Esempio con Render (piano gratuito)

Dalla documentazione ufficiale di Render, letta il 2026-11-04: i servizi gratuiti si **spengono dopo 15 minuti senza traffico**
e il risveglio richiede circa **un minuto**; hanno 750 ore gratuite al mese; il disco è temporaneo.
Non ho verificato se il piano gratuito accetti Docker: controlla nella pagina di creazione del servizio.
Condizioni e prezzi cambiano: verifica sul sito prima di scegliere. Alternative simili: Fly.io, Railway, un VPS.

1. Crea un account su render.com e collega il tuo account GitHub (il repo deve essere stato pubblicato da te con `git push`).
2. **New → Web Service** → scegli il repo `giochi-da-tavola`.
3. Runtime: **Docker**. Branch: `main`. Piano: Free (o a pagamento per non avere lo spegnimento).
4. Percorso di controllo (health check): `/salute`.
5. **Create Web Service**. Quando è pronto ottieni un indirizzo `https://nome.onrender.com`.
6. Condividi quell'indirizzo: con HTTPS funzionano "Condividi" e l'installazione come app.

Consiglio: aprilo qualche minuto prima di giocare, per svegliare il servizio.

## Aggiornamenti

Ad ogni push su `main` il servizio ricostruisce e riavvia il programma: le partite in corso si perdono.

## Sito statico (Vercel), facoltativo

Contiene solo l'app: funzionano i giochi "un solo telefono", non quelli "ognuno col suo telefono" (non c'è il server;
l'app lo dice dopo 8 secondi). Su [vercel.com](https://vercel.com): **Add New → Project**, repo `giochi-da-tavola`, poi

| Campo | Valore |
|---|---|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Vite |
| Build e Output Directory | quelli proposti |

L'opzione **Include source files outside of the Root Directory** deve essere attiva (l'app usa le cartelle in `games/`).
`apps/web/vercel.json` fa aprire direttamente `/impostore`, `/lupus`, `/tabu`. Se il deploy fallisce, leggi l'ultimo messaggio di errore.

## Provare l'installazione sul telefono

Con un indirizzo HTTPS: aprilo sul telefono, dal menu del browser scegli **Aggiungi a schermata Home** (o **Installa app**),
apri l'app dalla Home, poi spegni WiFi e dati: i giochi a un telefono devono continuare a funzionare.
Cos'è e come funziona: [app-installabile.md](app-installabile.md).
