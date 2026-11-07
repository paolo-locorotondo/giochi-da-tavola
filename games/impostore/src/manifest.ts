import { elenco, traduttore, type Lingua, type TestiGioco } from "@gdt/i18n";
import { dizionari } from "./locales";

export const manifest = {
  id: "impostore",
  minGiocatori: 3,
  /** Ha anche la modalità ognuno col suo telefono (server). Gli altri giochi sono solo a un telefono. */
  online: true,
  /** Testi mostrati dall'app fuori dal gioco (elenco, regolamento). Il regolamento sta in `locales/<lingua>.ts`. */
  testi(lingua: Lingua): TestiGioco {
    const t = traduttore(dizionari, lingua);
    return {
      nome: t("nome"),
      descrizione: t("descrizione"),
      regolamento: {
        passi: elenco(dizionari, lingua, "regolamentoPassi"),
        note: elenco(dizionari, lingua, "regolamentoNote"),
      },
      impostazioni: [],
    };
  },
} as const;
