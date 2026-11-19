import type { Lingua } from "@gdt/i18n";
import { audioAttivo } from "@gdt/suoni";

/** Codice BCP 47 della voce per ogni lingua dell'app. */
const LINGUA_VOCE: Record<Lingua, string> = { it: "it-IT", en: "en-US" };

/** Narratore a voce con la sintesi vocale del telefono (funziona offline), nella lingua dell'app. */
export function parla(testo: string, lingua: Lingua): void {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  if (!audioAttivo()) return;
  const u = new SpeechSynthesisUtterance(testo);
  u.lang = LINGUA_VOCE[lingua];
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

export function silenzio(): void {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
