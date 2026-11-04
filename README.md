# Giochi da tavola

Raccolta di giochi da tavola e party game da fare con lo smartphone, seduti allo stesso
tavolo. L'app non sostituisce le chiacchiere dal vivo: distribuisce le informazioni
segrete (una parola, un ruolo), guida le fasi del gioco e raccoglie le scelte quando serve.

È una web app installabile sul telefono ("Aggiungi a schermata Home") che funziona anche
**senza internet** dopo il primo caricamento ([come funziona](docs/app-installabile.md)).

## I giochi

| Gioco | Stato | Guida |
|---|---|---|
| **Impostore**: tutti conoscono la parola segreta tranne uno | Un telefono | [Leggi la guida](games/impostore/README.md) |
| **Lupus in fabula**: ruoli segreti, notte e giorno, voto | Un telefono con narratore a voce | [Leggi la guida](games/lupus/README.md) |
| **Tabù**: due squadre, timer, parole vietate | Un telefono | [Leggi la guida](games/tabu/README.md) |

Tutti i giochi si fanno con **un solo telefono** che passa di mano, senza rete.

## Provarla in locale

```
pnpm install      # solo la prima volta
pnpm dev          # giochi a un telefono, su http://localhost:5173
```

Requisiti: Node.js 20+, pnpm 9.

## Documentazione

| Per... | Leggi |
|---|---|
| Comandi di sviluppo, test, struttura del repo | [docs/sviluppo.md](docs/sviluppo.md) |
| Sapere cosa significa "Aggiungi a schermata Home" | [docs/app-installabile.md](docs/app-installabile.md) |
| Scelte di progetto | [docs/decisioni.md](docs/decisioni.md) |
| Cosa è cambiato in ogni versione | [CHANGELOG.md](CHANGELOG.md) |

## Licenza

Da definire.
