import { useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { ImpostoreLocale } from "./ImpostoreApp";
import { ImpostoreOnline } from "./online/ImpostoreOnline";

/** Indirizzo `/impostore/CODICE`: il codice porta direttamente nella partita online. */
function codiceDaIndirizzo(): string | null {
  const parti = window.location.pathname.split("/");
  return parti[2] ? parti[2].toUpperCase() : null;
}

export function ImpostoreApp() {
  const [codice] = useState(codiceDaIndirizzo);
  const [modo, setModo] = useState<"scelta" | "locale" | "online">(codice ? "online" : "scelta");

  const passaALocale = () => {
    // Se si era in /impostore/CODICE, torna all'indirizzo base.
    window.history.replaceState(null, "", "/impostore");
    setModo("locale");
  };

  if (modo === "locale") return <ImpostoreLocale />;
  if (modo === "online") return <ImpostoreOnline codiceIniziale={codice} onLocale={passaALocale} />;

  return (
    <section className="schermata scelta-modo">
      <h2>Come giocate?</h2>
      <button type="button" className="modo" onClick={() => setModo("locale")}>
        <span className="modo-icona modo-icona--locale">
          <WifiOff size={28} aria-hidden="true" />
        </span>
        <span className="modo-testo">
          <span className="modo-nome">Un solo telefono</span>
          <span className="modo-desc">Il telefono passa di mano. Anche offline.</span>
        </span>
      </button>
      <button type="button" className="modo" onClick={() => setModo("online")}>
        <span className="modo-icona modo-icona--online">
          <Wifi size={28} aria-hidden="true" />
        </span>
        <span className="modo-testo">
          <span className="modo-nome">Ognuno col suo telefono</span>
          <span className="modo-desc">Serve internet, oppure il WiFi del server di gioco.</span>
        </span>
      </button>
    </section>
  );
}
