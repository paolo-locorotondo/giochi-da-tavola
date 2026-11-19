# Duello Lampo

Sfida di riflessi per **due giocatori sullo stesso telefono**, appoggiato al centro del tavolo, uno di fronte all'altro. Una serie di mini giochi di velocità: ogni mini gioco vale 1 punto e alla fine vince chi ha più punti.

## Regolamento

1. Appoggia il telefono al centro del tavolo: ognuno gioca sulla metà di schermo che ha davanti (quella in alto è girata di 180°).
2. Per ogni mini gioco scegli quante **mani** (round) giocare di fila, da 0 a 9; con 0 non si usa. Poi tocca «Inizia la sfida».
3. Prima di ogni round si legge la regola e ognuno tocca «Sono pronto»; parte il conto alla rovescia 3, 2, 1.
4. Il mini gioco assegna 1 punto a chi lo vince; se è pari nessuno prende punti.
5. Ogni metà dello schermo mostra il **punteggio** del suo giocatore. Vince chi ha più punti alla fine. Se sono pari si gioca uno spareggio di «Via!», finché qualcuno è avanti.

Note: i tempi si misurano sul telefono dal momento in cui lo stimolo compare sullo schermo; ognuno tocca solo la sua metà.

### Mini giochi

| Mini gioco | Come si vince |
|---|---|
| **Via!** | Lo schermo diventa verde (con la scritta «ORA!») dopo 1,5–5 secondi: vince chi tocca per primo. Chi tocca prima del via perde il round. |
| **Raffica** | Per 5 secondi si tocca il più possibile: vince chi tocca di più. |
| **Stop al centro** | Un indicatore scorre avanti e indietro su una barra: vince chi lo ferma più vicino al centro. |
| **Colore giusto** | Compare il nome di un colore scritto con un altro colore (es. «Verde» scritto in rosso): si tocca il colore **della scritta**. Vince chi risponde giusto per primo; chi sbaglia perde il round. |
| **Colori e nomi** | Passano nomi di colori scritti con un altro colore (es. «Rosso» scritto in verde), uno ogni 1,3 secondi. Quando nome e colore combaciano (es. «Blu» in blu) vince chi tocca per primo; chi tocca prima perde il round, come in Via!. |
| **Trova il panda** | Una griglia 4×4 di animali colorati, ognuno girato in una direzione. Ogni secondo **cambiano 3 animali** a caso; a un certo punto uno di quelli che cambiano è un panda: vince chi lo tocca per primo. Gli altri animali continuano a cambiare anche dopo, così non si capisce dal fermo che è uscito. Chi tocca un altro animale (o tocca prima che compaia) perde il round. |
| **Trova lo smile** | Come Trova il panda, ma con faccine tristi colorate e girate: vince chi tocca per primo l'unica faccina che sorride. |
| **Memoria lampo** | Quattro caselle numerate si accendono una alla volta (4 passi); poi si ripete la sequenza nello stesso ordine. Vince chi la ripete giusta per primo; chi sbaglia una casella perde il round. |

### Impostazioni

Sotto ogni mini gioco, nella preparazione, c'è il pannello **«Impostazioni»** (si apre e si chiude). I valori di base sono quelli della tabella sopra; quando ne cambi uno compare «N modificate» e il tasto «Valori di base» li rimette. Le impostazioni valgono per la sfida e restano salvate sul telefono insieme a mani e nomi.

| Mini gioco | Impostazioni (base in grassetto) |
|---|---|
| Via! | Attesa massima prima del via: 3 / **5** / 8 s |
| Raffica | Durata: 3 / **5** / 10 s |
| Stop al centro | Velocità dell'indicatore: lenta / **media** / veloce |
| Colore giusto | Numero di colori: **4** / 5 (il quinto è il viola) |
| Colori e nomi | Tempo per ogni parola: 0,8 / **1,3** / 2 s |
| Trova il panda, Trova lo smile (ognuno i suoi) | Griglia: 3×3 / **4×4** / 5×5 / 6×6 · Caselle che cambiano a ogni passo: da 1 a tutte (**3**) · Ogni quanto cambiano: 0,5 / 0,75 / **1** / 1,5 / 2 s · Le figure che cambiano ruotano: **sì** / no · Tutte dritte verso il giocatore (facile): sì / **no** |
| Memoria lampo | Caselle: **4** / 6 / 9 · Lunghezza della sequenza: 3 / **4** / 5 / 6 / 7 / 8 |

Regole tra impostazioni: se rimpicciolisci la griglia, le caselle che cambiano scendono al massimo possibile (in 3×3 al massimo 9); con «Tutte dritte» l'interruttore «ruotano» si spegne. Lo spareggio di Via! usa le impostazioni scelte per Via!.

Idee per altri mini giochi: Bersagli (cerchi da colpire in 8 secondi), Il più grande (si tocca il numero più grande). Sui tablet si potranno valutare griglie più grandi di 6×6.

## Modalità di gioco

### Offline (un solo telefono)

È l'unica modalità. Funziona senza rete dopo la prima apertura ([come installarla](../../docs/app-installabile.md)). Nessuna partita da creare: si scelgono le mani di ogni mini gioco e si parte. Nomi e mani restano salvati su quel telefono per la sfida dopo.

### Online (ognuno col suo telefono)

**Non realizzata.** Decisione rimandata a quando si vorrà farla. Cosa comporta:

- **Il rischio**: ogni telefono ha una rete diversa (50–300 ms e oltre). Se il server decidesse «chi ha toccato prima» dall'ordine dei messaggi, vincerebbe chi ha la rete più veloce.
- **La soluzione**: misurare sempre sul telefono. Il server manda i parametri del round (anche il ritardo casuale), ogni telefono mostra lo stimolo e misura il proprio tempo, poi invia **solo la durata** (es. 312 ms). Il server confronta le durate: la rete lenta allunga l'attesa tra un round e l'altro, ma non cambia chi vince. I mini giochi sono già fatti così (`prepara` + `vincitore` in `src/minigiochi`), quindi la logica si riusa.
- **Mini giochi esclusi**: quelli in cui si deve vedere l'altro in tempo reale (es. tiro alla fune). Via!, Raffica e Stop al centro vanno bene.
- **Cosa cambia nel server**: oggi non c'è un timer per le partite (solo ping, scadenza della coda e pulizia delle stanze). Serve un'aggiunta al contratto `GiocoOnline`, per esempio `scadenze?(stato, ora)` controllata a intervalli, per chiudere un round se un telefono non risponde.
- **Da decidere allora**: soglia di pari merito per le differenze di hardware (schermi a 60 o 120 Hz, ritardo del tocco: qualche decina di ms); quanto fidarsi dei tempi inviati dal telefono (un telefono modificato potrebbe barare: tra amici si può accettare, con controlli minimi come scartare tempi sotto i 100 ms); round annullato e ripetuto se un telefono cade.
- **Bonus**: il server sa già fare la «partita veloce» con coda a due (`coda: { giocatori: 2 }`).

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/duello-lampo (anche dal telefono, vedi l'indirizzo "Network")
```

Passi dettagliati, firewall e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md). Per provarlo offline: `pnpm --filter @gdt/web build`, apri il sito una volta, poi spegni la rete e ricarica.

## Cosa controllare

- **Su un telefono vero** (i test automatici non provano il doppio tocco): ognuno con un dito sulla sua metà, insieme. Verifica che i due tocchi simultanei arrivino entrambi, anche in «Raffica».
- Il punteggio grande in ogni metà è quello del giocatore di quella metà e sale a ogni punto.
- Con le mani scelte (es. Via! 2, Stop al centro 3) i round escono di fila in quest'ordine: prima le mani del primo mini gioco dell'elenco, poi quelle del secondo, ecc.
- La metà in alto si legge dritta da chi sta di fronte; nessuno scorrimento né zoom durante la sfida; lo schermo resta acceso.
- **Via!**: toccare prima del verde dà il punto all'altro; il tempo mostrato è plausibile (200–400 ms); con due tocchi quasi insieme vince chi è davvero primo.
- **Raffica**: i tocchi si contano uno per uno e il round si chiude da solo dopo 5 secondi.
- **Stop al centro**: i due giocatori vedono lo stesso movimento e vince chi è più vicino al centro (si legge anche lo scarto in %).
- **Colore giusto**: la parola e il colore della scritta non coincidono mai; ogni tasto ha il nome del colore oltre al pallino (si gioca anche senza distinguere i colori).
- **Colori e nomi**: la prima parola non combacia mai e la stessa parola non esce due volte di fila; chi tocca prima che combacino perde.
- **Trova il panda / lo smile**: a ogni passo cambiano solo 3 caselle (non tutta la griglia, per non stancare la vista) e il bersaglio compare tra quelle che cambiano; dopo la comparsa le altre continuano a cambiare e il bersaglio resta fermo nella sua casella; le due metà hanno la stessa griglia e il bersaglio compare nello stesso momento; la griglia resta intera anche su telefoni bassi.
- **Memoria lampo**: la casella accesa si riconosce anche dal numero; durante la dimostrazione i tocchi non contano.
- Nello spareggio compare «Spareggio» al posto del numero del round.
- «Esci» sta nella barra centrale (non c'è durante conto alla rovescia e mini gioco, per non toccarlo per sbaglio) e chiede conferma.
- «Avanti» resta spento per un attimo dopo l'esito, così un tocco in ritardo del round non lo salta.
- Il colore non è mai l'unico segnale: «ORA!», «Troppo presto!» e i risultati sono sempre scritti. Con «riduci movimento» attivo non cambia nulla di essenziale (l'indicatore di Stop al centro è il gioco stesso).
- Il suono (se l'audio è acceso): conto alla rovescia, via, punto, pari, fine.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: la partita (scaletta con le mani di ogni mini gioco di fila, punti, spareggio), pura e testata.
- `src/minigiochi/`: un file per mini gioco con le sole regole (`prepara`, `vincitore`, `durataMassima`), e `index.ts` con il **registro**. `trova.ts` è un modulo comune: Trova il panda e Trova lo smile sono due sue configurazioni (bersaglio e figure).
- `src/ui/minigiochi/`: la vista React di ogni mini gioco e il suo registro `VISTE`.
- `src/ui/Preparazione.tsx` (nomi e mani di ogni mini gioco), `Partita.tsx` (schermo diviso, round, esito, fine), `DuelloLampoApp.tsx`.
- `src/locales/{it,en}.ts`: tutti i testi e il regolamento; `src/manifest.ts` li espone all'app.
- `src/suoni/`: suoni sintetizzati (nessun file audio).

## Aggiungere un mini gioco

I mini giochi sono moduli indipendenti: aggiungerne uno non richiede di toccare il resto. La guida passo per passo, con un esempio, è in [docs/aggiungere-un-minigioco.md](docs/aggiungere-un-minigioco.md).

## Lingue

Italiano e inglese. Cambiando lingua dall'ingranaggio cambiano tutti i testi.

- **Cambiare un testo**: modifica la chiave in `src/locales/it.ts` e in `src/locales/en.ts`; il compilatore segnala se manca in una lingua.
- **Aggiungere una lingua**: aggiungila in `packages/i18n` e crea `src/locales/<lingua>.ts`.
- Nel codice niente frasi: la logica non produce testo e il TSX usa `t("chiave")`.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md). Il gioco è solo lato browser e non richiede il server di gioco (`apps/web/vercel.json` apre direttamente `/duello-lampo`).
