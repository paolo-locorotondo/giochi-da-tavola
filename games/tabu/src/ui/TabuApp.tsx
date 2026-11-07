import { useEffect, useRef, useState } from "react";
import { suona } from "@gdt/suoni";
import { usaLingua, usaT, type Traduttore } from "@gdt/i18n";
import { carteDi, type Carta } from "../carte";
import { dizionari } from "../locales";
import type { it as dizionarioIt } from "../locales/it";
import {
  avanzaCarta,
  cartaCorrente,
  chiudiTurno,
  eFinita,
  nuovaPartita,
  punteggioTurno,
  squadraDiTurno,
  vincitrice,
  type Fase,
  type Partita,
  type Turno,
} from "../logica";
import { nomiSquadre } from "../validazione";
import "./tabu.css";

const TURNO_VUOTO: Turno = { corrette: [], saltate: [], errori: [] };
const CHIAVE = "gdt-tabu-partita";

interface Salvata {
  partita: Partita | null;
  fase: Fase;
  turno: Turno;
}

function carica(): Salvata {
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (raw) {
      const s = JSON.parse(raw) as Salvata;
      if (s.partita && Array.isArray(s.partita.mazzo) && s.turno) {
        // Un turno a metà riparte dall'inizio: il timer non si può riprendere.
        return { ...s, fase: s.fase === "gioco" ? "pronti" : s.fase, turno: s.fase === "gioco" ? TURNO_VUOTO : s.turno };
      }
    }
  } catch {
    /* storage non disponibile: si riparte da zero */
  }
  return { partita: null, fase: "pronti", turno: TURNO_VUOTO };
}

type T = Traduttore<typeof dizionarioIt>;

export function TabuApp() {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  const [iniziale] = useState(carica);
  const [partita, setPartita] = useState<Partita | null>(iniziale.partita);
  const [fase, setFase] = useState<Fase>(iniziale.fase);
  const [turno, setTurno] = useState<Turno>(iniziale.turno);

  // La partita sopravvive al refresh della pagina.
  useEffect(() => {
    try {
      if (partita) localStorage.setItem(CHIAVE, JSON.stringify({ partita, fase, turno }));
      else localStorage.removeItem(CHIAVE);
    } catch {
      /* ignora */
    }
  }, [partita, fase, turno]);

  if (!partita) {
    return (
      <Configurazione
        onAvvia={(nomi, turni, secondi) => {
          setPartita(nuovaPartita(nomi, turni, secondi, carteDi(lingua), Math.floor(Math.random() * 2 ** 32)));
          setFase("pronti");
        }}
      />
    );
  }

  const squadra = partita.squadre[squadraDiTurno(partita)];

  if (eFinita(partita)) {
    const v = vincitrice(partita);
    return (
      <section className="schermata">
        <h2>{v === null ? t("pareggio") : t("vince", { squadra: partita.squadre[v].nome })}</h2>
        <p>{risultato(t, partita)}</p>
        <h3>{t("carteDellaPartita")}</h3>
        {partita.storico.map((x, i) => (
          <div key={i} className="turno-storico">
            <p className="muted">
              {t("turnoStorico", {
                squadra: partita.squadre[x.squadra].nome,
                n: Math.floor(i / 2) + 1,
                punti: `${punteggioTurno(x.turno) >= 0 ? "+" : ""}${punteggioTurno(x.turno)}`,
              })}
            </p>
            <RiepilogoCarte turno={x.turno} mazzo={partita.mazzo} />
          </div>
        ))}
        <button className="btn primario" onClick={() => setPartita(null)}>
          {t("nuovaPartita")}
        </button>
      </section>
    );
  }

  if (fase === "pronti") {
    return (
      <section className="schermata">
        <p className="muted">{risultato(t, partita)}</p>
        <p>{t("toccaA")}</p>
        <h2>{squadra.nome}</h2>
        <p className="muted">{t("istruzioni")}</p>
        <button
          className="btn primario"
          onClick={() => {
            setTurno(TURNO_VUOTO);
            setFase("gioco");
          }}
        >
          {t("via")}
        </button>
        <ChiudiPartita onChiudi={() => setPartita(null)} />
      </section>
    );
  }

  if (fase === "gioco") {
    return (
      <Gioco
        partita={partita}
        turno={turno}
        onCambia={(t) => {
          setTurno(t);
          setPartita(avanzaCarta(partita));
        }}
        onTempoFinito={() => setFase("riepilogo")}
      />
    );
  }

  const p = punteggioTurno(turno);
  return (
    <section className="schermata">
      <h2>{t("tempoScaduto")}</h2>
      <p>{t("riepilogoTurno", { squadra: squadra.nome, corrette: turno.corrette.length, errori: turno.errori.length })}</p>
      <p className="grande">
        {p >= 0 ? "+" : ""}
        {p}
      </p>
      <RiepilogoCarte turno={turno} mazzo={partita.mazzo} />
      <button
        className="btn primario"
        onClick={() => {
          setPartita(chiudiTurno(partita, turno));
          setFase("pronti");
        }}
      >
        {t("avanti")}
      </button>
    </section>
  );
}

/** Testo del punteggio: «Rossi 3 – 2 Blu». */
function risultato(t: T, p: Partita): string {
  return t("risultato", { a: p.squadre[0].nome, puntiA: p.squadre[0].punti, puntiB: p.squadre[1].punti, b: p.squadre[1].nome });
}

/** Parola in grassetto con le vietate tra parentesi: «burro (latte, pane, …)». Le carte sono quelle del mazzo della partita. */
function VoceCarta({ parola, mazzo }: { parola: string; mazzo: readonly Carta[] }) {
  const vietate = mazzo.find((c) => c.parola === parola)?.vietate ?? [];
  return (
    <li>
      <strong>{parola}</strong>
      {vietate.length > 0 && <span className="muted"> ({vietate.join(", ")})</span>}
    </li>
  );
}

function ElencoCarte({ titolo, parole, mazzo, aperto }: { titolo: string; parole: string[]; mazzo: readonly Carta[]; aperto?: boolean }) {
  const t = usaT(dizionari);
  return (
    <details className="accordion" open={aperto}>
      <summary>
        {titolo} ({parole.length})
      </summary>
      <div className="accordion-corpo">
        {parole.length === 0 ? (
          <p className="muted">{t("nessuna")}</p>
        ) : (
          <ul className="parole">
            {parole.map((p, i) => (
              <VoceCarta key={i} parola={p} mazzo={mazzo} />
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function RiepilogoCarte({ turno, mazzo }: { turno: Turno; mazzo: readonly Carta[] }) {
  const t = usaT(dizionari);
  return (
    <div className="riepilogo-carte">
      <ElencoCarte titolo={t("indovinate")} parole={turno.corrette} mazzo={mazzo} />
      <ElencoCarte titolo={t("vietataDetta")} parole={turno.errori} mazzo={mazzo} />
      <ElencoCarte titolo={t("passate")} parole={turno.saltate} mazzo={mazzo} />
    </div>
  );
}

function Gioco({
  partita,
  turno,
  onCambia,
  onTempoFinito,
}: {
  partita: Partita;
  turno: Turno;
  onCambia: (t: Turno) => void;
  onTempoFinito: () => void;
}) {
  const t = usaT(dizionari);
  const [rimasti, setRimasti] = useState(partita.secondiTurno);
  const fine = useRef(onTempoFinito);
  fine.current = onTempoFinito;

  // Scadenza calcolata sull'orologio: resta giusta anche se il telefono rallenta il timer.
  useEffect(() => {
    const scadenza = Date.now() + partita.secondiTurno * 1000;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((scadenza - Date.now()) / 1000));
      setRimasti(s);
      if (s === 0) {
        clearInterval(id);
        navigator.vibrate?.(400);
        suona("fineTurno");
        fine.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [partita.secondiTurno]);

  const c = cartaCorrente(partita);
  return (
    <section className="schermata">
      <p className="grande">{t("secondi", { n: rimasti })}</p>
      <div className="carta">
        <p className="grande">{c.parola}</p>
        <p className="muted">{t("nonDire")}</p>
        {c.vietate.map((v) => (
          <p key={v} className="vietata">
            {v}
          </p>
        ))}
      </div>
      <div className="comandi">
        <button
          className="btn primario"
          data-suono="no"
          onClick={() => {
            suona("indovinata");
            onCambia({ ...turno, corrette: [...turno.corrette, c.parola] });
          }}
        >
          {t("btnIndovinata")}
        </button>
        <button
          className="btn pericolo"
          data-suono="no"
          onClick={() => {
            suona("vietata");
            onCambia({ ...turno, errori: [...turno.errori, c.parola] });
          }}
        >
          {t("btnVietata")}
        </button>
        <button
          className="btn passa"
          data-suono="no"
          onClick={() => {
            suona("passa");
            onCambia({ ...turno, saltate: [...turno.saltate, c.parola] });
          }}
        >
          {t("btnPassa")}
        </button>
      </div>
      <p className="muted">{t("puntiDelTurno", { punti: punteggioTurno(turno) })}</p>
      <RiepilogoCarte turno={turno} mazzo={partita.mazzo} />
    </section>
  );
}

/** Numero con − e + (limiti min/max): più rapido di un menu su telefono. */
function Selettore({
  etichetta,
  valore,
  min,
  max,
  passo,
  onCambia,
}: {
  etichetta: string;
  valore: number;
  min: number;
  max: number;
  passo: number;
  onCambia: (v: number) => void;
}) {
  const t = usaT(dizionari);
  const imposta = (v: number) => onCambia(Math.min(max, Math.max(min, v)));
  return (
    <div className="campo" role="group" aria-label={etichetta}>
      {etichetta}
      <div className="selettore">
        <button type="button" className="tema-btn" aria-label={t("meno", { cosa: etichetta.toLowerCase() })} disabled={valore <= min} onClick={() => imposta(valore - passo)}>
          −
        </button>
        <output className="selettore-valore" aria-live="polite">
          {valore}
        </output>
        <button type="button" className="tema-btn" aria-label={t("piu", { cosa: etichetta.toLowerCase() })} disabled={valore >= max} onClick={() => imposta(valore + passo)}>
          +
        </button>
      </div>
      <span className="muted selettore-limiti">
        {t("daA", { min, max })}
      </span>
    </div>
  );
}

function Configurazione({
  onAvvia,
}: {
  onAvvia: (nomi: [string, string], turni: number, secondi: number) => void;
}) {
  const t = usaT(dizionari);
  const predefiniti: [string, string] = [t("squadraN", { n: 1 }), t("squadraN", { n: 2 })];
  const [a, setA] = useState(predefiniti[0]);
  const [b, setB] = useState(predefiniti[1]);
  const [turni, setTurni] = useState(5);
  const [secondi, setSecondi] = useState(60);

  return (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        onAvvia(nomiSquadre(a, b, predefiniti), turni, secondi);
      }}
    >
      <label className="campo">
        {t("primaSquadra")}
        <input value={a} onChange={(e) => setA(e.target.value)} />
      </label>
      <label className="campo">
        {t("secondaSquadra")}
        <input value={b} onChange={(e) => setB(e.target.value)} />
      </label>
      <Selettore etichetta={t("turniPerSquadra")} valore={turni} min={1} max={20} passo={1} onCambia={setTurni} />
      <Selettore etichetta={t("secondiPerTurno")} valore={secondi} min={10} max={180} passo={5} onCambia={setSecondi} />
      <button className="btn primario" type="submit">
        {t("inizia")}
      </button>
    </form>
  );
}

function ChiudiPartita({ onChiudi }: { onChiudi: () => void }) {
  const t = usaT(dizionari);
  const [conferma, setConferma] = useState(false);
  if (!conferma) {
    return (
      <div className="chiudi-partita">
        <button className="btn pericolo-contorno" onClick={() => setConferma(true)}>
          {t("chiudiPartita")}
        </button>
      </div>
    );
  }
  return (
    <div className="rivedi">
      <p>{t("chiudereConferma")}</p>
      <button className="btn pericolo" onClick={onChiudi}>
        {t("siChiudi")}
      </button>
      <button className="btn" onClick={() => setConferma(false)}>
        {t("noContinua")}
      </button>
    </div>
  );
}
