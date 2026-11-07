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

/** Se il narratore sta ancora parlando (senza sintesi vocale: no). */
export function staParlando(): boolean {
  return typeof speechSynthesis !== "undefined" && speechSynthesis.speaking === true;
}

export function silenzio(): void {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
