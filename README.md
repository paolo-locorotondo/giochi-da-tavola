# Giochi da tavola

Raccolta di giochi da tavola e party game da usare con lo smartphone, seduti allo
stesso tavolo. L'app distribuisce informazioni segrete (parola, ruolo), guida le fasi
(turni, timer, notte/giorno) e raccoglie scelte segrete quando serve.

È una PWA: installabile dalla schermata Home e funzionante offline dopo il primo
caricamento. Non serve un server né una connessione per giocare.

## Giochi

- **Impostore** ([README](games/impostore/README.md)): tutti ricevono la stessa parola
  tranne l'impostore. Disponibile a un telefono solo.
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

Ogni gioco ha un suo README con le istruzioni per provarlo, per esempio
[games/impostore](games/impostore/README.md).

## Deploy

Il sito è statico (nessun server) e si pubblica **una volta sola per tutti i giochi**:
l'app `apps/web` contiene il menu e importa i giochi da `games/*`. Aggiungere un gioco
non richiede un nuovo deploy separato.

Hosting: **Vercel**, collegato al repo GitHub.

Impostazioni del progetto su Vercel (da fare una volta):

| Campo | Valore |
|---|---|
| Root Directory | `apps/web` |
| Framework Preset | Vite |
| Build Command | `pnpm build` (predefinito) |
| Output Directory | `dist` (predefinito) |
| Include source files outside of the Root Directory | attivo (predefinito) |

L'ultima opzione serve perché `apps/web` usa i pacchetti in `packages/` e `games/`.
Vercel usa pnpm in base al campo `packageManager` del `package.json` radice.

Flusso: ogni push su `main` crea un deploy di produzione; ogni altro branch ottiene un
indirizzo di anteprima. Per provare l'installazione come app e l'uso offline su un telefono
usa l'indirizzo di anteprima o di produzione, che è in HTTPS.

Controllo prima del push: `pnpm typecheck && pnpm test && pnpm build`.

Se Vercel non trova le dipendenze del workspace, controlla che l'opzione sui file fuori dalla
Root Directory sia attiva; altrimenti si può imporre `pnpm install` come Install Command.

Alternative equivalenti, se un giorno servisse: Cloudflare Pages, Netlify, GitHub Pages.

## Licenza

Da definire.
