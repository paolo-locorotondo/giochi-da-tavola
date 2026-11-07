import type { Dizionari } from "@gdt/i18n";

const it = {
  titolo: "Giochi da tavola",
  versione: "Giochi da tavola · v{versione}",
  indietro: "Indietro",
  impostazioni: "Impostazioni",
  chiudi: "Chiudi",
  tornaAlleImpostazioni: "Torna alle impostazioni",
  sezioneApp: "App",
  temaScuro: "Tema scuro",
  audio: "Audio",
  lingua: "Lingua",
  regolamentoDiGioco: "Regolamento di gioco",
  regolamentoDi: "Regolamento di {gioco}",
  regolamentoTitolo: "Regolamento · {gioco}",
  iPersonaggi: "I personaggi",
} as const;

export const dizionari: Dizionari<typeof it> = {
  it,
  en: {
    titolo: "Table games",
    versione: "Table games · v{versione}",
    indietro: "Back",
    impostazioni: "Settings",
    chiudi: "Close",
    tornaAlleImpostazioni: "Back to settings",
    sezioneApp: "App",
    temaScuro: "Dark theme",
    audio: "Sound",
    lingua: "Language",
    regolamentoDiGioco: "Game rules",
    regolamentoDi: "Rules of {gioco}",
    regolamentoTitolo: "Rules · {gioco}",
    iPersonaggi: "The characters",
  },
};
