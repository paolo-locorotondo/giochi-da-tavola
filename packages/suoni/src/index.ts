/**
 * Audio dell'app: un solo interruttore (impostazioni) per voce del narratore e suoni.
 * Spento di default. La scelta sta su `<html data-audio="on|off">` e in localStorage (`gdt-audio`).
 * Il pacchetto è generico: sa suonare un `Disegno` (note sintetizzate con Web Audio) o un file registrato,
 * e conosce solo i pochi suoni comuni a tutta l'app. I suoni di ogni gioco stanno nel gioco (`games/<gioco>/src/suoni`).
 */
const CHIAVE = "gdt-audio";
const EVENTO = "gdt-audio";

/** Suoni comuni a più parti dell'app (pulsanti, fine turno, sollecito online). */
export type NomeSuono = "click" | "fineTurno" | "sollecito";

export function audioAttivo(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-audio") === "on";
}

export function impostaAudio(attivo: boolean): void {
  document.documentElement.setAttribute("data-audio", attivo ? "on" : "off");
  try {
    localStorage.setItem(CHIAVE, attivo ? "on" : "off");
  } catch {
    // Archivio non disponibile: vale solo per questa visita.
  }
  // Spento: la voce in corso si interrompe subito.
  if (!attivo && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  window.dispatchEvent(new Event(EVENTO));
}

/** Chiama `f` ogni volta che l'audio viene acceso o spento. Restituisce la funzione per smettere. */
export function seguiAudio(f: () => void): () => void {
  window.addEventListener(EVENTO, f);
  return () => window.removeEventListener(EVENTO, f);
}

/** Da chiamare una volta all'avvio: rimette la scelta salvata su questo telefono. */
export function ripristinaAudio(): void {
  let salvato: string | null = null;
  try {
    salvato = localStorage.getItem(CHIAVE);
  } catch {
    /* resta spento */
  }
  document.documentElement.setAttribute("data-audio", salvato === "on" ? "on" : "off");
}

/**
 * Nota: frequenza (Hz), inizio (s), durata (s). Con il quarto valore la frequenza scivola fino a quella
 * finale (versi, ululati) e il volume resta pieno fino al rilascio, invece di spegnersi subito.
 */
export type Nota = readonly [number, number, number] | readonly [number, number, number, number];
export interface Disegno {
  onda: OscillatorType;
  volume: number;
  note: readonly Nota[];
}

const SUONI: Record<NomeSuono, Disegno> = {
  click: { onda: "sine", volume: 0.08, note: [[880, 0, 0.04]] },
  fineTurno: { onda: "sine", volume: 0.22, note: [[784, 0, 0.15], [784, 0.22, 0.15], [1047, 0.44, 0.3]] },
  sollecito: { onda: "sine", volume: 0.25, note: [[988, 0, 0.14], [988, 0.22, 0.14], [1319, 0.44, 0.2]] },
};

let contesto: AudioContext | null = null;

/** I suoni avviati o programmati e non ancora finiti (file e sintetizzati). */
const inCorso = new Set<Promise<void>>();

function registra(durataMs: number): void {
  const p: Promise<void> = new Promise((fatto) =>
    setTimeout(() => {
      inCorso.delete(p);
      fatto();
    }, durataMs),
  );
  inCorso.add(p);
}

/**
 * Si risolve quando non c'è più nessun suono in corso o in attesa di partire (anche quelli con ritardo).
 * Serve a chi deve parlare «dopo i suoni», come la voce del narratore: così non si sovrappongono mai.
 */
export async function attendiSuoni(): Promise<void> {
  while (inCorso.size > 0) await Promise.all([...inCorso]);
}

/**
 * Suona un suono comune o un disegno del gioco, solo se l'audio è acceso (con `ritardo` in secondi, se serve).
 * Non dà mai errori: senza Web Audio resta muto.
 */
export function suona(suono: NomeSuono | Disegno, ritardo = 0): void {
  if (!audioAttivo()) return;
  sintetizza(typeof suono === "string" ? SUONI[suono] : suono, ritardo);
}

/**
 * Riproduce un file registrato (l'indirizzo lo dà il bundler: `import url from "./x.mp3"`). Se non parte
 * (per esempio il telefono blocca la riproduzione) suona `riserva`, se c'è. Con `interrompi` si può fermare in anticipo.
 */
export function suonaFile(url: string, riserva?: Disegno, ritardo = 0, interrompi?: AbortSignal): Promise<void> {
  if (!audioAttivo()) return Promise.resolve();
  // La promessa si risolve a fine file (o in caso di errore, o dopo 15 s al massimo) e vale anche per `attendiSuoni`.
  const p: Promise<void> = new Promise<void>((fatto) => {
    const chiudi = () => {
      inCorso.delete(p);
      fatto();
    };
    const parti = () => {
      if (!audioAttivo()) return chiudi();
      const ripiega = () => {
        if (riserva) sintetizza(riserva, 0);
        chiudi();
      };
      try {
        const audio = new Audio(url);
        audio.addEventListener("ended", chiudi);
        // Con `interrompi` chi ha avviato il suono può fermarlo (per esempio a fine transizione).
        const ferma = () => {
          audio.pause();
          chiudi();
        };
        if (interrompi?.aborted) return ferma();
        interrompi?.addEventListener("abort", ferma, { once: true });
        setTimeout(chiudi, 15000);
        audio.play().catch(ripiega);
      } catch {
        ripiega();
      }
    };
    if (ritardo > 0) setTimeout(parti, ritardo * 1000);
    else parti();
  });
  inCorso.add(p);
  return p;
}

function sintetizza(disegno: Disegno, ritardo: number): void {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    contesto ??= new Ctx();
    void contesto.resume();
    const { onda, volume, note } = disegno;
    const t0 = contesto.currentTime + 0.01 + ritardo;
    registra((ritardo + Math.max(0, ...note.map(([, inizio, durata]) => inizio + durata)) + 0.1) * 1000);
    for (const [freq, inizio, durata, fine] of note) {
      const osc = contesto.createOscillator();
      const guadagno = contesto.createGain();
      osc.type = onda;
      osc.frequency.value = freq;
      // Attacco e rilascio rapidi: niente "clic" a inizio e fine nota.
      guadagno.gain.setValueAtTime(0.0001, t0 + inizio);
      guadagno.gain.exponentialRampToValueAtTime(volume, t0 + inizio + 0.03);
      if (fine === undefined) {
        guadagno.gain.exponentialRampToValueAtTime(0.0001, t0 + inizio + durata);
      } else {
        // Verso o ululato: la frequenza scivola e il volume si spegne solo nell'ultimo quarto.
        osc.frequency.setValueAtTime(freq, t0 + inizio);
        osc.frequency.exponentialRampToValueAtTime(fine, t0 + inizio + durata);
        guadagno.gain.setValueAtTime(volume, t0 + inizio + durata * 0.75);
        guadagno.gain.exponentialRampToValueAtTime(0.0001, t0 + inizio + durata);
      }
      osc.connect(guadagno).connect(contesto.destination);
      osc.start(t0 + inizio);
      osc.stop(t0 + inizio + durata + 0.02);
    }
  } catch {
    /* audio non disponibile */
  }
}
