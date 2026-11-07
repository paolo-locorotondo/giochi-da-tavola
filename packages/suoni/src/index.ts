/**
 * Audio dell'app: un solo interruttore (impostazioni) per voce del narratore e suoni.
 * Spento di default. La scelta sta su `<html data-audio="on|off">` e in localStorage (`gdt-audio`).
 * I suoni sono sintetizzati con Web Audio: nessun file, funzionano offline.
 */
const CHIAVE = "gdt-audio";
const EVENTO = "gdt-audio";

export type NomeSuono =
  | "click"
  | "indovinata"
  | "vietata"
  | "passa"
  | "fineTurno"
  | "sollecito"
  | "civili"
  | "impostori"
  | "gallo"
  | "ululato"
  | "rintocco"
  | "mortoLupo"
  | "mortoContadino"
  | "mortoVeggente"
  | "mortoMedico"
  | "fineContadini"
  | "fineLupi";

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
type Nota = readonly [number, number, number] | readonly [number, number, number, number];
interface Disegno {
  onda: OscillatorType;
  volume: number;
  note: readonly Nota[];
}

const SUONI: Record<NomeSuono, Disegno> = {
  click: { onda: "sine", volume: 0.08, note: [[880, 0, 0.04]] },
  indovinata: { onda: "sine", volume: 0.2, note: [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.16]] },
  vietata: { onda: "square", volume: 0.12, note: [[165, 0, 0.14], [117, 0.15, 0.26]] },
  passa: { onda: "triangle", volume: 0.18, note: [[600, 0, 0.08], [440, 0.08, 0.12]] },
  fineTurno: { onda: "sine", volume: 0.22, note: [[784, 0, 0.15], [784, 0.22, 0.15], [1047, 0.44, 0.3]] },
  sollecito: { onda: "sine", volume: 0.25, note: [[988, 0, 0.14], [988, 0.22, 0.14], [1319, 0.44, 0.2]] },
  civili: { onda: "triangle", volume: 0.22, note: [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.4]] },
  impostori: { onda: "sawtooth", volume: 0.1, note: [[392, 0, 0.2], [311, 0.2, 0.2], [262, 0.4, 0.2], [196, 0.6, 0.45]] },
  // Lupus. Il gallo: «chi chi ri chi», sillabe che salgono e un ultimo «chi» lungo che scende.
  gallo: {
    onda: "sawtooth",
    volume: 0.07,
    note: [[700, 0, 0.14, 1100], [750, 0.2, 0.14, 1150], [800, 0.4, 0.16, 1250], [1000, 0.62, 0.55, 1300]],
  },
  // L'ululato: sale piano, tiene, poi scende.
  ululato: {
    onda: "triangle",
    volume: 0.2,
    note: [[280, 0, 0.9, 560], [560, 0.8, 0.6, 520], [520, 1.3, 1, 260]],
  },
  rintocco: { onda: "sine", volume: 0.25, note: [[196, 0, 0.9], [196, 1.1, 0.9]] },
  mortoLupo: { onda: "triangle", volume: 0.2, note: [[420, 0, 0.3, 680], [680, 0.3, 0.45, 340]] },
  mortoContadino: { onda: "sine", volume: 0.3, note: [[110, 0, 0.5], [82, 0.55, 0.9]] },
  mortoVeggente: { onda: "sine", volume: 0.18, note: [[1319, 0, 0.3], [988, 0.25, 0.3], [740, 0.5, 0.3], [494, 0.75, 0.7]] },
  mortoMedico: { onda: "sine", volume: 0.25, note: [[90, 0, 0.12], [90, 0.3, 0.12], [440, 0.7, 1.1]] },
  fineContadini: {
    onda: "triangle",
    volume: 0.22,
    note: [[392, 0, 0.18], [523, 0.18, 0.18], [659, 0.36, 0.18], [784, 0.54, 0.18], [1047, 0.72, 0.6]],
  },
  fineLupi: {
    onda: "triangle",
    volume: 0.2,
    note: [[250, 0, 1, 520], [520, 0.9, 0.6, 500], [500, 1.4, 1.3, 230]],
  },
};

let contesto: AudioContext | null = null;

/** Suona solo se l'audio è acceso (con `ritardo` in secondi, se serve). Non dà mai errori: senza Web Audio resta muto. */
export function suona(nome: NomeSuono, ritardo = 0): void {
  if (!audioAttivo()) return;
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    contesto ??= new Ctx();
    void contesto.resume();
    const { onda, volume, note } = SUONI[nome];
    const t0 = contesto.currentTime + 0.01 + ritardo;
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
