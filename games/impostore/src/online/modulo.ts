import type { GiocoOnline } from "@gdt/engine";
import { applica, mancanti, nuovoStato, vistaPer, type AzioneOnline, type ConfigOnline, type StatoOnline, type Vista } from "./gioco";

/**
 * Impostore per il server comune: le regole di `gioco.ts` più i permessi (chi può chiedere cosa).
 * Prendere e lasciare un posto lo gestisce il server.
 */
export const impostoreOnline: GiocoOnline<StatoOnline, AzioneOnline, Vista> = {
  id: "impostore",
  nuovoStato: (nomi, config) => nuovoStato(nomi, config as ConfigOnline),
  applica,
  momento: (s) => (s.fase === "sala" ? "sala" : s.fase === "fine" ? "fine" : "inCorso"),
  inGioco: (s) => s.inGioco,
  mancanti,

  traduci(s, ctx, a) {
    const mio = ctx.posto;
    const soloHost = () => {
      if (!ctx.host) throw new Error("Solo chi ha creato la partita può farlo");
    };
    switch (a.tipo) {
      case "avvia":
        soloHost();
        return { tipo: "avvia", seme: ctx.seme() };
      case "avanti":
        soloHost();
        return { tipo: "avanti" };
      case "nuova":
        soloHost();
        return { tipo: "nuova" };
      case "visto":
        return mio === null ? null : { tipo: "visto", posto: mio };
      case "indizio":
        if (mio === null) throw new Error("Scegli prima il tuo nome");
        return { tipo: "indizio", chi: mio, testo: String(a.testo ?? "") };
      case "vota":
        // Si vota solo dal proprio telefono: nessuno vota per un altro.
        if (mio === null) throw new Error("Scegli prima il tuo nome");
        return { tipo: "vota", chi: mio, posto: a.posto as number };
      case "tenta":
        if (mio === null || mio !== s.eliminato) throw new Error("Solo l'impostore scoperto può tentare");
        return { tipo: "tenta", testo: a.testo as string };
      default:
        throw new Error("Azione non valida");
    }
  },

  vistaPer(s, posto, host, presenze) {
    const v = vistaPer(s, posto, host);
    return {
      ...v,
      nomi: v.nomi.map((n) => ({ ...n, collegato: presenze.collegati.has(n.posto), organizzatore: n.posto === presenze.organizzatore })),
    };
  },
};
