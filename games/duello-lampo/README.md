# Duello Lampo

Sfida di riflessi per **due giocatori sullo stesso telefono**, appoggiato al centro del tavolo, uno di fronte all'altro. Una serie di mini giochi di velocità: ogni mini gioco vale 1 punto e alla fine vince chi ha più punti.

## Regolamento

1. Appoggia il telefono al centro del tavolo: ognuno gioca sulla metà di schermo che ha davanti (quella in alto è girata di 180°).
2. Scegli i mini giochi e quanti round giocare, poi tocca «Inizia la sfida».
3. Prima di ogni round si legge la regola e ognuno tocca «Sono pronto»; parte il conto alla rovescia 3, 2, 1.
4. Il mini gioco assegna 1 punto a chi lo vince; se è pari nessuno prende punti.
5. Vince chi ha più punti alla fine. Se sono pari si gioca uno spareggio di «Via!», finché qualcuno è avanti.

Note: i tempi si misurano sul telefono dal momento in cui lo stimolo compare sullo schermo; ognuno tocca solo la sua metà.

### Mini giochi

| Mini gioco | Come si vince |
|---|---|
| **Via!** | Lo schermo diventa verde (con la scritta «ORA!») dopo 1,5–5 secondi: vince chi tocca per primo. Chi tocca prima del via perde il round. |
| **Raffica** | Per 5 secondi si tocca il più possibile: vince chi tocca di più. |
| **Stop al centro** | Un indicatore scorre avanti e indietro su una barra: vince chi lo ferma più vicino al centro. |

Mini giochi previsti più avanti: Colore giusto (effetto Stroop), Bersagli, Il più grande, Memoria lampo (vedi [piano](../../docs/piano-duello-lampo.md)).

## Modalità di gioco

### Offline (un solo telefono)

È l'unica modalità. Funziona senza rete dopo la prima apertura ([come installarla](../../docs/app-installabile.md)). Nessuna partita da creare: si scelgono i mini giochi e si parte. Nomi, mini giochi e numero di round restano salvati su quel telefono per la sfida dopo.

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
- La metà in alto si legge dritta da chi sta di fronte; nessuno scorrimento né zoom durante la sfida; lo schermo resta acceso.
- **Via!**: toccare prima del verde dà il punto all'altro; il tempo mostrato è plausibile (200–400 ms); con due tocchi quasi insieme vince chi è davvero primo.
- **Raffica**: i tocchi si contano uno per uno e il round si chiude da solo dopo 5 secondi.
- **Stop al centro**: i due giocatori vedono lo stesso movimento e vince chi è più vicino al centro (si legge anche lo scarto in %).
- Nello spareggio compare «Spareggio» al posto del numero del round.
- «Esci» sta nella barra centrale (non c'è durante conto alla rovescia e mini gioco, per non toccarlo per sbaglio) e chiede conferma.
- «Avanti» resta spento per un attimo dopo l'esito, così un tocco in ritardo del round non lo salta.
- Il colore non è mai l'unico segnale: «ORA!», «Troppo presto!» e i risultati sono sempre scritti. Con «riduci movimento» attivo non cambia nulla di essenziale (l'indicatore di Stop al centro è il gioco stesso).
- Il suono (se l'audio è acceso): conto alla rovescia, via, punto, pari, fine.

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Struttura

- `src/logica.ts`: la partita (scaletta dei mini giochi senza ripetizioni di fila, punti, spareggio), pura e testata.
- `src/minigiochi/`: un file per mini gioco con le sole regole (`prepara`, `vincitore`, `durataMassima`), e `index.ts` con il **registro**.
- `src/ui/minigiochi/`: la vista React di ogni mini gioco e il suo registro `VISTE`.
- `src/ui/Preparazione.tsx` (scelta di nomi, mini giochi e round), `Partita.tsx` (schermo diviso, round, esito, fine), `DuelloLampoApp.tsx`.
- `src/locales/{it,en}.ts`: tutti i testi e il regolamento; `src/manifest.ts` li espone all'app.
- `src/suoni/`: suoni sintetizzati (nessun file audio).

## Come aggiungere un mini gioco

Un mini gioco è fatto di **regole** (puro TypeScript) e **vista** (React). Esempio: «Tocco lento», vince chi aspetta di più prima di toccare dopo il via.

1. **Regole**: `src/minigiochi/lento.ts` con un oggetto `MiniGioco<Config, Risultato>`:

   ```ts
   import { confronta, type MiniGioco } from "./tipi";

   export interface ConfigLento { dopoMs: number }
   export interface RisultatoLento { ms: number }

   export const lento: MiniGioco<ConfigLento, RisultatoLento> = {
     id: "lento",
     prepara: (rng) => ({ dopoMs: 2000 + rng.intero(2000) }), // tutta la casualità passa da qui
     durataMassima: (c) => c.dopoMs + 3000,
     chiudeAlPrimo: false,
     vincitore: (_c, [a, b]) =>
       confronta("ms" in a ? a.ms : 0, "ms" in b ? b.ms : 0, "maggiore"),
   };
   ```

   `vincitore` restituisce `0` (chi sta in basso), `1` (chi sta in alto) o `null` (pari); chi non ha finito in tempo è `NESSUNO`. Aggiungi i test in `src/logica.test.ts`.

2. **Registro delle regole**: aggiungi `lento` all'elenco `MINIGIOCHI` in `src/minigiochi/index.ts`. È tutto: scelta dei mini giochi, scaletta e salvataggio lo usano da soli.
3. **Vista**: `src/ui/minigiochi/LentoVista.tsx` riceve `{ config, lato, inizio, principale, onRisultato }`, disegna la sua metà e chiama `onRisultato(...)` **una sola volta**; esporta anche `descriviLento` (il testo breve del risultato). Per i tempi usa `performance.now()` e `inizio` (il tempo zero comune), non l'ora del computer. Aggiungila a `VISTE` in `src/ui/minigiochi/index.ts`. Le zone di tocco usano la classe `dl-zona`.
4. **Testi**: in `src/locales/it.ts` e `en.ts` le chiavi `mg_lento_nome` e `mg_lento_regola` (stesse chiavi in entrambe: lo verifica il compilatore).
5. Prova con `pnpm --filter @gdt/duello-lampo test` e a mano.

## Lingue

Italiano e inglese. Cambiando lingua dall'ingranaggio cambiano tutti i testi.

- **Cambiare un testo**: modifica la chiave in `src/locales/it.ts` e in `src/locales/en.ts`; il compilatore segnala se manca in una lingua.
- **Aggiungere una lingua**: aggiungila in `packages/i18n` e crea `src/locales/<lingua>.ts`.
- Nel codice niente frasi: la logica non produce testo e il TSX usa `t("chiave")`.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md). Il gioco è solo lato browser e non richiede il server di gioco (`apps/web/vercel.json` apre direttamente `/duello-lampo`).
