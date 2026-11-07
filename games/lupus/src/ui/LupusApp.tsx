import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import {
  candidatiNotte,
  contaVoti,
  lupiConsigliati,
  riduci,
  statoIniziale,
  type Ruolo,
  type Stato,
} from "../logica";
import { validaConfigurazione } from "../validazione";
import { audioAttivo, seguiAudio, suona, type NomeSuono } from "@gdt/suoni";
import { parla, silenzio } from "./voce";
import "./lupus.css";

const NOME_RUOLO: Record<Ruolo, string> = {
  lupo: "Lupo",
  contadino: "Contadino",
  veggente: "Veggente",
  medico: "Medico",
};

const DESCRIZIONE_RUOLO: Record<Ruolo, string> = {
  lupo: "Di notte scegli con gli altri lupi chi sbranare. Di giorno fingi di essere innocente.",
  contadino: "Non hai poteri: scopri i lupi parlando e votando.",
  veggente: "Ogni notte scopri se un giocatore è un lupo.",
  medico: "Ogni notte proteggi un giocatore dai lupi (non lo stesso due notti di fila).",
};

/** Il verso di chi muore, uno per ruolo: con un ruolo nuovo il compilatore chiede il suo suono. */
const SUONO_MORTO: Record<Ruolo, NomeSuono> = {
  lupo: "mortoLupo",
  contadino: "mortoContadino",
  veggente: "mortoVeggente",
  medico: "mortoMedico",
};

const CHIAVE = "gdt-lupus-partita";

function caricaStato(): Stato {
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (raw) {
      const s = JSON.parse(raw) as Stato;
      if (Array.isArray(s.giocatori) && s.ruoli && Array.isArray(s.vivi)) return { ...statoIniziale(), ...s };
    }
  } catch {
    /* storage non disponibile o dati rovinati: si riparte da zero */
  }
  return statoIniziale();
}

function salvaStato(s: Stato) {
  try {
    if (s.giocatori.length === 0) localStorage.removeItem(CHIAVE);
    else localStorage.setItem(CHIAVE, JSON.stringify(s));
  } catch {
    /* ignora */
  }
}

function nomeDi(s: Stato, posto: number | null): string {
  return s.giocatori.find((g) => g.posto === posto)?.nome ?? "";
}

export function LupusApp() {
  const [s, dispatch] = useReducer(riduci, undefined, caricaStato);

  // La partita sopravvive al refresh della pagina.
  useEffect(() => salvaStato(s), [s]);
  const [voce, setVoce] = useState(true);
  // L'interruttore audio delle impostazioni comanda su tutto: spento, la voce si ferma; riacceso, riparte la fase corrente.
  const [audio, setAudio] = useState(audioAttivo);
  useEffect(() => seguiAudio(() => setAudio(audioAttivo())), []);

  // Il narratore parla quando cambia la fase.
  useEffect(() => {
    if (!voce || !audio || s.giocatori.length === 0) return;
    const testo = frasePerFase(s);
    if (testo) parla(testo);
    return silenzio;
  }, [s.fase, s.notte, s.ballottaggio, s.eliminato, voce, audio, s.giocatori.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suoni di scena: ululato quando scende la notte, gallo all'alba. Il verso del morto solo se il narratore ne dice il ruolo.
  const faseSuoni = useRef(s.fase);
  useEffect(() => {
    const prima = faseSuoni.current;
    faseSuoni.current = s.fase;
    if (prima === s.fase) return;
    const morto = s.fase === "alba" ? s.mortiNotte[0] : s.fase === "esito" ? s.eliminato : null;
    if (s.fase === "lupi") suona("ululato");
    else if (s.fase === "alba") suona("gallo");
    if (s.svelaRuoli && morto !== null && morto !== undefined) {
      suona(SUONO_MORTO[s.ruoli[morto] ?? "contadino"], s.fase === "alba" ? 1.5 : 0);
    }
  }, [s.fase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (s.giocatori.length === 0) {
    return (
      <Configurazione
        onAvvia={(nomi, svelaRuoli, narratoreGioca) =>
          dispatch({ tipo: "avvia", nomi, seme: Math.floor(Math.random() * 2 ** 32), svelaRuoli, narratoreGioca })
        }
      />
    );
  }

  const contenuto = (() => {
    switch (s.fase) {
      case "carte":
        return <Carte s={s} dispatch={dispatch} />;
      case "lupi":
      case "veggente":
      case "medico":
        return <Notte s={s} dispatch={dispatch} />;
      case "alba":
        return <Alba s={s} dispatch={dispatch} />;
      case "voto":
        return <Voto s={s} dispatch={dispatch} />;
      case "esito":
        return <Esito s={s} dispatch={dispatch} />;
      case "fine":
        return <Fine s={s} dispatch={dispatch} />;
    }
  })();

  return (
    <>
      <label className="voce">
        <input type="checkbox" checked={voce} onChange={(e) => setVoce(e.target.checked)} /> Voce
        del narratore
        {audio ? "" : " (audio spento nelle impostazioni)"}
      </label>
      {contenuto}
      {/* Se il narratore gioca o il telefono passa di mano, i ruoli restano coperti. */}
      {s.fase !== "carte" && s.fase !== "fine" && !s.narratoreGioca && <RuoliNarratore s={s} />}
      {s.fase !== "fine" && <ChiudiPartita onChiudi={() => dispatch({ tipo: "azzera" })} />}
    </>
  );
}

/** Per il narratore: chi è chi e chi è ancora vivo. Chiuso di default. */
function RuoliNarratore({ s }: { s: Stato }) {
  const vivi = s.vivi.length;
  return (
    <details className="accordion" style={{ marginTop: "1.25rem" }}>
      <summary>
        Giocatori e ruoli ({vivi} vivi su {s.giocatori.length})
      </summary>
      <div className="accordion-corpo">
        <p className="accordion-nota">Solo per il narratore: non mostrare lo schermo agli altri.</p>
        <ul className="ruoli-narratore">
          {s.giocatori.map((g) => {
            const vivo = s.vivi.includes(g.posto);
            return (
              <li key={g.posto} className={vivo ? "" : "morto"}>
                <span className="nome-g">{g.nome}</span>
                <span className="stato">
                  {NOME_RUOLO[s.ruoli[g.posto] ?? "contadino"]} · {vivo ? "vivo" : "morto"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

/** « Era Contadino.» se la partita svela i ruoli di chi muore, altrimenti nulla. */
function ruoloDetto(s: Stato, posto: number | null | undefined): string {
  if (!s.svelaRuoli || posto === null || posto === undefined) return "";
  return ` Era ${NOME_RUOLO[s.ruoli[posto] ?? "contadino"]}.`;
}

function frasePerFase(s: Stato): string | null {
  switch (s.fase) {
    case "lupi":
      return `Notte ${s.notte}. Il villaggio si addormenta. Tutti chiudono gli occhi. I lupi si risvegliano e scelgono chi sbranare.`;
    case "veggente":
      return "I lupi tornano a dormire. Il veggente si risveglia e indica un giocatore da esaminare.";
    case "medico":
      return "Il veggente torna a dormire. Il medico si risveglia e sceglie chi proteggere.";
    case "alba":
      return `Il villaggio si risveglia. ${
        s.mortiNotte.length
          ? `Questa notte è morto ${nomeDi(s, s.mortiNotte[0] ?? null)}.${ruoloDetto(s, s.mortiNotte[0])}`
          : "Questa notte non è morto nessuno."
      }`;
    case "voto":
      return s.ballottaggio
        ? "Ballottaggio. Votate tra i giocatori in parità."
        : "È ora di discutere e votare chi eliminare.";
    case "esito":
      return s.eliminato !== null
        ? `${nomeDi(s, s.eliminato)} è stato eliminato.${ruoloDetto(s, s.eliminato)}`
        : (s.messaggioVoto ?? null);
    case "fine":
      return s.vincitore === "villaggio" ? "Il villaggio ha vinto!" : "I lupi hanno vinto!";
    default:
      return null;
  }
}

type D = (a: Parameters<typeof riduci>[1]) => void;

function Configurazione({ onAvvia }: { onAvvia: (nomi: string[], svelaRuoli: boolean, narratoreGioca: boolean) => void }) {
  const [testo, setTesto] = useState("");
  const [svela, setSvela] = useState(true);
  const [narratoreGioca, setNarratoreGioca] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const nomi = testo
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);

  function invia(e: FormEvent) {
    e.preventDefault();
    const problema = validaConfigurazione(nomi);
    if (problema) {
      setErrore(problema);
      return;
    }
    setErrore(null);
    onAvvia(nomi, svela, narratoreGioca);
  }

  return (
    <form className="schermata allineata" onSubmit={invia}>
      <label className="campo">
        Giocatori (uno per riga, almeno 4)
        <textarea
          rows={8}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={"Anna\nLuca\nMarco\nSara"}
        />
      </label>
      <p className="suggerimento">
        {nomi.length >= 4
          ? `Ruoli: ${lupiConsigliati(nomi.length)} lupo/i${nomi.length >= 5 ? ", 1 veggente" : ""}${nomi.length >= 7 ? ", 1 medico" : ""}, il resto contadini.`
          : "I ruoli vengono assegnati in automatico in base al numero di giocatori."}
      </p>
      <label className="spunta">
        <input type="checkbox" checked={svela} onChange={(e) => setSvela(e.target.checked)} />
        Il narratore dice il ruolo di chi muore
      </label>
      <label className="spunta">
        <input
          type="checkbox"
          checked={narratoreGioca}
          onChange={(e) => setNarratoreGioca(e.target.checked)}
        />
        {narratoreGioca
          ? "Il narratore gioca (il telefono resta al centro e non compare l'elenco dei giocatori con ruoli e stato vivo/morto)"
          : "Il narratore non gioca (il telefono lo tiene il narratore, che avrà a supporto l'elenco dei giocatori con ruoli e stato vivo/morto)"}
      </label>
      {errore && <p className="errore">{errore}</p>}
      <button className="btn primario" type="submit">
        Inizia
      </button>
    </form>
  );
}

function Carte({ s, dispatch }: { s: Stato; dispatch: D }) {
  const g = s.giocatori[s.indiceCarta];
  if (!g) return null;
  if (!s.cartaMostrata) {
    return (
      <section className="schermata">
        <p className="muted">
          Carta {s.indiceCarta + 1} di {s.giocatori.length}
        </p>
        <p>Passa il telefono a</p>
        <h2>{g.nome}</h2>
        <button className="btn primario" onClick={() => dispatch({ tipo: "mostraCarta" })}>
          Mostra il mio ruolo
        </button>
      </section>
    );
  }
  const ruolo = s.ruoli[g.posto] ?? "contadino";
  const compagni =
    ruolo === "lupo"
      ? s.giocatori.filter((x) => x.posto !== g.posto && s.ruoli[x.posto] === "lupo")
      : [];
  return (
    <section className="schermata">
      <p className="muted">{g.nome}, guarda solo tu</p>
      <div className="carta">
        <p className="grande">{NOME_RUOLO[ruolo]}</p>
        <p>{DESCRIZIONE_RUOLO[ruolo]}</p>
        {compagni.length > 0 && <p className="muted">Compagni: {compagni.map((c) => c.nome).join(", ")}</p>}
      </div>
      <button className="btn" onClick={() => dispatch({ tipo: "prossimaCarta" })}>
        Ho visto, passa il telefono
      </button>
    </section>
  );
}

const TITOLO_NOTTE = {
  lupi: "I lupi scelgono la vittima",
  veggente: "Il veggente indaga",
  medico: "Il medico protegge",
} as const;

function Notte({ s, dispatch }: { s: Stato; dispatch: D }) {
  const fase = s.fase as keyof typeof TITOLO_NOTTE;
  const scelto = fase === "lupi" ? s.vittima : fase === "veggente" ? s.ispezionato : s.protetto;
  // I lupi non possono sbranarsi tra loro e il veggente non indaga su di sé; il medico non può ripetere la stessa protezione.
  const candidati = candidatiNotte(s);
  // Il veggente vede una sola persona: scelta fatta, gli altri nomi si bloccano.
  const bloccato = (p: number) => fase === "veggente" && s.ispezionato !== null && s.ispezionato !== p;
  const risultato =
    fase === "veggente" && s.ispezionato !== null
      ? s.ruoli[s.ispezionato] === "lupo"
        ? "È un lupo!"
        : "Non è un lupo."
      : null;

  return (
    <section className="schermata">
      <p className="muted">Notte {s.notte} — tutti a occhi chiusi</p>
      <h2>{TITOLO_NOTTE[fase]}</h2>
      <p className="muted">Solo chi ha il ruolo tocca il telefono.</p>
      <div className="giocatori">
        {candidati.map((p) => (
          <button
            key={p}
            className={`btn${scelto === p ? " primario" : ""}`}
            disabled={bloccato(p)}
            onClick={() => dispatch({ tipo: "scegli", posto: p })}
          >
            {nomeDi(s, p)}
          </button>
        ))}
      </div>
      {risultato && <p className="grande">{risultato}</p>}
      <button
        className="btn primario"
        disabled={scelto === null}
        onClick={() => dispatch({ tipo: "avanti" })}
      >
        {risultato ? "Ho visto, torna a dormire" : "Conferma"}
      </button>
    </section>
  );
}

function Alba({ s, dispatch }: { s: Stato; dispatch: D }) {
  const morto = s.mortiNotte[0];
  return (
    <section className="schermata">
      <h2>Il villaggio si risveglia</h2>
      {morto !== undefined ? (
        <p>
          Questa notte è morto <strong>{nomeDi(s, morto)}</strong>.{ruoloDetto(s, morto)}
        </p>
      ) : (
        <p>Questa notte non è morto nessuno.</p>
      )}
      <button
        className="btn primario"
        onClick={() => dispatch({ tipo: s.vincitore ? "dopoVoto" : "avanti" })}
      >
        {s.vincitore ? "Vedi il risultato" : "Si discute e si vota"}
      </button>
    </section>
  );
}

function Voto({ s, dispatch }: { s: Stato; dispatch: D }) {
  const [voti, setVoti] = useState<Record<number, number>>({});
  const candidati = s.ballottaggio ?? s.vivi;
  const totale = Object.values(voti).reduce((a, b) => a + b, 0);
  const cambia = (p: number, d: number) =>
    setVoti((v) => ({ ...v, [p]: Math.max(0, (v[p] ?? 0) + d) }));

  // Quando parte il ballottaggio i contatori ripartono da zero.
  useEffect(() => setVoti({}), [s.ballottaggio]);

  const { eliminato, pari } = contaVoti(voti);
  const pronto = totale === s.vivi.length;

  return (
    <section className="schermata allineata">
      <h2>{s.ballottaggio ? "Ballottaggio" : "Votazione"}</h2>
      {s.messaggioVoto && <p className="muted">{s.messaggioVoto}</p>}
      <p className="muted">
        Ognuno vota a voce un giocatore; segna i voti qui sotto. Devono votare tutti i vivi (
        {totale}/{s.vivi.length}).
      </p>
      {candidati.map((p) => (
        <div key={p} className="riga-voto">
          <span>{nomeDi(s, p)}</span>
          <button className="btn" onClick={() => cambia(p, -1)}>
            −
          </button>
          <strong>{voti[p] ?? 0}</strong>
          <button className="btn" disabled={totale >= s.vivi.length} onClick={() => cambia(p, 1)}>
            +
          </button>
        </div>
      ))}
      {pronto && pari.length > 1 && (
        <p className="muted">Pareggio tra {pari.map((p) => nomeDi(s, p)).join(", ")}.</p>
      )}
      <button
        className="btn primario"
        disabled={!pronto}
        onClick={() => dispatch({ tipo: "chiudiVoto", voti })}
      >
        {eliminato === null && pari.length > 1 && !s.ballottaggio
          ? "Vai al ballottaggio"
          : "Chiudi la votazione"}
      </button>
    </section>
  );
}

function Esito({ s, dispatch }: { s: Stato; dispatch: D }) {
  return (
    <section className="schermata">
      {s.eliminato !== null ? (
        <>
          <h2>{nomeDi(s, s.eliminato)} è eliminato</h2>
          {s.svelaRuoli && <p>Era {NOME_RUOLO[s.ruoli[s.eliminato] ?? "contadino"]}.</p>}
        </>
      ) : (
        <h2>{s.messaggioVoto}</h2>
      )}
      <button className="btn primario" onClick={() => dispatch({ tipo: "dopoVoto" })}>
        {s.vincitore ? "Vedi il risultato" : "Scende la notte"}
      </button>
    </section>
  );
}

function Fine({ s, dispatch }: { s: Stato; dispatch: D }) {
  useEffect(() => {
    suona(s.vincitore === "villaggio" ? "fineContadini" : "fineLupi");
  }, [s.vincitore]);
  return (
    <section className="schermata">
      <h2>{s.vincitore === "villaggio" ? "Vince il villaggio!" : "Vincono i lupi!"}</h2>
      <ul className="elenco-ruoli">
        {s.giocatori.map((g) => (
          <li key={g.posto} className={s.vivi.includes(g.posto) ? "" : "morto"}>
            {g.nome}: {NOME_RUOLO[s.ruoli[g.posto] ?? "contadino"]}
          </li>
        ))}
      </ul>
      <button className="btn primario" onClick={() => dispatch({ tipo: "azzera" })}>
        Nuova partita
      </button>
    </section>
  );
}

function ChiudiPartita({ onChiudi }: { onChiudi: () => void }) {
  const [conferma, setConferma] = useState(false);
  if (!conferma) {
    return (
      <div className="chiudi-partita">
        <button className="btn pericolo-contorno" onClick={() => setConferma(true)}>
          Chiudi la partita
        </button>
      </div>
    );
  }
  return (
    <div className="rivedi">
      <p>Chiudere la partita? Si perde lo stato attuale.</p>
      <button className="btn pericolo" onClick={onChiudi}>
        Sì, chiudi
      </button>
      <button className="btn" onClick={() => setConferma(false)}>
        No, continua
      </button>
    </div>
  );
}
