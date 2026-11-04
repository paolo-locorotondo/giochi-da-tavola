# giochi-da-tavola

Raccolta di giochi da tavola / party game come PWA (React + TypeScript, monorepo pnpm),
funzionante offline. Primo gioco: Impostore; poi Lupus in fabula e altri.

Prima di lavorare leggi [docs/decisioni.md](docs/decisioni.md): contiene architettura,
motivazioni e punti aperti decisi prima dell'avvio del progetto.

- Lingua del progetto e dell'interfaccia: italiano.
- La logica di gioco resta TypeScript puro e deterministico, separata dalla UI.
- Ogni gioco in `games/*` ha un `README.md` con: come provarlo (locale, telefono, offline),
  cosa controllare, struttura, e una sezione Deploy (dove e come si pubblica).
  Il repo è pubblico: niente di non pubblicabile nei file.
- Il push lo fa sempre l'utente; le commit si possono fare in autonomia.
