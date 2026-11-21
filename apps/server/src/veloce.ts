import {
  ATTESA_VELOCE_PREDEFINITA_MS,
  ATTESE_VELOCE_MS,
  CONTO_VELOCE_MS,
  CONTO_VELOCE_SCELTE_MS,
  MAX_CARATTERI_NOME,
  limitaTesto,
  type AnteprimaVeloce,
  type AperturaVeloce,
  type ComandoSala,
  type ModoSquadre,
  type MomentoSala,
  type PartitaVeloceOnline,
  type VistaSalaVeloce,
} from "@gdt/engine";

/**
 * Sala d'attesa della «partita veloce a stanze aperte». Modulo puro: il tempo (`ora`), la
 * connessione dei telefoni e il caso entrano come parametri, così si prova senza rete né timer.
 * La sala sta fuori dallo stato del gioco: il gioco riceve tutti i nomi solo all'avvio.
 */

/** Quanto si tiene il posto a chi si scollega (schermo bloccato, cambio di rete). */
export const GRAZIA_SALA_MS = 30_000;
/** Quanto resta aperta la sala «scaduta» in attesa che l'organizzatore decida. */
export const SCADUTA_MS = 60_000;
/** Vita massima di una sala: dopo non si rinnova più l'attesa. */
export const VITA_SALA_MS = 15 * 60_000;

const MODI_SQUADRE: readonly ModoSquadre[] = ["arrivo", "caso", "scelte"];

export interface Arrivato {
  /** Numero d'arrivo, stabile (non il token, che è segreto). */
  id: number;
  token: string;
  nome: string;
  /** Solo con le squadre «scelte in sala»: indice della squadra. */
  squadra: number | null;
  /** Da quando il telefono è scollegato (null = collegato). */
  assenteDal: number | null;
}

export interface SalaVeloce {
  gioco: string;
  /** Impostazioni già controllate (config passata da `configVeloce`). */
  apertura: AperturaVeloce;
  momento: MomentoSala;
  /** Fine dell'attesa, del conto o della sala scaduta (ms). */
  scade: number;
  /** In ordine di arrivo: [0] è l'organizzatore. */
  arrivati: Arrivato[];
  aperta: number;
  prossimoId: number;
}

export type MotivoChiusura = "scaduta" | "chiusa" | "vuota";

/** Cosa deve fare chi tiene la rete dopo un'operazione sulla sala. */
export type Effetto = { t: "niente" } | { t: "aggiorna" } | { t: "avvia" } | { t: "chiudi"; motivo: MotivoChiusura };

const NIENTE: Effetto = { t: "niente" };
const AGGIORNA: Effetto = { t: "aggiorna" };

/** Nome pulito e distinto da quelli già presenti (senza badare alle maiuscole): «Anna», «anna (2)»… */
export function nomeDistinto(grezzo: unknown, esistenti: readonly string[]): string {
  const base = limitaTesto(String(grezzo ?? "").trim(), MAX_CARATTERI_NOME - 4);
  if (!base) throw new Error("nomiNonValidi");
  const usati = new Set(esistenti.map((n) => n.toLocaleLowerCase("it-IT")));
  let nome = base;
  for (let n = 2; usati.has(nome.toLocaleLowerCase("it-IT")); n++) nome = `${base} (${n})`;
  return nome;
}

const squadreDi = (v: PartitaVeloceOnline, posti: number) => v.squadre?.(posti) ?? null;

/** Con quanti si può aprire: tutti i posti, o il minimo del gioco se ammette l'avvio anticipato. */
export function minimoPer(v: PartitaVeloceOnline, posti: number): number {
  return v.anticipato ? Math.min(v.posti[0]!, posti) : posti;
}

/** Controlla ciò che sceglie chi apre (arriva dalla rete). Assente = impostazioni di base. */
export function leggiApertura(v: PartitaVeloceOnline, grezza: unknown): AperturaVeloce {
  const a = (typeof grezza === "object" && grezza !== null ? grezza : {}) as Record<string, unknown>;
  const posti = a.posti === undefined ? v.posti[0]! : a.posti;
  if (typeof posti !== "number" || !v.posti.includes(posti)) throw new Error("postiNonValidi");
  const attesaMs = a.attesaMs === undefined ? ATTESA_VELOCE_PREDEFINITA_MS : a.attesaMs;
  if (typeof attesaMs !== "number" || !(ATTESE_VELOCE_MS as readonly number[]).includes(attesaMs)) throw new Error("attesaNonValida");
  let squadre: ModoSquadre | undefined;
  if (squadreDi(v, posti)) {
    const m = a.squadre === undefined ? "arrivo" : a.squadre;
    if (!MODI_SQUADRE.includes(m as ModoSquadre)) throw new Error("squadreNonValide");
    squadre = m as ModoSquadre;
  }
  const config = v.configVeloce(a.config ?? {}, posti);
  return squadre ? { posti, config, squadre, attesaMs } : { posti, config, attesaMs };
}

function nuovoArrivato(sala: SalaVeloce, v: PartitaVeloceOnline, token: string, nome: unknown): Arrivato {
  const sq = squadreDi(v, sala.apertura.posti);
  let squadra: number | null = null;
  if (sq && sala.apertura.squadre === "scelte") {
    // Alla squadra con meno persone (a parità la prima) che ha ancora posto.
    let migliore = -1;
    let minimo = Infinity;
    sq.forEach((posti, k) => {
      const n = sala.arrivati.filter((a) => a.squadra === k).length;
      if (n < posti.length && n < minimo) [migliore, minimo] = [k, n];
    });
    squadra = migliore >= 0 ? migliore : null;
  }
  return { id: sala.prossimoId, token, nome: nomeDistinto(nome, sala.arrivati.map((a) => a.nome)), squadra, assenteDal: null };
}

/** Apre una sala: chi apre è il primo arrivato e l'organizzatore. */
export function apriSala(gioco: string, v: PartitaVeloceOnline, apertura: AperturaVeloce, token: string, nome: unknown, ora: number): SalaVeloce {
  const sala: SalaVeloce = { gioco, apertura, momento: "attesa", scade: ora + apertura.attesaMs, arrivati: [], aperta: ora, prossimoId: 1 };
  sala.arrivati.push(nuovoArrivato(sala, v, token, nome));
  sala.prossimoId++;
  // Una sala da un solo posto parte subito (non esiste per i giochi di oggi, ma il contratto lo ammette).
  return sala;
}

export const piena = (sala: SalaVeloce) => sala.arrivati.length >= sala.apertura.posti;

const contoCon = (sala: SalaVeloce) =>
  sala.apertura.squadre === "scelte" && piena(sala) ? CONTO_VELOCE_SCELTE_MS : CONTO_VELOCE_MS;

/** Un telefono si aggancia a una sala con posti liberi. */
export function aggancia(sala: SalaVeloce, v: PartitaVeloceOnline, token: string, nome: unknown, ora: number): Effetto {
  if (sala.arrivati.some((a) => a.token === token)) throw new Error("giaInSala");
  if (piena(sala)) throw new Error("salaCambiata");
  sala.arrivati.push(nuovoArrivato(sala, v, token, nome));
  sala.prossimoId++;
  if (piena(sala)) {
    // Con «scelte in sala» si lascia il tempo di sistemarsi; altrimenti si parte subito.
    if (sala.apertura.squadre !== "scelte") return { t: "avvia" };
    sala.momento = "conto";
    sala.scade = ora + contoCon(sala);
    return AGGIORNA;
  }
  if (sala.momento === "scaduta" && sala.arrivati.length >= minimoPer(v, sala.apertura.posti)) {
    sala.momento = "conto";
    sala.scade = ora + CONTO_VELOCE_MS;
  }
  return AGGIORNA;
}

/** Un telefono lascia la sala (esce, o la grazia è finita). Il posto di organizzatore passa al prossimo. */
export function esci(sala: SalaVeloce, v: PartitaVeloceOnline, token: string, ora: number): Effetto {
  const i = sala.arrivati.findIndex((a) => a.token === token);
  if (i < 0) return NIENTE;
  sala.arrivati.splice(i, 1);
  if (sala.arrivati.length === 0) return { t: "chiudi", motivo: "vuota" };
  if (sala.momento === "conto") {
    if (sala.arrivati.length < minimoPer(v, sala.apertura.posti)) {
      if (minimoPer(v, sala.apertura.posti) === sala.apertura.posti) {
        // Il conto di una sala piena (squadre scelte): senza uno dei giocatori si torna ad aspettare.
        sala.momento = "attesa";
        sala.scade = ora + sala.apertura.attesaMs;
      } else {
        sala.momento = "scaduta";
        sala.scade = ora + SCADUTA_MS;
      }
    } else if (i === 0) {
      sala.scade = ora + contoCon(sala);
    }
  }
  return AGGIORNA;
}

/** Comandi della sala. Chi non può darli riceve un errore (codice da mostrare). */
export function comando(sala: SalaVeloce, v: PartitaVeloceOnline, token: string, c: ComandoSala, ora: number): Effetto {
  const io = sala.arrivati.find((a) => a.token === token);
  if (!io) throw new Error("nonInSala");
  const host = sala.arrivati[0]!.token === token;
  const n = sala.arrivati.length;
  const vivaAncora = ora - sala.aperta < VITA_SALA_MS;
  switch (c.comando) {
    case "squadra": {
      const sq = squadreDi(v, sala.apertura.posti);
      if (!sq || sala.apertura.squadre !== "scelte" || sala.momento === "scaduta") throw new Error("comandoNonValido");
      const chi = sala.arrivati.find((a) => a.id === c.id);
      if (!chi) throw new Error("nonInSala");
      if (chi.token !== token && !host) throw new Error("soloHostSala");
      if (!Number.isInteger(c.squadra) || c.squadra < 0 || c.squadra >= sq.length) throw new Error("squadraNonValida");
      if (chi.squadra === c.squadra) return NIENTE;
      if (sala.arrivati.filter((a) => a.squadra === c.squadra).length >= sq[c.squadra]!.length) throw new Error("squadraPiena");
      chi.squadra = c.squadra;
      return AGGIORNA;
    }
    case "apriAdesso":
      if (!host) throw new Error("soloHostSala");
      if (sala.momento === "scaduta" || n < minimoPer(v, sala.apertura.posti)) throw new Error("pochiPerAprire");
      return { t: "avvia" };
    case "annullaAvvio":
      if (!host) throw new Error("soloHostSala");
      if (sala.momento !== "conto") throw new Error("comandoNonValido");
      if (!vivaAncora) throw new Error("salaTroppoVecchia");
      sala.momento = "attesa";
      sala.scade = ora + sala.apertura.attesaMs;
      return AGGIORNA;
    case "aspettaAncora":
      if (!host) throw new Error("soloHostSala");
      if (sala.momento !== "scaduta") throw new Error("comandoNonValido");
      if (!vivaAncora) throw new Error("salaTroppoVecchia");
      sala.momento = "attesa";
      sala.scade = ora + sala.apertura.attesaMs;
      return AGGIORNA;
    case "chiudiSala":
      if (!host) throw new Error("soloHostSala");
      return { t: "chiudi", motivo: "chiusa" };
    default:
      throw new Error("comandoNonValido");
  }
}

/**
 * Passo del tempo (si chiama ogni secondo): libera i posti di chi è assente oltre la grazia e
 * fa scorrere attesa, conto e sala scaduta. `connesso` dice se un telefono ha un socket aperto.
 */
export function tick(sala: SalaVeloce, v: PartitaVeloceOnline, ora: number, connesso: (token: string) => boolean): Effetto {
  let effetto: Effetto = NIENTE;
  for (const a of [...sala.arrivati]) {
    if (connesso(a.token)) a.assenteDal = null;
    else if (a.assenteDal === null) a.assenteDal = ora;
    else if (ora - a.assenteDal >= GRAZIA_SALA_MS) {
      const e = esci(sala, v, a.token, ora);
      if (e.t === "chiudi") return e;
      effetto = AGGIORNA;
    }
  }
  if (ora < sala.scade) return effetto;
  const n = sala.arrivati.length;
  const m = minimoPer(v, sala.apertura.posti);
  if (sala.momento === "attesa") {
    if (n >= m) {
      sala.momento = "conto";
      sala.scade = ora + contoCon(sala);
    } else {
      sala.momento = "scaduta";
      sala.scade = ora + SCADUTA_MS;
    }
    return AGGIORNA;
  }
  if (sala.momento === "conto") return n >= m ? { t: "avvia" } : effetto;
  return { t: "chiudi", motivo: "scaduta" };
}

/** Il piano dell'avvio: chi siede dove, con i nomi e la config definitiva per `n` giocatori. */
export function pianoAvvio(
  sala: SalaVeloce,
  v: PartitaVeloceOnline,
  casuale: (n: number) => number,
): { ordine: Arrivato[]; nomi: string[]; config: unknown; organizzatore: string } {
  const n = sala.arrivati.length;
  const sq = squadreDi(v, sala.apertura.posti);
  let ordine = [...sala.arrivati];
  if (sq && sala.apertura.squadre === "caso") {
    for (let i = ordine.length - 1; i > 0; i--) {
      const j = casuale(i + 1);
      [ordine[i], ordine[j]] = [ordine[j]!, ordine[i]!];
    }
  } else if (sq && sala.apertura.squadre === "scelte") {
    const perPosto: Arrivato[] = [];
    sq.forEach((posti, k) => {
      sala.arrivati.filter((a) => a.squadra === k).forEach((a, i) => (perPosto[posti[i]! - 1] = a));
    });
    ordine = perPosto.filter((a): a is Arrivato => a !== undefined);
  }
  return {
    ordine,
    nomi: ordine.map((a) => a.nome),
    config: v.configVeloce(sala.apertura.config, n),
    organizzatore: sala.arrivati[0]!.token,
  };
}

/** La prima sala aperta di un gioco con posti liberi. */
export function salaAperta<T extends { sala: SalaVeloce | null }>(stanze: Iterable<T>, gioco: string): T | null {
  for (const s of stanze) if (s.sala && s.sala.gioco === gioco && !piena(s.sala)) return s;
  return null;
}

export function anteprima(sala: SalaVeloce, codice: string): AnteprimaVeloce {
  return {
    codice,
    organizzatore: sala.arrivati[0]!.nome,
    posti: sala.apertura.posti,
    occupati: sala.arrivati.length,
    config: sala.apertura.config,
    squadre: sala.apertura.squadre ?? null,
    attesaMs: sala.apertura.attesaMs,
  };
}

/** La sala come la vede un telefono (generica, uguale per tutti i giochi). */
export function vistaSala(
  sala: SalaVeloce,
  v: PartitaVeloceOnline,
  codice: string,
  token: string,
  ora: number,
  connesso: (token: string) => boolean,
): VistaSalaVeloce {
  const sq = squadreDi(v, sala.apertura.posti);
  const modo = sala.apertura.squadre ?? null;
  const squadraDi = (a: Arrivato, i: number): number | null => {
    if (!sq) return null;
    if (modo === "scelte") return a.squadra;
    if (modo === "arrivo") {
      const k = sq.findIndex((posti) => posti.includes(i + 1));
      return k >= 0 ? k : null;
    }
    return null;
  };
  return {
    gioco: sala.gioco,
    codice,
    momento: sala.momento,
    restaMs: Math.max(0, sala.scade - ora),
    posti: sala.apertura.posti,
    minimo: v.anticipato ? minimoPer(v, sala.apertura.posti) : null,
    config: sala.apertura.config,
    attesaMs: sala.apertura.attesaMs,
    squadre: modo,
    postiSquadre: sq,
    host: sala.arrivati[0]!.token === token,
    giocatori: sala.arrivati.map((a, i) => ({
      id: a.id,
      nome: a.nome,
      io: a.token === token,
      organizzatore: i === 0,
      collegato: connesso(a.token),
      squadra: squadraDi(a, i),
    })),
  };
}
