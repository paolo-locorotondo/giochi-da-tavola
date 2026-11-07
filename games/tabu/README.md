# Tabù

Gioco a squadre con un solo telefono. Servono **almeno 4 persone**, divise in due squadre.

## Regolamento

> Regole scritte dalla conoscenza del gioco classico, non copiate da un regolamento ufficiale: controllale e dimmi se qualcosa non torna.

1. Le squadre si alternano. Nel proprio turno un giocatore **descrive** a voce la parola in cima alla carta, i compagni cercano di indovinarla.
2. Non può dire la parola né le **cinque parole vietate**, né usare gesti, parti della parola o traduzioni.
3. Una persona della squadra avversaria controlla: se sente una parola vietata, chi tiene il telefono tocca **Vietata detta (−1)**.
4. Parola indovinata: **Indovinata (+1)**. Carta troppo difficile: **Passa** (nessun punto).
5. Allo scadere del tempo si sommano i punti e tocca all'altra squadra.
6. Dopo i turni scelti vince la squadra con più punti.

Le carte sono **originali** (140 parole): non sono quelle del gioco commerciale.

## Modalità di gioco

### Offline (un solo telefono che gira sul tavolo)

È l'unica modalità: chi descrive tiene il telefono. Funziona senza rete dopo la prima apertura ([come installarla](../../docs/app-installabile.md)).

### Online (ognuno col suo telefono)

Non prevista: il gioco è pensato per un telefono solo.

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/tabu (anche dal telefono, vedi l'indirizzo "Network")
```

Passi dettagliati, firewall e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md).

## Cosa controllare

- Con l'audio acceso (ingranaggio → Audio, spento di default): suoni diversi per Indovinata, Vietata detta e Passa, e un segnale a fine turno.
- Il timer scade e compare il riepilogo; il punteggio va alla squadra giusta.
- Le squadre si alternano e la partita finisce dopo i turni scelti.
- Il testo è leggibile sul telefono e le carte non si ripetono finché c'è mazzo.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `data/it/carte.json`: le carte (parola + 5 vietate), una riga per carta; `src/carte.ts` le legge.
- `src/logica.ts`: regole pure (punti, turni, vincitore); `src/validazione.ts`: nomi delle squadre.
- `src/ui/TabuApp.tsx`: le schermate.

## Come cambiare o aggiungere le carte

Le carte stanno in `data/it/carte.json`, una per riga. Non serve toccare il codice.

```json
{"parola": "Pizza", "vietate": ["forno", "mozzarella", "pomodoro", "Napoli", "impasto"]}
```

- **Aggiungere una carta**: aggiungi una riga in fondo (attenzione alla virgola tra una riga e l'altra, e niente virgola dopo l'ultima). Servono la parola e **esattamente cinque** parole vietate.
- **Modificare o togliere**: cambia o cancella la riga.
- Regole controllate dai test (`pnpm test:unit`): almeno 120 carte, nessuna parola da indovinare ripetuta (ignorando maiuscole), nessuno spazio ai bordi, la parola non compare tra le sue vietate, cinque vietate diverse.
- Le carte devono essere **originali**: non copiare quelle del gioco commerciale.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md) (`apps/web/vercel.json` apre direttamente `/tabu`).
