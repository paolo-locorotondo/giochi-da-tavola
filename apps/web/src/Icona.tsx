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
  type LucideIcon,
} from "lucide-react";

/* Mazzo di carte con il «1» sulla prima carta: distingue Ultima! dagli altri giochi di carte che arriveranno. Stesso tratto delle icone lucide (24×24, 2 px). */
const Carte = createLucideIcon("carte-con-uno", [
  ["rect", { x: 3, y: 6, width: 11, height: 15, rx: 2, key: "dietro" }],
  ["path", { d: "M17 8.5 20 9.2a2 2 0 0 1 1.5 2.4L19.2 20", key: "lato" }],
  ["path", { d: "M7 11l2-1.5V17", key: "uno" }],
]);

/* Scopa: due carte a ventaglio con un rametto di scopa davanti. Stesso tratto delle icone lucide (24×24, 2 px). */
const Ventaglio = createLucideIcon("carte-a-ventaglio", [
  ["rect", { x: 3, y: 4, width: 10, height: 14, rx: 2, transform: "rotate(-12 8 11)", key: "sinistra" }],
  ["path", { d: "M14 4.5 18.5 5.6a2 2 0 0 1 1.4 2.4L18 15", key: "destra" }],
  ["path", { d: "M10 21 20 11", key: "manico" }],
  ["path", { d: "M10 21l-1-4M10 21l4 1M10 21l-3-1", key: "rametti" }],
]);

/* Burraco: due carte aperte a ventaglio, una con l'asso (A) e il seme a punta: diverse dal mazzo con il «1» di Ultima!. */
const AssoESette = createLucideIcon("asso-e-sette", [
  ["rect", { x: 3, y: 5, width: 11, height: 15, rx: 2, key: "carta" }],
  ["path", { d: "M17.5 7.5l2.4.9a2 2 0 0 1 1.2 2.6L18.6 18", key: "ventaglio" }],
  ["path", { d: "M6.2 15l2.3-6 2.3 6M7 13h3", key: "a" }],
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
  ventaglio: Ventaglio,
  "asso-e-sette": AssoESette,
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
