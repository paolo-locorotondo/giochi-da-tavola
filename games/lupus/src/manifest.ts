import { traduttore, type Lingua, type TestiGioco } from "@gdt/i18n";
import { impostazioni } from "./impostazioni";
import { dizionari } from "./locales";
import { personaggiRegolamento } from "./personaggi";

export const manifest = {
  id: "lupus",
  minGiocatori: 4,
  /** Testi che l'app mostra fuori dal gioco (elenco, regolamento, impostazioni) nella lingua scelta. */
  testi(lingua: Lingua): TestiGioco {
    const t = traduttore(dizionari, lingua);
    return {
      nome: t("nomeGioco"),
      descrizione: t("descrizioneGioco"),
      // In italiano è lo stesso testo di "Regolamento" in README.md del gioco: se cambi uno, cambia anche l'altro.
      regolamento: {
        passi: [t("regPasso1"), t("regPasso2"), t("regPasso3"), t("regPasso4"), t("regPasso5")],
        note: [t("regNota1"), t("regNota2")],
        personaggi: personaggiRegolamento(lingua),
      },
      impostazioni: impostazioni(lingua),
    };
  },
};
