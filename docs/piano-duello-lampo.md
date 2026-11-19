# Piano di lavoro — «Duello Lampo» (mini giochi di velocità per due)

Stato: **piano rivisto con le decisioni dell'utente (2026-11-19)**, da approvare prima di partire. Origine: TODO in `docs/decisioni.md`.

Una serie di mini giochi di velocità; ogni mini gioco vale 1 punto; alla fine vince chi ha più punti.

## Decisioni prese

| Tema | Decisione |
|---|---|
| Nome | **«Duello Lampo»**, icona un fulmine (`Zap` di lucide). |
| Cartella e indirizzo | `games/duello-lampo`, id `duello-lampo`, indirizzo `/duello-lampo` (il trattino non dà problemi: l'app prende il primo pezzo del percorso come id del gioco). |
| Versione | **Solo un telefono, offline**, appoggiato al centro del tavolo, i due giocatori uno di fronte all'altro. |
| Giocatori | Solo 2. |
| Punteggio | 1 punto a chi vince il mini gioco, 0 a entrambi se pari. |
| Mini giochi | Elenco iniziale sotto; **alla creazione della sfida si sceglie quali usare**. Aggiungerne uno nuovo deve costare poco. |
| Online | **Rimandato.** Il README del gioco spiegherà cosa comporta (vedi «Versione online: cosa comporta»). |

## Mini giochi iniziali

Tutti brevi (5–15 secondi) e pensati per due metà di schermo.

1. **Via!**: lo schermo diventa verde (con la scritta «ORA») dopo un ritardo casuale; vince chi tocca prima. Chi tocca prima del via perde il round.
2. **Colore giusto**: appare il nome di un colore scritto in un altro colore; si tocca il colore *scritto*. Vince il primo che risponde giusto; chi sbaglia è fermo per un attimo.
3. **Raffica**: per 5 secondi si tocca il più possibile; vince chi tocca di più.
4. **Il più grande**: compaiono alcuni numeri, si tocca il più grande. Vince il primo che risponde giusto.
5. **Stop al centro**: un indicatore scorre su una barra, si tocca quando è al centro. Vince chi si ferma più vicino.
6. **Bersagli**: compaiono cerchi in punti casuali della propria metà; vince chi ne colpisce di più in 8 secondi.
7. **Memoria lampo**: si accende una breve sequenza di caselle da ripetere; vince chi la ripete giusta per primo.

Spareggio, se a fine partita c'è parità: un round di «Via!».

## Mini giochi come moduli: aggiungerne uno è facile

Ogni mini gioco è un modulo a sé, con la logica pura separata dalla vista:

```ts
/** Logica pura e testabile: niente DOM, niente tempo reale. */
interface MiniGioco<Config, Risultato> {
  id: string;                         // es. "via", anche chiave dei testi
  durataMassima: number;              // ms, oltre la quale il round si chiude
  prepara(rng: Rng): Config;          // parametri del round dal seme (ritardo, posizioni, colori…)
  vincitore(config: Config, risultati: [Risultato, Risultato]): 0 | 1 | null; // null = pari
}

/** Vista React di una metà dello schermo: riceve config, riporta il risultato. */
type VistaMiniGioco<Config, Risultato> = (props: {
  config: Config;
  fine(risultato: Risultato): void;
}) => JSX.Element;
```

- **Registro unico** `MINIGIOCHI` in `src/minigiochi/index.ts`: ogni voce collega logica, vista, icona e chiavi dei testi.
- **Per aggiungere un mini gioco**: un file di logica con i test, un file di vista, una riga nel registro, i testi (nome, spiegazione in una riga) in `locales/{it,en}.ts`. Il README del gioco lo spiega con un esempio.
- **Hook comune `useReazione`**: ritardo, frame in cui lo stimolo compare davvero (`requestAnimationFrame`), misura con `performance.now()`, partenza anticipata. Lo usano tutti i mini giochi, così la misura è uguale per tutti.
- Il **round** (conto alla rovescia, avvio delle due metà, raccolta dei risultati, punto) è gestito una volta sola dalla partita, non da ogni mini gioco.

## Creazione della sfida

- Nomi dei due giocatori (facoltativi; di base «Giocatore 1» e «Giocatore 2»).
- **Scelta dei mini giochi**: elenco con il selettore delle mani, pulsanti «Tutti» e «A caso». Almeno una mano in tutto.
- **Mani per mini gioco** (fatto in 0.16.0): accanto a ogni mini gioco un selettore − / + da 0 a 9 (di base 2); le mani di un mini gioco si giocano di fila, nell'ordine dell'elenco. Con 0 il mini gioco non si usa.
- La scelta resta salvata sul telefono (`@gdt/preferenze`) per la sfida successiva.

## Schermo diviso, telefono al centro

- Due metà: quella in alto **ruotata di 180°**, così ognuno legge il proprio lato. Ogni metà è una zona di tocco indipendente.
- Tocchi con **Pointer Events** multitouch, ognuno assegnato alla propria metà. Da provare su telefoni veri: alcuni browser perdono un tocco quando due dita toccano insieme.
- Mentre si gioca: schermo sempre acceso (Wake Lock, se disponibile), niente scorrimento né zoom, orientamento verticale.
- Contatore dei punti grande in ogni metà (fatto in 0.16.0).
- Tra un round e l'altro: risultato del round su entrambe le metà, punteggio, «Pronti?» con conto alla rovescia 3-2-1.
- Fine partita: vincitore, punti per mini gioco, «Rivincita» con la stessa scelta.
- Suoni sintetizzati con `@gdt/suoni` (via, punto, fine); vibrazione facoltativa sul punto.
- Accessibilità: mai solo il colore (Via! mostra anche «ORA»), impostazione per animazioni ridotte.
- Funziona offline (PWA), nessuna rete.

## Architettura

```
games/duello-lampo/
├── package.json, tsconfig.json, README.md
├── src/
│   ├── logica.ts               → partita: scaletta dei round, punti, spareggio (puro, testato)
│   ├── minigiochi/
│   │   ├── index.ts            → registro MINIGIOCHI
│   │   ├── via.ts, raffica.ts… → logica di ogni mini gioco, con i test
│   ├── manifest.ts, locales/{it,en}.ts
│   └── ui/
│       ├── DuelloLampo.tsx     → creazione, schermo diviso, round, fine
│       ├── useReazione.ts
│       ├── minigiochi/*.tsx    → vista di ogni mini gioco
│       └── duello.css
```

Nessun testo nei `.tsx`: tutto in `locales/{it,en}.ts`.

## Passi

1. **Logica della partita** e i primi tre mini giochi (Via!, Raffica, Stop al centro), con i test: scaletta senza ripetizioni di fila, punti, pari, partenza anticipata, spareggio.
2. **`useReazione`**, schermo diviso e flusso completo (creazione con scelta dei mini giochi, round, fine). Manifest, locali, registrazione in `App.tsx`, icona `Zap`, indirizzo `/duello-lampo`.
3. **Verifica visiva** a 375 px in tema scuro e chiaro e **prova su un telefono vero** (due dita insieme, rotazione, schermo acceso).
4. **Gli altri quattro mini giochi**, uno per volta, ognuno con test e verifica visiva.
5. **README** (provare, controllare, struttura, come aggiungere un mini gioco, Deploy, versione online), CHANGELOG, `decisioni.md`, versione.

## Versione online: cosa comporta (da riportare nel README del gioco)

Non si fa ora. Quando si deciderà:

- **Il rischio**: ogni telefono ha una rete diversa (50–300 ms e oltre). Se il server decidesse «chi ha toccato prima» dall'ordine dei messaggi, vincerebbe chi ha la rete più veloce.
- **La soluzione**: misurare sempre sul telefono. Il server manda i parametri del round (anche il ritardo casuale), ogni telefono mostra lo stimolo e misura il proprio tempo di reazione, poi invia solo la durata (es. 312 ms). Il server confronta le durate. La rete lenta allunga solo l'attesa tra un round e l'altro, non cambia chi vince. I moduli `MiniGioco` sono già fatti così (`prepara` + `vincitore`), quindi si riusano.
- **Mini giochi esclusi**: quelli in cui si deve vedere l'altro in tempo reale (es. tiro alla fune). Tutti quelli dell'elenco iniziale vanno bene.
- **Cosa cambia nel server**: oggi il server non ha un timer per le partite (solo ping, scadenza della coda e pulizia delle stanze). Serve un'aggiunta al contratto `GiocoOnline`, per esempio `scadenze?(stato, ora)` controllata a intervalli, per chiudere un round se un telefono non risponde.
- **Da decidere allora**: soglia di pari merito per le differenze di hardware (schermi a 60 o 120 Hz, ritardo del tocco: qualche decina di ms), quanto fidarsi dei tempi inviati dal telefono (un telefono modificato potrebbe barare; tra amici si può accettare, con controlli minimi come scartare tempi sotto 100 ms), round annullato e ripetuto se un telefono cade.
- **Bonus**: il server sa già fare la «partita veloce» con coda a due (`coda: { giocatori: 2 }`).
