import { useEffect, useRef, useState } from "react";
import { CARTE } from "../carte";
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

export function TabuApp() {
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
          setPartita(nuovaPartita(nomi, turni, secondi, CARTE, Math.floor(Math.random() * 2 ** 32)));
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
        <h2>{v === null ? "Pareggio!" : `Vince ${partita.squadre[v].nome}!`}</h2>
        <p>
          {partita.squadre[0].nome} {partita.squadre[0].punti} – {partita.squadre[1].punti}{" "}
          {partita.squadre[1].nome}
        </p>
        <h3>Carte della partita</h3>
        {partita.storico.map((x, i) => (
          <div key={i} className="turno-storico">
            <p className="muted">
              {partita.squadre[x.squadra].nome} · turno {Math.floor(i / 2) + 1} ({punteggioTurno(x.turno) >= 0 ? "+" : ""}
              {punteggioTurno(x.turno)})
            </p>
            <RiepilogoCarte turno={x.turno} />
          </div>
        ))}
        <button className="btn primario" onClick={() => setPartita(null)}>
          Nuova partita
        </button>
      </section>
    );
  }

  if (fase === "pronti") {
    return (
      <section className="schermata">
        <p className="muted">
          {partita.squadre[0].nome} {partita.squadre[0].punti} – {partita.squadre[1].punti}{" "}
          {partita.squadre[1].nome}
        </p>
        <p>Tocca a</p>
        <h2>{squadra.nome}</h2>
        <p className="muted">
          Un giocatore descrive le parole, i compagni indovinano. Una persona della squadra
          avversaria controlla le parole vietate. Chi descrive tiene il telefono.
        </p>
        <button
          className="btn primario"
          onClick={() => {
            setTurno(TURNO_VUOTO);
            setFase("gioco");
          }}
        >
          Via!
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
      <h2>Tempo scaduto!</h2>
      <p>
        {squadra.nome}: {turno.corrette.length} indovinate, {turno.errori.length} errori (−1
        ciascuno)
      </p>
      <p className="grande">
        {p >= 0 ? "+" : ""}
        {p}
      </p>
      <RiepilogoCarte turno={turno} />
      <button
        className="btn primario"
        onClick={() => {
          setPartita(chiudiTurno(partita, turno));
          setFase("pronti");
        }}
      >
        Avanti
      </button>
    </section>
  );
}

/** Parola in grassetto con le vietate tra parentesi: «burro (latte, pane, …)». */
function VoceCarta({ parola }: { parola: string }) {
  const vietate = CARTE.find((c) => c.parola === parola)?.vietate ?? [];
  return (
    <li>
      <strong>{parola}</strong>
      {vietate.length > 0 && <span className="muted"> ({vietate.join(", ")})</span>}
    </li>
  );
}

function ElencoCarte({ titolo, parole, aperto }: { titolo: string; parole: string[]; aperto?: boolean }) {
  return (
    <details className="accordion" open={aperto}>
      <summary>
        {titolo} ({parole.length})
      </summary>
      <div className="accordion-corpo">
        {parole.length === 0 ? (
          <p className="muted">Nessuna.</p>
        ) : (
          <ul className="parole">
            {parole.map((p, i) => (
              <VoceCarta key={i} parola={p} />
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function RiepilogoCarte({ turno }: { turno: Turno }) {
  return (
    <div className="riepilogo-carte">
      <ElencoCarte titolo="Indovinate" parole={turno.corrette} />
      <ElencoCarte titolo="Vietata detta" parole={turno.errori} />
      <ElencoCarte titolo="Passate" parole={turno.saltate} />
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
        fine.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [partita.secondiTurno]);

  const c = cartaCorrente(partita);
  return (
    <section className="schermata">
      <p className="grande">{rimasti}s</p>
      <div className="carta">
        <p className="grande">{c.parola}</p>
        <p className="muted">Non dire:</p>
        {c.vietate.map((v) => (
          <p key={v} className="vietata">
            {v}
          </p>
        ))}
      </div>
      <div className="comandi">
        <button
          className="btn primario"
          onClick={() => onCambia({ ...turno, corrette: [...turno.corrette, c.parola] })}
        >
          Indovinata (+1)
        </button>
        <button
          className="btn pericolo"
          onClick={() => onCambia({ ...turno, errori: [...turno.errori, c.parola] })}
        >
          Vietata detta (−1)
        </button>
        <button
          className="btn passa"
          onClick={() => onCambia({ ...turno, saltate: [...turno.saltate, c.parola] })}
        >
          Passa
        </button>
      </div>
      <p className="muted">Punti del turno: {punteggioTurno(turno)}</p>
      <RiepilogoCarte turno={turno} />
    </section>
  );
}

function Configurazione({
  onAvvia,
}: {
  onAvvia: (nomi: [string, string], turni: number, secondi: number) => void;
}) {
  const [a, setA] = useState("Squadra 1");
  const [b, setB] = useState("Squadra 2");
  const [turni, setTurni] = useState(5);
  const [secondi, setSecondi] = useState(60);

  return (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        onAvvia([a.trim() || "Squadra 1", b.trim() || "Squadra 2"], turni, secondi);
      }}
    >
      <label className="campo">
        Prima squadra
        <input value={a} onChange={(e) => setA(e.target.value)} />
      </label>
      <label className="campo">
        Seconda squadra
        <input value={b} onChange={(e) => setB(e.target.value)} />
      </label>
      <label className="campo">
        Turni per squadra
        <select value={turni} onChange={(e) => setTurni(Number(e.target.value))}>
          {[3, 4, 5, 6, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        Secondi per turno
        <select value={secondi} onChange={(e) => setSecondi(Number(e.target.value))}>
          {[30, 45, 60, 90, 120].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button className="btn primario" type="submit">
        Inizia
      </button>
    </form>
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
