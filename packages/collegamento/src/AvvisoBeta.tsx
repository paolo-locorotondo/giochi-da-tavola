import { Bug } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "./locales";
import "./sala-veloce.css";

/** Avviso in rosso sulla schermata iniziale di un gioco in beta testing (il manifest ha `beta: true`). */
export function AvvisoBetaTesto() {
  const t = usaT(dizionari);
  return (
    <p className="sv-beta" role="note">
      <Bug size={20} aria-hidden="true" />
      <span>{t("betaTesto")}</span>
    </p>
  );
}
