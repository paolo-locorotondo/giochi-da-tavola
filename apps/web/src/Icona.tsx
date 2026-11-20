import {
  ArrowLeft,
  ArrowUpDown,
  Ban,
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
  type LucideIcon,
} from "lucide-react";

/* Solo le icone usate: l'import per nome tiene fuori dal bundle tutte le altre. */
const ICONE = {
  sole: Sun,
  luna: Moon,
  "occhio-barrato": EyeOff,
  divieto: Ban,
  dadi: Dices,
  griglia: Grid3x3,
  fulmine: Zap,
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
