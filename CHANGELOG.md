# Changelog

Tutte le modifiche importanti a questo progetto. Le versioni seguono
[Semantic Versioning](https://semver.org/lang/it/): `MAJOR.MINOR.PATCH`.

- **MAJOR**: cambi che rompono le partite già in corso o i codici condivisi
- **MINOR**: nuovi giochi o nuove modalità
- **PATCH**: correzioni

## [0.2.0] - 2026-11-04

I tre giochi a un telefono, anche offline.

### Aggiunto

- **Tabù** (due squadre, timer) con carte originali
- **Lupus in fabula** con narratore a voce, veggente, medico, voto e ballottaggio
- **Impostore**: parole portate a circa 800 e tre nuove categorie (sport, oggetti, mezzi di trasporto); consiglio sul numero di impostori
- Un indirizzo per ogni gioco (`/impostore`, `/lupus`, `/tabu`) e `vercel.json` per aprirli direttamente
- App web installabile (PWA) che funziona offline dopo il primo caricamento; versione in grigio in fondo a ogni pagina
- Motore condiviso: numeri casuali con seme, giocatori, codice partita, macchina a stati per le fasi
- Guide passo passo per ogni gioco
