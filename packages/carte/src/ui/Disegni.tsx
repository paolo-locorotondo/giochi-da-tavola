import { mazzoDi, type Carta, type Seme } from "../tipi";
import { FormaSeme } from "./Semi";

/**
 * Disegni al centro delle carte, tutti SVG nostri, nessun asset.
 * Il colore viene da `currentColor` (il seme) e dai token `--carta-*`, tramite le classi `cg-f-*` di carte.css.
 */

type Posto = [number, number];

// Coordinate sull'intera carta: 40×58 unità, cioè 0,1 em (la carta è 4 em × 5,8 em).
// Colonne laterali e centrali; l'indice in alto a sinistra resta fuori dalla colonna sinistra.
const SX = 21;
const CX = 26.5;
const DX = 32;
const LATO_PIP = 8.6;

/** Posizioni dei semi per valore (2..10), nella disposizione classica delle carte vere. */
export function posti(valore: number): Posto[] {
  const due = (ys: number[]): Posto[] => ys.flatMap((y): Posto[] => [[SX, y], [DX, y]]);
  const R3 = [9, 29, 49];
  const R4 = [8, 22, 36, 50];
  switch (valore) {
    case 2: return [[CX, 9], [CX, 49]];
    case 3: return [[CX, 9], [CX, 29], [CX, 49]];
    case 4: return due([9, 49]);
    case 5: return [...due([9, 49]), [CX, 29]];
    case 6: return due(R3);
    case 7: return [...due(R3), [CX, 19]];
    case 8: return [...due(R3), [CX, 19], [CX, 39]];
    case 9: return [...due(R4), [CX, 29]];
    case 10: return [...due(R4), [CX, 15], [CX, 43]];
    default: return [];
  }
}

/** Carte con i semi in fila: 2..10 nel francese, 2..7 nell'italiano. L'asso e le figure no. */
export function haPips(carta: Carta): boolean {
  if (carta.seme === null) return false;
  return mazzoDi(carta) === "italiano" ? carta.valore >= 2 && carta.valore <= 7 : carta.valore >= 2 && carta.valore <= 10;
}

export function Pips({ seme, valore, francese, className }: { seme: Seme; valore: number; francese: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 58" aria-hidden="true" focusable="false">
      {posti(valore).map(([x, y]) => (
        // Come sulle carte francesi vere, i semi della metà bassa sono a testa in giù.
        <FormaSeme key={`${x}-${y}`} seme={seme} cx={x} cy={y} lato={LATO_PIP} ruota={francese && y > 29} />
      ))}
    </svg>
  );
}

export type TipoFigura = "fante" | "regina" | "re" | "cavallo";

/** Figura dal valore: francese 11/12/13, italiano 8/9/10. */
export function tipoFigura(carta: Carta): TipoFigura | null {
  if (carta.seme === null) return null;
  const v = carta.valore;
  if (mazzoDi(carta) === "italiano") return v === 8 ? "fante" : v === 9 ? "cavallo" : v === 10 ? "re" : null;
  return v === 11 ? "fante" : v === 12 ? "regina" : v === 13 ? "re" : null;
}

const Faccia = () => (
  <>
    <rect className="cg-f-pelle" x="11" y="18.5" width="4" height="5" />
    <ellipse className="cg-f-pelle" cx="13" cy="14" rx="5" ry="5.8" />
    <circle className="cg-f-tinta" cx="11" cy="13.6" r="0.8" />
    <circle className="cg-f-tinta" cx="15" cy="13.6" r="0.8" />
  </>
);
const Busto = () => <path className="cg-f-tinta" d="M1.5 37C1.5 28 6.5 22.5 13 22.5C19.5 22.5 24.5 28 24.5 37Z" />;

/** Busto stilizzato, uno per tipo e riusato per tutti i semi (prende il colore da `currentColor`). Riquadro 26×37. */
export function Figura({ tipo, className }: { tipo: TipoFigura; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 37" aria-hidden="true" focusable="false">
      {tipo === "fante" && (
        <>
          <Busto />
          <path className="cg-f-linea" d="M9 24L13 30L17 24" />
          <path className="cg-f-tinta" d="M8 12.5C6.8 17 7.6 20 9.5 21.5L10.4 14.5Z M18 12.5C19.2 17 18.4 20 16.5 21.5L15.6 14.5Z" />
          <Faccia />
          <path className="cg-f-tinta" d="M7.3 11.5C7.3 5.5 10.5 3.2 14 3.2C18 3.2 19.6 7 18.8 11.5Z" />
          <rect className="cg-f-tinta" x="5.5" y="10.8" width="15" height="1.8" rx="0.9" />
          <path className="cg-f-oro" d="M16.5 5.5C20.5 0.8 24.8 2.2 24.4 7C21.8 4.8 19.8 5.6 18 8Z" />
        </>
      )}
      {tipo === "regina" && (
        <>
          <path className="cg-f-tinta" d="M6.3 14C5.8 8 9 5.6 13 5.6C17 5.6 20.2 8 19.7 14C20.2 18.5 20.2 22.5 21.5 26.5H4.5C5.8 22.5 5.8 18.5 6.3 14Z" />
          <Busto />
          <path className="cg-f-linea" d="M8.8 24Q13 30.5 17.2 24" />
          <Faccia />
          <path className="cg-f-tinta" d="M8 12.5C10 11 12 10 13 8.5C14 10 16 11 18 12.5C17 9 15.5 7.8 13 7.8C10.5 7.8 9 9 8 12.5Z" />
          <path className="cg-f-oro" d="M8.2 8.8L7.6 2.8L10.7 5.8L13 1.6L15.3 5.8L18.4 2.8L17.8 8.8Z" />
          <path className="cg-f-collana" d="M9.4 25Q13 29 16.6 25" />
        </>
      )}
      {tipo === "re" && (
        <>
          <Busto />
          <Faccia />
          <path className="cg-f-tinta" d="M8.3 16.5C8.5 22 10.2 24.8 13 24.8C15.8 24.8 17.5 22 17.7 16.5C16.5 18.8 15 19.2 13 19.2C11 19.2 9.5 18.8 8.3 16.5Z" />
          <path className="cg-f-pelle" d="M10.8 19.9Q13 21.2 15.2 19.9Q13 19 10.8 19.9Z" />
          <path className="cg-f-oro" d="M7.8 9.5L7.2 3.6L10.5 6.2L13 2L15.5 6.2L18.8 3.6L18.2 9.5Z" />
          <path className="cg-f-linea" d="M3.5 33Q13 27 22.5 33" />
        </>
      )}
      {tipo === "cavallo" && (
        <>
          <path className="cg-f-oro" d="M10.4 8.2C16.2 7 21.5 11.5 22.4 18.5C23.2 24.5 23.4 30.5 24.6 37H19.6C19.8 30.5 19 25 17 20.5C15.8 17 13.6 12.5 10.4 8.2Z" />
          <path className="cg-f-tinta" d="M2.2 18.4C2.2 15.6 4.4 13.6 6.8 12.2L8.6 4.4L11.6 9.6C15 9.8 17.8 11.6 19.2 15.6C21 21 20.6 29 20.8 37H8.6C9.6 31 8.6 27 6.8 25C4.4 24 2.2 21.8 2.2 18.4Z" />
          <circle className="cg-f-vuoto" cx="8.6" cy="14.6" r="1.2" />
          <circle className="cg-f-vuoto" cx="3.9" cy="19.2" r="0.8" />
          <path className="cg-f-linea" d="M5.2 22L12.4 17L14.6 21.5" />
        </>
      )}
    </svg>
  );
}
