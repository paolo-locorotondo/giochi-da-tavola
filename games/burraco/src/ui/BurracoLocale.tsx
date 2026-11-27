import { useEffect, useRef, useState, type FormEvent } from "react";
import { CampoTesto } from "@gdt/collegamento";
import { MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { cancellaPartita, leggiPartita, scriviPartita } from "@gdt/preferenze";
import { dizionari } from "../locales";
import { testoMessaggio } from "../errori-ui";
import { LIVELLI, type Livello } from "../bot";
import { OBIETTIVI, OBIETTIVO_BASE, PILA_BASE, PILE, type Obiettivo, type Pila } from "../regole";
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

const GIOCO = "burraco";
const CHIAVE = "gdt.burraco.offline";

interface Salvate {
  nome?: string;
  giocatori?: 2 | 4;
  livello?: Livello;
  velocita?: Velocita;
  obiettivo?: Obiettivo;
  pila?: Pila;
}

/** Le ultime scelte sul telefono: solo comodità, mai necessarie. */
function leggiSalvate(): Salvate {
  try {
    const g = JSON.parse(localStorage.getItem(CHIAVE) ?? "{}") as Record<string, unknown>;
    return {
      nome: typeof g.nome === "string" ? g.nome.slice(0, MAX_CARATTERI_NOME) : undefined,
      giocatori: g.giocatori === 2 || g.giocatori === 4 ? g.giocatori : undefined,
      livello: LIVELLI.includes(g.livello as Livello) ? (g.livello as Livello) : undefined,
      velocita: g.velocita === "lenta" || g.velocita === "normale" || g.velocita === "veloce" ? g.velocita : undefined,
      obiettivo: (OBIETTIVI as readonly unknown[]).includes(g.obiettivo) ? (g.obiettivo as Obiettivo) : undefined,
      pila: (PILE as readonly unknown[]).includes(g.pila) ? (g.pila as Pila) : undefined,
    };
  } catch {
    return {};
  }
}
function salva(dati: Required<Salvate>) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(dati));
  } catch {
    /* niente memoria: si riparte dai valori di base */
  }
}

/** Burraco su un solo telefono, contro i bot. */
export function BurracoLocale() {
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
  const [giocatori, setGiocatori] = useState<2 | 4>(salvate.giocatori ?? 2);
  const [livello, setLivello] = useState<Livello>(salvate.livello ?? "medio");
  const [obiettivo, setObiettivo] = useState<Obiettivo>(salvate.obiettivo ?? OBIETTIVO_BASE);
  const [pila, setPila] = useState<Pila>(salvate.pila ?? PILA_BASE);
  const [errore, setErrore] = useState<string | null>(null);
  const pulito = nome.trim();

  // Ordine dei posti: tu (1), avversario (2), compagno (3), avversario (4).
  const nomi = giocatori === 2 ? [pulito, t("botAvversario", { n: 1 })] : [pulito, t("botAvversario", { n: 1 }), t("botCompagno"), t("botAvversario", { n: 2 })];

  return (
    <form
      className="schermata allineata"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!pulito) return;
        try {
          salva({ nome: pulito, giocatori, livello, velocita, obiettivo, pila });
          onAvvia(nuovaPartitaLocale({ nomi, livello, config: { obiettivo, pila } }, caso()));
        } catch (err) {
          setErrore(err instanceof Error ? err.message : "sconosciuto");
        }
      }}
    >
      <CampoTesto label={t("tuoNome")} value={nome} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={setNome} />

      <Opzioni
        legenda={t("quantiGiocatori")}
        nome="giocatori"
        valore={String(giocatori)}
        onCambia={(v) => setGiocatori(v === "4" ? 4 : 2)}
        voci={[
          { valore: "2", titolo: t("dueGiocatori"), desc: t("dueGiocatoriDesc") },
          { valore: "4", titolo: t("quattroGiocatori"), desc: t("quattroGiocatoriDesc") },
        ]}
      />
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
        legenda={t("obiettivoTitolo")}
        nome="obiettivo"
        valore={String(obiettivo)}
        onCambia={(v) => setObiettivo(Number(v) as Obiettivo)}
        voci={OBIETTIVI.map((o) => ({ valore: String(o), titolo: t(`obiettivo_${o}`) }))}
      />
      <Opzioni
        legenda={t("pilaTitolo")}
        nome="pila"
        valore={pila}
        onCambia={setPila}
        voci={PILE.map((p) => ({ valore: p, titolo: t(`pila_${p}`), desc: t(`pila_${p}Desc`) }))}
      />

      {errore && (
        <p className="errore" role="alert">
          {testoMessaggio(t, errore)}
        </p>
      )}
      <button className="btn primario" type="submit" disabled={!pulito}>
        {t("iniziaControBot")}
      </button>
    </form>
  );
}

export function Opzioni<V extends string>({
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
    <fieldset className="bu-gruppo bu-senza-bordo">
      <legend>{legenda}</legend>
      {voci.map((o) => (
        <label key={o.valore} className="bu-opzione">
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
  /** Sempre l'ultima partita: i passi dei bot e i miei non devono sovrapporsi. */
  const corrente = useRef(partita);
  corrente.current = partita;

  // Tocca a un bot: dopo una pausa fa un passo (e poi, se serve, il successivo).
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
    // Si riparte a ogni cambio di stato (nuovo passo) o di velocità.
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
      {turnoBot !== null && (
        <p className="avviso" role="status">
          {t("botPensa", { nome: v.nomi.find((n) => n.posto === turnoBot)?.nome ?? "" })}
        </p>
      )}
      <Tavolo v={v} comandi={{ azione, errore: errore ? testoMessaggio(t, errore) : null }} />
      <fieldset className="bu-gruppo bu-senza-bordo velocita-bot">
        <legend>{t("velocitaBot")}</legend>
        <div className="bu-segmento">
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
