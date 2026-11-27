import { useEffect, useId, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { usaT } from "@gdt/i18n";
import {
  ATTESA_VELOCE_PREDEFINITA_MS,
  ATTESE_VELOCE_MS,
  MAX_CARATTERI_NOME,
  type AnteprimaVeloce,
  type AperturaVeloce,
  type ModoSquadre,
  type PartitaVeloceOnline,
} from "@gdt/engine";
import { dizionari } from "./locales";
import { CampoTesto } from "./CampoTesto";
import { testoErroreVeloce } from "./SalaVeloce";
import "./sala-veloce.css";

/** Le impostazioni del gioco scelte da chi apre la stanza (es. modo di punteggio di Ultima!). */
export interface ImpostazioniVeloce<C = unknown> {
  iniziale: C;
  /** Disegna i campi; `cambia` aggiorna la config. */
  disegna(config: C, cambia: (c: C) => void): ReactNode;
  /** Falso = le impostazioni non sono valide e «Apri» resta spento. */
  valida?(config: C): boolean;
}

interface Props<C> {
  c: {
    connesso: boolean;
    errore: string | null;
    anteprima: AnteprimaVeloce | null | undefined;
    fuoriSala: "uscito" | "scaduta" | "chiusa" | null;
    chiediAnteprima: () => void;
    /** Rientra nella sala salvata, se c'è (true = tentativo partito; se fallisce chiede lui l'anteprima). */
    riprendiVeloce?: () => boolean;
    entraVeloce: (nome: string, opzioni?: { codice?: string; apri?: AperturaVeloce }) => void;
  };
  /** La dichiarazione `veloce` del gioco (posti, squadre). */
  veloce: PartitaVeloceOnline;
  impostazioni?: ImpostazioniVeloce<C>;
  /** Il gioco traduce le sue impostazioni (es. «A punti, fino a 500»). */
  riepilogo: (config: unknown) => string;
  testoErrore?: (messaggio: string) => string;
  onIndietro: () => void;
  /** Un'alternativa quando non arriva nessuno (es. «Gioca con un solo telefono»). */
  alternativa?: { testo: string; onClick: () => void };
}

/**
 * Schermata «Partita veloce»: il nome, poi o l'anteprima della stanza aperta («Entra») o le
 * impostazioni per aprirne una. Giochi a posti fissi e senza impostazioni (Tris) saltano tutto:
 * un tocco e si entra nella prima stanza o se ne apre una.
 */
export function ApriVeloce<C = unknown>({ c, veloce, impostazioni, riepilogo, testoErrore, onIndietro, alternativa }: Props<C>) {
  const t = usaT(dizionari);
  const semplice = veloce.posti.length === 1 && !veloce.squadre && !impostazioni;
  const [nome, setNome] = useState("");
  const [config, setConfig] = useState<C>(impostazioni?.iniziale as C);
  const [posti, setPosti] = useState(veloce.posti[0]!);
  const [squadre, setSquadre] = useState<ModoSquadre>("arrivo");
  const [attesaMs, setAttesaMs] = useState<number>(ATTESA_VELOCE_PREDEFINITA_MS);
  const idAttesa = useId();
  const idSquadre = useId();
  const pulito = nome.trim();

  // Appena collegato provo a riprendere il posto lasciato; se non c'è chiedo com'è la situazione
  // (e di nuovo se la connessione torna).
  useEffect(() => {
    if (!c.connesso) return;
    if (c.riprendiVeloce?.()) return;
    if (!semplice) c.chiediAnteprima();
  }, [c.connesso, semplice]); // eslint-disable-line react-hooks/exhaustive-deps

  const sq = veloce.squadre?.(posti) ?? null;
  const valide = !impostazioni?.valida || impostazioni.valida(config);
  const anteprima = c.anteprima;
  const pronto = c.connesso && pulito !== "" && (semplice || anteprima !== undefined);
  const lettera = (k: number) => String.fromCharCode(65 + k);

  const apri = () => {
    const apertura: AperturaVeloce = { posti, config, attesaMs, ...(sq ? { squadre } : {}) };
    c.entraVeloce(pulito, { apri: apertura });
  };

  return (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pronto) return;
        if (semplice) c.entraVeloce(pulito);
        else if (anteprima) c.entraVeloce(pulito, { codice: anteprima.codice });
        else if (valide) apri();
      }}
    >
      <h2>{t("partitaVeloce")}</h2>
      <p className="muted">{t(semplice ? "veloceTestoSemplice" : "veloceTesto")}</p>
      {c.fuoriSala && c.fuoriSala !== "uscito" && (
        <p className="avviso" role="status">
          {t(c.fuoriSala === "scaduta" ? "fuoriScaduta" : "fuoriChiusa")}
        </p>
      )}
      <CampoTesto label={t("tuoNome")} autoFocus value={nome} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={setNome} />

      {!semplice && anteprima === undefined && <p className="muted">{t("cercoStanze")}</p>}

      {!semplice && anteprima && (
        <div className="sv-scheda">
          <h3>{t("stanzaDi", { nome: anteprima.organizzatore })}</h3>
          <p>
            {t("codiceSala", { codice: anteprima.codice })}
            {" · "}
            {t("postiOccupati", { n: anteprima.occupati, tot: anteprima.posti })}
            {" · "}
            {t("minuti", { n: anteprima.attesaMs / 60_000 })}
          </p>
          <p className="muted">
            {[riepilogo(anteprima.config), anteprima.squadre ? t(NOMI_SQUADRE[anteprima.squadre]) : ""].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}

      {!semplice && anteprima === null && (
        <>
          {impostazioni?.disegna(config, setConfig)}

          {veloce.posti.length > 1 && (
            <fieldset className="scelta">
              <legend className="scelta-titolo">{t("quantiPosti")}</legend>
              {veloce.posti.length <= 4 ? (
                <div className="scelta-opzioni">
                  {veloce.posti.map((p) => (
                    <label key={p} className="scelta-opzione">
                      <input type="radio" name="posti" checked={posti === p} onChange={() => setPosti(p)} />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="sv-stepper">
                  <button
                    type="button"
                    className="btn"
                    aria-label={t("menoGiocatori")}
                    disabled={posti <= veloce.posti[0]!}
                    onClick={() => setPosti(veloce.posti[Math.max(0, veloce.posti.indexOf(posti) - 1)]!)}
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <output className="sv-valore" aria-live="polite">
                    {t("giocatoriN", { n: posti })}
                  </output>
                  <button
                    type="button"
                    className="btn"
                    aria-label={t("piuGiocatori")}
                    disabled={posti >= veloce.posti[veloce.posti.length - 1]!}
                    onClick={() => setPosti(veloce.posti[Math.min(veloce.posti.length - 1, veloce.posti.indexOf(posti) + 1)]!)}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
              )}
            </fieldset>
          )}

          {sq && (
            <fieldset className="scelta" aria-describedby={`${idSquadre}-aiuto`}>
              <legend className="scelta-titolo">{t("squadreTitolo")}</legend>
              <p id={`${idSquadre}-aiuto`} className="scelta-aiuto">
                {t(AIUTO_SQUADRE[squadre])}
              </p>
              <div className="scelta-opzioni sv-opzioni-larghe">
                {(["arrivo", "caso", "scelte"] as const).map((m) => (
                  <label key={m} className="scelta-opzione">
                    <input type="radio" name={idSquadre} checked={squadre === m} onChange={() => setSquadre(m)} />
                    <span>{t(NOMI_SQUADRE[m])}</span>
                  </label>
                ))}
              </div>
              <p className="scelta-aiuto">{sq.map((p, k) => `${t("squadraN", { lettera: lettera(k) })}: ${p.join(" + ")}`).join(" · ")}</p>
            </fieldset>
          )}

          <fieldset className="scelta" aria-describedby={`${idAttesa}-aiuto`}>
            <legend className="scelta-titolo">{t("tempoAttesa")}</legend>
            <p id={`${idAttesa}-aiuto`} className="scelta-aiuto">
              {t("tempoAttesaAiuto")}
            </p>
            <div className="scelta-opzioni">
              {ATTESE_VELOCE_MS.map((ms) => (
                <label key={ms} className="scelta-opzione">
                  <input type="radio" name={idAttesa} checked={attesaMs === ms} onChange={() => setAttesaMs(ms)} />
                  <span>{t("minutiBreve", { n: ms / 60_000 })}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {c.errore && (
        <p className="errore" role="alert">
          {testoErroreVeloce(t, c.errore, testoErrore ?? ((m) => m))}
        </p>
      )}

      <button className="btn primario" type="submit" disabled={!pronto || (!semplice && anteprima === null && !valide)}>
        {t(semplice ? "cercaAvversario" : anteprima ? "entraNellaStanza" : "apriStanzaVeloce")}
      </button>
      {alternativa && c.fuoriSala === "scaduta" && (
        <button className="btn" type="button" onClick={alternativa.onClick}>
          {alternativa.testo}
        </button>
      )}
      <button className="btn" type="button" onClick={onIndietro}>
        {t("indietro")}
      </button>
    </form>
  );
}

const NOMI_SQUADRE = { arrivo: "squadreArrivo", caso: "squadreCaso", scelte: "squadreScelte" } as const;
const AIUTO_SQUADRE = { arrivo: "squadreArrivoAiuto", caso: "squadreCasoAiuto", scelte: "squadreScelteAiuto" } as const;
