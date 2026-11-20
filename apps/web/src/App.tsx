import { useEffect, useState, type MouseEvent, type ReactElement } from "react";
import { applicaOrdine, leggiOrdine, scriviOrdine, spostaVoce } from "@gdt/preferenze";
import { DadiApp, manifest as dadi } from "@gdt/dadi";
import { DuelloLampoApp, manifest as duelloLampo } from "@gdt/duello-lampo";
import { ImpostoreApp, manifest as impostore } from "@gdt/impostore";
import { LupusApp, manifest as lupus } from "@gdt/lupus";
import { TabuApp, manifest as tabu } from "@gdt/tabu";
import { TrisApp, manifest as tris } from "@gdt/tic-tac-toe";

import { applicaLingua, usaLingua, usaT, type Lingua, type TestiGioco } from "@gdt/i18n";

import { Icona, type NomeIcona } from "./Icona";
import { dizionari } from "./testi";
import { Impostazioni, PulsanteRegolamento, type GiocoConRegole } from "./Impostazioni";

/** Ogni gioco dà l'identità (`id`) e una funzione che ne restituisce i testi nella lingua scelta. */
interface ManifestGioco {
  id: string;
  /** true = c'è anche la modalità online; tutti i giochi funzionano offline. */
  online?: boolean;
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
  { ...tris, Componente: TrisApp },
  { ...duelloLampo, Componente: DuelloLampoApp },
];

/** Il gioco indicato dall'indirizzo: `/impostore`, `/impostore/ABC123`, ... */
function giocoDaPercorso(percorso: string): VoceGioco | undefined {
  const id = percorso.split("/")[1];
  return giochi.find((g) => g.id === id);
}

/** Il gioco con i testi nella lingua corrente, come lo vogliono le schede (regolamento, impostazioni). */
function conTesti(g: VoceGioco, lingua: Lingua): GiocoConRegole {
  return { id: g.id, online: g.online === true, ...g.testi(lingua) };
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
  tris: "griglia",
  "duello-lampo": "fulmine",
};

/** Nome dell'ordine dei giochi della home nelle preferenze del telefono. */
const ORDINE_HOME = "home";

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
  /** L'ordine salvato su questo telefono; `null` = alfabetico. */
  const [ordineSalvato, setOrdineSalvato] = useState<string[] | null>(() => leggiOrdine(ORDINE_HOME));
  /** Durante l'ordinamento: l'ordine in prova (si salva solo con «Salva l'ordinamento»). */
  const [inOrdinamento, setInOrdinamento] = useState<string[] | null>(null);
  /** Il gioco appena spostato e la freccia usata: il fuoco resta lì per spostarlo ancora. */
  const [spostato, setSpostato] = useState<{ id: string; verso: -1 | 1 } | null>(null);

  // Di base in ordine alfabetico nella lingua corrente; con un ordine salvato, quello (i giochi nuovi in fondo).
  const alfabetico = giochi.map((v) => conTesti(v, lingua)).sort((a, b) => a.nome.localeCompare(b.nome, lingua));
  const ordinati = applicaOrdine(alfabetico, (g) => g.id, inOrdinamento ?? ordineSalvato);
  // Durante l'ordinamento la ricerca non filtra: si ordinano tutti i giochi.
  const elenco = inOrdinamento
    ? ordinati
    : ordinati.filter((g) => !filtro.trim() || normalizza(`${g.nome} ${g.descrizione}`).includes(normalizza(filtro.trim())));

  const iniziaOrdinamento = () => {
    setRicercaAperta(false);
    setFiltro("");
    setSpostato(null);
    setInOrdinamento(ordinati.map((g) => g.id));
  };
  const sposta = (id: string, verso: -1 | 1) => {
    if (!inOrdinamento) return;
    setInOrdinamento(spostaVoce(inOrdinamento, id, verso));
    setSpostato({ id, verso });
  };
  const salvaOrdinamento = () => {
    if (!inOrdinamento) return;
    scriviOrdine(ORDINE_HOME, inOrdinamento);
    setOrdineSalvato(inOrdinamento);
    setInOrdinamento(null);
  };
  const tornaAlfabetico = () => {
    scriviOrdine(ORDINE_HOME, null);
    setOrdineSalvato(null);
    setInOrdinamento(null);
  };

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
        <header className="barra-gioco barra-fissa">
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
    <main className={`app${inOrdinamento ? " app--ordinamento" : ""}`}>
      <header className="app-testata barra-fissa">
        <h1>{t("titolo")}</h1>
        <div className="testata-azioni">
          <button
            type="button"
            className="tema-btn"
            aria-label={t("ordina")}
            aria-pressed={inOrdinamento !== null}
            onClick={() => (inOrdinamento ? setInOrdinamento(null) : iniziaOrdinamento())}
          >
            <Icona nome="ordina" />
          </button>
          <button
            type="button"
            className="tema-btn"
            aria-label={t("cerca")}
            aria-expanded={ricercaAperta}
            aria-controls="ricerca-giochi"
            disabled={inOrdinamento !== null}
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
      {inOrdinamento && (
        <p className="muted ordina-aiuto" role="status">
          {t("ordinaAiuto")}
        </p>
      )}
      {ricercaAperta && !inOrdinamento && (
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
        {elenco.map((g, posizione) => (
          <li key={g.id} className={`riga-gioco${inOrdinamento ? " riga-gioco--ordina" : ""}`}>
            {inOrdinamento && (
              <div className="ordina-riga" role="group" aria-label={t("posizioneDi", { gioco: g.nome })}>
                <span className="ordina-pos" aria-hidden="true">
                  {posizione + 1}
                </span>
                <button
                  type="button"
                  className="tema-btn ordina-freccia"
                  aria-label={t("spostaSu", { gioco: g.nome })}
                  disabled={posizione === 0}
                  ref={(el) => {
                    // Il fuoco resta sulla freccia usata; se il gioco è arrivato in cima va sull'altra.
                    if (el && spostato?.id === g.id && (spostato.verso === -1 ? posizione > 0 : posizione === elenco.length - 1))
                      el.focus();
                  }}
                  onClick={() => sposta(g.id, -1)}
                >
                  <Icona nome="freccia-su" />
                </button>
                <button
                  type="button"
                  className="tema-btn ordina-freccia"
                  aria-label={t("spostaGiu", { gioco: g.nome })}
                  disabled={posizione === elenco.length - 1}
                  ref={(el) => {
                    if (el && spostato?.id === g.id && (spostato.verso === 1 ? posizione < elenco.length - 1 : posizione === 0))
                      el.focus();
                  }}
                  onClick={() => sposta(g.id, 1)}
                >
                  <Icona nome="freccia-giu" />
                </button>
              </div>
            )}
            <a
              className="gioco"
              href={`/${g.id}`}
              // Durante l'ordinamento le righe non si aprono: si spostano.
              onClick={inOrdinamento ? (e) => e.preventDefault() : naviga(`/${g.id}`)}
              aria-disabled={inOrdinamento ? true : undefined}
              tabIndex={inOrdinamento ? -1 : undefined}
            >
              <span className="gioco-icona">
                <Icona nome={ICONE_GIOCHI[g.id] ?? "divieto"} dimensione={28} />
              </span>
              <span className="gioco-testo">
                <span className="gioco-titolo">
                  <span className="gioco-nome">{g.nome}</span>
                  <span className="gioco-modi">
                    <span className="modo-badge modo-badge--offline" role="img" aria-label={t("giocaOffline")}>
                      <Icona nome="wifi-barrato" dimensione={20} />
                    </span>
                    {g.online && (
                      <span className="modo-badge modo-badge--online" role="img" aria-label={t("giocaOnline")}>
                        <Icona nome="wifi" dimensione={20} />
                      </span>
                    )}
                  </span>
                </span>
                <span className="muted">{g.descrizione}</span>
              </span>
            </a>
            {!inOrdinamento && <PulsanteRegolamento gioco={g} />}
          </li>
        ))}
      </ul>
      {inOrdinamento && (
        <div className="ordina-azioni">
          <button type="button" className="primario" onClick={salvaOrdinamento}>
            {t("salvaOrdine")}
          </button>
          <button type="button" onClick={() => setInOrdinamento(null)}>
            {t("annullaOrdine")}
          </button>
          <button type="button" className="ordina-alfabetico" disabled={ordineSalvato === null} onClick={tornaAlfabetico}>
            {t("ordineAlfabetico")}
          </button>
        </div>
      )}
      {elenco.length === 0 && <p className="muted" role="status">{t("nessunGioco")}</p>}
      <Versione />
    </main>
  );
}
