import { useEffect, useState, type MouseEvent, type ReactElement } from "react";
import { ImpostoreApp, manifest as impostore } from "@gdt/impostore";
import { LupusApp, manifest as lupus } from "@gdt/lupus";
import { TabuApp, manifest as tabu } from "@gdt/tabu";

import { Icona, type NomeIcona } from "./Icona";
import { impostaTema, temaAttuale, type Tema } from "./tema";

interface VoceGioco {
  id: string;
  nome: string;
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

function InterruttoreTema() {
  const [tema, setTema] = useState<Tema>(temaAttuale);
  const scuro = tema === "dark";
  return (
    <button
      type="button"
      className="tema-btn"
      aria-label={scuro ? "Passa al tema chiaro" : "Passa al tema scuro"}
      onClick={() => {
        const nuovo: Tema = scuro ? "light" : "dark";
        impostaTema(nuovo);
        setTema(nuovo);
      }}
    >
      <Icona nome={scuro ? "sole" : "luna"} />
    </button>
  );
}

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

  if (gioco) {
    const { Componente } = gioco;
    return (
      <main className="app">
        <header className="barra-gioco">
          <a className="tema-btn" href="/" onClick={naviga("/")} aria-label="Torna ai giochi">
            <Icona nome="indietro" />
          </a>
          <span className="barra-titolo">{gioco.nome}</span>
          <InterruttoreTema />
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
        <InterruttoreTema />
      </header>
      <ul className="lista-giochi">
        {giochi.map((g) => (
          <li key={g.id}>
            <a className="gioco" href={`/${g.id}`} onClick={naviga(`/${g.id}`)}>
              <span className="gioco-icona">
                <Icona nome={ICONE_GIOCHI[g.id] ?? "divieto"} dimensione={28} />
              </span>
              <span className="gioco-testo">
                <span className="gioco-nome">{g.nome}</span>
                <span className="muted">{g.descrizione}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <Versione />
    </main>
  );
}
