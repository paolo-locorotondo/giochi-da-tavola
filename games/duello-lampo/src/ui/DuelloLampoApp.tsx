import { useState } from "react";
import type { Sfida } from "../logica";
import { Partita } from "./Partita";
import { Preparazione, scelteIniziali } from "./Preparazione";
import "./duello.css";

interface InCorso {
  sfida: Sfida;
  nomi: readonly [string, string];
}

export function DuelloLampoApp() {
  const [iniziale] = useState(scelteIniziali);
  const [inCorso, setInCorso] = useState<InCorso | null>(null);
  // Rimontare la preparazione quando si torna indietro: legge le scelte appena salvate.
  const [giro, setGiro] = useState(0);

  if (inCorso) {
    return (
      <Partita
        sfida={inCorso.sfida}
        nomi={inCorso.nomi}
        onEsci={() => {
          setInCorso(null);
          setGiro((g) => g + 1);
        }}
      />
    );
  }
  return <Preparazione key={giro} iniziale={giro === 0 ? iniziale : scelteIniziali()} onInizia={(sfida, nomi) => setInCorso({ sfida, nomi })} />;
}
