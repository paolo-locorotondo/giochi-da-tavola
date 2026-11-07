# Dadi

Moneta, dadi (D4, D6, D8, D10, D12, D20) e **dado personalizzato**, con un solo telefono. Non c'è una partita: si sceglie, si lancia, si legge il risultato.

## Regolamento

1. Scegli la moneta o un dado (D4, D6, D8, D10, D12, D20).
2. Oppure scrivi un dado personalizzato: un valore per riga, per esempio «Sì», «No», «Forse».
3. Se i valori sono due, il dado diventa una moneta.
4. Tocca **Lancia**: il risultato è casuale e il lancio si vede in animazione.

Il lancio usa il generatore casuale del telefono (`crypto.getRandomValues`), con uguale probabilità per ogni faccia: i valori che non dividono esattamente l'intervallo vengono scartati, così nessuna faccia esce più spesso delle altre.

## Modalità di gioco

### Offline (un solo telefono)

È l'unica modalità. Funziona senza rete dopo la prima apertura ([come installarla](../../docs/app-installabile.md)).

### Online (ognuno col suo telefono)

Non prevista: non c'è nulla da condividere.

## Provarlo

```
pnpm install     # solo la prima volta
pnpm dev         # http://localhost:5173/dadi (anche dal telefono, vedi l'indirizzo "Network")
```

Passi dettagliati, firewall e problemi comuni: [provare-in-locale.md](../../docs/provare-in-locale.md). Per provarlo offline: `pnpm --filter @gdt/web build`, apri il sito una volta, poi spegni la rete e ricarica.

## Cosa controllare

- Ogni dado dà solo facce che esistono (D6: da 1 a 6) e dopo molti lanci escono tutte.
- Nel dado personalizzato: con un solo valore compare l'avviso e **Lancia** resta spento; con due valori il dado diventa tondo (moneta); ogni valore è al massimo di 20 caratteri (il resto viene tagliato); righe vuote e valori ripetuti vengono ignorati.
- Durante il lancio il tasto è spento e i dadi non si possono cambiare; l'esito si legge anche con il lettore di schermo.
- Con «riduci movimento» attivo nel telefono non c'è animazione e il risultato è immediato.
- Cambiando lingua dall'ingranaggio cambiano i nomi dei modelli (Moneta/Coin, Testa/Heads).
- Lo storico tiene gli ultimi 10 lanci e si può cancellare.
- Il suono dei dadi non c'è ancora (vedi sotto).

I test automatici (anche grafici) sono descritti in [test.md](../../docs/test.md).

## Suono

Non ancora presente: il progetto richiede suoni **registrati** (file audio), non sintetizzati, con licenza che permetta di pubblicarli nel repo. Quando saranno scelti i file (CC0), vanno messi in `packages/suoni/audio/` con la fonte in `CREDITI.md` e aggiunti i formati a `globPatterns` di `apps/web/vite.config.ts`, perché funzionino offline.

## Struttura

- `data/<lingua>/modelli.json` (`it`, `en`): la moneta e i dadi con le loro facce; `src/modelli.ts` sceglie quelli della lingua.
- `src/locales/{it,en}.ts`: tutti i testi e il regolamento; `src/manifest.ts` li espone all'app.
- `src/logica.ts`: il lancio (`lancia`, con generatore iniettato) e i valori personalizzati; `src/casuale.ts`: il generatore basato su `crypto`.
- `src/ui/DadiApp.tsx` e `dadi.css`: la schermata e l'animazione.

## Come cambiare o aggiungere un dado

I modelli stanno in `data/it/modelli.json` (e `data/en/modelli.json`), uno per riga. Non serve toccare il codice.

```json
{"id": "d6", "nome": "D6", "facce": ["1", "2", "3", "4", "5", "6"]}
```

- **Aggiungere un modello**: aggiungi una riga con un `id` nuovo, un `nome` e le `facce` (almeno due, tutte diverse, senza spazi ai bordi). Esempio, un dado dei sì/no:

  ```json
  {"id": "sino", "nome": "Sì / No / Forse", "facce": ["Sì", "No", "Forse"]}
  ```

- **Modificare o togliere**: cambia o cancella la riga. Attenzione alla virgola tra una riga e l'altra e niente virgola dopo l'ultima.
- Aggiungi lo stesso `id` in **tutte** le lingue (`it` ed `en`): i test controllano che i modelli siano gli stessi, nello stesso ordine. Se aggiungi un modello cambia anche l'elenco atteso in `src/logica.test.ts`.
- Le facce sono testi: possono essere numeri, parole o frasi brevi, al massimo 20 caratteri (`MAX_CARATTERI_FACCIA` in `src/logica.ts`): oltre, il dado non ci sta.

## Lingue

Italiano e inglese. Cambiando lingua dall'ingranaggio cambiano testi e nomi dei modelli.

- **Cambiare un testo**: modifica la chiave in `src/locales/it.ts` e in `src/locales/en.ts`; il compilatore segnala se manca in una lingua.
- **Aggiungere una lingua**: aggiungila in `packages/i18n`, poi crea `src/locales/<lingua>.ts` e `data/<lingua>/modelli.json`.
- Nel codice niente frasi: il TSX usa `t("chiave")`.

## Deploy

Insieme al resto dell'app: [guida al deploy](../../docs/guida-deploy-online.md) (`apps/web/vercel.json` apre direttamente `/dadi`).
