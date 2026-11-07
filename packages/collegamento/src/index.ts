import { useCallback, useEffect, useRef, useState } from "react";
import { suona } from "@gdt/suoni";

/** Messaggi verso il server (specchio di apps/server/src/stanze.ts). */
export type Messaggio =
  | { t: "crea"; gioco?: string; nomi: string[]; config: unknown; token?: string }
  | { t: "entra"; codice: string; token?: string }
  | { t: "azione"; azione: Record<string, unknown> }
  | { t: "sollecita" }
  | { t: "chiudi" }
  | { t: "coda"; gioco: string; nome: string }
  | { t: "esciDaCoda" };

type DaServer<V> =
  | { t: "benvenuto"; codice: string; token: string }
  | { t: "vista"; vista: V }
  | { t: "sollecito" }
  | { t: "chiusa" }
  | { t: "inCoda"; in: boolean }
  | { t: "codaScaduta" }
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
  /** Partita veloce: in coda in attesa di un avversario. */
  inCoda: boolean;
  /** Nessun avversario è arrivato in tempo (si azzera rimettendosi in coda). */
  codaScaduta: boolean;
  /** Mi metto in coda con il mio nome; quando arriva un avversario entro nella partita già avviata. */
  cercaAvversario: (nome: string) => void;
  annullaCoda: () => void;
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
  const [inCoda, setInCoda] = useState(false);
  const [codaScaduta, setCodaScaduta] = useState(false);
  /** Nome con cui sono in coda: se la connessione cade, al rientro mi rimetto in coda. */
  const nomeInCoda = useRef<string | null>(null);

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
        else if (nomeInCoda.current !== null) {
          // Il server toglie dalla coda chi si scollega: al rientro ci si rimette (in fondo).
          inAttesa.current = inAttesa.current.filter((m) => m.t !== "coda");
          s.send(JSON.stringify({ t: "coda", gioco, nome: nomeInCoda.current }));
        }
        for (const m of inAttesa.current.splice(0)) s.send(JSON.stringify(m));
      };
      s.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as DaServer<V>;
        if (m.t === "benvenuto") {
          nomeInCoda.current = null;
          setInCoda(false);
          codiceRef.current = m.codice;
          setCodice(m.codice);
          salvaToken(gioco, m.codice, m.token);
          window.history.replaceState(window.history.state, "", `/${gioco}/${m.codice}`);
        } else if (m.t === "vista") {
          setVista(m.vista);
          setSollecitato(false);
        } else if (m.t === "chiusa") {
          // Partita chiusa: il token non serve più e non si deve rientrare da solo.
          const c = codiceRef.current;
          if (c) cancellaToken(gioco, c);
          codiceRef.current = null;
          setChiusa(true);
          setVista(null);
          setCodice(null);
          window.history.replaceState(window.history.state, "", `/${gioco}`);
        } else if (m.t === "inCoda") {
          if (!m.in) nomeInCoda.current = null;
          setInCoda(m.in);
        } else if (m.t === "codaScaduta") {
          nomeInCoda.current = null;
          setInCoda(false);
          setCodaScaduta(true);
        } else if (m.t === "sollecito") {
          setSollecitato(true);
          navigator.vibrate?.([200, 100, 200]);
          suona("sollecito");
        } else {
          // Un errore mentre cerco un avversario (es. server pieno) mi toglie dalla coda.
          if (nomeInCoda.current !== null && !codiceRef.current) {
            nomeInCoda.current = null;
            setInCoda(false);
          }
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
      ws.current?.close();
    };
  }, [gioco]);

  const cercaAvversario = useCallback(
    (nome: string) => {
      nomeInCoda.current = nome;
      setCodaScaduta(false);
      setInCoda(true);
      invia({ t: "coda", gioco, nome });
    },
    [gioco, invia],
  );
  const annullaCoda = useCallback(() => {
    nomeInCoda.current = null;
    setInCoda(false);
    inAttesa.current = inAttesa.current.filter((m) => m.t !== "coda");
    invia({ t: "esciDaCoda" });
  }, [invia]);

  return {
    vista,
    inCoda,
    codaScaduta,
    cercaAvversario,
    annullaCoda,
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
