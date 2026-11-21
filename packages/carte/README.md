# @gdt/carte

Carte condivise dai giochi di carte (Burraco, Scopa): mazzi, mescolata, ordinamenti, carta grafica e mano.
Tutto disegnato in proprio (SVG e CSS), nessun asset di terzi; colori solo a token (`--carta-*` in `apps/web/src/tema.css`), tema scuro e chiaro.

## Uso

```tsx
import { creaRng } from "@gdt/engine";
import { CartaGrafica, Mano, mazzoFrancese, mazzoItaliano, mescola } from "@gdt/carte";

const mazzo = mescola(mazzoFrancese({ mazzi: 2, jolly: 4 }), creaRng("seme-della-partita")); // 108 carte, id 0..107
const scopa = mazzoItaliano(); // 40 carte, id 0..39

function Esempio({ mano }: { mano: Carta[] }) {
  const [sel, setSel] = useState<number[]>([]);
  return (
    <>
      <Mano carte={mano} selezione={sel} onSeleziona={setSel} />   {/* multipla, riordino per seme / valore */}
      <CartaGrafica carta={mano[0]} dimensione="normale" />        {/* mini | piccola | normale */}
      <CartaGrafica dorso />
    </>
  );
}
```

## API

- `Carta { id, seme, valore }`: serializzabile. Francese: valore 1-13 (11 fante, 12 regina, 13 re). Italiano: 1-10 (8 fante, 9 cavallo, 10 re). Jolly: `seme: null`, `valore: 0`.
- `mazzoFrancese({ mazzi = 1, jolly = 0 })`, `mazzoItaliano()`: id stabili, ordine fisso.
- `mescola(carte, rng)`: copia mescolata con `Rng` di `@gdt/engine` (stesso seme, stesso ordine).
- `ordinaPerSeme`, `ordinaPerValore` (jolly in fondo), `nomeCarta(t, carta)`, `eJolly`, `mazzoDi`.
- `CartaGrafica`: `carta` o `dorso`, `dimensione`, `selezionata`, `evidenziata`, `disabilitata`, `onClick` (con `onClick` è un pulsante con `aria-pressed`, area di tocco >= 44 px), `etichetta`.
- `Mano`: griglia a righe (7 carte per riga a 375 px), selezione singola o multipla (controllata), pulsanti «Per seme» / «Per valore», frecce e Home/Fine per spostarsi, Invio o Spazio per selezionare.

## Testi

Nomi di semi, figure e testi della mano in `src/locales/{it,en}.ts` (stesse chiavi, lo verifica il compilatore). Seguono la lingua dell'app (`@gdt/i18n`).

## Controllare

```
pnpm --filter @gdt/carte typecheck
pnpm --filter @gdt/carte test
```

Dopo modifiche al disegno: guardare le carte a 375 px in tema scuro e chiaro.
