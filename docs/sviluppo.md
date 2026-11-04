# Sviluppo e prove in locale

Requisiti: Node.js 20 o superiore e pnpm 9. Dal terminale di Visual Studio Code:

| Comando | Cosa fa |
|---|---|
| `pnpm install` | Prepara tutto (solo la prima volta, o dopo un aggiornamento delle dipendenze) |
| `pnpm dev` | Apre l'app sul computer, su `http://localhost:5173`. Si aggiorna da sola quando salvi un file. |
| `pnpm dev:rete` | Come `pnpm dev`, ma raggiungibile anche dagli altri dispositivi della stessa rete (telefono, tablet): Vite stampa un indirizzo "Network" tipo `http://192.168.1.20:5173`. Su Windows serve la regola del firewall |
| `pnpm anteprima` | Fa la build vera e la serve. È l'unico modo per provare in locale l'installazione e l'uso offline, che in `pnpm dev` non ci sono. Funziona su `localhost`, non dal telefono in `http://192.168…` (manca l'HTTPS) |
| `pnpm typecheck`, `pnpm test`, `pnpm build` | Controlli prima di pubblicare, in quest'ordine |

Per fermare un comando: clicca nel terminale e premi **Ctrl + C**.

Per aprire l'app dal telefono, la prima volta su Windows serve un'autorizzazione del firewall: è spiegata
nella sezione "Provarlo sul telefono" della [guida di Impostore](../games/impostore/README.md#provarlo-sul-telefono).

Ogni gioco ha la sua guida con cosa controllare e come provarlo: vedi la cartella `games/`.

## Struttura

```
apps/web/        app contenitore: menu dei giochi
packages/engine/ motore condiviso: numeri casuali con seme, giocatori, codice partita, fasi
games/           un gioco per cartella, ognuno con la sua guida
docs/            guide e decisioni di progetto
```

React + TypeScript, Vite, pnpm workspaces, `vite-plugin-pwa` per l'uso offline. La logica dei giochi è
TypeScript puro e deterministico, separato dalla UI, così si testa.
