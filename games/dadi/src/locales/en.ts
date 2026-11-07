import type { Dizionario } from "@gdt/i18n";
import type { it } from "./it";

export const en: Dizionario<typeof it> = {
  nome: "Dice",
  descrizione: "Flip a coin or roll a die, or make a die with the values you want.",
  regolamentoPassi: [
    "Choose the coin or a die (D4, D6, D8, D10, D12, D20).",
    "Or write a custom die: one value per line, for example “Yes”, “No”, “Maybe”.",
    "If there are two values, the die becomes a coin.",
    "Tap Roll: the result is random and the roll is shown with an animation.",
  ],
  regolamentoNote: ["The roll uses the phone's random generator, with equal chance for every face."],
  sceltaDado: "What do you roll?",
  personalizzato: "Custom",
  valoriPersonalizzati: "Values, one per line",
  valoriAiuto: "At least two different values, up to {max} characters each. With two values the die becomes a coin.",
  valoriInsufficienti: "At least two different values are needed.",
  lancia: "Roll",
  inLancio: "Rolling…",
  risultato: "Result: {faccia}",
  ultimi: "Last rolls",
  nessunLancio: "No rolls yet. Tap Roll to start.",
  cancellaLanci: "Clear rolls",
  dado: "Die",
  moneta: "Coin",
};
