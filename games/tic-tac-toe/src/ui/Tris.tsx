import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { TrisLocale } from "./TrisLocale";
import { TrisOnline } from "./online/TrisOnline";

type Modo = "scelta" | "locale" | "online";

/** Indirizzo `/tris/CODICE`: il codice porta direttamente nella partita online. */
function codiceDaIndirizzo(): string | null {
  const parti = window.location.pathname.split("/");
  return parti[2] ? parti[2].toUpperCase() : null;
}

/** La modalità scelta sta nella cronologia: il tasto indietro torna a «Come giocate?». */
function modoDaCronologia(): Modo | null {
  return (window.history.state as { gdtModo?: Modo } | null)?.gdtModo ?? null;
}

export function TrisApp() {
  const t = usaT(dizionari);
  const [codice] = useState(codiceDaIndirizzo);
  const [modo, setModo] = useState<Modo>(() => modoDaCronologia() ?? (codice ? "online" : "scelta"));

  useEffect(() => {
    const aggiorna = () => setModo(modoDaCronologia() ?? (codiceDaIndirizzo() ? "online" : "scelta"));
    window.addEventListener("popstate", aggiorna);
    return () => window.removeEventListener("popstate", aggiorna);
  }, []);

  const scegli = (m: "locale" | "online") => {
    window.history.pushState({ gdtModo: m }, "", window.location.pathname);
    setModo(m);
  };

  const passaALocale = () => {
    window.history.replaceState({ gdtModo: "locale" }, "", "/tris");
    setModo("locale");
  };

  if (modo === "locale") return <TrisLocale />;
  if (modo === "online") return <TrisOnline codiceIniziale={codice} onLocale={passaALocale} />;

  return (
    <section className="schermata scelta-modo">
      <h2>{t("comeGiocate")}</h2>
      <button type="button" className="modo" onClick={() => scegli("locale")}>
        <span className="modo-icona modo-icona--locale">
          <WifiOff size={28} aria-hidden="true" />
        </span>
        <span className="modo-testo">
          <span className="modo-nome">{t("unTelefono")}</span>
          <span className="modo-desc">{t("unTelefonoDesc")}</span>
        </span>
      </button>
      <button type="button" className="modo" onClick={() => scegli("online")}>
        <span className="modo-icona modo-icona--online">
          <Wifi size={28} aria-hidden="true" />
        </span>
        <span className="modo-testo">
          <span className="modo-nome">{t("ognunoIlSuo")}</span>
          <span className="modo-desc">{t("ognunoIlSuoDesc")}</span>
        </span>
      </button>
    </section>
  );
}
