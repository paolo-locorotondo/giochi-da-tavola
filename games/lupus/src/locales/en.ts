import type { Dizionario } from "@gdt/i18n";
import type { it } from "./it";

/** English texts for Lupus (Werewolf). Same keys as the Italian dictionary, or it won't compile. */
export const en: Dizionario<typeof it> = {
  nomeGioco: "Werewolf",
  descrizioneGioco: "The village sleeps, the wolves don't. The phone is the narrator.",
  regPasso1: "Everyone secretly sees their own role. The werewolves see their pack.",
  regPasso2:
    "Night: everyone closes their eyes. The narrator calls the werewolves (they pick a victim, never a werewolf), then the seer (finds out whether a player is a werewolf), then the doctor (protects someone, never the same person two nights in a row).",
  regPasso3: "Day: the village learns who died (and their role). Discuss and vote: every living player must vote.",
  regPasso4: "Tie: runoff between the tied players; if they tie again, nobody is eliminated.",
  regPasso5:
    "The villagers win when all the werewolves are dead; the werewolves win when they are at least as many as the other living players.",
  regNota1:
    "Roles: 1 werewolf for every 4 players (rounded), a seer from 5 players, a doctor from 7, the rest villagers. At least 4 players needed.",
  regNota2: "These are the rules of the classic game: there are many variants.",

  impTransizione: "Transition screen",
  impTransizioneAiuto:
    "Between one role and the next, and between night and day: time to go back to sleep without seeing the next screen.",
  impNo: "No",
  impSecondi: "{n} s",

  voceNarratore: "Narrator voice",
  audioSpento: " (sound is off in settings)",
  ruoliNarratoreTitolo: "Players and roles ({vivi} alive out of {tot})",
  soloNarratore: "For the narrator only: don't show the screen to the others.",
  statoRuolo: "{ruolo} · {stato}",
  vivo: "alive",
  morto: "dead",
  eraRuolo: "They were a {ruolo}.",

  vLupi:
    "Night {notte}. The village falls asleep. Everyone closes their eyes. The werewolves wake up and choose who to devour.",
  vVeggente: "The werewolves go back to sleep. The seer wakes up and points at a player to examine.",
  vMedico: "The seer goes back to sleep. The doctor wakes up and chooses who to protect.",
  vAlbaMorto: "The village wakes up. Last night {nome} died.{ruolo}",
  vAlbaNessuno: "The village wakes up. Nobody died last night.",
  vBallottaggio: "Runoff. Vote among the tied players.",
  vVoto: "Time to discuss and vote on who to eliminate.",
  vEliminato: "{nome} has been eliminated.{ruolo}",
  vFineVillaggio: "The village has won!",
  vFineLupi: "The werewolves have won!",

  esitoPareggio: "Tie: runoff between the tied players.",
  esitoAncoraPari: "Tied again: nobody is eliminated.",

  giocatoriLabel: "Players (one per line, at least 4)",
  placeholderNomi: "Anna\nLuke\nMark\nSara",
  ruoliLupi: { one: "{n} werewolf", other: "{n} werewolves" },
  ruoliVeggente: "1 seer",
  ruoliMedico: "1 doctor",
  ruoliElenco: "Roles: {elenco}, the rest villagers.",
  ruoliAutomatici: "Roles are assigned automatically based on the number of players.",
  svelaRuoli: "The narrator reveals the role of whoever dies",
  narratoreGioca:
    "The narrator plays (the phone stays in the middle and the list of players with roles and alive/dead status is hidden)",
  narratoreNonGioca:
    "The narrator doesn't play (the narrator holds the phone, with the list of players, roles and alive/dead status as support)",
  inizia: "Start",
  errNomeVuoto: "The player at seat {posto} has no name",
  errNomeDuplicato: "Duplicate name: {nome}",
  errPochi: "At least {minimo} players are needed",

  cartaDi: "Card {n} of {tot}",
  passaA: "Pass the phone to",
  mostraRuolo: "Show my role",
  guardaSoloTu: "{nome}, only you look",
  compagni: "Pack: {nomi}",
  hoVistoPassa: "Seen, pass the phone on",

  titoloLupi: "The werewolves choose the victim",
  titoloVeggente: "The seer investigates",
  titoloMedico: "The doctor protects",
  fineLupi: "Confirm and go back to sleep",
  fineVeggente: "Seen, go back to sleep",
  fineMedico: "Confirm and go back to sleep",
  notteOcchiChiusi: "Night {notte} — everyone has their eyes closed",
  soloChiHaRuolo: "Only the player with this role touches the phone.",
  eUnLupo: "A werewolf!",
  nonELupo: "Not a werewolf.",

  albaTitolo: "The village wakes up",
  albaMorto: "Last night {nome} died.",
  albaNessuno: "Nobody died last night.",
  vediRisultato: "See the result",
  discuteVota: "Discuss and vote",

  ballottaggio: "Runoff",
  votazione: "Vote",
  votoIstruzioni:
    "Everyone votes aloud for one player; tally the votes below. Every living player must vote ({totale}/{vivi}).",
  paritaTra: "Tie between {nomi}.",
  vaiBallottaggio: "Go to the runoff",
  chiudiVotazione: "Close the vote",
  meno: "−",
  piu: "+",

  eliminatoTitolo: "{nome} is eliminated",
  scendeNotte: "Night falls",
  vinceVillaggio: "The village wins!",
  vinconoLupi: "The werewolves win!",
  ruoloDi: "{nome}: {ruolo}",
  nuovaPartita: "New game",

  chiudiPartita: "End the game",
  chiudereConferma: "End the game? The current state will be lost.",
  siChiudi: "Yes, end it",
  noContinua: "No, keep playing",

  trOcchiChiusi: "Eyes closed",
  trLasciaTelefono: "Whoever just touched the phone leaves it in the middle and goes back to sleep.",
  trProssimo: "The narrator is about to call the next one.",
  trAlba: "The village wakes up",
  trApriGliOcchi: "Everyone can open their eyes.",
  trRaccontare: "The narrator is about to tell what happened during the night.",
};
