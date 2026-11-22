import type { Carta, Colore } from "../logica";

/**
 * Impaginazione della mano a ventaglio: ordine delle carte e divisione in righe.
 * Pura e deterministica (nessun orologio, nessuna misura dello schermo): la sovrapposizione
 * orizzontale la calcola il CSS (`ultima.css`, `.ul-riga`).
 */

/** Carte per riga. Cambiare solo questo numero basta a cambiare l'impaginazione. */
export const CARTE_PER_RIGA = 9;

/** Ordine dei blocchi di colore; i jolly vengono dopo. */
export const ORDINE_COLORI: readonly Colore[] = ["blu", "giallo", "rosso", "verde"];

export type ChiaveGruppo = Colore | "jolly";

export interface GruppoMano {
  chiave: ChiaveGruppo;
  carte: Carta[];
}

export interface RigaMano {
  /** Blocchi di colore consecutivi della riga, nell'ordine in cui si vedono. */
  gruppi: GruppoMano[];
  /** Quante carte ha la riga. */
  n: number;
}

export const chiaveGruppo = (c: Carta): ChiaveGruppo => ("colore" in c ? c.colore : "jolly");

/** Posizione dentro il colore: numeri 0-9, poi Salta, Inverti, +2; fra i jolly Jolly, +4, Scambio, Rotazione. */
function rango(c: Carta): number {
  switch (c.tipo) {
    case "numero":
      return c.valore;
    case "salta":
      return 10;
    case "inverti":
      return 11;
    case "piu2":
      return 12;
    case "jolly":
      return 0;
    case "piu4":
      return 1;
    case "scambio":
      return 2;
    case "rotazione":
      return 3;
  }
}

const posizioneGruppo = (k: ChiaveGruppo) => (k === "jolly" ? ORDINE_COLORI.length : ORDINE_COLORI.indexOf(k));

/** Le carte in ordine: blocchi per colore (blu, giallo, rosso, verde), poi i jolly; a parità per id. */
export function ordinaMano(mano: readonly Carta[]): Carta[] {
  return [...mano].sort(
    (a, b) => posizioneGruppo(chiaveGruppo(a)) - posizioneGruppo(chiaveGruppo(b)) || rango(a) - rango(b) || a.id - b.id,
  );
}

/** Costo (in carte al quadrato) di interrompere la riga in mezzo a un blocco di colore: meglio una riga di 1 carta in più o in meno. */
const COSTO_TAGLIO_IN_BLOCCO = 3;

/**
 * Ordina la mano e la divide in `ceil(n / capacita)` righe di non più di `capacita` carte.
 * Le righe sono bilanciate (circa n/righe carte) e l'interruzione cade di preferenza fra un colore
 * e l'altro; un blocco più grande di una riga si divide in parti bilanciate.
 */
export function impaginaMano(mano: readonly Carta[], capacita: number = CARTE_PER_RIGA): RigaMano[] {
  const cap = Math.max(1, Math.floor(capacita));
  const carte = ordinaMano(mano);
  const n = carte.length;
  if (n === 0) return [];
  const righe = Math.ceil(n / cap);
  const obiettivo = n / righe;
  const dentroBlocco = (i: number) => i > 0 && i < n && chiaveGruppo(carte[i - 1]!) === chiaveGruppo(carte[i]!);

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
    const gruppi: GruppoMano[] = [];
    for (const carta of carte.slice(inizio, tagli[r + 1]!)) {
      const k = chiaveGruppo(carta);
      const ultimo = gruppi[gruppi.length - 1];
      if (ultimo && ultimo.chiave === k) ultimo.carte.push(carta);
      else gruppi.push({ chiave: k, carte: [carta] });
    }
    return { gruppi, n: tagli[r + 1]! - inizio };
  });
}
