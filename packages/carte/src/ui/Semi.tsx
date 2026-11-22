import type { Seme } from "../tipi";

/** Forme dei semi, disegnate in proprio su un riquadro 24×24. Prendono il colore da `currentColor`. */
export function SimboloSeme({ seme, className }: { seme: Seme; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {FORME[seme]}
    </svg>
  );
}

/** Il seme come gruppo SVG centrato in (cx, cy) con lato `lato`, per i disegni composti (semi in fila). */
export function FormaSeme({ seme, cx, cy, lato, ruota = false }: { seme: Seme; cx: number; cy: number; lato: number; ruota?: boolean }) {
  const k = lato / 24;
  return (
    <g transform={`translate(${cx - lato / 2} ${cy - lato / 2}) scale(${k})${ruota ? " rotate(180 12 12)" : ""}`}>{FORME[seme]}</g>
  );
}

export function Stella({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.2l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.1l-6 3.5 1.3-6.7-5-4.7 6.8-.8z" fill="currentColor" />
    </svg>
  );
}

export function Spunta({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FORME: Record<Seme, JSX.Element> = {
  cuori: (
    <path
      fill="currentColor"
      d="M12 21.5C12 21.5 2.8 15 2.8 8.7C2.8 5.6 5.2 3.5 7.9 3.5C9.7 3.5 11.2 4.4 12 5.8C12.8 4.4 14.3 3.5 16.1 3.5C18.8 3.5 21.2 5.6 21.2 8.7C21.2 15 12 21.5 12 21.5Z"
    />
  ),
  quadri: <path fill="currentColor" d="M12 1.8L20.5 12L12 22.2L3.5 12Z" />,
  fiori: (
    <g fill="currentColor">
      <circle cx="12" cy="7" r="4.6" />
      <circle cx="6.6" cy="13.4" r="4.6" />
      <circle cx="17.4" cy="13.4" r="4.6" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 11L8.8 22.2H15.2Z" />
    </g>
  ),
  picche: (
    <path
      fill="currentColor"
      d="M12 1.8C12 1.8 2.8 8.6 2.8 14.2C2.8 17 5 18.9 7.5 18.9C9.3 18.9 10.8 18 11.5 16.7C11.4 19.1 10.6 20.7 8.8 22.2H15.2C13.4 20.7 12.6 19.1 12.5 16.7C13.2 18 14.7 18.9 16.5 18.9C19 18.9 21.2 17 21.2 14.2C21.2 8.6 12 1.8 12 1.8Z"
    />
  ),
  // Moneta: bordo, cerchio interno e punto centrale.
  denari: (
    <g>
      <circle cx="12" cy="12" r="9.6" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
    </g>
  ),
  // Coppa: calice con stelo e base.
  coppe: (
    <path
      fill="currentColor"
      d="M4.6 2.6H19.4C19.4 8.6 16.4 12.6 12.9 13.3V19H16.8V21.6H7.2V19H11.1V13.3C7.6 12.6 4.6 8.6 4.6 2.6Z"
    />
  ),
  // Spada: lama, guardia, impugnatura e pomo.
  spade: (
    <g fill="currentColor">
      <path d="M12 1.2L14.4 4.8V14.2H9.6V4.8Z" />
      <rect x="4.8" y="14.2" width="14.4" height="2.6" rx="1.1" />
      <rect x="10.6" y="16.8" width="2.8" height="4" />
      <circle cx="12" cy="21.8" r="1.7" />
    </g>
  ),
  // Bastone: randello nodoso in diagonale, più grosso in cima, con due rami tagliati.
  bastoni: (
    <g fill="currentColor" transform="rotate(32 12 12)">
      <path d="M12 1.4C14.6 1.4 15.6 3.2 15.3 5.4L13.9 21.4C13.8 22.6 10.2 22.6 10.1 21.4L8.7 5.4C8.4 3.2 9.4 1.4 12 1.4Z" />
      <path d="M14.6 8.2L18.4 6.6C19.3 6.3 19.8 7.5 19 8L15.2 10.6Z" />
      <path d="M9.3 13.4L5.6 12C4.7 11.7 4.2 12.9 5 13.4L9 15.6Z" />
    </g>
  ),
};
