import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { Icona, type NomeIcona } from "./Icona";
import { audioAttivo, impostaAudio } from "@gdt/suoni";
import { scriviPreferenza, usaPreferenza, type ImpostazioneGioco } from "@gdt/preferenze";
import { LINGUE, NOME_LINGUA, scriviLingua, usaLingua, usaT, type TestiGioco } from "@gdt/i18n";
import { dizionari } from "./testi";
import { impostaTema, temaAttuale, type Tema } from "./tema";

/** Un gioco con i suoi testi nella lingua corrente (manifest + `testi(lingua)`). */
export type GiocoConRegole = TestiGioco & { id: string };

function Regole({ gioco }: { gioco: GiocoConRegole }) {
  const t = usaT(dizionari);
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
          <h3 className="regole-sezione">{t("iPersonaggi")}</h3>
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

/** Scelta singola fra poche opzioni (es. durata): una fila di pulsanti radio nativi. */
function SceltaGioco({ gioco, imp }: { gioco: string; imp: ImpostazioneGioco }) {
  const valore = usaPreferenza(gioco, imp);
  const id = useId();
  return (
    <fieldset className="scelta" aria-describedby={imp.aiuto ? `${id}-aiuto` : undefined}>
      <legend className="scelta-titolo">{imp.testo}</legend>
      {imp.aiuto ? (
        <p id={`${id}-aiuto`} className="scelta-aiuto">
          {imp.aiuto}
        </p>
      ) : null}
      <div className="scelta-opzioni">
        {imp.opzioni.map((o) => (
          <label key={String(o.valore)} className="scelta-opzione">
            <input
              type="radio"
              name={id}
              checked={o.valore === valore}
              onChange={() => scriviPreferenza(gioco, imp.chiave, o.valore)}
            />
            <span>{o.testo}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Lingua dell'interfaccia: vale per tutta l'app, su questo telefono. */
function SceltaLingua() {
  const lingua = usaLingua();
  const t = usaT(dizionari);
  const id = useId();
  return (
    <fieldset className="scelta">
      <legend className="scelta-titolo">{t("lingua")}</legend>
      <div className="scelta-opzioni">
        {LINGUE.map((l) => (
          <label key={l} className="scelta-opzione">
            <input type="radio" name={id} checked={l === lingua} onChange={() => scriviLingua(l)} lang={l} />
            <span lang={l}>{NOME_LINGUA[l]}</span>
          </label>
        ))}
      </div>
    </fieldset>
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
  const t = usaT(dizionari);
  const chiudi = () => finestra.current?.close();
  const sulloSfondo = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) chiudi();
  };
  return (
    <dialog ref={finestra} className="impostazioni" aria-labelledby="impostazioni-titolo" onClick={sulloSfondo}>
      <div className="impostazioni-testata">
        {indietro ? (
          <button type="button" className="tema-btn" aria-label={t("tornaAlleImpostazioni")} onClick={indietro}>
            <Icona nome="indietro" />
          </button>
        ) : null}
        <h2 id="impostazioni-titolo">{titolo}</h2>
        <button type="button" className="tema-btn" aria-label={t("chiudi")} onClick={chiudi}>
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
  const t = usaT(dizionari);
  return (
    <>
      <button
        type="button"
        className="tema-btn"
        aria-label={t("regolamentoDi", { gioco: gioco.nome })}
        onClick={() => finestra.current?.showModal()}
      >
        <Icona nome="regolamento" />
      </button>
      <Scheda finestra={finestra} titolo={t("regolamentoTitolo", { gioco: gioco.nome })}>
        <Regole gioco={gioco} />
      </Scheda>
    </>
  );
}

/**
 * Ingranaggio che apre le impostazioni. Nell'elenco dei giochi: solo quelle dell'app (tema, audio).
 * Dentro un gioco (`gioco`): anche le impostazioni di quel gioco e il suo regolamento.
 */
export function Impostazioni({ gioco }: { gioco?: GiocoConRegole }) {
  const finestra = useRef<HTMLDialogElement>(null);
  const t = usaT(dizionari);
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
      <button type="button" className="tema-btn" aria-label={t("impostazioni")} onClick={apri}>
        <Icona nome="impostazioni" />
      </button>
      <Scheda
        finestra={finestra}
        titolo={vista === "regole" ? t("regolamentoDiGioco") : t("impostazioni")}
        indietro={vista === "regole" ? () => setVista("voci") : undefined}
      >
        {vista === "voci" || !gioco ? (
          <>
            {gioco ? <h3 className="impostazioni-sezione">{t("sezioneApp")}</h3> : null}
            <ul className="impostazioni-voci">
              <li>
                <Interruttore
                  icona={scuro ? "luna" : "sole"}
                  testo={t("temaScuro")}
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
                  testo={t("audio")}
                  acceso={audio}
                  onCambia={(v) => {
                    impostaAudio(v);
                    setAudio(v);
                  }}
                />
              </li>
              <li>
                <SceltaLingua />
              </li>
            </ul>
            {gioco ? (
              <>
                <h3 className="impostazioni-sezione">{gioco.nome}</h3>
                <ul className="impostazioni-voci">
                  {gioco.impostazioni?.map((imp) => (
                    <li key={imp.chiave}>
                      <SceltaGioco gioco={gioco.id} imp={imp} />
                    </li>
                  ))}
                  <li>
                    <button type="button" className="impostazioni-voce" onClick={() => setVista("regole")}>
                      <Icona nome="regolamento" />
                      <span className="impostazioni-voce-testo">{t("regolamentoDiGioco")}</span>
                    </button>
                  </li>
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <Regole gioco={gioco} />
        )}
      </Scheda>
    </>
  );
}
