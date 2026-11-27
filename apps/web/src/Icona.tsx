import {
  ArrowLeft,
  ArrowUpDown,
  Ban,
  Bug,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Dices,
  EyeOff,
  Grid3x3,
  Moon,
  Search,
  Settings,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  Zap,
  createLucideIcon,
  type IconNode,
  type LucideIcon,
} from "lucide-react";

/* Mazzo di carte con il «1» sulla prima carta: distingue Ultima! dagli altri giochi di carte che arriveranno. Stesso tratto delle icone lucide (24×24, 2 px). */
const Carte = createLucideIcon("carte-con-uno", [
  ["rect", { x: 3, y: 6, width: 11, height: 15, rx: 2, key: "dietro" }],
  ["path", { d: "M17 8.5 20 9.2a2 2 0 0 1 1.5 2.4L19.2 20", key: "lato" }],
  ["path", { d: "M7 11l2-1.5V17", key: "uno" }],
]);

/*
 * Burraco e Scopa: due carte a ventaglio, con una lettera sulla prima (la «B» di Burraco, la «S» di Scopa).
 * Stessa carta, stessa seconda carta e stesso tratto delle icone lucide (24×24, 2 px): cambia solo la lettera,
 * così si riconoscono come due giochi della stessa famiglia.
 */
const CARTE_A_VENTAGLIO: IconNode = [
  ["rect", { x: 3, y: 5, width: 11, height: 15, rx: 2, key: "carta" }],
  ["path", { d: "M17.5 7.5l2.4.9a2 2 0 0 1 1.2 2.6L18.6 18", key: "ventaglio" }],
];

const LetteraB = createLucideIcon("carte-b", [
  ...CARTE_A_VENTAGLIO,
  ["path", { d: "M7.5 9.5v7M7.5 9.5h1.8a1.6 1.6 0 0 1 0 3.2H7.5M7.5 12.7h2.2a1.7 1.7 0 0 1 0 3.4 1.7 1.7 0 0 1 0 0H7.5", key: "b", strokeWidth: 1.5 }],
]);

const LetteraS = createLucideIcon("carte-s", [
  ...CARTE_A_VENTAGLIO,
  ["path", { d: "M10.4 10.3c-.5-.6-1.3-.9-2.1-.8-1.1.1-1.7.9-1.5 1.7.2.9 1 1.1 1.9 1.4.9.3 1.8.6 2 1.5.1.9-.6 1.7-1.8 1.8-1 .1-1.9-.3-2.4-1", key: "s", strokeWidth: 1.5 }],
]);

/* Solo le icone usate: l'import per nome tiene fuori dal bundle tutte le altre. */
const ICONE = {
  sole: Sun,
  luna: Moon,
  "occhio-barrato": EyeOff,
  divieto: Ban,
  dadi: Dices,
  griglia: Grid3x3,
  carte: Carte,
  "carte-s": LetteraS,
  "carte-b": LetteraB,
  fulmine: Zap,
  bug: Bug,
  indietro: ArrowLeft,
  impostazioni: Settings,
  regolamento: BookOpen,
  chiudi: X,
  cerca: Search,
  "volume-si": Volume2,
  "volume-no": VolumeX,
  "freccia-su": ChevronUp,
  "freccia-giu": ChevronDown,
  ordina: ArrowUpDown,
  wifi: Wifi,
  "wifi-barrato": WifiOff,
} satisfies Record<string, LucideIcon>;

export type NomeIcona = keyof typeof ICONE;

export function Icona({ nome, dimensione = 24 }: { nome: NomeIcona; dimensione?: number }) {
  const Componente = ICONE[nome];
  return <Componente size={dimensione} strokeWidth={2} aria-hidden="true" focusable="false" />;
}
