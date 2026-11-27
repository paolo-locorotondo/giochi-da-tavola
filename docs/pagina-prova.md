# La pagina di prova dei giochi (solo sviluppo)

`prova-carte.html` ricrea al volo una situazione di gioco (carte in mano, combinazioni calate, scarti, turno, pozzetti)
e si gioca con il tavolo vero e le regole vere. Serve a riprodurre i bug che nascono in casi rari e a controllare le
correzioni. **Non fa parte dell'app che si pubblica.** Il piano per estenderla a tutti i giochi:
[piano-pagina-prova.md](piano-pagina-prova.md).

## Come si apre

```
pnpm dev
```

poi `http://localhost:5173/prova-carte.html` (la porta la scrive Vite). Dal telefono sulla stessa rete: l'indirizzo IP del
PC al posto di `localhost`. `?tema=light` o `?tema=dark` sceglie il tema.

## Quali file servono

| File | A cosa serve |
|---|---|
| `apps/web/prova-carte.html` | ingresso della pagina (HTML) |
| `apps/web/src/prova-carte.tsx` | la pagina: casi pronti, editor della situazione, tavolo |
| `games/burraco/src/prova.ts` | costruisce una partita vera da una descrizione (`partitaDiProva`) e riesporta ciò che serve |
| `games/burraco/package.json` | la voce `"exports": { "./prova": "./src/prova.ts" }` |
| `packages/engine/src/prova-fuori-dalla-build.test.ts` | il test che garantisce che la prova resti fuori dal rilascio |

Quando si aggiungono altri giochi: un `games/<gioco>/src/prova.ts` e una voce `./prova` in `exports`, e il test
guardiano li copre già (cerca ogni import di `/prova` fuori dalle pagine `prova*.tsx`).

## Come resta fuori dal rilascio

Tre garanzie, tutte verificate in automatico:

1. **La build parte solo da `index.html`.** `apps/web/vite.config.ts` non dichiara altri ingressi (`rollupOptions.input`):
   Vite non include `prova-carte.html` né i moduli che solo lei importa. Il test controlla che nel file non compaia
   né `rollupOptions` né «prova-».
2. **Nessun file di produzione importa un modulo di prova.** Il test `packages/engine/src/prova-fuori-dalla-build.test.ts`
   scorre `apps/web/src`, `apps/server/src`, `games` e `packages` e fallisce se un file diverso dalle pagine `prova*.tsx`
   importa `…/prova` o `@gdt/<pacchetto>/prova`. Parte con `pnpm test:unit`.
3. **La build non contiene nulla della pagina.** Controllo manuale, da fare prima di rilasciare:

   ```
   pnpm --filter @gdt/web exec vite build --outDir /tmp/gdt-build --emptyOutDir
   ls /tmp/gdt-build/*.html            # deve esserci solo index.html
   grep -rl "Prova Burraco" /tmp/gdt-build   # deve essere vuoto
   ```

Il service worker (`sw.js`) non memorizza la pagina di prova: elenca solo i file della build.

Se un giorno la pagina deve restare raggiungibile in una versione di sviluppo pubblicata, si aggiunge a mano
l'ingresso in `vite.config.ts` **dietro una variabile d'ambiente** (non di base) e si rimuove la riga 1 del test.
