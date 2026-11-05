import { useEffect, useReducer, useState, type FormEvent } from "react";
import { creaGiocatori, type Giocatore } from "@gdt/engine";
import { carta, impostoriConsigliati, impostoriMassimi, type Partita } from "../logic/partita";
import { fasiImpostore, nuovaMacchinaImpostore, type EventoImpostore, type FaseImpostore } from "../logic/fasi";
import { esitoSessione, riduci, sessioneIniziale, type Sessione } from "../logic/sessione";
import { categorie, paroleDi, type Categoria } from "../parole";
import { leggiRecenti, ricordaParola } from "./recenti";
import "./impostore.css";

const NOME_CATEGORIA: Record<Categoria, string> = {
  cibi: "Cibi",
  animali: "Animali",
  luoghi: "Luoghi",
  mestieri: "Mestieri",
  sport: "Sport",
  oggetti: "Oggetti",
  trasporti: "Mezzi di trasporto",
};

const CHIAVE = "gdt-impostore-locale";

/** La macchina a stati ha funzioni: si salva solo la storia delle fasi e la si rigioca al caricamento. */
function caricaSessione(): { sessione: Sessione; categoria: Categoria } {
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (raw) {
      const { macchina: _scartata, storia, categoria, ...resto } = JSON.parse(raw) as Sessione & {
        storia: FaseImpostore[];
        categoria: Categoria;
        macchina?: unknown;
      };
      let macchina = nuovaMacchinaImpostore();
      for (const prossima of storia.slice(1)) {
        const evento = (Object.entries(fasiImpostore.transizioni[macchina.fase]) as [EventoImpostore, FaseImpostore][]).find(
          ([, f]) => f === prossima,
        )?.[0];
        if (!evento) throw new Error("storia non valida");
        macchina = macchina.invia(evento);
      }
      if (resto.partita) return { sessione: { ...resto, macchina }, categoria };
    }
  } catch {
    /* storage non disponibile o dati rovinati: si riparte da zero */
  }
  return { sessione: sessioneIniziale(), categoria: "cibi" };
}

export function ImpostoreLocale() {
  const [iniziale] = useState(caricaSessione);
  const [sessione, dispatch] = useReducer(riduci, iniziale.sessione);
  const [categoriaPartita, setCategoriaPartita] = useState<Categoria>(iniziale.categoria);

  // La partita sopravvive al refresh della pagina.
  useEffect(() => {
    try {
      if (sessione.partita) {
        const { macchina, ...resto } = sessione;
        localStorage.setItem(CHIAVE, JSON.stringify({ ...resto, storia: macchina.storia, categoria: categoriaPartita }));
      } else localStorage.removeItem(CHIAVE);
    } catch {
      /* ignora */
    }
  }, [sessione, categoriaPartita]);
  const { partita } = sessione;

  if (!partita) {
    return (
      <Configurazione
        onAvvia={(nomi, numImpostori, categoria) => {
          setCategoriaPartita(categoria);
          dispatch({
            tipo: "avvia",
            nomi,
            numImpostori,
            parole: paroleDi(categoria),
            escluse: leggiRecenti(categoria),
            seme: Math.floor(Math.random() * 2 ** 32),
          });
        }}
      />
    );
  }

  const contenuto = (() => {
  switch (sessione.macchina.fase) {
    case "distribuzione":
      return <Carte sessione={sessione} partita={partita} dispatch={dispatch} />;
    case "indizi":
      return <Indizi partita={partita} onAvanti={() => dispatch({ tipo: "indiziFatti" })} />;
    case "voto":
      return (
        <Voto partita={partita} onElimina={(posto) => dispatch({ tipo: "elimina", posto })} />
      );
    case "tentativo":
      return (
        <Tentativo
          nomeScoperto={nomeDi(partita, sessione.eliminato)}
          onTenta={(testo) => dispatch({ tipo: "tenta", testo })}
        />
      );
    case "fine":
      return (
        <Fine
          sessione={sessione}
          partita={partita}
          onNuova={() => {
            ricordaParola(categoriaPartita, partita.parola);
            dispatch({ tipo: "nuova" });
          }}
        />
      );
  }
  })();

  return (
    <>
      {contenuto}
      {sessione.macchina.fase !== "fine" && <ChiudiPartita onChiudi={() => dispatch({ tipo: "nuova" })} />}
    </>
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


function nomeDi(partita: Partita, posto: number | null): string {
  return partita.giocatori.find((g) => g.posto === posto)?.nome ?? "";
}

function Configurazione({
  onAvvia,
}: {
  onAvvia: (nomi: string[], numImpostori: number, categoria: Categoria) => void;
}) {
  const [testoNomi, setTestoNomi] = useState("");
  const [scelta, setScelta] = useState<number | null>(null);
  const [categoria, setCategoria] = useState<Categoria>("cibi");
  const [errore, setErrore] = useState<string | null>(null);

  const nomi = testoNomi
    .split("\n")
    .map((riga) => riga.trim())
    .filter((riga) => riga.length > 0);

  // Finché non scegli a mano, vale il consigliato per il numero di nomi inseriti.
  const consigliati = impostoriConsigliati(nomi.length);
  const massimi = impostoriMassimi(nomi.length);
  const numImpostori = scelta !== null && scelta <= massimi ? scelta : consigliati;

  function invia(e: FormEvent) {
    e.preventDefault();
    const problema = valida(nomi, numImpostori);
    if (problema) {
      setErrore(problema);
      return;
    }
    setErrore(null);
    onAvvia(nomi, numImpostori, categoria);
  }

  return (
    <form className="schermata allineata" onSubmit={invia}>
      <label className="campo">
        Giocatori (uno per riga, almeno 3)
        <textarea
          rows={6}
          value={testoNomi}
          onChange={(e) => setTestoNomi(e.target.value)}
          placeholder={"Anna\nLuca\nMarco"}
        />
      </label>

      <label className="campo">
        Numero di impostori
        <select value={numImpostori} onChange={(e) => setScelta(Number(e.target.value))}>
          {Array.from({ length: massimi }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
              {n === consigliati ? " (consigliato)" : ""}
            </option>
          ))}
        </select>
        <span className="suggerimento">
          {nomi.length < 3
            ? "Il consiglio compare quando hai inserito almeno 3 giocatori."
            : `Con ${nomi.length} giocatori si consiglia ${consigliati}. Massimo ${massimi}.`}
        </span>
      </label>

      <label className="campo">
        Categoria
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
          {categorie.map((c) => (
            <option key={c} value={c}>
              {NOME_CATEGORIA[c]}
            </option>
          ))}
        </select>
      </label>

      {errore && <p className="errore">{errore}</p>}

      <button className="btn primario" type="submit">
        Inizia
      </button>
    </form>
  );
}

/** Controlli sui dati della configurazione, prima di avviare la partita. */
function valida(nomi: string[], numImpostori: number): string | null {
  try {
    creaGiocatori(nomi);
  } catch (e) {
    return e instanceof Error ? e.message : "Nomi non validi";
  }
  if (nomi.length < 3) return "Servono almeno 3 giocatori";
  if (numImpostori * 2 >= nomi.length) {
    return `Con ${nomi.length} giocatori gli impostori possono essere al massimo ${Math.floor((nomi.length - 1) / 2)}`;
  }
  return null;
}

function Carte({
  sessione,
  partita,
  dispatch,
}: {
  sessione: Sessione;
  partita: Partita;
  dispatch: (a: { tipo: "mostraCarta" } | { tipo: "prossimaCarta" }) => void;
}) {
  const giocatore: Giocatore | undefined = partita.giocatori[sessione.indiceCarta];
  if (!giocatore) return null;
  const progresso = `${sessione.indiceCarta + 1} di ${partita.giocatori.length}`;

  if (!sessione.cartaMostrata) {
    return (
      <section className="schermata">
        <p className="muted">Carta {progresso}</p>
        <p>Passa il telefono a</p>
        <h2>{giocatore.nome}</h2>
        <button className="btn primario" onClick={() => dispatch({ tipo: "mostraCarta" })}>
          Mostra la mia carta
        </button>
      </section>
    );
  }

  const mia = carta(partita, giocatore.posto);
  return (
    <section className="schermata">
      <p className="muted">{giocatore.nome}, guarda solo tu</p>
      <div className="carta">
        {mia.ruolo === "impostore" ? (
          <>
            <p>Sei l'impostore</p>
            <p className="grande">Non conosci la parola</p>
          </>
        ) : (
          <>
            <p>La parola è</p>
            <p className="grande">{mia.parola}</p>
          </>
        )}
      </div>
      <button className="btn" onClick={() => dispatch({ tipo: "prossimaCarta" })}>
        Ho visto, passa il telefono
      </button>
    </section>
  );
}

function Indizi({ partita, onAvanti }: { partita: Partita; onAvanti: () => void }) {
  return (
    <section className="schermata">
      <h2>Indizi</h2>
      <p>
        Partendo da <strong>{nomeDi(partita, partita.primoDiTurno)}</strong>, ognuno dice a voce
        un indizio in senso orario.
      </p>
      <button className="btn primario" onClick={onAvanti}>
        Si passa al voto
      </button>
    </section>
  );
}

function Voto({ partita, onElimina }: { partita: Partita; onElimina: (posto: number) => void }) {
  return (
    <section className="schermata">
      <h2>Voto</h2>
      <p>Discutete, poi votate. Tocca il nome di chi viene eliminato.</p>
      <div className="giocatori">
        {partita.giocatori.map((g) => (
          <button key={g.posto} className="btn" onClick={() => onElimina(g.posto)}>
            {g.nome}
          </button>
        ))}
      </div>
    </section>
  );
}

function Tentativo({
  nomeScoperto,
  onTenta,
}: {
  nomeScoperto: string;
  onTenta: (testo: string) => void;
}) {
  const [testo, setTesto] = useState("");

  function invia(e: FormEvent) {
    e.preventDefault();
    onTenta(testo);
  }

  return (
    <form className="schermata allineata" onSubmit={invia}>
      <h2>{nomeScoperto} è stato scoperto</h2>
      <p>Può ancora vincere: deve indovinare la parola segreta.</p>
      <label className="campo">
        Parola
        <input
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
        />
      </label>
      <button className="btn primario" type="submit">
        Conferma
      </button>
    </form>
  );
}

function Fine({
  sessione,
  partita,
  onNuova,
}: {
  sessione: Sessione;
  partita: Partita;
  onNuova: () => void;
}) {
  const esito = esitoSessione(sessione);
  if (!esito) return null;
  const impostori = partita.impostori.map((p) => nomeDi(partita, p)).join(", ");

  return (
    <section className="schermata">
      <h2>{esito.vincitore === "civili" ? "Vincono i civili!" : "Vincono gli impostori!"}</h2>
      <p>
        La parola era <strong>{partita.parola}</strong>
      </p>
      <p className="muted">Impostori: {impostori}</p>
      <button className="btn primario" onClick={onNuova}>
        Nuova partita
      </button>
    </section>
  );
}
