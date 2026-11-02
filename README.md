# Giochi da tavola

Raccolta di giochi da tavola e party game da usare con lo smartphone, seduti allo
stesso tavolo. L'app distribuisce informazioni segrete (parola, ruolo), guida le fasi
(turni, timer, notte/giorno) e raccoglie scelte segrete quando serve.

È una PWA: installabile dalla schermata Home e funzionante offline dopo il primo
caricamento. Non serve un server né una connessione per giocare.

## Giochi

- **Impostore** (in sviluppo): tutti ricevono la stessa parola tranne l'impostore.
- **Lupus in fabula** (previsto): ruoli segreti, fasi notte/giorno, voto.

## Stack

- React + TypeScript, build con Vite
- pnpm workspaces (monorepo)
- vite-plugin-pwa per il service worker e il manifest

La logica di gioco è TypeScript puro e deterministico, separata dalla UI, così è
testabile. Le scelte architetturali sono in [docs/decisioni.md](docs/decisioni.md).

## Struttura

```
apps/web/       PWA contenitore: menu giochi, crea/entra partita
packages/       motore condiviso (in arrivo)
games/          un gioco per cartella (in arrivo)
docs/           decisioni di progetto
```

## Sviluppo

Requisiti: Node.js 20 o superiore e pnpm 9.

```bash
pnpm install
pnpm dev         # server di sviluppo
pnpm typecheck   # controllo dei tipi
pnpm build       # build di produzione in apps/web/dist
```

## Licenza

Da definire.
