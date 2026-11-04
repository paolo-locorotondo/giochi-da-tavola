import { useState } from "react";
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
    <section className="schermata">
      <h2>Come giocate?</h2>
      <button className="btn primario" onClick={() => setModo("locale")}>
        Un solo telefono
        <br />
        <small>Il telefono passa di mano. Anche offline.</small>
      </button>
      <button className="btn primario" onClick={() => setModo("online")}>
        Ognuno col suo telefono
        <br />
        <small>Serve internet, oppure il WiFi del server di gioco.</small>
      </button>
    </section>
  );
}
