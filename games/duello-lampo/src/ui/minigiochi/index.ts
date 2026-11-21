import type { ComponentType } from "react";
import { BersagliVista, descriviBersagli } from "./BersagliVista";
import { ColoreVista, descriviColore } from "./ColoreVista";
import { MemoriaVista, descriviMemoria } from "./MemoriaVista";
import { NomiVista, descriviNomi } from "./NomiVista";
import { PiuGrandeVista, descriviPiuGrande } from "./PiuGrandeVista";
import { RafficaVista, descriviRaffica } from "./RafficaVista";
import { StopVista, descriviStop } from "./StopVista";
import { creaTrovaVista, descriviTrova } from "./TrovaVista";
import { ViaVista, descriviVia } from "./ViaVista";
import type { Descrivi, VistaProps } from "./tipi";

export interface VoceVista {
  Vista: ComponentType<VistaProps<any, any>>;
  descrivi: Descrivi<any>;
}

/**
 * La parte grafica di ogni mini gioco, per `id` (gli stessi di `minigiochi/index.ts`).
 * Per aggiungerne uno: la sua vista in questa cartella e una riga qui.
 */
export const VISTE: Readonly<Record<string, VoceVista>> = {
  via: { Vista: ViaVista, descrivi: descriviVia },
  raffica: { Vista: RafficaVista, descrivi: descriviRaffica },
  stop: { Vista: StopVista, descrivi: descriviStop },
  colore: { Vista: ColoreVista, descrivi: descriviColore },
  nomi: { Vista: NomiVista, descrivi: descriviNomi },
  panda: { Vista: creaTrovaVista("aspettaPanda"), descrivi: descriviTrova },
  smile: { Vista: creaTrovaVista("aspettaSmile"), descrivi: descriviTrova },
  memoria: { Vista: MemoriaVista, descrivi: descriviMemoria },
  bersagli: { Vista: BersagliVista, descrivi: descriviBersagli },
  piugrande: { Vista: PiuGrandeVista, descrivi: descriviPiuGrande },
};

export type { T, VistaProps } from "./tipi";
