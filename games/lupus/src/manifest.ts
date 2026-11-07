import { IMPOSTAZIONI } from "./impostazioni";
import { PERSONAGGI_REGOLAMENTO } from "./personaggi";

export const manifest = {
  id: "lupus",
  nome: "Lupus in fabula",
  descrizione: "Il villaggio dorme, i lupi no. Il telefono fa da narratore.",
  minGiocatori: 4,
  /** Impostazioni del gioco, mostrate nell'ingranaggio quando si è dentro Lupus. */
  impostazioni: IMPOSTAZIONI,
  // Stesso testo di "Regolamento" in README.md del gioco: se cambi uno, cambia anche l'altro.
  regolamento: {
    passi: [
      "Ognuno vede in segreto il proprio ruolo. I lupi vedono i compagni.",
      "Notte: tutti chiudono gli occhi. Il narratore chiama i lupi (scelgono una vittima, non un lupo), poi il veggente (scopre se un giocatore è lupo), poi il medico (protegge qualcuno, non lo stesso due notti di fila).",
      "Giorno: si scopre chi è morto (e il suo ruolo). Si discute e si vota: devono votare tutti i vivi.",
      "Pareggio: ballottaggio tra i pari merito; se pareggiano ancora nessuno viene eliminato.",
      "Vincono i contadini se muoiono tutti i lupi, i lupi quando sono almeno quanti gli altri vivi.",
    ],
    note: [
      "Ruoli: 1 lupo ogni 4 giocatori (arrotondato), veggente da 5 giocatori, medico da 7, il resto contadini. Servono almeno 4 persone.",
      "Regole del gioco classico: esistono varianti.",
    ],
    personaggi: PERSONAGGI_REGOLAMENTO,
  },
} as const;
