import { useState, type ReactElement } from "react";
import { ImpostoreApp, manifest as impostore } from "@gdt/impostore";

interface VoceGioco {
  id: string;
  nome: string;
  descrizione: string;
  Componente: () => ReactElement;
}

const giochi: VoceGioco[] = [
  {
    id: impostore.id,
    nome: impostore.nome,
    descrizione: impostore.descrizione,
    Componente: ImpostoreApp,
  },
];

export function App() {
  const [attivo, setAttivo] = useState<string | null>(null);
  const gioco = giochi.find((g) => g.id === attivo);

  if (gioco) {
    const { Componente } = gioco;
    return (
      <main className="app">
        <button className="link" onClick={() => setAttivo(null)}>
          ← Giochi
        </button>
        <Componente />
      </main>
    );
  }

  return (
    <main className="app">
      <h1>Giochi da tavola</h1>
      <ul className="lista-giochi">
        {giochi.map((g) => (
          <li key={g.id}>
            <button className="gioco" onClick={() => setAttivo(g.id)}>
              <span className="gioco-nome">{g.nome}</span>
              <span className="muted">{g.descrizione}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
