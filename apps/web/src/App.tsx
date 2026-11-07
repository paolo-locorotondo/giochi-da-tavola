import { useEffect, useState, type MouseEvent, type ReactElement } from "react";
import { ImpostoreApp, manifest as impostore } from "@gdt/impostore";
import { LupusApp, manifest as lupus } from "@gdt/lupus";
import { TabuApp, manifest as tabu } from "@gdt/tabu";

import { Icona, type NomeIcona } from "./Icona";
import { Impostazioni, PulsanteRegolamento, type GiocoConRegole } from "./Impostazioni";

interface VoceGioco extends GiocoConRegole {
  descrizione: string;
  Componente: () => ReactElement;
}

const giochi: VoceGioco[] = [
  { ...impostore, Componente: ImpostoreApp },
  { ...lupus, Componente: LupusApp },
  { ...tabu, Componente: TabuApp },
];

/** Il gioco indicato dall'indirizzo: `/impostore`, `/impostore/ABC123`, ... */
function giocoDaPercorso(percorso: string): VoceGioco | undefined {
  const id = percorso.split("/")[1];
  return giochi.find((g) => g.id === id);
}

function usaPercorso(): [string, (a: string) => void] {
  const [percorso, setPercorso] = useState(window.location.pathname);
  useEffect(() => {
    const aggiorna = () => setPercorso(window.location.pathname);
    window.addEventListener("popstate", aggiorna);
    return () => window.removeEventListener("popstate", aggiorna);
  }, []);
  const vai = (a: string) => {
    window.history.pushState(null, "", a);
    setPercorso(a);
  };
  return [percorso, vai];
}

const ICONE_GIOCHI: Record<string, NomeIcona> = {
  impostore: "occhio-barrato",
  lupus: "luna",
  tabu: "divieto",
};

function Versione() {
  return <p className="versione">Giochi da tavola · v{__APP_VERSION__}</p>;
}

export function App() {
  const [percorso, vai] = usaPercorso();
  const gioco = giocoDaPercorso(percorso);

  const naviga = (a: string) => (e: MouseEvent) => {
    e.preventDefault();
    vai(a);
  };

  // Dentro un gioco con un livello interno (es. la modalità di Impostore) la freccia fa un passo indietro,
  // come il tasto del telefono; altrimenti riporta all'elenco dei giochi.
  const indietro = (e: MouseEvent) => {
    e.preventDefault();
    if ((window.history.state as { gdtModo?: string } | null)?.gdtModo) window.history.back();
    else vai("/");
  };

  if (gioco) {
    const { Componente } = gioco;
    return (
      <main className="app">
        <header className="barra-gioco">
          <a className="tema-btn" href="/" onClick={indietro} aria-label="Indietro">
            <Icona nome="indietro" />
          </a>
          <span className="barra-titolo">{gioco.nome}</span>
          <Impostazioni gioco={gioco} />
        </header>
        <Componente />
        <Versione />
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app-testata">
        <h1>Giochi da tavola</h1>
        <Impostazioni />
      </header>
      <ul className="lista-giochi">
        {giochi.map((g) => (
          <li key={g.id} className="riga-gioco">
            <a className="gioco" href={`/${g.id}`} onClick={naviga(`/${g.id}`)}>
              <span className="gioco-icona">
                <Icona nome={ICONE_GIOCHI[g.id] ?? "divieto"} dimensione={28} />
              </span>
              <span className="gioco-testo">
                <span className="gioco-nome">{g.nome}</span>
                <span className="muted">{g.descrizione}</span>
              </span>
            </a>
            <PulsanteRegolamento gioco={g} />
          </li>
        ))}
      </ul>
      <Versione />
    </main>
  );
}
