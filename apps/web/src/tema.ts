export type Tema = "dark" | "light";

const COLORE_BARRA: Record<Tema, string> = { dark: "#0e1a16", light: "#f3efe3" };

export function temaAttuale(): Tema {
  return document.documentElement.getAttribute("data-tema") === "light" ? "light" : "dark";
}

/** Applica il tema alla pagina e lo ricorda su questo telefono (se il browser lo permette). */
export function impostaTema(tema: Tema): void {
  document.documentElement.setAttribute("data-tema", tema);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLORE_BARRA[tema]);
  try {
    localStorage.setItem("gdt-tema", tema);
  } catch {
    // Archivio non disponibile (navigazione privata): il tema vale solo per questa visita.
  }
}
