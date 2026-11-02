# Giochi da tavola

Raccolta di giochi da tavola e party game da fare con lo smartphone, seduti allo stesso
tavolo. L'app non sostituisce le chiacchiere dal vivo: distribuisce le informazioni
segrete (una parola, un ruolo), guida le fasi del gioco e raccoglie le scelte quando serve.

È un'app web installabile sul telefono ("Aggiungi a schermata Home") che funziona anche
**senza internet** dopo il primo caricamento.

## I giochi

| Gioco | Stato | Guida |
|---|---|---|
| **Impostore**: tutti conoscono la parola segreta tranne uno | Giocabile con un telefono solo | [Leggi la guida](games/impostore/README.md) |
| **Lupus in fabula**: ruoli segreti, notte e giorno, voto | In arrivo | |

## Provare l'app

Ogni gioco ha la sua guida passo passo (come avviarlo, cosa controllare, cosa fare se
qualcosa non va). Parti da quella del gioco che vuoi provare, per esempio quella di
[Impostore](games/impostore/README.md).

In breve, dal terminale di Visual Studio Code:

| Cosa vuoi fare | Comando |
|---|---|
| Preparare tutto (solo la prima volta) | `pnpm install` |
| Aprire l'app sul computer | `pnpm dev` |
| Aprire l'app anche sul telefono (stesso WiFi) | `pnpm dev:telefono` |
| Provare l'app come sarà online, anche offline | `pnpm anteprima` |
| Controllare che tutto sia a posto prima di pubblicare | `pnpm typecheck` poi `pnpm test` poi `pnpm build` |

Per fermare l'app: clicca nel terminale e premi **Ctrl + C**.

## Pubblicare online

L'app è un sito statico (senza server) e si pubblica **una volta sola per tutti i giochi**:
aggiungere un gioco non richiede un nuovo sito. Il sito è ospitato su **Vercel**, collegato
al repository GitHub.

**Come funziona di solito**: ogni volta che il codice viene caricato su GitHub nel ramo
`main`, Vercel pubblica da solo la nuova versione. I telefoni con l'app installata si
aggiornano al caricamento successivo.

### Prima configurazione (si fa una volta sola)

1. Vai su [vercel.com](https://vercel.com) ed entra con il tuo account GitHub.
2. Scegli **Add New → Project** e seleziona il repository `giochi-da-tavola`.
3. Nella schermata di configurazione imposta:

   | Campo | Valore |
   |---|---|
   | **Root Directory** | `apps/web` |
   | **Framework Preset** | Vite |
   | Build Command | lascia quello proposto |
   | Output Directory | lascia quello proposto |

4. Controlla che l'opzione **Include source files outside of the Root Directory** sia
   attiva (di solito lo è già). Serve perché l'app usa i giochi che stanno in `games/`.
5. Premi **Deploy** e aspetta qualche minuto. Alla fine Vercel mostra l'indirizzo del sito.

### Provare l'app pubblicata sul telefono

Con l'indirizzo di Vercel (che usa HTTPS) puoi provare ciò che in locale non si può fare:

1. Apri l'indirizzo sul telefono.
2. Dal menu del browser scegli **Aggiungi a schermata Home** (o **Installa app**).
3. Apri l'app dalla Home, poi spegni il WiFi e i dati: deve continuare a funzionare.

### Se la pubblicazione fallisce

Su Vercel apri il deploy fallito e copia l'ultimo messaggio di errore: me lo mandi e lo
sistemo. Il caso più probabile è che non trovi le cartelle fuori da `apps/web`: ricontrolla
il punto 4.

## Per chi sviluppa

- React + TypeScript, Vite, pnpm workspaces, `vite-plugin-pwa` per l'uso offline.
- La logica dei giochi è TypeScript puro e deterministico, separato dalla UI, così si testa.
- Scelte e motivazioni: [docs/decisioni.md](docs/decisioni.md).

```
apps/web/        app contenitore: menu dei giochi
packages/engine/ motore condiviso: numeri casuali con seme, giocatori, codice partita, fasi
games/           un gioco per cartella, ognuno con la sua guida
docs/            decisioni di progetto
```

Requisiti: Node.js 20 o superiore e pnpm 9.

## Licenza

Da definire.
