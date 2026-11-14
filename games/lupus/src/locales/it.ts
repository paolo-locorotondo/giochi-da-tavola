/** Testi di Lupus in italiano: è il dizionario di riferimento, le altre lingue devono avere le stesse chiavi. */
export const it = {
  // Elenco giochi e regolamento (l'app li mostra fuori dal gioco)
  nomeGioco: "Lupus in fabula",
  descrizioneGioco: "Il villaggio dorme, i lupi no. Il telefono fa da narratore.",
  regPasso1: "Ognuno vede in segreto il proprio ruolo. I lupi vedono i compagni.",
  regPasso2:
    "Notte: tutti chiudono gli occhi. Il narratore chiama il medico (dalla seconda notte protegge qualcuno, mai sé stesso), poi il gufo (indica un giocatore: sarà indiziato, o muore se il gufo è letale), poi il veggente (scopre se un giocatore è lupo), poi i lupi (scelgono una vittima). Alla fine della seconda notte il mitomane indica un giocatore e ne prende il ruolo se è lupo o veggente. Dalla seconda notte il medium sente se l'ultimo linciato era un lupo; la prima notte i massoni si riconoscono. La prima notte nessuno muore: i lupi si riconoscono soltanto.",
  regPasso3: "Giorno: si scopre chi è morto, poi si discute. Primo turno: votano tutti, anche i morti (fantasmi); i due più votati sono gli indiziati e fanno un'arringa.",
  regPasso4: "Secondo turno: votano in segreto solo i vivi non indiziati; il più votato è linciato. Nei pareggi vince chi siede più vicino, in senso orario, a chi ha il «Benvenuto!» (l'ultimo morto, il primo giorno il narratore). I morti non parlano più.",
  regPasso5: "Vincono i contadini se muoiono tutti i lupi, i lupi quando sono almeno quanti gli altri vivi. Il criceto mannaro, se è vivo alla fine, vince da solo.",
  regNota1:
    "Si gioca da 8 a 24 persone. Ruoli: 2 lupi (3 da 16 giocatori), 1 veggente, poi, dal numero minimo di giocatori e togliendoli o aggiungendoli prima di iniziare: medium (9), indemoniato (10), medico (11), gufo (12; letale da 20), due massoni (13), criceto mannaro (15), mitomane (16); il resto contadini.",
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
  vNotte: "Notte {notte}. Il villaggio si addormenta. Tutti chiudono gli occhi.",
  vLupi: "I lupi si risvegliano e scelgono chi sbranare.",
  vLupiPrima: "I lupi si risvegliano e si riconoscono. Questa notte nessuno viene sbranato.",
  vVeggente: "Il veggente si risveglia e indica un giocatore da esaminare.",
  vMedico: "Il medico si risveglia e sceglie chi proteggere.",
  vAlbaMorto: "Il villaggio si risveglia. Questa notte è morto {nome}.{ruolo}",
  vAlbaNessuno: "Il villaggio si risveglia. Questa notte non è morto nessuno.",
  vAlbaMorti: "Il villaggio si risveglia. Questa notte sono morti {nomi}.{ruolo}",
  vVoto: "Primo turno: votano tutti, anche i fantasmi. I due più votati saranno gli indiziati.",
  vFineVillaggio: "Il villaggio ha vinto!",
  vFineLupi: "I lupi hanno vinto!",
  vFineCriceto: "Il criceto mannaro ha vinto, da solo!",

  // Configurazione
  giocatoriLabel: "Giocatori (uno per riga, da {min} a {max})",
  placeholderNomi: "Anna\nLuca\nMarco\nSara\nElena\nPaolo\nGiulia\nMatteo",
  ordineOrario:
    "Scrivi i nomi in senso orario, partendo da chi siede dopo il narratore: in caso di parità vince chi è più vicino a lui.",
  ruoliLupi: { one: "{n} lupo", other: "{n} lupi" },
  ruoliContadini: { one: "{n} contadino", other: "{n} contadini" },
  ruoliElenco: "Ruoli: {elenco}.",
  composizioneTitolo: "Personaggi della partita",
  conSpeciale: "Con il {ruolo}",
  ruoliAutomatici: "I ruoli vengono assegnati in automatico in base al numero di giocatori.",
  primaNotteSenzaVittima: "La prima notte nessuno muore (i lupi si riconoscono soltanto)",
  svelaRuoli: "Il narratore dice il ruolo di chi muore",
  narratoreGioca:
    "Il narratore gioca (il telefono resta al centro e non compare l'elenco dei giocatori con ruoli e stato vivo/morto)",
  narratoreNonGioca:
    "Il narratore non gioca (il telefono lo tiene il narratore, che avrà a supporto l'elenco dei giocatori con ruoli e stato vivo/morto)",
  inizia: "Inizia",
  errNomeVuoto: "Il giocatore al posto {posto} non ha un nome",
  errNomeDuplicato: "Nome duplicato: {nome}",
  errPochi: "Servono almeno {minimo} giocatori",
  errTanti: "Al massimo {massimo} giocatori",

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
  lupiSiRiconoscono: "Prima notte: i lupi si guardano e si riconoscono. Nessuno viene sbranato.",
  notteOcchiChiusi: "Notte {notte} — tutti a occhi chiusi",
  soloChiHaRuolo: "Solo chi ha il ruolo tocca il telefono.",
  eUnLupo: "È un lupo!",
  nonELupo: "Non è un lupo.",
  eUnCriceto: "È un criceto mannaro: morirà insieme allo sbranato dai lupi.",

  // Medium e massoni
  titoloGufo: "Il gufo indica",
  fineGufo: "Conferma e torna a dormire",
  gufoNota: "Chi indichi sarà tra gli indiziati del primo turno.",
  gufoLetaleNota: "Gufo Letale: chi indichi muore all'alba, a meno che sia un lupo o un criceto mannaro.",
  vGufo: "Il gufo si risveglia e indica un giocatore.",
  arringheGufato: "{nome} è stato gufato.",
  titoloMitomane: "Il mitomane sceglie chi imitare",
  fineMitomane: "Ho capito, torna a dormire",
  mitomaneNota: "Una volta sola: se indichi un lupo diventi lupo, se indichi il veggente diventi veggente, altrimenti resti umano.",
  mitomaneLupo: "Ora sei un lupo.",
  mitomaneVeggente: "Ora sei il veggente.",
  mitomaneUmano: "Non cambia nulla: resti un umano senza poteri.",
  vMitomane: "Il mitomane si risveglia e sceglie chi imitare.",
  titoloMedium: "Il medium ascolta lo spirito",
  fineMedium: "Ho capito, torna a dormire",
  mediumLupo: "Lo spirito di {nome} era un lupo.",
  mediumNonLupo: "Lo spirito di {nome} non era un lupo.",
  titoloMassoni: "I massoni si riconoscono",
  fineMassoni: "Ho visto, tornate a dormire",
  massoniSono: "I massoni sono: {nomi}.",
  massoniNessuno: "In questa partita non ci sono massoni vivi da mostrare.",
  vMedium: "Il medium si risveglia e ascolta lo spirito dell'ultimo linciato.",
  vMassoni: "I massoni si risvegliano e si riconoscono.",

  // Alba
  albaTitolo: "Il villaggio si risveglia",
  albaMorto: "Questa notte è morto {nome}.",
  albaNessuno: "Questa notte non è morto nessuno.",
  albaMorti: "Questa notte sono morti {nomi}.",
  vediRisultato: "Vedi il risultato",
  discuteVota: "Si discute e si vota",

  // Voto
  votazione: "Votazione",
  votoIstruzioni: "Ognuno, vivo o fantasma, vota a voce un giocatore vivo; segna i voti qui sotto ({totale}/{votanti}).",
  // Giorno: discussione, due turni di voto
  discussioneTitolo: "Si discute",
  discussioneTesto: "I vivi discutono su chi possa essere un lupo. I morti non parlano.",
  avviaTimer: "Avvia il timer di 3 minuti",
  tempoRimasto: "Tempo rimasto: {tempo}",
  tempoFinito: "Tempo scaduto: si vota.",
  vaiAlVoto: "Al primo turno di voto",
  primoTurno: "Primo turno",
  chiudiPrimoTurno: "Scopri gli indiziati",
  arringheTitolo: "Gli indiziati",
  arringheTesto: "{nomi} fanno ciascuno la propria arringa. Poi si vota.",
  arringheUno: "{a} fa la propria arringa. Poi si vota.",
  vaiSecondoTurno: "Al secondo turno di voto",
  secondoTurno: "Secondo turno",
  secondoIstruzioni:
    "Votano solo i vivi non indiziati: insieme, in segreto (es. a occhi chiusi, alzando la mano). Il narratore segna i voti ({totale}/{votanti}).",
  chiudiSecondoTurno: "Chiudi la votazione",
  paritaBenvenuto: "Pareggio: vince chi è più vicino al «Benvenuto!» ({nome}).",
  narratoreBenvenuto: "il narratore",
  vDiscussione: "Il villaggio si risveglia e discute.",
  vArringhe: "Gli indiziati sono {nomi}. A voi la parola.",
  vSecondoTurno: "Secondo turno. Votano solo i vivi non indiziati, tutti insieme.",
  vLinciato: "{nome} viene linciato.{ruolo}",
  meno: "−",
  piu: "+",

  // Esito e fine
  eliminatoTitolo: "{nome} è eliminato",
  scendeNotte: "Scende la notte",
  vinceVillaggio: "Vince il villaggio!",
  vinconoLupi: "Vincono i lupi!",
  vinceCriceto: "Vince il criceto mannaro!",
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
