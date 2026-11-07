import { MAX_CARATTERI_NOME, limitaTesto } from "@gdt/engine";

/** Nomi delle squadre: vuoti o solo spazi diventano il nome predefinito (di norma «Squadra 1» / «Squadra 2», nella lingua scelta). */
export function nomiSquadre(
  a: string,
  b: string,
  predefiniti: readonly [string, string] = ["Squadra 1", "Squadra 2"],
): [string, string] {
  const pulito = (v: string, predefinito: string) => limitaTesto(v.trim(), MAX_CARATTERI_NOME) || predefinito;
  return [pulito(a, predefiniti[0]), pulito(b, predefiniti[1])];
}
