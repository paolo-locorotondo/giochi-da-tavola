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

## Pulsanti di fine turno e transizione

Quando il narratore chiama un ruolo, chi ha finito tocca il pulsante e lascia il telefono al centro:

- lupi e medico: «Conferma e torna a dormire»;
- veggente: «Ho visto, torna a dormire» (il veggente vede la carta del giocatore scelto, poi chiude gli occhi);
- l'ultima carta della distribuzione resta «Ho visto, passa il telefono».

Dopo ogni pulsante di fine turno tra un ruolo e l'altro compare una **schermata di transizione** sempre uguale, con la luna e il testo «Occhi chiusi». Prima del racconto dell'alba ne compare una diversa, con il sole e «Il villaggio si risveglia»: dice a tutti di aprire gli occhi. Serve a non vedere la schermata del ruolo successivo mentre si torna a dormire. Dura il tempo scelto nelle impostazioni del gioco (ingranaggio → Lupus in fabula → Schermata di transizione: No, 3, 5, 8 o 10 secondi, predefinito 5). Se il narratore sta ancora parlando alla fine della durata, la schermata resta fino alla fine della frase (al massimo altri 20 secondi).

Le impostazioni di gioco sono salvate sul telefono e non fanno parte della partita: si cambiano anche tra una partita e l'altra. Sono dichiarate in `src/impostazioni.ts` (pacchetto `@gdt/preferenze`).

## Cosa controllare

- Ogni ruolo chiude con lo stesso gesto: «Conferma e torna a dormire» (o «Ho visto, torna a dormire» per il veggente), poi la transizione. Con «No» la transizione non compare.
- La voce italiana parla a ogni fase. Serve l'audio acceso (ingranaggio → Audio, spento di default); spegnerlo ferma subito la voce. La casella "Voce del narratore" spegne solo la voce.
- Con l'audio acceso: ululato quando scende la notte, gallo all'alba, un verso diverso per ruolo (lupo, contadino, veggente, medico) quando muore qualcuno, solo se è attiva «Il narratore dice il ruolo di chi muore»; due suoni di fine partita (contadini o lupi). Sono sintetizzati: se non convincono, si ritoccano in `packages/suoni/src/index.ts`. Se non si sente: volume e voci italiane installate.
- Lupi non scelgono un lupo; il medico non protegge due volte di fila la stessa persona.
- Il ballottaggio parte dal primo pareggio, il secondo pareggio non elimina nessuno.
- Fine partita: l'elenco mostra i ruoli di tutti.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: regole pure (ruoli, candidati della notte, voto, vittoria); non produce frasi, solo codici (es. `esitoVoto`). `src/validazione.ts`: controllo dei nomi, restituisce un codice d'errore.
- `src/ui/LupusApp.tsx`: schermate e narratore; `src/ui/voce.ts`: sintesi vocale nella lingua dell'app (`it-IT`, `en-US`).
- `data/<lingua>/personaggi.json`: i testi dei personaggi per lingua; `src/personaggi.ts` li legge.
- `src/locales/<lingua>.ts` (`it.ts` è il riferimento) e `src/locales/index.ts`: tutti gli altri testi visibili (schermate, frasi del narratore, regolamento, impostazioni).
- `src/impostazioni.ts` e `src/manifest.ts`: impostazioni e testi per l'app (`manifest.testi(lingua)`).

## Lingue

Italiano e inglese. La lingua si sceglie dall'ingranaggio dell'app; il narratore a voce parla nella stessa lingua (serve una voce installata sul telefono per quella lingua). I **suoni** (ululato, gallo, versi dei ruoli, fine partita) non dipendono dalla lingua, la **voce** sì.

**Aggiungere una lingua** (es. `fr`):

1. Aggiungila in `LINGUE` e `NOME_LINGUA` di `packages/i18n/src/index.ts` (e il codice voce in `LINGUA_VOCE` di `src/ui/voce.ts`).
2. Copia `src/locales/en.ts` in `src/locales/fr.ts`, traduci i valori (le chiavi restano uguali) e aggiungila in `src/locales/index.ts`.
3. Copia `data/en/personaggi.json` in `data/fr/personaggi.json`, traduci e aggiungila in `PERSONAGGI` di `src/personaggi.ts`.

Il compilatore segnala una lingua o una chiave mancante.

**Tradurre o cambiare un personaggio**: modifica `nome`, `tuo` e `regolamento` in `data/<lingua>/personaggi.json`, senza toccare il codice. Le chiavi (`lupo`, `contadino`, `veggente`, `medico`) sono i ruoli del codice e non si traducono.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md) (`apps/web/vercel.json` apre direttamente `/lupus`).
