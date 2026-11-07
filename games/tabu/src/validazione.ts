/** Nomi delle squadre: vuoti o solo spazi diventano «Squadra 1» / «Squadra 2». */
export function nomiSquadre(a: string, b: string): [string, string] {
  return [a.trim() || "Squadra 1", b.trim() || "Squadra 2"];
}
