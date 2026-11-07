import type { GiocoOnline } from "@gdt/engine";
import { impostoreOnline } from "@gdt/impostore/online";

/**
 * I giochi che il server sa ospitare, per `id`. Per aggiungerne uno: un modulo
 * `games/<gioco>/src/online` che esporta un `GiocoOnline`, poi una riga qui.
 */
/** Ogni gioco ha i suoi tipi: il server non li guarda. */
export type GiocoQualsiasi = GiocoOnline<any, any, any>;

export const GIOCHI_ONLINE: Readonly<Record<string, GiocoQualsiasi>> = {
  [impostoreOnline.id]: impostoreOnline,
};

/** Il gioco con questo id; quello predefinito (Impostore) se manca, per i client di prima. */
export function giocoOnline(id: unknown): GiocoQualsiasi {
  const g = GIOCHI_ONLINE[typeof id === "string" ? id : "impostore"];
  if (!g) throw new Error("Gioco non disponibile online");
  return g;
}
