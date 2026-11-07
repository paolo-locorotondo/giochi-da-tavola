export const manifest = {
  id: "impostore",
  nome: "Impostore",
  descrizione: "Tutti conoscono la parola tranne uno. Scoprilo prima che vinca.",
  minGiocatori: 3,
  // Stesso testo di "Regolamento" in README.md del gioco: se cambi uno, cambia anche l'altro.
  regolamento: {
    passi: [
      "Ognuno guarda la propria carta in segreto: vede la parola, oppure scopre di essere l'impostore.",
      "A turno si viene indicati dall'app e ognuno dice a voce (se offline) o digita (se online) un indizio sulla parola, senza dirla. L'impostore bluffa.",
      "Si discute e si vota chi sembra l'impostore.",
      "Se votano un innocente, vince l'impostore.",
      "Se scoprono l'impostore, lui ha un'ultima occasione: se indovina la parola vince lui, altrimenti vincono gli altri.",
    ],
    note: ["Impostori consigliati: 1 fino a 6 giocatori, 2 da 7 a 10, 3 da 11. Servono almeno 3 persone."],
  },
} as const;
