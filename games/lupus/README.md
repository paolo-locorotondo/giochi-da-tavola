# Lupus in fabula

Il villaggio dorme, i lupi no. Un telefono al centro del tavolo fa da **narratore a voce** (sintesi vocale, funziona offline). Servono **almeno 4 persone**.

## Regolamento

> Regole scritte dalla conoscenza del gioco classico (esistono varianti), non copiate da un regolamento ufficiale: controllale e dimmi cosa cambiare.

1. Ognuno vede in segreto il proprio **ruolo**. I lupi vedono i compagni.
2. **Notte**: tutti chiudono gli occhi. Il narratore chiama i lupi (scelgono una vittima, non un lupo), poi il veggente (scopre se un giocatore è lupo), poi il medico (protegge qualcuno, non lo stesso due notti di fila).
3. **Giorno**: si scopre chi è morto (e il suo ruolo). Si discute e si **vota**: devono votare tutti i vivi, i voti si segnano con + e −.
4. **Pareggio**: ballottaggio tra i pari merito; se pareggiano ancora nessuno viene eliminato.
5. Vincono i **contadini** se muoiono tutti i lupi, i **lupi** quando sono almeno quanti gli altri vivi.

Ruoli: 1 lupo ogni 4 giocatori (arrotondato), veggente da 5 giocatori, medico da 7, il resto contadini.

## Modalità di gioco

### Offline (un solo telefono che gira sul tavolo)

È l'unica modalità attuale: il telefono fa da narratore, passa di mano per i ruoli e resta al centro di notte.
Funziona senza rete dopo la prima apertura ([come installarla](../../docs/app-installabile.md)).

### Online (ognuno col suo telefono)

Non ancora disponibile ([punti aperti](../../docs/decisioni.md)).

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/lupus (anche dal telefono, vedi l'indirizzo "Network")
```

Passi dettagliati, firewall e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md).

## Cosa controllare

- La voce italiana parla a ogni fase. Serve l'audio acceso (ingranaggio → Audio, spento di default); spegnerlo ferma subito la voce. La casella "Voce del narratore" spegne solo la voce.
- Con l'audio acceso: ululato quando scende la notte, gallo all'alba, un verso diverso per ruolo (lupo, contadino, veggente, medico) quando muore qualcuno, solo se è attiva «Il narratore dice il ruolo di chi muore»; due suoni di fine partita (contadini o lupi). Sono sintetizzati: se non convincono, si ritoccano in `packages/suoni/src/index.ts`. Se non si sente: volume e voci italiane installate.
- Lupi non scelgono un lupo; il medico non protegge due volte di fila la stessa persona.
- Il ballottaggio parte dal primo pareggio, il secondo pareggio non elimina nessuno.
- Fine partita: l'elenco mostra i ruoli di tutti.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: regole pure (ruoli, candidati della notte, voto, vittoria); `src/validazione.ts`: controllo dei nomi.
- `src/ui/LupusApp.tsx`: schermate e narratore; `src/ui/voce.ts`: sintesi vocale.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md) (`apps/web/vercel.json` apre direttamente `/lupus`).
