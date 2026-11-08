import { Info } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usaLingua, usaT } from "@gdt/i18n";
import { generaCasuale } from "../casuale";
import { dizionari } from "../locales";
import { MAX_CARATTERI_FACCIA, MAX_CARATTERI_INFO, eMoneta, facceDaTesto, lancia, limitaInfo, limitaRighe } from "../logica";
import { modelliDi } from "../modelli";
import "./dadi.css";

const PERSONALIZZATO = "personalizzato";
const DURATA_LANCIO = 900;
const PASSO_FACCE = 90;
const MAX_STORICO = 10;

interface Lancio {
  n: number;
  faccia: string;
}

function riduciMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function DadiApp() {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  const modelli = useMemo(() => modelliDi(lingua), [lingua]);

  const [scelto, setScelto] = useState<string>(modelli[2]?.id ?? PERSONALIZZATO);
  const [testo, setTesto] = useState("");
  const [testoInfo, setTestoInfo] = useState("");
  const [infoAperta, setInfoAperta] = useState(false);
  const [mostrata, setMostrata] = useState<string | null>(null);
  const [inLancio, setInLancio] = useState(false);
  const [storico, setStorico] = useState<Lancio[]>([]);
  const contatore = useRef(0);
  const timer = useRef<number[]>([]);
  const rng = useRef(generaCasuale());

  const personalizzato = scelto === PERSONALIZZATO;
  const facce = useMemo(() => {
    if (personalizzato) return facceDaTesto(testo);
    return modelli.find((m) => m.id === scelto)?.facce ?? [];
  }, [personalizzato, testo, modelli, scelto]);
  const info = (personalizzato ? testoInfo : (modelli.find((m) => m.id === scelto)?.info ?? "")).trim();
  const valido = facce.length >= 2;
  const moneta = eMoneta(facce);

  const ferma = () => {
    for (const id of timer.current) window.clearTimeout(id);
    timer.current = [];
  };
  useEffect(() => ferma, []);

  // Cambiando dado (o lingua) il risultato precedente non vale più.
  useEffect(() => {
    ferma();
    setInLancio(false);
    setMostrata(null);
  }, [scelto, lingua, testo]);

  const tira = () => {
    if (!valido || inLancio) return;
    const indice = lancia(facce, rng.current);
    const faccia = facce[indice] ?? "";
    const concludi = () => {
      contatore.current += 1;
      setMostrata(faccia);
      setInLancio(false);
      setStorico((s) => [{ n: contatore.current, faccia }, ...s].slice(0, MAX_STORICO));
    };
    if (riduciMovimento()) {
      concludi();
      return;
    }
    setInLancio(true);
    // Durante il lancio le facce scorrono; l'ultima è quella già estratta.
    for (let ms = 0; ms < DURATA_LANCIO; ms += PASSO_FACCE) {
      timer.current.push(
        window.setTimeout(() => setMostrata(facce[Math.floor(Math.random() * facce.length)] ?? ""), ms),
      );
    }
    timer.current.push(window.setTimeout(concludi, DURATA_LANCIO));
  };

  return (
    <section className="schermata allineata dadi">
      <fieldset className="scelta dadi-scelta">
        <legend className="scelta-titolo">{t("sceltaDado")}</legend>
        <div className="scelta-opzioni">
          {[...modelli.map((m) => ({ id: m.id, nome: m.nome })), { id: PERSONALIZZATO, nome: t("personalizzato") }].map(
            (o) => (
              <label key={o.id} className="scelta-opzione">
                <input
                  type="radio"
                  name="dado"
                  value={o.id}
                  checked={scelto === o.id}
                  disabled={inLancio}
                  onChange={() => setScelto(o.id)}
                />
                <span>{o.nome}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>

      {personalizzato ? (
        <label className="campo">
          {t("valoriPersonalizzati")}
          <textarea
            rows={5}
            value={testo}
            spellCheck={false}
            aria-describedby="dadi-aiuto"
            aria-invalid={!valido && testo.trim() !== ""}
            disabled={inLancio}
            onChange={(e) => setTesto(limitaRighe(e.target.value))}
          />
          <span id="dadi-aiuto" className={valido || testo.trim() === "" ? "suggerimento" : "errore"}>
            {valido || testo.trim() === "" ? t("valoriAiuto", { max: MAX_CARATTERI_FACCIA }) : t("valoriInsufficienti")}
          </span>
        </label>
      ) : null}

      {personalizzato ? (
        <label className="campo">
          {t("infoPersonalizzata")}
          <textarea
            rows={6}
            value={testoInfo}
            maxLength={MAX_CARATTERI_INFO}
            aria-describedby="dadi-info-aiuto"
            onChange={(e) => setTestoInfo(limitaInfo(e.target.value))}
          />
          <span id="dadi-info-aiuto" className="suggerimento">
            {t("infoAiuto", { n: Array.from(testoInfo).length, max: MAX_CARATTERI_INFO })}
          </span>
        </label>
      ) : null}

      <div className="dado-riga">
      <div
        className={`dado-scena${moneta ? " dado-moneta" : ""}${inLancio ? " dado-gira" : ""}`}
        role="img"
        aria-label={moneta ? t("moneta") : t("dado")}
      >
        <span className={`dado-faccia${(mostrata ?? "").length > 8 ? " dado-faccia-lunga" : ""}`}>{mostrata ?? "?"}</span>
      </div>
      {info ? (
        <button
          type="button"
          className="tema-btn dado-info-tasto"
          aria-expanded={infoAperta}
          aria-controls="dadi-info"
          aria-label={t("infoDado")}
          onClick={() => setInfoAperta((a) => !a)}
        >
          <Info size={22} aria-hidden="true" />
        </button>
      ) : null}
      </div>

      {info && infoAperta ? (
        <div id="dadi-info" className="dado-info" role="region" aria-label={t("infoDado")}>
          {info}
        </div>
      ) : null}

      <p className="dado-esito" role="status" aria-live="polite">
        {inLancio ? t("inLancio") : mostrata !== null ? t("risultato", { faccia: mostrata }) : ""}
      </p>

      <button type="button" className="btn primario dadi-lancia" disabled={!valido || inLancio} onClick={tira}>
        {t("lancia")}
      </button>

      <div className="dadi-storico">
        <h3>{t("ultimi")}</h3>
        {storico.length === 0 ? (
          <p className="muted">{t("nessunLancio")}</p>
        ) : (
          <>
            <ol className="chip-elenco">
              {storico.map((l) => (
                <li key={l.n} className="chip">
                  {l.faccia}
                </li>
              ))}
            </ol>
            <button type="button" className="btn" onClick={() => setStorico([])}>
              {t("cancellaLanci")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
