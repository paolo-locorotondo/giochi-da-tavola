export const manifest = {
  id: "tabu",
  nome: "Tabù",
  descrizione: "Fai indovinare la parola alla tua squadra senza dire le parole vietate.",
  minGiocatori: 4,
  // Stesso testo di "Regolamento" in README.md del gioco: se cambi uno, cambia anche l'altro.
  regolamento: {
    passi: [
      "Le squadre si alternano. Nel proprio turno un giocatore descrive a voce la parola in cima alla carta, i compagni cercano di indovinarla.",
      "Non può dire la parola né le cinque parole vietate, né usare gesti, parti della parola o traduzioni.",
      "Una persona della squadra avversaria controlla: se sente una parola vietata, chi tiene il telefono tocca «Vietata detta (−1)».",
      "Parola indovinata: «Indovinata (+1)». Carta troppo difficile: «Passa» (nessun punto).",
      "Allo scadere del tempo si sommano i punti e tocca all'altra squadra.",
      "Dopo i turni scelti vince la squadra con più punti.",
    ],
    note: ["Servono almeno 4 persone, in due squadre. Regole del gioco classico: esistono varianti."],
  },
} as const;
