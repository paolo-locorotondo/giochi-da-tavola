# Lupus in fabula

Il villaggio dorme, i lupi no. Un solo telefono al centro del tavolo fa da **narratore a voce** (sintesi vocale del telefono, funziona offline). Servono **almeno 4 persone**.

## Come si gioca

> Regole scritte dalla conoscenza del gioco classico (varianti diverse esistono), non copiate da un regolamento ufficiale: controllale e dimmi cosa cambiare.

1. Il telefono passa di mano: ognuno vede in segreto il proprio **ruolo**. I lupi vedono i compagni.
2. **Notte**: tutti chiudono gli occhi. Il narratore chiama i lupi (scelgono una vittima), poi il veggente (scopre se un giocatore è lupo), poi il medico (protegge qualcuno, ma non lo stesso due notti di fila). Chi ha il ruolo tocca il telefono, gli altri tengono gli occhi chiusi.
3. **Giorno**: si scopre chi è morto (e il suo ruolo). Si discute e si **vota** chi eliminare: devono votare tutti i vivi, i voti si segnano con + e −.
4. **Pareggio**: ballottaggio solo tra i pari merito; se pareggiano ancora nessuno viene eliminato.
5. Vincono i **contadini** se muoiono tutti i lupi, vincono i **lupi** quando sono almeno quanti gli altri vivi.

Ruoli: 1 lupo ogni 4 giocatori (arrotondato), veggente da 5 giocatori, medico da 7, il resto contadini.

## Provarlo

- **Computer**: `pnpm install` (solo la prima volta), poi `pnpm dev` e apri `http://localhost:5173/lupus`.
- **Telefono**: `pnpm dev:rete` e apri l'indirizzo "Network" seguito da `/lupus`.
- **Offline**: come per gli altri giochi (sito aperto una volta e aggiunto alla Home).

## Cosa controllare

- La voce italiana parla a ogni fase (se non si sente, controlla volume e voci italiane installate; la casella "Voce del narratore" la spegne).
- Lupi: non possono scegliere un lupo. Medico: non può proteggere due volte di fila la stessa persona.
- Il ballottaggio parte dal primo pareggio, e il secondo pareggio non elimina nessuno.
- Fine partita: l'elenco mostra i ruoli di tutti.

## Struttura

- `src/logica.ts`: regole pure (ruoli, notte, voto, vittoria), con test.
- `src/ui/LupusApp.tsx`: schermate e narratore; `src/ui/voce.ts`: sintesi vocale.

## Deploy

Insieme al resto dell'app su Vercel (Root Directory `apps/web`); `apps/web/vercel.json` fa aprire direttamente `/lupus`.
