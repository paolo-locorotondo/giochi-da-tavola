import { creaMacchina, type DefinizioneFasi } from "@gdt/engine";

export type FaseImpostore = "distribuzione" | "indizi" | "voto" | "tentativo" | "fine";
export type EventoImpostore =
  | "avanti"
  /** Il voto ha eliminato un impostore: può tentare di indovinare la parola. */
  | "impostoreScoperto"
  /** Il voto ha eliminato un civile (o pareggio senza ballottaggio): vince l'impostore. */
  | "impostoreNonScoperto"
  | "tentativoEseguito";

export const fasiImpostore: DefinizioneFasi<FaseImpostore, EventoImpostore> = {
  iniziale: "distribuzione",
  transizioni: {
    distribuzione: { avanti: "indizi" },
    indizi: { avanti: "voto" },
    voto: { impostoreScoperto: "tentativo", impostoreNonScoperto: "fine" },
    tentativo: { tentativoEseguito: "fine" },
    fine: {},
  },
};

export const nuovaMacchinaImpostore = () => creaMacchina(fasiImpostore);

export type Vincitore = "civili" | "impostori";

/** Vincitore a fine partita. `indovinato` conta solo se l'impostore è stato scoperto. */
export function vincitore(scoperto: boolean, indovinato: boolean): Vincitore {
  if (!scoperto) return "impostori";
  return indovinato ? "impostori" : "civili";
}
