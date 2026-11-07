/** Testi di Lupus in italiano: è il dizionario di riferimento, le altre lingue devono avere le stesse chiavi. */
export const it = {
  // Elenco giochi e regolamento (l'app li mostra fuori dal gioco)
  nomeGioco: "Lupus in fabula",
  descrizioneGioco: "Il villaggio dorme, i lupi no. Il telefono fa da narratore.",
  regPasso1: "Ognuno vede in segreto il proprio ruolo. I lupi vedono i compagni.",
  regPasso2:
    "Notte: tutti chiudono gli occhi. Il narratore chiama i lupi (scelgono una vittima, non un lupo), poi il veggente (scopre se un giocatore è lupo), poi il medico (protegge qualcuno, non lo stesso due notti di fila).",
  regPasso3: "Giorno: si scopre chi è morto (e il suo ruolo). Si discute e si vota: devono votare tutti i vivi.",
  regPasso4: "Pareggio: ballottaggio tra i pari merito; se pareggiano ancora nessuno viene eliminato.",
  regPasso5: "Vincono i contadini se muoiono tutti i lupi, i lupi quando sono almeno quanti gli altri vivi.",
  regNota1:
    "Ruoli: 1 lupo ogni 4 giocatori (arrotondato), veggente da 5 giocatori, medico da 7, il resto contadini. Servono almeno 4 persone.",
  regNota2: "Regole del gioco classico: esistono varianti.",

  // Impostazioni del gioco
  impTransizione: "Schermata di transizione",
  impTransizioneAiuto:
    "Tra un ruolo e l'altro e tra notte e giorno: il tempo per tornare a dormire senza vedere la schermata dopo.",
  impNo: "No",
  impSecondi: "{n} s",

  // Cornice della partita
  voceNarratore: "Voce del narratore",
  audioSpento: " (audio spento nelle impostazioni)",
  ruoliNarratoreTitolo: "Giocatori e ruoli ({vivi} vivi su {tot})",
  soloNarratore: "Solo per il narratore: non mostrare lo schermo agli altri.",
  statoRuolo: "{ruolo} · {stato}",
  vivo: "vivo",
  morto: "morto",
  eraRuolo: "Era {ruolo}.",

  // Cosa dice il narratore a voce
  vLupi:
    "Notte {notte}. Il villaggio si addormenta. Tutti chiudono gli occhi. I lupi si risvegliano e scelgono chi sbranare.",
  vVeggente: "I lupi tornano a dormire. Il veggente si risveglia e indica un giocatore da esaminare.",
  vMedico: "Il veggente torna a dormire. Il medico si risveglia e sceglie chi proteggere.",
  vAlbaMorto: "Il villaggio si risveglia. Questa notte è morto {nome}.{ruolo}",
  vAlbaNessuno: "Il villaggio si risveglia. Questa notte non è morto nessuno.",
  vBallottaggio: "Ballottaggio. Votate tra i giocatori in parità.",
  vVoto: "È ora di discutere e votare chi eliminare.",
  vEliminato: "{nome} è stato eliminato.{ruolo}",
  vFineVillaggio: "Il villaggio ha vinto!",
  vFineLupi: "I lupi hanno vinto!",

  // Esito del voto senza eliminati
  esitoPareggio: "Pareggio: ballottaggio tra i pari merito.",
  esitoAncoraPari: "Ancora pari: nessuno viene eliminato.",

  // Configurazione
  giocatoriLabel: "Giocatori (uno per riga, almeno 4)",
  placeholderNomi: "Anna\nLuca\nMarco\nSara",
  ruoliLupi: "{n} lupo/i",
  ruoliVeggente: "1 veggente",
  ruoliMedico: "1 medico",
  ruoliElenco: "Ruoli: {elenco}, il resto contadini.",
  ruoliAutomatici: "I ruoli vengono assegnati in automatico in base al numero di giocatori.",
  svelaRuoli: "Il narratore dice il ruolo di chi muore",
  narratoreGioca:
    "Il narratore gioca (il telefono resta al centro e non compare l'elenco dei giocatori con ruoli e stato vivo/morto)",
  narratoreNonGioca:
    "Il narratore non gioca (il telefono lo tiene il narratore, che avrà a supporto l'elenco dei giocatori con ruoli e stato vivo/morto)",
  inizia: "Inizia",
  errNomeVuoto: "Il giocatore al posto {posto} non ha un nome",
  errNomeDuplicato: "Nome duplicato: {nome}",
  errPochi: "Servono almeno {minimo} giocatori",

  // Distribuzione delle carte
  cartaDi: "Carta {n} di {tot}",
  passaA: "Passa il telefono a",
  mostraRuolo: "Mostra il mio ruolo",
  guardaSoloTu: "{nome}, guarda solo tu",
  compagni: "Compagni: {nomi}",
  hoVistoPassa: "Ho visto, passa il telefono",

  // Notte
  titoloLupi: "I lupi scelgono la vittima",
  titoloVeggente: "Il veggente indaga",
  titoloMedico: "Il medico protegge",
  fineLupi: "Conferma e torna a dormire",
  fineVeggente: "Ho visto, torna a dormire",
  fineMedico: "Conferma e torna a dormire",
  notteOcchiChiusi: "Notte {notte} — tutti a occhi chiusi",
  soloChiHaRuolo: "Solo chi ha il ruolo tocca il telefono.",
  eUnLupo: "È un lupo!",
  nonELupo: "Non è un lupo.",

  // Alba
  albaTitolo: "Il villaggio si risveglia",
  albaMorto: "Questa notte è morto {nome}.",
  albaNessuno: "Questa notte non è morto nessuno.",
  vediRisultato: "Vedi il risultato",
  discuteVota: "Si discute e si vota",

  // Voto
  ballottaggio: "Ballottaggio",
  votazione: "Votazione",
  votoIstruzioni:
    "Ognuno vota a voce un giocatore; segna i voti qui sotto. Devono votare tutti i vivi ({totale}/{vivi}).",
  paritaTra: "Pareggio tra {nomi}.",
  vaiBallottaggio: "Vai al ballottaggio",
  chiudiVotazione: "Chiudi la votazione",
  meno: "−",
  piu: "+",

  // Esito e fine
  eliminatoTitolo: "{nome} è eliminato",
  scendeNotte: "Scende la notte",
  vinceVillaggio: "Vince il villaggio!",
  vinconoLupi: "Vincono i lupi!",
  ruoloDi: "{nome}: {ruolo}",
  nuovaPartita: "Nuova partita",

  // Chiusura della partita
  chiudiPartita: "Chiudi la partita",
  chiudereConferma: "Chiudere la partita? Si perde lo stato attuale.",
  siChiudi: "Sì, chiudi",
  noContinua: "No, continua",

  // Transizioni
  trOcchiChiusi: "Occhi chiusi",
  trLasciaTelefono: "Chi ha appena toccato il telefono lo lascia al centro e torna a dormire.",
  trProssimo: "Il narratore sta per chiamare il prossimo.",
  trAlba: "Il villaggio si risveglia",
  trApriGliOcchi: "Tutti possono aprire gli occhi.",
  trRaccontare: "Il narratore sta per raccontare cosa è successo nella notte.",
} as const;
