/** Nomi delle squadre: vuoti o solo spazi diventano il nome predefinito (di norma «Squadra 1» / «Squadra 2», nella lingua scelta). */
export function nomiSquadre(
  a: string,
  b: string,
  predefiniti: readonly [string, string] = ["Squadra 1", "Squadra 2"],
): [string, string] {
  return [a.trim() || predefiniti[0], b.trim() || predefiniti[1]];
}
