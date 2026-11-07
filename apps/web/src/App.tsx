import { useEffect, useState, type MouseEvent, type ReactElement } from "react";
import { DadiApp, manifest as dadi } from "@gdt/dadi";
import { ImpostoreApp, manifest as impostore } from "@gdt/impostore";
import { LupusApp, manifest as lupus } from "@gdt/lupus";
import { TabuApp, manifest as tabu } from "@gdt/tabu";

import { applicaLingua, usaLingua, usaT, type Lingua, type TestiGioco } from "@gdt/i18n";

import { Icona, type NomeIcona } from "./Icona";
import { dizionari } from "./testi";
import { Impostazioni, PulsanteRegolamento, type GiocoConRegole } from "./Impostazioni";

/** Ogni gioco dà l'identità (`id`) e una funzione che ne restituisce i testi nella lingua scelta. */
interface ManifestGioco {
  id: string;
  testi: (lingua: Lingua) => TestiGioco;
}

interface VoceGioco extends ManifestGioco {
  Componente: () => ReactElement;
}

const giochi: VoceGioco[] = [
  { ...impostore, Componente: ImpostoreApp },
  { ...lupus, Componente: LupusApp },
  { ...tabu, Componente: TabuApp },
  { ...dadi, Componente: DadiApp },
];

/** Il gioco indicato dall'indirizzo: `/impostore`, `/impostore/ABC123`, ... */
function giocoDaPercorso(percorso: string): VoceGioco | undefined {
  const id = percorso.split("/")[1];
  return giochi.find((g) => g.id === id);
}

/** Il gioco con i testi nella lingua corrente, come lo vogliono le schede (regolamento, impostazioni). */
function conTesti(g: VoceGioco, lingua: Lingua): GiocoConRegole {
  return { id: g.id, ...g.testi(lingua) };
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
  dadi: "dadi",
};

function Versione() {
  const t = usaT(dizionari);
  return <p className="versione">{t("versione", { versione: __APP_VERSION__ })}</p>;
}

export function App() {
  const [percorso, vai] = usaPercorso();
  const lingua = usaLingua();
  const t = usaT(dizionari);
  const voce = giocoDaPercorso(percorso);
  const gioco = voce ? conTesti(voce, lingua) : undefined;

  // `lang` della pagina e titolo della scheda del browser seguono la lingua scelta.
  useEffect(() => {
    applicaLingua(lingua);
    document.title = t("titolo");
  }, [lingua, t]);

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

  if (voce && gioco) {
    const { Componente } = voce;
    return (
      <main className="app">
        <header className="barra-gioco">
          <a className="tema-btn" href="/" onClick={indietro} aria-label={t("indietro")}>
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
        <h1>{t("titolo")}</h1>
        <Impostazioni />
      </header>
      <ul className="lista-giochi">
        {giochi.map((voceGioco) => {
          const g = conTesti(voceGioco, lingua);
          return (
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
          );
        })}
      </ul>
      <Versione />
    </main>
  );
}
