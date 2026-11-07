# Sviluppo e prove in locale

Requisiti: Node.js 20 o superiore e pnpm 9. Dal terminale di Visual Studio Code:

## Quale comando uso, e quale indirizzo apro

Due soli modi di far girare l'app. **Apri sempre l'indirizzo della riga che hai lanciato**, gli altri non sono pagine da visitare.

| Voglio... | Comando | Indirizzo da aprire |
|---|---|---|
| **Modificare il codice** e vedere subito l'effetto (anche online e dal telefono) | `pnpm dev` | **`http://localhost:5173`** (dal telefono: l'indirizzo `Network` che stampa) |
| **Giocare davvero**, o provare installazione e offline (build vera) | `docker compose up` | **`http://localhost:8080`** |

Cosa succede con `pnpm dev`: parte il sito (porta 5173, è l'unica pagina da aprire) e, dietro le quinte, il server
delle partite online (porta 8081, senza pagine: aprirla mostra solo un avviso). Il sito parla da solo col server.
Su Windows, per aprirlo dal telefono serve la regola del firewall (vedi sotto).

Prima volta: `pnpm install`.

Controlli prima di pubblicare, in quest'ordine: `pnpm typecheck`, `pnpm test`, `pnpm build`.
`pnpm test` fa test unitari e grafici: vedi [test.md](test.md).

Per fermare un comando: clicca nel terminale e premi **Ctrl + C**.

Per aprire l'app dal telefono, la prima volta su Windows serve un'autorizzazione del firewall: passi completi in
[provare-in-locale.md](provare-in-locale.md).

Ogni gioco ha la sua guida con cosa controllare e come provarlo: vedi la cartella `games/`. Come sono fatti i test: [test.md](test.md).

## Struttura

```
apps/web/        app contenitore: menu dei giochi
apps/server/     server di gioco WebSocket (serve anche l'app)
packages/engine/ motore condiviso: numeri casuali con seme, giocatori, codice partita, fasi
packages/suoni/  audio: interruttore unico (spento di default) e suoni sintetizzati dei giochi
games/           un gioco per cartella, ognuno con la sua guida
apps/web/e2e/    test grafici (Playwright, 375 px, tema scuro e chiaro)
docs/            guide e decisioni di progetto
```

React + TypeScript, Vite, pnpm workspaces, `vite-plugin-pwa` per l'uso offline. La logica dei giochi è
TypeScript puro e deterministico, separato dalla UI, così si testa.
