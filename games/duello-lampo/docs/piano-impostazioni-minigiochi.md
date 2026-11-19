# Piano: impostazioni di ogni mini gioco (bozza)

Stato: **bozza, con le prime decisioni dell'utente (2026-11-19)**. Nulla è ancora realizzato come impostazione: «trova» ha già i parametri separati (`ParametriTrova` in `src/minigiochi/trova.ts`), con valori fissi.

Idea: oltre alle mani, ogni mini gioco può avere qualche impostazione propria (es. quante caselle ha «Memoria lampo»).

## Decisioni prese

- Le impostazioni sono della **sfida**: si scelgono nella **preparazione**, insieme alle mani, e restano salvate sul telefono (localStorage) con le altre scelte. Non stanno nell'ingranaggio.
- **Niente riepilogo** nella schermata della regola prima del round: le impostazioni sono della partita, non servono lì.
- **Trova il panda / lo smile**: le impostazioni sono quelle scritte dall'utente (vedi sotto). Il comportamento di base è già cambiato: a ogni passo cambiano solo alcune caselle (non tutta la griglia) e il bersaglio compare tra quelle.

## Proposta di impostazioni

Poche per mini gioco, ognuna con un valore di base uguale a oggi (così chi non tocca nulla gioca come adesso).

| Mini gioco | Impostazione | Valori | Base |
|---|---|---|---|
| Via! | Attesa massima prima del via | 3 / 5 / 8 s | 5 s |
| Raffica | Durata | 3 / 5 / 10 s | 5 s |
| Stop al centro | Velocità dell'indicatore | lenta / media / veloce | media |
| Colore giusto | Numero di colori | 4 / 5 | 4 |
| Colori e nomi | Tempo per parola | 0,8 / 1,3 / 2 s | 1,3 s |
| Trova il panda / lo smile | Griglia | 3×3 / 4×4 / 5×5 / 6×6 | 4×4 |
| Trova il panda / lo smile | Caselle che cambiano a ogni passo | da 1 a tutte (3×3: fino a 9) | 3 |
| Trova il panda / lo smile | Ogni quanto cambiano | 0,5 / 0,75 / 1 / 1,5 / 2 s | 1 s |
| Trova il panda / lo smile | Le figure che cambiano ruotano | sì / no | sì |
| Trova il panda / lo smile | Tutte dritte verso il giocatore (facile) | sì / no | no |
| Memoria lampo | Caselle | 4 / 6 / 9 | 4 |
| Memoria lampo | Lunghezza della sequenza | 3–8 | 4 |

Per «trova» le impostazioni sono decise (cinque, ognuna separata per panda e smile). Per gli altri mini giochi la tabella è una proposta: da decidere quali tenere, perché troppe impostazioni allungano la preparazione.

Note su «trova»:
- «Caselle che cambiano» ha come massimo il numero di caselle della griglia: se si rimpicciolisce la griglia il valore scende da solo al massimo possibile.
- «Tutte dritte» rende inutile «ruotano»: con «dritte» attivo l'interruttore «ruotano» si spegne e resta spento.
- Con 6×6 a 375 px le caselle restano sopra i 44 px solo se la metà dello schermo è abbastanza alta: va verificato con gli screenshot e su un telefono vero, altrimenti il massimo resta 5×5.

## Come si mostra

- Nella preparazione ogni mini gioco resta una riga con nome, regola e selettore delle mani.
- Se il mini gioco ha impostazioni, sotto la riga c'è un pulsante **«Impostazioni»** (icona ingranaggio) che apre un pannello a scomparsa (`<details>`, come gli accordion dell'app) con le opzioni a scelta singola (stile `.scelta-opzioni`, già usato in tutta l'app).
- Se un valore è diverso dalla base, la riga lo dice in breve (es. «6 caselle · sequenza 5»), così si vede senza aprire il pannello.
- Pulsante «Valori di base» nel pannello.
- Con le mani a 0 il pannello resta disponibile ma spento.

## Architettura

Le impostazioni sono **dati del mini gioco**, quindi stanno nelle regole, non nella vista:

```ts
interface ImpostazioneMiniGioco {
  chiave: string;                       // es. "caselle", anche chiave dei testi: mg_memoria_imp_caselle
  valori: readonly (number | string)[]; // le scelte possibili
  base: number | string;
}

interface MiniGioco<Config, Risultato, Imp = Record<string, never>> {
  id: string;
  impostazioni?: readonly ImpostazioneMiniGioco[];
  prepara(rng: Rng, imp: Imp): Config;  // le impostazioni entrano solo da qui
  durataMassima(config: Config): number;
  chiudeAlPrimo: boolean;
  vincitore(config: Config, risultati: …): Lato | null;
}
```

- **`prepara` riceve le impostazioni** e le «cuoce» dentro il `Config` (es. `caselle: 6`). La vista legge solo il `Config`: non serve sapere nulla di impostazioni. Anche `vincitore` e `durataMassima` restano invariati.
- La **sfida** diventa `{ mani, impostazioni: Record<id, Record<chiave, valore>> }`; `nuovaPartita` controlla che ogni valore sia tra quelli ammessi (come già fa con le mani) e ripiega sulla base se uno è vecchio o sconosciuto.
- **Salvataggio** sul telefono: nella stessa chiave delle scelte (`gdt-duello-lampo-scelte-…`), con lo stesso controllo «scarta in silenzio ciò che non è valido».
- **Testi**: `mg_<id>_imp_<chiave>` per il titolo e, per i valori non numerici, `mg_<id>_imp_<chiave>_<valore>` in `locales/{it,en}.ts`.
- **Test**: per ogni impostazione, `prepara` con ogni valore produce un `Config` coerente (es. sequenze con caselle nel limite, griglie della misura giusta); `nuovaPartita` rifiuta valori non ammessi.
- La guida [aggiungere-un-minigioco.md](aggiungere-un-minigioco.md) avrà un paragrafo «Impostazioni (facoltative)».

Con questo schema, aggiungere un'impostazione a un mini gioco costa: una voce in `impostazioni`, il suo uso in `prepara`, i testi, i test.

## Impatto sulle viste attuali

- Memoria lampo: la griglia oggi è fissa a 2×2; con 6 o 9 caselle diventa 3×2 o 3×3 (le caselle restano ≥ 44 px anche su un telefono basso: da verificare con gli screenshot).
- Trova il panda / lo smile: la griglia 5×5 a 375 px di larghezza dà caselle di circa 50 px: ancora toccabili, ma va guardato su telefono vero.
- Le altre viste leggono già il loro tempo dal `Config`: non cambiano.

## Passi

1. Contratto `MiniGioco` con `impostazioni` e `prepara(rng, imp)`; sfida e salvataggio con le impostazioni; test.
2. Interfaccia della preparazione (pannello a scomparsa) e verifica visiva a 375 px, scuro e chiaro.
3. Impostazioni di Trova il panda / lo smile come primo caso completo (i parametri sono già separati), con test e screenshot; poi Memoria lampo.
4. Le altre, una per mini gioco, scegliendo con l'utente quali tenere.
5. README del gioco, guida per aggiungere un mini gioco, CHANGELOG, versione.

## Da decidere con l'utente

1. Quali impostazioni tenere per gli altri mini giochi (Via!, Raffica, Stop al centro, Colore giusto, Colori e nomi, Memoria lampo): la tabella sopra è una proposta.
2. Se arrivare fino a 6×6 per «trova» (dipende dall'altezza dello schermo).
