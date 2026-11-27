import { useCallback, useEffect, useRef, useState } from "react";
import { suona } from "@gdt/suoni";
import type { AnteprimaVeloce, AperturaVeloce, ComandoSala, VistaSalaVeloce } from "@gdt/engine";

export { SalaVeloce, formatoTempo, linkVeloce, testoErroreVeloce, usaTestiVeloce, veloceDaIndirizzo } from "./SalaVeloce";
export { AvvisoBetaTesto } from "./AvvisoBeta";
export { ApriVeloce, type ImpostazioniVeloce } from "./ApriVeloce";
export { ContoRighe } from "./ContoRighe";
export { CampoTesto } from "./CampoTesto";
export type { AnteprimaVeloce, AperturaVeloce, ComandoSala, VistaSalaVeloce };

/** Messaggi verso il server (specchio di apps/server/src/stanze.ts). */
export type Messaggio =
  | { t: "crea"; gioco?: string; nomi: string[]; config: unknown; token?: string }
  | { t: "entra"; codice: string; token?: string; riprendi?: boolean }
  | { t: "azione"; azione: Record<string, unknown> }
  | { t: "sollecita" }
  | { t: "chiudi" }
  | { t: "anteprimaVeloce"; gioco: string }
  | { t: "veloce"; gioco: string; nome: string; codice?: string; apri?: AperturaVeloce }
  | { t: "esciDaSala" }
  | ({ t: "sala" } & ComandoSala);

type DaServer<V> =
  | { t: "benvenuto"; codice: string; token: string }
  | { t: "vista"; vista: V }
  | { t: "sollecito" }
  | { t: "chiusa" }
  | { t: "anteprima"; gioco: string; sala: AnteprimaVeloce | null }
  | { t: "salaVeloce"; sala: VistaSalaVeloce }
  | { t: "fuoriSala"; motivo: "uscito" | "scaduta" | "chiusa" }
  | { t: "errore"; messaggio: string };

const ATTESA_MASSIMA_MS = 8000;

const chiaveToken = (gioco: string, codice: string) => `gdt.${gioco}.token.${codice}`;

/** Il token salvato per un codice: serve a creare/entrare con lo stesso telefono. */
export function leggiToken(gioco: string, codice: string): string | undefined {
  try {
    return localStorage.getItem(chiaveToken(gioco, codice)) ?? undefined;
  } catch {
    return undefined;
  }
}

function cancellaToken(gioco: string, codice: string) {
  try {
    localStorage.removeItem(chiaveToken(gioco, codice));
  } catch {
    /* niente da cancellare */
  }
}

function salvaToken(gioco: string, codice: string, token: string) {
  try {
    localStorage.setItem(chiaveToken(gioco, codice), token);
  } catch {
    /* senza storage il refresh fa perdere il posto, ma si può continuare a giocare */
  }
}

const chiaveUltimaVeloce = (gioco: string) => `gdt.${gioco}.ultimaVeloce`;

/** L'ultima sala veloce in cui ero (il token sta in `chiaveToken`): serve a riprendere il posto. */
function leggiUltimaVeloce(gioco: string): string | undefined {
  try {
    return localStorage.getItem(chiaveUltimaVeloce(gioco)) ?? undefined;
  } catch {
    return undefined;
  }
}

function scriviUltimaVeloce(gioco: string, codice: string | null) {
  try {
    if (codice) localStorage.setItem(chiaveUltimaVeloce(gioco), codice);
    else localStorage.removeItem(chiaveUltimaVeloce(gioco));
  } catch {
    /* senza storage non si riprende il posto: resta la grazia di 30 s */
  }
}

export interface Collegamento<V> {
  vista: V | null;
  codice: string | null;
  connesso: boolean;
  /** Non si riesce a collegarsi da un po': probabilmente nessun server raggiungibile. */
  nonRaggiungibile: boolean;
  errore: string | null;
  sollecitato: boolean;
  /** La partita è stata chiusa dall'organizzatore. */
  chiusa: boolean;
  /** Partita veloce: la sala d'attesa in cui mi trovo (finché la partita non parte). */
  sala: VistaSalaVeloce | null;
  /** La stanza veloce aperta di questo gioco: undefined = non ancora chiesta, null = nessuna. */
  anteprima: AnteprimaVeloce | null | undefined;
  /** Perché sono uscito dalla sala (si azzera entrando di nuovo). */
  fuoriSala: "uscito" | "scaduta" | "chiusa" | null;
  /** Chiede com'è la stanza veloce aperta (risposta in `anteprima`). */
  chiediAnteprima: () => void;
  /** Entra nella stanza vista (`codice`), ne apre una (`apri`) o, senza opzioni, entra nella prima o ne apre una di base. */
  entraVeloce: (nome: string, opzioni?: { codice?: string; apri?: AperturaVeloce }) => void;
  esciDaSala: () => void;
  /**
   * Se c'è una sala veloce salvata prova a rientrarci con il suo token (true = tentativo partito).
   * Se il server la rifiuta il salvataggio si scarta e si chiede da sé l'anteprima.
   */
  riprendiVeloce: () => boolean;
  comandoSala: (c: ComandoSala) => void;
  invia: (m: Messaggio) => void;
  azione: (a: Record<string, unknown>) => void;
  azzeraErrore: () => void;
}

/**
 * Tiene aperto il WebSocket verso il server per il gioco `gioco` (`/<gioco>/CODICE` è l'indirizzo
 * della partita). Se cade (schermo bloccato, rete) riprova da solo e rientra nella stessa partita
 * con il token salvato sul telefono. `V` è il tipo della vista che manda il server per quel gioco.
 */
export function useCollegamento<V>(gioco: string, codiceIniziale: string | null): Collegamento<V> {
  const [vista, setVista] = useState<V | null>(null);
  const [codice, setCodice] = useState<string | null>(codiceIniziale);
  const [connesso, setConnesso] = useState(false);
  const [nonRaggiungibile, setNonRaggiungibile] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [sollecitato, setSollecitato] = useState(false);
  const [chiusa, setChiusa] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const codiceRef = useRef<string | null>(codiceIniziale);
  const inAttesa = useRef<Messaggio[]>([]);
  const [sala, setSala] = useState<VistaSalaVeloce | null>(null);
  const [anteprima, setAnteprima] = useState<AnteprimaVeloce | null | undefined>(undefined);
  const [fuoriSala, setFuoriSala] = useState<"uscito" | "scaduta" | "chiusa" | null>(null);
  /** Il codice della sala d'attesa in cui sono ora (null = non in sala): decide se smontare è un'uscita. */
  const salaDi = useRef<string | null>(null);
  /** Un tentativo di riprendere il posto è in corso: un errore va scartato in silenzio. */
  const riprendendo = useRef(false);

  // Se per troppo tempo non c'è connessione, lo si dice invece di restare in attesa all'infinito.
  useEffect(() => {
    if (connesso) {
      setNonRaggiungibile(false);
      return;
    }
    const id = setTimeout(() => setNonRaggiungibile(true), ATTESA_MASSIMA_MS);
    return () => clearTimeout(id);
  }, [connesso]);

  const invia = useCallback((m: Messaggio) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(m));
    else inAttesa.current.push(m);
  }, []);

  useEffect(() => {
    let chiuso = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const apri = () => {
      const protocollo = window.location.protocol === "https:" ? "wss" : "ws";
      const s = new WebSocket(`${protocollo}://${window.location.host}/ws`);
      ws.current = s;
      s.onopen = () => {
        setConnesso(true);
        const c = codiceRef.current;
        // Rientro: se conosco già il codice, mi riaggancio con il mio token.
        if (c) s.send(JSON.stringify({ t: "entra", codice: c, token: leggiToken(gioco, c) }));
        for (const m of inAttesa.current.splice(0)) s.send(JSON.stringify(m));
      };
      s.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as DaServer<V>;
        if (m.t === "benvenuto") {
          setFuoriSala(null);
          codiceRef.current = m.codice;
          setCodice(m.codice);
          salvaToken(gioco, m.codice, m.token);
          window.history.replaceState(window.history.state, "", `/${gioco}/${m.codice}`);
        } else if (m.t === "vista") {
          riprendendo.current = false;
          salaDi.current = null;
          setSala(null);
          setVista(m.vista);
          setSollecitato(false);
        } else if (m.t === "chiusa") {
          // Partita chiusa: il token non serve più e non si deve rientrare da solo.
          const c = codiceRef.current;
          if (c) cancellaToken(gioco, c);
          scriviUltimaVeloce(gioco, null);
          salaDi.current = null;
          codiceRef.current = null;
          setChiusa(true);
          setVista(null);
          setCodice(null);
          window.history.replaceState(window.history.state, "", `/${gioco}`);
        } else if (m.t === "anteprima") {
          setAnteprima(m.sala);
        } else if (m.t === "salaVeloce") {
          riprendendo.current = false;
          salaDi.current = m.sala.codice;
          scriviUltimaVeloce(gioco, m.sala.codice);
          setSala(m.sala);
        } else if (m.t === "fuoriSala") {
          // Fuori dalla sala (uscito, scaduta, chiusa): il token non serve più.
          const c = codiceRef.current;
          if (c) cancellaToken(gioco, c);
          scriviUltimaVeloce(gioco, null);
          salaDi.current = null;
          codiceRef.current = null;
          setSala(null);
          setCodice(null);
          setFuoriSala(m.motivo);
          window.history.replaceState(window.history.state, "", `/${gioco}`);
        } else if (m.t === "sollecito") {
          setSollecitato(true);
          navigator.vibrate?.([200, 100, 200]);
          suona("sollecito");
        } else if (riprendendo.current) {
          // Il posto salvato non c'è più (sala chiusa, grazia finita): si riparte da zero.
          riprendendo.current = false;
          const c = codiceRef.current;
          if (c) cancellaToken(gioco, c);
          scriviUltimaVeloce(gioco, null);
          codiceRef.current = null;
          setCodice(null);
          s.send(JSON.stringify({ t: "anteprimaVeloce", gioco }));
        } else {
          setErrore(m.messaggio);
        }
      };
      s.onclose = () => {
        setConnesso(false);
        if (!chiuso) timer = setTimeout(apri, 1500);
      };
    };
    apri();

    const alRitorno = () => {
      if (document.visibilityState === "visible" && ws.current?.readyState !== WebSocket.OPEN) {
        clearTimeout(timer);
        apri();
      }
    };
    document.addEventListener("visibilitychange", alRitorno);
    return () => {
      chiuso = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", alRitorno);
      // Smontaggio (freccia «indietro», cambio di gioco) con la sala d'attesa aperta: è un'uscita
      // voluta, il posto si libera subito. Refresh, schermo bloccato, rete o scheda chiusa non
      // passano di qui (il socket cade da solo) e restano coperti dalla grazia del server.
      // Con StrictMode il primo cleanup arriva prima di ogni sala, quindi non scatta.
      const dentro = salaDi.current;
      if (dentro && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ t: "esciDaSala" } satisfies Messaggio));
        cancellaToken(gioco, dentro);
        scriviUltimaVeloce(gioco, null);
      }
      ws.current?.close();
    };
  }, [gioco]);

  const chiediAnteprima = useCallback(() => invia({ t: "anteprimaVeloce", gioco }), [gioco, invia]);
  const entraVeloce = useCallback(
    (nome: string, opzioni?: { codice?: string; apri?: AperturaVeloce }) => {
      setFuoriSala(null);
      invia({ t: "veloce", gioco, nome, ...opzioni });
    },
    [gioco, invia],
  );
  const esciDaSala = useCallback(() => invia({ t: "esciDaSala" }), [invia]);
  const riprendiVeloce = useCallback(() => {
    const c = leggiUltimaVeloce(gioco);
    const token = c ? leggiToken(gioco, c) : undefined;
    if (!c || !token) {
      if (c) scriviUltimaVeloce(gioco, null);
      return false;
    }
    if (riprendendo.current || codiceRef.current) return true;
    riprendendo.current = true;
    codiceRef.current = c;
    invia({ t: "entra", codice: c, token, riprendi: true });
    return true;
  }, [gioco, invia]);
  const comandoSala = useCallback((c: ComandoSala) => invia({ t: "sala", ...c }), [invia]);

  return {
    vista,
    sala,
    anteprima,
    fuoriSala,
    chiediAnteprima,
    entraVeloce,
    esciDaSala,
    riprendiVeloce,
    comandoSala,
    codice,
    connesso,
    nonRaggiungibile,
    errore,
    sollecitato,
    chiusa,
    invia,
    azione: (azione) => invia({ t: "azione", azione }),
    azzeraErrore: () => setErrore(null),
  };
}
