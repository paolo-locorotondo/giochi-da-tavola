import type { Dizionari, Traduttore } from "@gdt/i18n";
import { en } from "./en";
import { it } from "./it";

export const dizionari: Dizionari<typeof it> = { it, en };
export type T = Traduttore<typeof it>;
