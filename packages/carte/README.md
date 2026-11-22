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

## Ingressi

- `@gdt/carte`: tutto, con i componenti (importa i CSS: solo per la UI).
- `@gdt/carte/logica`: solo tipi, mazzi, mescolata, ordinamenti, impaginazione, nomi e testi, senza CSS né React. Per la logica dei giochi e per il server.
- `@gdt/carte/ventaglio`: l'impaginazione e il componente `Ventaglio` (con il suo CSS), senza le carte grafiche: per i giochi che disegnano carte proprie (Ultima!).

## API

- `Carta { id, seme, valore }`: serializzabile. Francese: valore 1-13 (11 fante, 12 regina, 13 re). Italiano: 1-10 (8 fante, 9 cavallo, 10 re). Jolly: `seme: null`, `valore: 0`.
- `mazzoFrancese({ mazzi = 1, jolly = 0 })`, `mazzoItaliano()`: id stabili, ordine fisso.
- `mescola(carte, rng)`: copia mescolata con `Rng` di `@gdt/engine` (stesso seme, stesso ordine).
- `ordinaPerSeme`, `ordinaPerValore` (jolly in fondo), `nomeCarta(t, carta)`, `eJolly`, `mazzoDi`.
- `CartaGrafica`: `carta` o `dorso`, `dimensione`, `selezionata`, `evidenziata`, `disabilitata`, `onClick` (con `onClick` è un pulsante con `aria-pressed`, area di tocco >= 44 px), `etichetta`.
- `Mano`: griglia a righe (7 carte per riga a 375 px), oppure **a ventaglio** con `ventaglio` (vedi sotto); selezione singola o multipla (controllata), pulsanti «Per seme» / «Per valore», frecce e Home/Fine per spostarsi, Invio o Spazio per selezionare.
- `impaginaMano(carte, { capacita, chiave, ordine })`, `CARTE_PER_RIGA` (9), `Ventaglio`: la mano a ventaglio generica.
- `confrontaPerSeme`, `confrontaPerValore`, `chiaveSeme`: i confronti usati da `ordinaPerSeme` / `ordinaPerValore`, riusabili con `impaginaMano`.

## La mano a ventaglio

Una mano a righe di carte **sovrapposte** (senza scroll orizzontale), uguale per i giochi che la usano: Ultima! (ordine per colore) e Burraco (ordine per seme, poi per valore). Scopa ha 3 carte e resta con la griglia.

- **Impaginazione pura** (`src/impagina.ts`, test in `impagina.test.ts`): `impaginaMano(carte, { capacita = 9, chiave, ordine })` ordina le carte con `ordine` e le divide in `ceil(n / capacita)` righe bilanciate; ogni riga è una lista di **gruppi** (blocchi consecutivi con la stessa `chiave`: il colore in Ultima!, il seme in Burraco). L'interruzione cade di preferenza fra due gruppi; un gruppo troppo grande si divide in parti uguali. Esempi con 9 per riga: 9 carte = 1 riga, 10 = 5+5, 20 = 3 righe, 40 = 5, 110 = 13.
- **Come ci si aggancia**: un gioco passa il suo `ordine` (un confronto per `Array.sort`) e la sua `chiave`; con `Mano` basta `ventaglio` (ordine seme→valore, jolly in fondo). Chi disegna carte proprie usa `Ventaglio` (`righe`, `carta(c)`, `chiaveCarta(c)`) con le misure come custom property: Ultima! lo fa con `.ul-mano` in `ultima.css`.
- **CSS** (`src/ui/ventaglio.css`, classi `.cg-ventaglio` > `.cg-riga` > `.cg-blocco`): nessuna misura in JavaScript, la larghezza utile è `100cqw` (container query). Parametri: `--cg-v-w` (larghezza carta), `--cg-v-h` (altezza), `--cg-v-gap` (stacco, 8 px), `--cg-v-min` (parte visibile minima, 32 px), `--cg-v-passo` (passo fra righe), `--cg-v-pad`. Ogni carta dopo la prima ha margine sinistro `clamp(min − w, (larghezza utile − w − stacchi) / (n−1) − w, stacco)`: staccate se ci stanno, altrimenti sovrapposte in modo uniforme, mai sotto la parte minima.
- **Carte grafiche (`Mano` con `ventaglio`)**: carte «piccole» da 44×64 px, **9 per riga**. L'angolo valore+seme sporge di 15 px a destra e 30 px in basso dall'angolo della carta (misurato), quindi basta una parte visibile di 32 px: con 9 carte in un solo gruppo il passo misurato è 36,8 px su 375 px di spazio utile; dentro la pagina dell'app (spazio utile minore di circa 32 px) scende a circa 33 px, comunque sopra il minimo di 32 px grazie al `clamp`, che non lo fa mai scendere sotto (non misurato in app con 9 carte: le misure in app sono 11, 20 e 40 carte); con meno carte per riga cresce fino a 44 px (carta intera con 5-6 carte). Capacità 9 scelta come per Ultima!, con carte più strette sarebbe stata possibile una riga più lunga, ma 9 mantiene almeno 32 px senza ridurre altro; si cambia con `cartePerRiga`. **Passo verticale 44 px** (`--cg-v-passo`): la riga sotto copre la parte bassa della carta sopra (pips e figura), ma non l'angolo, che finisce a 30 px dal bordo superiore. Esempi di righe: 11 carte = 6+5, 20 = 7+6+7, 40 = 5 righe da 8.
- **Stati**: scelta = bordo d'accento e spunta nella parte visibile; evidenziata (appena pescata) = bordo tratteggiato; non toccabile = fondo pieno più scuro, non più trasparenza (si vedrebbe la carta sotto). `:focus-visible` e `:active` portano la carta in primo piano.
- **Tocco**: la parte visibile è larga circa 33-44 px e alta fino a 44 px (l'ultima riga 64), meno dei 44 px canonici in larghezza; come in Ultima! è un'eccezione dichiarata (le carte non toccabili non reagiscono). Negli e2e si clicca l'angolo (`position: { x: 16, y: 24 }`).

## Testi

Nomi di semi, figure e testi della mano in `src/locales/{it,en}.ts` (stesse chiavi, lo verifica il compilatore). Seguono la lingua dell'app (`@gdt/i18n`).

## Controllare

```
pnpm --filter @gdt/carte typecheck
pnpm --filter @gdt/carte test
```

Dopo modifiche al disegno: guardare le carte a 375 px in tema scuro e chiaro.
