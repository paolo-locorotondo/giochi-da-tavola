/** Narratore a voce con la sintesi vocale del telefono (funziona offline). */
export function parla(testo: string): void {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(testo);
  u.lang = "it-IT";
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

export function silenzio(): void {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
