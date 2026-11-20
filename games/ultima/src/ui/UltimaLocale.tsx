import { useEffect, useRef, useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { testoMessaggio } from "../errori-ui";
import { LIVELLI, type Livello } from "../bot";
import { MAX_GIOCATORI, MIN_GIOCATORI } from "../logica";
import { SOGLIA_MAX, SOGLIA_MIN, SOGLIA_PREDEFINITA, type ModoPunteggio } from "../online";
import {
  VELOCITA,
  VELOCITA_PREDEFINITA,
  agisci,
  botDiTurno,
  muoviBot,
  nuovaPartitaLocale,
  pausaBot,
  vistaLocale,
  type PartitaLocale,
  type Velocita,
} from "../offline";
import { Tavolo } from "./Tavolo";

/** Un numero casuale a 32 bit per il seme di ogni mano. */
const caso = () => Math.floor(Math.random() * 2 ** 32);

const CHIAVE = "gdt.ultima.offline";

/** Le ultime scelte sul telefono (nomi, livello, velocità): solo comodità, mai necessarie. */
function leggiSalvate(): Partial<{ nomi: string[]; livello: Livello; velocita: Velocita }> {
  try {
    const g = JSON.parse(localStorage.getItem(CHIAVE) ?? "{}") as Record<string, unknown>;
    return {
      nomi: Array.isArray(g.nomi) && g.nomi.every((n) => typeof n === "string") && g.nomi.length >= MIN_GIOCATORI && g.nomi.length <= MAX_GIOCATORI ? (g.nomi as string[]) : undefined,
      livello: LIVELLI.includes(g.livello as Livello) ? (g.livello as Livello) : undefined,
      velocita: g.velocita === "lenta" || g.velocita === "normale" || g.velocita === "veloce" ? g.velocita : undefined,
    };
  } catch {
    return {};
  }
}
function salva(dati: { nomi: string[]; livello: Livello; velocita: Velocita }) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(dati));
  } catch {
    /* niente memoria: si riparte dai valori di base */
  }
}

/** Ultima! su un solo telefono, contro i bot. */
export function UltimaLocale() {
  const [partita, setPartita] = useState<PartitaLocale | null>(null);
  const [velocita, setVelocita] = useState<Velocita>(() => leggiSalvate().velocita ?? VELOCITA_PREDEFINITA);
  if (!partita) return <Crea velocita={velocita} onVelocita={setVelocita} onAvvia={setPartita} />;
  return <Partita partita={partita} onPartita={setPartita} velocita={velocita} onVelocita={setVelocita} onEsci={() => setPartita(null)} />;
}

function Crea({ velocita, onVelocita, onAvvia }: { velocita: Velocita; onVelocita: (v: Velocita) => void; onAvvia: (p: PartitaLocale) => void }) {
  const t = usaT(dizionari);
  const salvate = leggiSalvate();
  const [nomi, setNomi] = useState<string[]>(salvate.nomi ?? ["", "Bot 1"]);
  const [livello, setLivello] = useState<Livello>(salvate.livello ?? "medio");
  const [modo, setModo] = useState<ModoPunteggio>("singolo");
  const [soglia, setSoglia] = useState(SOGLIA_PREDEFINITA);
  const [errore, setErrore] = useState<string | null>(null);
  const puliti = nomi.map((n) => n.trim());
  const distinti = new Set(puliti.map((n) => n.toLowerCase())).size === puliti.length;
  const sogliaOk = Number.isInteger(soglia) && soglia >= SOGLIA_MIN && soglia <= SOGLIA_MAX;
  const validi = puliti.every(Boolean) && distinti && (modo === "singolo" || sogliaOk);
  const cambia = (i: number, v: string) => setNomi(nomi.map((n, k) => (k === i ? v : n)));
  const aggiungi = () => {
    const usati = new Set(nomi.map((n) => n.trim().toLowerCase()));
    let k = nomi.length;
    while (usati.has(t("nomeBot", { n: k }).toLowerCase())) k++;
    setNomi([...nomi, t("nomeBot", { n: k })]);
  };

  return (
    <form
      className="schermata allineata"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!validi) return;
        try {
          salva({ nomi: puliti, livello, velocita });
          onAvvia(nuovaPartitaLocale({ nomi: puliti, livello, config: { modo, soglia } }, caso()));
        } catch (err) {
          setErrore(err instanceof Error ? err.message : "sconosciuto");
        }
      }}
    >
      <fieldset className="ul-nomi-crea ul-senza-bordo">
        <legend>{t("nomiGiocatoriBot")}</legend>
        {nomi.map((n, i) => (
          <div key={i} className="ul-riga-nome">
            <label className="campo">
              {i === 0 ? t("tuoNome") : t("nomeBotCampo", { n: i })}
              <input value={n} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={(e) => cambia(i, e.target.value)} />
            </label>
            {i > 0 && nomi.length > MIN_GIOCATORI && (
              <button type="button" className="btn" aria-label={t("togliBot", { n: i })} onClick={() => setNomi(nomi.filter((_, k) => k !== i))}>
                <Minus size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        <span className="suggerimento">{t("botAiutoCrea")}</span>
        {nomi.length < MAX_GIOCATORI && (
          <button type="button" className="btn" onClick={aggiungi}>
            <Plus size={18} aria-hidden="true" /> {t("aggiungiBot")}
          </button>
        )}
      </fieldset>

      <Opzioni
        legenda={t("livelloBot")}
        nome="livello"
        valore={livello}
        onCambia={setLivello}
        voci={LIVELLI.map((l) => ({ valore: l, titolo: t(`livello_${l}`), desc: t(`livello_${l}Desc`) }))}
      />
      <Opzioni
        legenda={t("velocitaBot")}
        nome="velocita"
        valore={velocita}
        onCambia={onVelocita}
        voci={(Object.keys(VELOCITA) as Velocita[]).map((v) => ({ valore: v, titolo: t(`velocita_${v}`) }))}
      />

      <fieldset className="ul-nomi-crea ul-senza-bordo">
        <legend>{t("comeSiVince")}</legend>
        {(["singolo", "punti"] as const).map((m) => (
          <label key={m} className="ul-opzione">
            <input type="radio" name="modo" checked={modo === m} onChange={() => setModo(m)} />
            <span>
              <strong>{t(m === "singolo" ? "modoSingolo" : "modoPunti")}</strong>
              <br />
              <span className="muted">{t(m === "singolo" ? "modoSingoloDesc" : "modoPuntiDesc")}</span>
            </span>
          </label>
        ))}
        {modo === "punti" && (
          <label className="campo">
            {t("soglia")}
            <input type="number" inputMode="numeric" min={SOGLIA_MIN} max={SOGLIA_MAX} step={10} value={soglia} aria-invalid={!sogliaOk} onChange={(e) => setSoglia(Number(e.target.value))} />
            <span className="suggerimento">{t("sogliaAiuto", { min: SOGLIA_MIN, max: SOGLIA_MAX })}</span>
          </label>
        )}
      </fieldset>

      {errore && (
        <p className="errore" role="alert">
          {testoMessaggio(t, errore)}
        </p>
      )}
      <button className="btn primario" type="submit" disabled={!validi}>
        {t("iniziaControBot")}
      </button>
    </form>
  );
}

function Opzioni<V extends string>({
  legenda,
  nome,
  valore,
  onCambia,
  voci,
}: {
  legenda: string;
  nome: string;
  valore: V;
  onCambia: (v: V) => void;
  voci: { valore: V; titolo: string; desc?: string }[];
}) {
  return (
    <fieldset className="ul-nomi-crea ul-senza-bordo">
      <legend>{legenda}</legend>
      {voci.map((o) => (
        <label key={o.valore} className="ul-opzione">
          <input type="radio" name={nome} checked={valore === o.valore} onChange={() => onCambia(o.valore)} />
          <span>
            <strong>{o.titolo}</strong>
            {o.desc && (
              <>
                <br />
                <span className="muted">{o.desc}</span>
              </>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Partita({
  partita,
  onPartita,
  velocita,
  onVelocita,
  onEsci,
}: {
  partita: PartitaLocale;
  onPartita: (p: PartitaLocale) => void;
  velocita: Velocita;
  onVelocita: (v: Velocita) => void;
  onEsci: () => void;
}) {
  const t = usaT(dizionari);
  const [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState(false);
  /** Sempre l'ultima partita: le mosse dei bot e le mie non devono sovrapporsi. */
  const corrente = useRef(partita);
  corrente.current = partita;

  // Tocca a un bot: dopo una pausa fa la sua mossa (e poi, se serve, il successivo).
  useEffect(() => {
    if (botDiTurno(partita) === null) return;
    const id = setTimeout(() => {
      try {
        onPartita(muoviBot(corrente.current));
      } catch (e) {
        setErrore(e instanceof Error ? e.message : "sconosciuto");
      }
    }, pausaBot(partita, velocita));
    return () => clearTimeout(id);
    // Si riparte a ogni cambio di stato (nuova mossa) o di velocità.
  }, [partita.stato, velocita]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gli errori transitori spariscono dopo qualche secondo.
  useEffect(() => {
    if (!errore) return;
    const id = setTimeout(() => setErrore(null), 4000);
    return () => clearTimeout(id);
  }, [errore]);

  const azione = (a: Record<string, unknown>) => {
    try {
      onPartita(agisci(corrente.current, a as { tipo: string }, caso));
      setErrore(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "sconosciuto");
    }
  };

  const v = vistaLocale(partita);
  const turnoBot = botDiTurno(partita);
  return (
    <>
      {errore && (
        <p className="errore" role="alert">
          {testoMessaggio(t, errore)}
        </p>
      )}
      {turnoBot !== null && (
        <p className="avviso" role="status">
          {t("botPensa", { nome: v.nomi.find((n) => n.posto === turnoBot)?.nome ?? "" })}
        </p>
      )}
      <Tavolo v={v} comandi={{ azione }} />
      <fieldset className="ul-nomi-crea ul-senza-bordo">
        <legend>{t("velocitaBot")}</legend>
        <div className="ul-segmento">
          {(Object.keys(VELOCITA) as Velocita[]).map((x) => (
            <button key={x} type="button" className={`btn${x === velocita ? " primario" : ""}`} aria-pressed={x === velocita} onClick={() => onVelocita(x)}>
              {t(`velocita_${x}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <section className="schermata allineata chiudi">
        {conferma ? (
          <>
            <p>{t("esciPartitaTesto")}</p>
            <button className="btn pericolo" onClick={onEsci}>
              {t("siEsci")}
            </button>
            <button className="btn" onClick={() => setConferma(false)}>
              {t("noContinua")}
            </button>
          </>
        ) : (
          <button className="btn pericolo-contorno" onClick={() => setConferma(true)}>
            {t("esciPartita")}
          </button>
        )}
      </section>
    </>
  );
}
