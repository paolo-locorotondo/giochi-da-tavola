# Tabù

Gioco a squadre da fare in compagnia con un solo telefono. Servono **almeno 4 persone**, divise in due squadre.

## Come si gioca

> Regole scritte dalla conoscenza del gioco classico, non copiate da un regolamento ufficiale: controllale e dimmi se qualcosa non torna.

1. Le squadre si alternano. Nel proprio turno un giocatore **descrive** a voce la parola in cima alla carta, e i compagni cercano di indovinarla.
2. Non può dire la parola né le **cinque parole vietate** sulla carta, né usare gesti, parti della parola o traduzioni.
3. Una persona della squadra avversaria controlla: se sente una parola vietata, chi tiene il telefono tocca **Vietata detta (−1)** e passa alla carta dopo.
4. Parola indovinata: **Indovinata (+1)**. Carta troppo difficile: **Passa** (nessun punto).
5. Allo scadere del tempo il turno finisce; si sommano i punti e tocca all'altra squadra.
6. Dopo il numero di turni scelto vince la squadra con più punti.

Le carte sono **originali** (circa 150 parole): non sono quelle del gioco commerciale.

## Provarlo

- **Computer**: `pnpm install` (solo la prima volta), poi `pnpm dev` e apri `http://localhost:5173/tabu`.
- **Telefono**: `pnpm dev:rete` e apri sul telefono l'indirizzo "Network" seguito da `/tabu` (stesso WiFi).
- **Offline**: apri il sito pubblicato una volta con internet, poi aggiungilo alla schermata Home; funziona anche in modalità aereo.

## Cosa controllare

- Il timer scade e compare il riepilogo del turno; il punteggio si somma alla squadra giusta.
- Le squadre si alternano e la partita finisce dopo i turni scelti.
- Il testo è leggibile sul telefono e le carte non si ripetono finché c'è mazzo.

## Struttura

- `src/carte.ts`: le carte (parola + 5 vietate), aggiungine una riga per volta.
- `src/logica.ts`: regole pure (punti, turni, vincitore), con test.
- `src/ui/TabuApp.tsx`: le schermate.

## Deploy

Si pubblica insieme al resto dell'app: sito statico (es. Vercel, Root Directory `apps/web`; `apps/web/vercel.json` fa aprire direttamente `/tabu`) oppure dal server Docker ([guida](../../docs/guida-deploy-online.md)). Resta solo a un telefono.
