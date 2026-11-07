# Giochi da tavola

Raccolta di giochi da tavola e party game da fare con lo smartphone, seduti allo stesso
tavolo. L'app non sostituisce le chiacchiere dal vivo: distribuisce le informazioni
segrete (una parola, un ruolo), guida le fasi del gioco e raccoglie le scelte quando serve.

È una web app installabile sul telefono ("Aggiungi a schermata Home") che funziona anche
**senza internet** dopo il primo caricamento ([come funziona](docs/app-installabile.md)).

## I giochi

| Gioco | Stato | Guida |
|---|---|---|
| **Impostore**: tutti conoscono la parola segreta tranne uno | Un telefono (anche offline) e ognuno col suo telefono | [Leggi la guida](games/impostore/README.md) |
| **Lupus in fabula**: ruoli segreti, notte e giorno, voto | Un telefono con narratore a voce (online: in arrivo) | [Leggi la guida](games/lupus/README.md) |
| **Tabù**: due squadre, timer, parole vietate | Un telefono | [Leggi la guida](games/tabu/README.md) |

Due modi di giocare: **un solo telefono** (il telefono passa di mano, nessuna rete) oppure
**ognuno col suo telefono**, che richiede il server di gioco.

## Provarla in locale

```
pnpm install       # solo la prima volta
pnpm dev           # per modificare il codice → apri SOLO http://localhost:5173
docker compose up  # per giocare / build vera, installazione e offline → apri http://localhost:8080
```

Con `pnpm dev` parte anche il server delle partite online (porta 8081), ma non ha pagine: non si apre. Entrambi i comandi
sono raggiungibili anche dal telefono sulla stessa WiFi e includono "ognuno col suo telefono".
Requisiti: Node.js 20+, pnpm 9; Docker per `docker compose`. Passi dettagliati: [docs/provare-in-locale.md](docs/provare-in-locale.md).

## Documentazione

| Per... | Leggi |
|---|---|
| Comandi di sviluppo, struttura del repo | [docs/sviluppo.md](docs/sviluppo.md) |
| Test unitari e grafici, come aggiornarli | [docs/test.md](docs/test.md) |
| Giocare dagli amici con il PC come server (WiFi/hotspot) | [docs/guida-giocare-con-il-pc.md](docs/guida-giocare-con-il-pc.md) |
| Pubblicare il server o il sito online | [docs/guida-deploy-online.md](docs/guida-deploy-online.md) |
| Capire stanze, dati sul browser, sicurezza | [docs/architettura-tecnica.md](docs/architettura-tecnica.md) |
| Sapere cosa significa "Aggiungi a schermata Home" | [docs/app-installabile.md](docs/app-installabile.md) |
| Scelte di progetto e punti aperti | [docs/decisioni.md](docs/decisioni.md) |
| Cosa è cambiato in ogni versione | [CHANGELOG.md](CHANGELOG.md) |

## Licenza

Da definire (punto aperto in [docs/decisioni.md](docs/decisioni.md)).
