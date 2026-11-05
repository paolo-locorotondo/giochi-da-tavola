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

## Interfaccia

- Stile deciso: «Tavolo» (verde feltro e oro), tema scuro e chiaro, tutto a token CSS; l'architettura è pronta per altri stili (Argilla, Quiz) ma non vanno realizzati finché non lo chiede l'utente.
- **Verifica visiva obbligatoria**: prima di dichiarare finita una schermata, guardane gli screenshot a 375 px in tema scuro e chiaro, e passa la checklist di `ui-mobile-checklist`. Typecheck e build non bastano.

## Skill di progetto

Le skill stanno in `.claude/skills/`. Leggi quella giusta prima di scrivere codice (fonti in `.claude/skills/FONTI.md`):

- `ui-giochi-da-tavola`: stile, token, componenti, icone, testi. Si legge prima di ogni lavoro sulla UI.
- `ui-mobile-checklist`: regole di UX per telefono e checklist di consegna di una schermata.
- `web-design-guidelines`: revisione del codice UI (accessibilità, focus, form, touch, safe area).
- `frontend-design`: direzione visiva distintiva; serve per scelte nuove, non per rimettere in discussione lo stile deciso.
- `verification-before-completion`: comandi da eseguire e leggere prima di dire che qualcosa funziona.
