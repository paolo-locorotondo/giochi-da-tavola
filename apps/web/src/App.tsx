import { useEffect, useState, type MouseEvent, type ReactElement } from "react";
import { ImpostoreApp, manifest as impostore } from "@gdt/impostore";
import { LupusApp, manifest as lupus } from "@gdt/lupus";
import { TabuApp, manifest as tabu } from "@gdt/tabu";

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
        <a className="link" href="/" onClick={naviga("/")}>
          ← Giochi
        </a>
        <Componente />
        <Versione />
      </main>
    );
  }

  return (
    <main className="app">
      <h1>Giochi da tavola</h1>
      <ul className="lista-giochi">
        {giochi.map((g) => (
          <li key={g.id}>
            <a className="gioco" href={`/${g.id}`} onClick={naviga(`/${g.id}`)}>
              <span className="gioco-nome">{g.nome}</span>
              <span className="muted">{g.descrizione}</span>
            </a>
          </li>
        ))}
      </ul>
      <Versione />
    </main>
  );
}
