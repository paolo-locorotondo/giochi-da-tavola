export const it = {
  nome: "Duello Lampo",
  descrizione: "Sfida di riflessi per due: mini giochi di velocità sullo stesso telefono, uno di fronte all'altro.",
  regolamentoPassi: [
    "Appoggia il telefono al centro del tavolo: ognuno gioca sulla metà di schermo che ha davanti.",
    "Scegli i mini giochi e quanti round giocare, poi tocca «Inizia la sfida».",
    "Prima di ogni round si legge la regola e ognuno tocca «Sono pronto»; parte il conto alla rovescia 3, 2, 1.",
    "Il mini gioco assegna 1 punto a chi lo vince; se è pari nessuno prende punti.",
    "Vince chi ha più punti alla fine. Se sono pari si gioca uno spareggio di «Via!», finché qualcuno è avanti.",
  ],
  regolamentoNote: [
    "I tempi si misurano sul telefono, dal momento in cui lo stimolo compare sullo schermo.",
    "Tocca solo la tua metà: i tocchi dell'altra metà non contano per te.",
  ],

  // Preparazione della sfida
  giocatoreBasso: "Chi sta in basso",
  giocatoreAlto: "Chi sta in alto",
  nomeAiuto: "Nome facoltativo, al massimo {max} caratteri.",
  nomeBasso: "Giocatore 1",
  nomeAlto: "Giocatore 2",
  minigiochiTitolo: "Mini giochi",
  minigiochiAiuto: "Scegli quali usare: ne serve almeno uno.",
  tutti: "Tutti",
  aCaso: "A caso",
  nessunoScelto: "Scegli almeno un mini gioco.",
  roundTitolo: "Quanti round?",
  roundAiuto: "Se alla fine sono pari si fa uno spareggio.",
  inizia: "Inizia la sfida",

  // Mini giochi: nome e regola (una coppia di chiavi per ogni id del registro)
  mg_via_nome: "Via!",
  mg_via_regola: "Aspetta che lo schermo diventi verde e tocca per primo. Se tocchi prima, perdi il round.",
  mg_raffica_nome: "Raffica",
  mg_raffica_regola: "Tocca più volte che puoi in 5 secondi.",
  mg_stop_nome: "Stop al centro",
  mg_stop_regola: "Tocca per fermare l'indicatore il più vicino possibile al centro.",

  // Partita
  campo: "Campo di gioco di {nome}",
  round: "Round {n} di {tot}",
  spareggio: "Spareggio",
  punteggio: "{a} {pa} - {pb} {b}",
  pronto: "Sono pronto",
  aspettoAltro: "Aspetto l'altro giocatore…",
  contoAlla: "{n}",
  zonaTocco: "Zona di tocco di {nome}",
  aspetta: "Aspetta…",
  ora: "ORA!",
  troppoPresto: "Troppo presto!",
  fermato: "Fermato!",
  tocchiTuoi: { one: "{n} tocco", other: "{n} tocchi" },
  secondiRimasti: "{s} s",
  inizioRaffica: "Tocca!",

  // Esito del round
  haiVinto: "Punto per te!",
  haiPerso: "Punto per {nome}",
  pari: "Pari: nessun punto",
  tu: "Tu",
  valMs: "{ms} ms",
  valAnticipo: "troppo presto",
  valNessuno: "nessun tocco",
  valTocchi: { one: "{n} tocco", other: "{n} tocchi" },
  valScarto: "scarto {p}%",
  dettaglio: "{chi}: {valore}",
  avanti: "Avanti",
  vediRisultato: "Risultato finale",

  // Fine
  vintoSfida: "Hai vinto la sfida!",
  persoSfida: "{nome} ha vinto la sfida",
  rivincita: "Rivincita",
  cambiaSfida: "Cambia sfida",
  esci: "Esci",
  esciAria: "Esci dalla sfida",
  esciChiedi: "Uscire dalla sfida?",
  resta: "Resta",

  // Errori (la logica restituisce solo il codice)
  errore_nessunMinigioco: "Scegli almeno un mini gioco.",
  errore_minigiocoSconosciuto: "Un mini gioco scelto non esiste più. Rifai la scelta.",
  errore_roundNonValidi: "Il numero di round non è valido.",
};
