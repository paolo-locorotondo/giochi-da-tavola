import { elenco, traduttore, type Lingua, type TestiGioco } from "@gdt/i18n";
import { dizionari } from "./locales";

export const manifest = {
  id: "tris",
  online: true,
  minGiocatori: 1,
  /** Testi mostrati dall'app (elenco giochi, regolamento, ingranaggio) nella lingua scelta. */
  testi(lingua: Lingua): TestiGioco {
    const t = traduttore(dizionari, lingua);
    return {
      nome: t("nome"),
      descrizione: t("descrizione"),
      // Stesso testo di «Regolamento» in README.md del gioco: se cambi uno, cambia anche l'altro.
      regolamento: {
        passi: elenco(dizionari, lingua, "regolamentoPassi"),
        note: elenco(dizionari, lingua, "regolamentoNote"),
      },
      impostazioni: [],
    };
  },
} as const;
