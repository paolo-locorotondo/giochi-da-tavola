import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { AvvisoBetaTesto } from "@gdt/collegamento";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { BurracoLocale } from "./BurracoLocale";
import { BurracoOnline } from "./BurracoOnline";
import "./burraco.css";

type Modo = "scelta" | "locale" | "online";

/** Indirizzo `/burraco/CODICE`: il codice porta direttamente nella partita online. */
function codiceDaIndirizzo(): string | null {
  const parti = window.location.pathname.split("/");
  return parti[2] ? parti[2].toUpperCase() : null;
}

/** La modalità scelta sta nella cronologia: il tasto indietro torna a «Come giocate?». */
function modoDaCronologia(): Modo | null {
  return (window.history.state as { gdtModo?: Modo } | null)?.gdtModo ?? null;
}

/** Un telefono contro i bot (anche offline), oppure ognuno col suo telefono (online). */
export function BurracoApp() {
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
    window.history.replaceState({ gdtModo: "locale" }, "", "/burraco");
    setModo("locale");
  };

  if (modo === "locale") return <BurracoLocale />;
  if (modo === "online") return <BurracoOnline codiceIniziale={codice} onLocale={passaALocale} />;

  return (
    <section className="schermata scelta-modo">
      <AvvisoBetaTesto />
      <h2>{t("comeGiocate")}</h2>
      <button type="button" className="modo" onClick={() => scegli("locale")}>
        <span className="modo-icona modo-icona--locale">
          <WifiOff size={28} aria-hidden="true" />
        </span>
        <span className="modo-testo">
          <span className="modo-nome">{t("controBot")}</span>
          <span className="modo-desc">{t("controBotDesc")}</span>
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
