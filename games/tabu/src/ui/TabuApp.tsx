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

export function TabuApp() {
  const [partita, setPartita] = useState<Partita | null>(null);
  const [fase, setFase] = useState<Fase>("pronti");
  const [turno, setTurno] = useState<Turno>(TURNO_VUOTO);

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
      <div className="giocatori">
        <button
          className="btn primario"
          onClick={() => onCambia({ ...turno, corrette: [...turno.corrette, c.parola] })}
        >
          Indovinata (+1)
        </button>
        <button
          className="btn"
          onClick={() => onCambia({ ...turno, errori: [...turno.errori, c.parola] })}
        >
          Vietata detta (−1)
        </button>
      </div>
      <button
        className="btn"
        onClick={() => onCambia({ ...turno, saltate: [...turno.saltate, c.parola] })}
      >
        Passa
      </button>
      <p className="muted">Punti del turno: {punteggioTurno(turno)}</p>
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
