import type { Dizionari } from "@gdt/i18n";
import { en } from "./en";
import { it } from "./it";

/** Tutti i testi di Lupus per lingua. Per una lingua nuova: `locales/<lingua>.ts` e una riga qui. */
export const dizionari: Dizionari<typeof it> = { it, en };
