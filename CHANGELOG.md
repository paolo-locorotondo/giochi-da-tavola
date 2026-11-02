# Changelog

Tutte le modifiche importanti a questo progetto. Le versioni seguono
[Semantic Versioning](https://semver.org/lang/it/): `MAJOR.MINOR.PATCH`.

- **MAJOR**: cambi che rompono le partite già in corso o i codici condivisi
- **MINOR**: nuovi giochi o nuove modalità
- **PATCH**: correzioni

## [0.1.0] - 2026-11-02

Prima versione pubblicata.

### Aggiunto

- **Impostore**, modalità a un telefono solo:
  - configurazione con nomi, numero di impostori (con consiglio in base ai giocatori) e categoria
  - carte segrete passate di mano, primo indizio, voto, tentativo finale dell'impostore
  - parole in italiano in quattro categorie: cibi, animali, luoghi, mestieri
  - memoria delle parole recenti sul telefono, per non ripetere subito la stessa
- App web installabile (PWA) che funziona offline dopo il primo caricamento
- Motore condiviso: numeri casuali con seme, giocatori, codice partita a 8 caratteri, macchina a stati per le fasi
