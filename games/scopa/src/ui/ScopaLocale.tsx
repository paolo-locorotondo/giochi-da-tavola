import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { cancellaPartita, leggiPartita, scriviPartita } from "@gdt/preferenze";
import { dizionari } from "../locales";
import { testoMessaggio } from "../errori-ui";
import { LIVELLI, type Livello } from "../bot";
import { SOGLIE, SOGLIA_PREDEFINITA, type Posti, type Soglia } from "../regole";
import {
  VELOCITA,
  VELOCITA_PREDEFINITA,
  VERSIONE_SALVATAGGIO,
  agisci,
  botDiTurno,
  muoviBot,
  eSalvataggio,
  nuovaPartitaLocale,
  pausaBot,
  riprendi,
  vistaLocale,
  type PartitaLocale,
  type Velocita,
} from "../offline";
import { Tavolo } from "./Tavolo";

/** Un numero casuale a 32 bit per il seme di ogni mano. */
const caso = () => Math.floor(Math.random() * 2 ** 32);

const GIOCO = "scopa";
const CHIAVE = "gdt.scopa.offline";

interface Salvate {
  nome: string;
  livello: Livello;
  velocita: Velocita;
  posti: Posti;
  soglia: Soglia;
}

/** Le ultime scelte sul telefono: solo comodità, mai necessarie. */
function leggiSalvate(): Partial<Salvate> {
  try {
    const g = JSON.parse(localStorage.getItem(CHIAVE) ?? "{}") as Record<string, unknown>;
    return {
      nome: typeof g.nome === "string" ? g.nome : undefined,
      livello: LIVELLI.includes(g.livello as Livello) ? (g.livello as Livello) : undefined,
      velocita: g.velocita === "lenta" || g.velocita === "normale" || g.velocita === "veloce" ? g.velocita : undefined,
      posti: g.posti === 2 || g.posti === 4 ? g.posti : undefined,
      soglia: (SOGLIE as readonly unknown[]).includes(g.soglia) ? (g.soglia as Soglia) : undefined,
    };
  } catch {
    return {};
  }
}
function salva(dati: Salvate) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(dati));
  } catch {
    /* niente memoria: si riparte dai valori di base */
  }
}

/** La Scopa su un solo telefono, contro i bot. */
export function ScopaLocale() {
  // Dopo un refresh si torna alla partita in corso (stato, turno, mani dei bot, velocità), senza domande.
  const [ripresa] = useState(() => leggiPartita(GIOCO, VERSIONE_SALVATAGGIO, eSalvataggio));
  const [partita, setPartita] = useState<PartitaLocale | null>(() => (ripresa ? riprendi(ripresa.partita) : null));
  const [velocita, setVelocita] = useState<Velocita>(() => ripresa?.velocita ?? leggiSalvate().velocita ?? VELOCITA_PREDEFINITA);

  // Si salva solo mentre la partita è in corso: a partita finita o con «Esci dalla partita» il salvataggio si cancella.
  useEffect(() => {
    if (partita && partita.stato.fase !== "fine") scriviPartita(GIOCO, VERSIONE_SALVATAGGIO, { partita, velocita });
    else cancellaPartita(GIOCO);
  }, [partita, velocita]);

  if (!partita) return <Crea velocita={velocita} onVelocita={setVelocita} onAvvia={setPartita} />;
  return <Partita partita={partita} onPartita={setPartita} velocita={velocita} onVelocita={setVelocita} onEsci={() => setPartita(null)} />;
}

function Crea({ velocita, onVelocita, onAvvia }: { velocita: Velocita; onVelocita: (v: Velocita) => void; onAvvia: (p: PartitaLocale) => void }) {
  const t = usaT(dizionari);
  const salvate = leggiSalvate();
  const [nome, setNome] = useState(salvate.nome ?? "");
  const [posti, setPosti] = useState<Posti>(salvate.posti ?? 2);
  // Bot 1 è l'avversario, Bot 2 il compagno (a 4), Bot 3 il secondo avversario.
  const [bot, setBot] = useState<string[]>([t("nomeBot", { n: 1 }), t("nomeBot", { n: 2 }), t("nomeBot", { n: 3 })]);
  const [livello, setLivello] = useState<Livello>(salvate.livello ?? "medio");
  const [soglia, setSoglia] = useState<Soglia>(salvate.soglia ?? SOGLIA_PREDEFINITA);
  const [errore, setErrore] = useState<string | null>(null);
  const nomi = [nome.trim(), ...bot.slice(0, posti - 1).map((n) => n.trim())];
  const distinti = new Set(nomi.map((n) => n.toLowerCase())).size === nomi.length;
  const validi = nomi.every(Boolean) && distinti;
  const cambiaBot = (i: number, v: string) => setBot(bot.map((n, k) => (k === i ? v : n)));

  return (
    <form
      className="schermata allineata"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!validi) return;
        try {
          salva({ nome: nome.trim(), livello, velocita, posti, soglia });
          onAvvia(nuovaPartitaLocale({ nomi, livello, config: { posti, soglia } }, caso()));
        } catch (err) {
          setErrore(err instanceof Error ? err.message : "sconosciuto");
        }
      }}
    >
      <Opzioni
        legenda={t("quantiGiocatori")}
        nome="posti"
        valore={posti}
        onCambia={setPosti}
        voci={([2, 4] as const).map((p) => ({ valore: p, titolo: t(`posti_${p}Bot`), desc: t(`posti_${p}BotDesc`) }))}
      />

      <fieldset className="sc-gruppo sc-senza-bordo">
        <legend>{t("nomiGiocatoriBot")}</legend>
        <label className="campo">
          {t("tuoNome")}
          <input value={nome} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={(e) => setNome(e.target.value)} />
        </label>
        {bot.slice(0, posti - 1).map((n, i) => (
          <label key={i} className="campo">
            {posti === 4 && i === 1 ? t("nomeBotCompagno") : t("nomeBotCampo", { n: i + 1 })}
            <input value={n} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={(e) => cambiaBot(i, e.target.value)} />
          </label>
        ))}
        <span className="suggerimento">{t("botAiutoCrea")}</span>
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
      <Opzioni
        legenda={t("sogliaTitolo")}
        nome="soglia"
        valore={soglia}
        onCambia={setSoglia}
        voci={SOGLIE.map((s) => ({ valore: s, titolo: t(`soglia_${s}`), desc: t(`soglia_${s}Desc`) }))}
      />

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

export function Opzioni<V extends string | number>({
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
    <fieldset className="sc-gruppo sc-senza-bordo">
      <legend>{legenda}</legend>
      {voci.map((o) => (
        <label key={o.valore} className="sc-opzione">
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
    }, pausaBot(velocita));
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
      <fieldset className="sc-gruppo sc-senza-bordo">
        <legend>{t("velocitaBot")}</legend>
        <div className="sc-segmento">
          {(Object.keys(VELOCITA) as Velocita[]).map((x) => (
            <button key={x} type="button" className="btn" aria-pressed={x === velocita} onClick={() => onVelocita(x)}>
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
