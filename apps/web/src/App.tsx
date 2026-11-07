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

/** Senza maiuscole e senza accenti, per confrontare nomi e testo cercato. */
const normalizza = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function App() {
  const [percorso, vai] = usaPercorso();
  const lingua = usaLingua();
  const t = usaT(dizionari);
  const voce = giocoDaPercorso(percorso);
  const gioco = voce ? conTesti(voce, lingua) : undefined;
  const [ricercaAperta, setRicercaAperta] = useState(false);
  const [filtro, setFiltro] = useState("");

  // Elenco in ordine alfabetico per nome nella lingua corrente, filtrato dalla ricerca (nome o descrizione).
  const elenco = giochi
    .map((v) => conTesti(v, lingua))
    .sort((a, b) => a.nome.localeCompare(b.nome, lingua))
    .filter((g) => !filtro.trim() || normalizza(`${g.nome} ${g.descrizione}`).includes(normalizza(filtro.trim())));

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
        <div className="testata-azioni">
          <button
            type="button"
            className="tema-btn"
            aria-label={t("cerca")}
            aria-expanded={ricercaAperta}
            aria-controls="ricerca-giochi"
            onClick={() => {
              setRicercaAperta(!ricercaAperta);
              if (ricercaAperta) setFiltro("");
            }}
          >
            <Icona nome={ricercaAperta ? "chiudi" : "cerca"} />
          </button>
          <Impostazioni />
        </div>
      </header>
      {ricercaAperta && (
        <div className="campo ricerca" id="ricerca-giochi">
          <input
            type="search"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-label={t("cerca")}
            placeholder={t("cerca")}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      )}
      <ul className="lista-giochi">
        {elenco.map((g) => (
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
      {elenco.length === 0 && <p className="muted" role="status">{t("nessunGioco")}</p>}
      <Versione />
    </main>
  );
}
