# Changelog

Tutte le modifiche importanti a questo progetto. Le versioni seguono
[Semantic Versioning](https://semver.org/lang/it/): `MAJOR.MINOR.PATCH`.

- **MAJOR**: cambi che rompono le partite già in corso o i codici condivisi
- **MINOR**: nuovi giochi o nuove modalità
- **PATCH**: correzioni

## [0.3.0] - 2026-11-04

Impostore ognuno col suo telefono.

### Aggiunto

- **Server di gioco** (`apps/server`, WebSocket, Docker): `docker compose up` sul PC (WiFi o hotspot) oppure su un hosting che esegue contenitori; serve anche l'app
- **Impostore online**: stanze con codice e link, ognuno sceglie il proprio nome, carta visibile solo sul proprio telefono, voto dal proprio telefono con ballottaggio (secondo pareggio: vincono gli impostori)
- Organizzatore: avvio, chiusura partita, sollecito, "Escludi dal voto" per un telefono irraggiungibile, liberare un nome
- Rientro dopo refresh, schermo bloccato o caduta di rete (token sul telefono) e rientro in una partita già avviata
- Pannello stanza con chi è collegato, **QR code** dell'invito generato sul telefono
- Se il server non risponde entro 8 secondi l'app avvisa e propone un solo telefono
- Versione dell'app mostrata in grigio in fondo a ogni pagina
- Guide: giocare con il PC (WiFi/hotspot, firewall) e mettere il server online; architettura tecnica (stanze, dati sul browser, limiti di sicurezza)

### Cambiato

- `vercel.json` valido: ogni indirizzo apre l'app

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
