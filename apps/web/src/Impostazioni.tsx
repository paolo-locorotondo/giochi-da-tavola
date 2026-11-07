import { useRef, useState, type MouseEvent, type ReactNode } from "react";

import { Icona, type NomeIcona } from "./Icona";
import { audioAttivo, impostaAudio } from "@gdt/suoni";
import { impostaTema, temaAttuale, type Tema } from "./tema";

export interface GiocoConRegole {
  id: string;
  nome: string;
  regolamento: {
    passi: readonly string[];
    note?: readonly string[];
    /** Elenco di ruoli/personaggi con la loro abilità, mostrato dopo i passi. */
    personaggi?: readonly { nome: string; testo: string }[];
  };
}

function Regole({ gioco }: { gioco: GiocoConRegole }) {
  return (
    <>
      <ol className="regole-passi">
        {gioco.regolamento.passi.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      {gioco.regolamento.note?.map((n) => (
        <p key={n} className="muted regole-nota">
          {n}
        </p>
      ))}
      {gioco.regolamento.personaggi ? (
        <>
          <h3 className="regole-sezione">I personaggi</h3>
          <dl className="regole-personaggi">
            {gioco.regolamento.personaggi.map((p) => (
              <div key={p.nome}>
                <dt>{p.nome}</dt>
                <dd>{p.testo}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </>
  );
}

/** Interruttore animato (role="switch"): tutta la riga è il bersaglio del tocco. */
function Interruttore({
  icona,
  testo,
  acceso,
  onCambia,
}: {
  icona: NomeIcona;
  testo: string;
  acceso: boolean;
  onCambia: (acceso: boolean) => void;
}) {
  return (
    <button type="button" role="switch" aria-checked={acceso} className="impostazioni-voce" onClick={() => onCambia(!acceso)}>
      <Icona nome={icona} />
      <span className="impostazioni-voce-testo">{testo}</span>
      <span className="interruttore" aria-hidden="true">
        <span className="interruttore-pomello" />
      </span>
    </button>
  );
}

/** Scheda modale (<dialog> nativo): Esc, X o un tocco sullo sfondo la chiudono. */
function Scheda({
  finestra,
  titolo,
  indietro,
  children,
}: {
  finestra: React.RefObject<HTMLDialogElement>;
  titolo: string;
  indietro?: () => void;
  children: ReactNode;
}) {
  const chiudi = () => finestra.current?.close();
  const sulloSfondo = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) chiudi();
  };
  return (
    <dialog ref={finestra} className="impostazioni" aria-labelledby="impostazioni-titolo" onClick={sulloSfondo}>
      <div className="impostazioni-testata">
        {indietro ? (
          <button type="button" className="tema-btn" aria-label="Torna alle impostazioni" onClick={indietro}>
            <Icona nome="indietro" />
          </button>
        ) : null}
        <h2 id="impostazioni-titolo">{titolo}</h2>
        <button type="button" className="tema-btn" aria-label="Chiudi" onClick={chiudi}>
          <Icona nome="chiudi" />
        </button>
      </div>
      {/* Titolo e X restano fermi: scorre solo il contenuto (elenco puntato e note). */}
      <div className="impostazioni-corpo">{children}</div>
    </dialog>
  );
}

/** Libro accanto a un gioco nell'elenco: apre direttamente il regolamento di quel gioco. */
export function PulsanteRegolamento({ gioco }: { gioco: GiocoConRegole }) {
  const finestra = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="tema-btn"
        aria-label={`Regolamento di ${gioco.nome}`}
        onClick={() => finestra.current?.showModal()}
      >
        <Icona nome="regolamento" />
      </button>
      <Scheda finestra={finestra} titolo={`Regolamento · ${gioco.nome}`}>
        <Regole gioco={gioco} />
      </Scheda>
    </>
  );
}

/**
 * Ingranaggio che apre le impostazioni: tema scuro/chiaro, audio, regolamento di gioco.
 * Il regolamento c'è solo dentro un gioco (`gioco`); nell'elenco ogni gioco ha il suo libro.
 */
export function Impostazioni({ gioco }: { gioco?: GiocoConRegole }) {
  const finestra = useRef<HTMLDialogElement>(null);
  const [tema, setTema] = useState<Tema>(temaAttuale);
  const [vista, setVista] = useState<"voci" | "regole">("voci");
  const [audio, setAudio] = useState(audioAttivo);
  const scuro = tema === "dark";

  const apri = () => {
    setTema(temaAttuale());
    setAudio(audioAttivo());
    setVista("voci");
    finestra.current?.showModal();
  };

  return (
    <>
      <button type="button" className="tema-btn" aria-label="Impostazioni" onClick={apri}>
        <Icona nome="impostazioni" />
      </button>
      <Scheda
        finestra={finestra}
        titolo={vista === "regole" ? "Regolamento di gioco" : "Impostazioni"}
        indietro={vista === "regole" ? () => setVista("voci") : undefined}
      >
        {vista === "voci" || !gioco ? (
          <ul className="impostazioni-voci">
            <li>
              <Interruttore
                icona={scuro ? "luna" : "sole"}
                testo="Tema scuro"
                acceso={scuro}
                onCambia={(v) => {
                  const nuovo: Tema = v ? "dark" : "light";
                  impostaTema(nuovo);
                  setTema(nuovo);
                }}
              />
            </li>
            <li>
              <Interruttore
                icona={audio ? "volume-si" : "volume-no"}
                testo="Audio"
                acceso={audio}
                onCambia={(v) => {
                  impostaAudio(v);
                  setAudio(v);
                }}
              />
            </li>
            {gioco ? (
              <li>
                <button type="button" className="impostazioni-voce" onClick={() => setVista("regole")}>
                  <Icona nome="regolamento" />
                  <span className="impostazioni-voce-testo">Regolamento di gioco</span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : (
          <Regole gioco={gioco} />
        )}
      </Scheda>
    </>
  );
}
