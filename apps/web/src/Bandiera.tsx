import type { Lingua } from "@gdt/i18n";

/**
 * Bandiere in SVG (le emoji delle bandiere su Windows si vedono come due lettere).
 * Sono le uniche cose con colori scritti a mano: i colori di una bandiera non sono quelli del tema.
 * Per una nuova lingua aggiungi qui la sua bandiera (il tipo Record fa dare errore se manca).
 */
const BANDIERE: Record<Lingua, JSX.Element> = {
  it: (
    <>
      <rect width="6" height="12" fill="#009246" />
      <rect x="6" width="6" height="12" fill="#ffffff" />
      <rect x="12" width="6" height="12" fill="#ce2b37" />
    </>
  ),
  en: (
    <>
      <rect width="18" height="12" fill="#012169" />
      <path d="M0 0 18 12M18 0 0 12" stroke="#ffffff" strokeWidth="2.4" />
      <path d="M0 0 18 12M18 0 0 12" stroke="#c8102e" strokeWidth="0.9" />
      <path d="M9 0v12M0 6h18" stroke="#ffffff" strokeWidth="4" />
      <path d="M9 0v12M0 6h18" stroke="#c8102e" strokeWidth="2.2" />
    </>
  ),
};

export function Bandiera({ lingua }: { lingua: Lingua }) {
  return (
    <svg className="bandiera" viewBox="0 0 18 12" width="24" height="16" aria-hidden="true" focusable="false">
      {BANDIERE[lingua]}
    </svg>
  );
}
