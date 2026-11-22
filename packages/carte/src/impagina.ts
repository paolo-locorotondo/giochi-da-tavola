/**
 * Impaginazione della mano a ventaglio, uguale per ogni gioco di carte: ordine delle carte e divisione in righe.
 * Pura e deterministica (nessun orologio, nessuna misura dello schermo): la sovrapposizione orizzontale la
 * calcola il CSS (`ui/ventaglio.css`). Ogni gioco passa il suo ordine e la sua chiave di gruppo
 * (Ultima!: il colore; Burraco: il seme).
 */

/** Carte per riga di base: 9 (vedi `ui/ventaglio.css` per il conto a 375 px). */
export const CARTE_PER_RIGA = 9;

export interface GruppoMano<C, K> {
  chiave: K;
  carte: C[];
}

export interface RigaMano<C, K> {
  /** Blocchi consecutivi con la stessa chiave, nell'ordine in cui si vedono. */
  gruppi: GruppoMano<C, K>[];
  /** Quante carte ha la riga. */
  n: number;
}

export interface OpzioniImpagina<C, K> {
  /** Massimo di carte per riga (base: `CARTE_PER_RIGA`). */
  capacita?: number;
  /** Gruppo della carta (colore, seme…): le righe si interrompono di preferenza fra un gruppo e l'altro. Confronto con `===`. */
  chiave: (carta: C) => K;
  /** Ordine delle carte (come in `Array.sort`). Senza, restano nell'ordine ricevuto. Deve tenere vicine le carte dello stesso gruppo. */
  ordine?: (a: C, b: C) => number;
}

/** Costo (in carte al quadrato) di interrompere la riga in mezzo a un gruppo: meglio una riga di 1 carta in più o in meno. */
const COSTO_TAGLIO_IN_BLOCCO = 3;

/**
 * Ordina le carte e le divide in `ceil(n / capacita)` righe di non più di `capacita` carte.
 * Le righe sono bilanciate (circa n/righe carte) e l'interruzione cade di preferenza fra un gruppo
 * e l'altro; un gruppo più grande di una riga si divide in parti bilanciate.
 */
export function impaginaMano<C, K>(mano: readonly C[], { capacita = CARTE_PER_RIGA, chiave, ordine }: OpzioniImpagina<C, K>): RigaMano<C, K>[] {
  const cap = Math.max(1, Math.floor(capacita));
  const carte = ordine ? [...mano].sort(ordine) : [...mano];
  const n = carte.length;
  if (n === 0) return [];
  const righe = Math.ceil(n / cap);
  const obiettivo = n / righe;
  const chiavi = carte.map(chiave);
  const dentroBlocco = (i: number) => i > 0 && i < n && chiavi[i - 1] === chiavi[i];

  // dp[r][i]: costo minimo per mettere le prime i carte in r righe; da[r][i]: dove comincia l'ultima.
  const INF = Number.POSITIVE_INFINITY;
  const dp: number[][] = Array.from({ length: righe + 1 }, () => new Array<number>(n + 1).fill(INF));
  const da: number[][] = Array.from({ length: righe + 1 }, () => new Array<number>(n + 1).fill(-1));
  dp[0]![0] = 0;
  for (let r = 1; r <= righe; r++) {
    for (let i = r; i <= n; i++) {
      for (let j = Math.max(r - 1, i - cap); j < i; j++) {
        const prima = dp[r - 1]![j]!;
        if (prima === INF) continue;
        const scarto = i - j - obiettivo;
        const costo = prima + scarto * scarto + (dentroBlocco(j) ? COSTO_TAGLIO_IN_BLOCCO : 0);
        if (costo < dp[r]![i]!) {
          dp[r]![i] = costo;
          da[r]![i] = j;
        }
      }
    }
  }

  const tagli: number[] = [];
  for (let r = righe, i = n; r > 0; r--) {
    const j = da[r]![i]!;
    tagli.unshift(j);
    i = j;
  }
  tagli.push(n);

  return tagli.slice(0, -1).map((inizio, r) => {
    const gruppi: GruppoMano<C, K>[] = [];
    for (let i = inizio; i < tagli[r + 1]!; i++) {
      const ultimo = gruppi[gruppi.length - 1];
      if (ultimo && ultimo.chiave === chiavi[i]) ultimo.carte.push(carte[i]!);
      else gruppi.push({ chiave: chiavi[i]!, carte: [carte[i]!] });
    }
    return { gruppi, n: tagli[r + 1]! - inizio };
  });
}
