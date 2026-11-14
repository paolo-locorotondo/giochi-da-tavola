# Lupus in fabula

Il villaggio dorme, i lupi no. Un telefono al centro del tavolo fa da **narratore a voce** (sintesi vocale, funziona offline). Servono **da 8 a 24 persone**.

## Regolamento

> Regole scritte dalla conoscenza del gioco classico (esistono varianti), non copiate da un regolamento ufficiale: controllale e dimmi cosa cambiare.

1. Ognuno vede in segreto il proprio **ruolo**. I lupi vedono i compagni.
2. **Notte**: tutti chiudono gli occhi. Il narratore chiama, nell'ordine: il medium (dalla seconda notte: sente se l'ultimo linciato era un lupo), i massoni (solo la prima notte: si riconoscono), il medico (protegge qualcuno, non sé stesso; può ripetere la stessa persona), il veggente (scopre se un giocatore è lupo), i lupi (scelgono una vittima, non un lupo). Ogni ruolo si sveglia anche se è morto, senza mostrare nulla.
3. **Giorno**: si scopre chi è morto, si discute (timer facoltativo di 3 minuti; i morti non parlano).
4. **Primo turno**: votano tutti, anche i morti (fantasmi); i voti si segnano con + e −. I due più votati sono gli **indiziati** e fanno un'arringa.
5. **Secondo turno**: votano in segreto solo i vivi non indiziati; il più votato è linciato. Nei pareggi vince chi siede più vicino, in senso orario, a chi ha il «Benvenuto!» (l'ultimo morto; il primo giorno il narratore, quindi il primo nome dell'elenco).
5. Vincono i **contadini** se muoiono tutti i lupi, i **lupi** quando sono almeno quanti gli altri vivi. Il **criceto mannaro**, se è vivo alla fine, vince da solo.

Ruoli: 2 lupi da 8 a 15 giocatori, 3 da 16; un veggente; poi gli speciali dal numero minimo (si possono togliere o aggiungere prima di iniziare): medium da 9, indemoniato da 10, medico da 11, due massoni da 13, criceto mannaro da 15. Il resto contadini.

| Ruolo | Dove sta | Cosa fa |
|---|---|---|
| Lupo | con i lupi | di notte sceglie una vittima, non un lupo |
| Contadino | villaggio | niente di speciale: vota e basta |
| Veggente | villaggio | di notte scopre se un giocatore è lupo |
| Medico | villaggio | di notte protegge un giocatore (non sé stesso); se i lupi scelgono lui, nessuno muore |
| Indemoniato | con i lupi | è umano per il veggente e per il conteggio, ma vince con i lupi (non sa chi siano) |
| Massone | villaggio | i due massoni si riconoscono la prima notte |
| Medium | villaggio | dalla seconda notte sa se l'ultimo linciato era un lupo (un Indemoniato o un contadino conta come «non lupo») |
| Criceto mannaro | a sé | i lupi non possono sbranarlo; se il veggente lo guarda muore insieme allo sbranato; vince da solo se è vivo a fine partita (per il conteggio è umano) |

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

- lupi e medico: «Conferma e torna a dormire»; medium e massoni: «Ho capito, torna a dormire» e «Ho visto, tornate a dormire» (nessuna scelta da fare);
- veggente: «Ho visto, torna a dormire» (il veggente vede la carta del giocatore scelto, poi chiude gli occhi);
- l'ultima carta della distribuzione resta «Ho visto, passa il telefono».

Dopo ogni pulsante di fine turno tra un ruolo e l'altro compare una **schermata di transizione** sempre uguale, con la luna e il testo «Occhi chiusi». Prima del racconto dell'alba ne compare una diversa, con il sole e «Il villaggio si risveglia»: dice a tutti di aprire gli occhi. Serve a non vedere la schermata del ruolo successivo mentre si torna a dormire. Dura il tempo scelto nelle impostazioni del gioco (ingranaggio → Lupus in fabula → Schermata di transizione: No, 3, 5, 8 o 10 secondi, predefinito 5). Se il narratore sta ancora parlando alla fine della durata, la schermata resta fino alla fine della frase (al massimo altri 20 secondi).

Le impostazioni di gioco sono salvate sul telefono e non fanno parte della partita: si cambiano anche tra una partita e l'altra. Sono dichiarate in `src/impostazioni.ts` (pacchetto `@gdt/preferenze`).

## Cosa controllare

- Ogni ruolo chiude con lo stesso gesto: «Conferma e torna a dormire» (o «Ho visto, torna a dormire» per il veggente), poi la transizione. Con «No» la transizione non compare.
- La voce italiana parla a ogni fase. Serve l'audio acceso (ingranaggio → Audio, spento di default); spegnerlo ferma subito la voce. La casella "Voce del narratore" spegne solo la voce.
- Con l'audio acceso: ululato quando scende la notte, gallo all'alba, un verso diverso per ruolo (lupo, contadino, veggente, medico; indemoniato, massone, medium e criceto riusano quelli di lupo, contadino e veggente) quando muore qualcuno, solo se è attiva «Il narratore dice il ruolo di chi muore»; due suoni di fine partita (contadini o lupi). Sono sintetizzati: se non convincono, si ritoccano in `packages/suoni/src/index.ts`. Se non si sente: volume e voci italiane installate.
- Lupi non scelgono un lupo; il medico non protegge sé stesso ma può proteggere la stessa persona due notti di fila.
- Con 9 giocatori il medium compare dalla seconda notte; con 13 i massoni si riconoscono la prima notte (e non appaiono più dopo). Con 10 l'Indemoniato non è lupo per il veggente: «non è un lupo».
- Medium: il messaggio «era un lupo» compare solo se il linciato era davvero un lupo (non l'Indemoniato). Se il medium è morto, la sua fase si gioca senza messaggi.
- Fine partita: l'Indemoniato vince con i lupi, non con i contadini.
- Criceto (15 giocatori): se i lupi lo scelgono, nessuno muore; se il veggente lo guarda compare «È un criceto mannaro…» e all'alba muoiono due persone (lo sbranato e il criceto); se è vivo a fine partita vince solo lui («Vince il criceto mannaro!»).
- Si lincia sempre qualcuno: i pareggi li decide il «Benvenuto!», non c'è più il ballottaggio. I nomi vanno inseriti in ordine orario.
- Fine partita: l'elenco mostra i ruoli di tutti.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: regole pure (ruoli, candidati della notte, voto, vittoria); non produce frasi, solo codici (es. gli `indiziati`). `src/validazione.ts`: controllo dei nomi, restituisce un codice d'errore.
- `src/ui/LupusApp.tsx`: schermate e narratore; `src/ui/voce.ts`: sintesi vocale nella lingua dell'app (`it-IT`, `en-US`).
- `data/<lingua>/personaggi.json`: i testi dei personaggi per lingua; `src/personaggi.ts` li legge.
- `src/locales/<lingua>.ts` (`it.ts` è il riferimento) e `src/locales/index.ts`: tutti gli altri testi visibili (schermate, frasi del narratore, regolamento, impostazioni).
- `src/impostazioni.ts` e `src/manifest.ts`: impostazioni e testi per l'app (`manifest.testi(lingua)`).

## Personaggi: cosa si cambia nei dati e cosa nel codice

In Lupus le «carte» sono i **personaggi**. Un personaggio ha due parti:

- **Testi** (nei dati, `data/<lingua>/personaggi.json`): per ogni ruolo `nome`, `tuo` (cosa legge il giocatore sulla propria carta, in seconda persona) e `regolamento` (la voce di «I personaggi» nel regolamento, in terza persona). **Modificare questi testi non richiede il codice**: cambi il file e basta.
- **Poteri** (nel codice, `src/logica.ts`): chi si sveglia, cosa può scegliere, come si risolve la notte, chi vince, quanti ce ne sono ogni N giocatori. Questa parte non è nei dati: sono regole, e un errore nel JSON non deve poterle rompere.

**Aggiungere un personaggio nuovo** (per esempio la guardia o il cacciatore) richiede quindi entrambe le parti, e il compilatore ti guida perché ogni elenco di ruoli è un `Record<Ruolo, …>`:

1. Aggiungi il ruolo al tipo `Ruolo` in `src/logica.ts`.
2. Scrivi i suoi testi in **ogni** `data/<lingua>/personaggi.json` (`it`, `en`); il compilatore segnala dove manca.
3. Decidi in `distribuisciRuoli` da quanti giocatori compare.
4. Se agisce di notte: aggiungi la fase, il candidato (`candidatiNotte`), l'azione e la risoluzione in `riduci`, e la schermata in `src/ui/LupusApp.tsx` (titolo, testo del narratore, `FINE_TURNO`, e la fase in `FASI_CON_TRANSIZIONE`).
5. Aggiungi il suo verso di morte in `SUONO_MORTO` (e il suono in `packages/suoni`).
6. Aggiorna il regolamento («Ruoli: …») qui e in `src/locales/{it,en}.ts` (regolamento, e anche le frasi del narratore e dell'interfaccia del nuovo ruolo), e scrivi i test in `src/logica.test.ts`.

La fase di notte è un elenco ordinato di descrittori in `src/logica.ts` (`FASI_NOTTE`: chi si sveglia, chi può scegliere, effetto). Un ruolo notturno nuovo si aggiunge lì, e la UI della notte ne deriva.

## Lingue

Italiano e inglese. La lingua si sceglie dall'ingranaggio dell'app; il narratore a voce parla nella stessa lingua (serve una voce installata sul telefono per quella lingua). I **suoni** (ululato, gallo, versi dei ruoli, fine partita) non dipendono dalla lingua, la **voce** sì.

**Aggiungere una lingua** (es. `fr`):

1. Aggiungila in `LINGUE` e `NOME_LINGUA` di `packages/i18n/src/index.ts` (e il codice voce in `LINGUA_VOCE` di `src/ui/voce.ts`).
2. Copia `src/locales/en.ts` in `src/locales/fr.ts`, traduci i valori (le chiavi restano uguali) e aggiungila in `src/locales/index.ts`.
3. Copia `data/en/personaggi.json` in `data/fr/personaggi.json`, traduci e aggiungila in `PERSONAGGI` di `src/personaggi.ts`.

Il compilatore segnala una lingua o una chiave mancante.

**Tradurre o cambiare un personaggio**: modifica `nome`, `tuo` e `regolamento` in `data/<lingua>/personaggi.json`, senza toccare il codice. Le chiavi (`lupo`, `contadino`, `veggente`, `medico`, `indemoniato`, `massone`, `medium`, `criceto`) sono i ruoli del codice e non si traducono. Ogni ruolo ha anche `plurale` (per l'elenco della composizione, «2 massoni»).

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md) (`apps/web/vercel.json` apre direttamente `/lupus`).
