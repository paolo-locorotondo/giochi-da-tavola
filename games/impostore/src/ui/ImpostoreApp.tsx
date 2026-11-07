import { useEffect, useReducer, useState, type FormEvent } from "react";
import { suona } from "@gdt/suoni";
import { usaLingua, usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { testoProblema } from "../errori-ui";
import { g, Ricco } from "./Ricco";
import { MAX_CARATTERI_NOME, limitaRighe, type Giocatore } from "@gdt/engine";
import { carta, impostoriConsigliati, impostoriMassimi, type Partita } from "../logic/partita";
import { fasiImpostore, nuovaMacchinaImpostore, type EventoImpostore, type FaseImpostore } from "../logic/fasi";
import { esitoSessione, riduci, sessioneIniziale, type Sessione } from "../logic/sessione";
import { validaConfigurazione } from "../logic/validazione";
import { MAX_CARATTERI_PAROLA, categorie, nomeCategoria, paroleDi, type Categoria } from "../parole";
import { chiaveRecenti, leggiRecenti, ricordaParola } from "./recenti";
import "./impostore.css";

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
  const lingua = usaLingua();
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
            parole: paroleDi(categoria, lingua),
            escluse: leggiRecenti(chiaveRecenti(categoria, lingua)),
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
            ricordaParola(chiaveRecenti(categoriaPartita, lingua), partita.parola);
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
      <p>{t("chiudereLaPartita")}</p>
      <button className="btn pericolo" onClick={onChiudi}>
        {t("siChiudi")}
      </button>
      <button className="btn" onClick={() => setConferma(false)}>
        {t("noContinua")}
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
  const t = usaT(dizionari);
  const lingua = usaLingua();
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
    const problema = validaConfigurazione(nomi, numImpostori);
    if (problema) {
      setErrore(testoProblema(t, problema));
      return;
    }
    setErrore(null);
    onAvvia(nomi, numImpostori, categoria);
  }

  return (
    <form className="schermata allineata" onSubmit={invia}>
      <label className="campo">
        {t("giocatoriLabel")}
        <textarea
          rows={6}
          value={testoNomi}
          onChange={(e) => setTestoNomi(limitaRighe(e.target.value, MAX_CARATTERI_NOME))}
          placeholder={t("segnapostoNomi")}
        />
      </label>

      <label className="campo">
        {t("numImpostori")}
        <select value={numImpostori} onChange={(e) => setScelta(Number(e.target.value))}>
          {Array.from({ length: massimi }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n === consigliati ? t("consigliato", { n }) : n}
            </option>
          ))}
        </select>
        <span className="suggerimento">
          {nomi.length < 3
            ? t("consiglioAssente")
            : t("consiglio", { giocatori: nomi.length, consigliati, massimi })}
        </span>
      </label>

      <label className="campo">
        {t("categoria")}
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
          {categorie.map((c) => (
            <option key={c} value={c}>
              {nomeCategoria(c, lingua)}
            </option>
          ))}
        </select>
      </label>

      {errore && <p className="errore">{errore}</p>}

      <button className="btn primario" type="submit">
        {t("inizia")}
      </button>
    </form>
  );
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
  const t = usaT(dizionari);
  const giocatore: Giocatore | undefined = partita.giocatori[sessione.indiceCarta];
  if (!giocatore) return null;
  const progresso = t("cartaProgresso", { n: sessione.indiceCarta + 1, totale: partita.giocatori.length });

  if (!sessione.cartaMostrata) {
    return (
      <section className="schermata">
        <p className="muted">{progresso}</p>
        <p>{t("passaA")}</p>
        <h2>{giocatore.nome}</h2>
        <button className="btn primario" onClick={() => dispatch({ tipo: "mostraCarta" })}>
          {t("mostraCarta")}
        </button>
      </section>
    );
  }

  const mia = carta(partita, giocatore.posto);
  return (
    <section className="schermata">
      <p className="muted">{t("guardaSoloTu", { nome: giocatore.nome })}</p>
      <div className="carta">
        {mia.ruolo === "impostore" ? (
          <>
            <p>{t("seiImpostore")}</p>
            <p className="grande">{t("nonConosciParola")}</p>
          </>
        ) : (
          <>
            <p>{t("laParolaE")}</p>
            <p className="grande">{mia.parola}</p>
          </>
        )}
      </div>
      <button className="btn" onClick={() => dispatch({ tipo: "prossimaCarta" })}>
        {t("hoVistoPassa")}
      </button>
    </section>
  );
}

function Indizi({ partita, onAvanti }: { partita: Partita; onAvanti: () => void }) {
  const t = usaT(dizionari);
  return (
    <section className="schermata">
      <h2>{t("indizi")}</h2>
      <p>
        <Ricco testo={t("indiziLocale", { nome: g(nomeDi(partita, partita.primoDiTurno)) })} />
      </p>
      <button className="btn primario" onClick={onAvanti}>
        {t("passaAlVoto")}
      </button>
    </section>
  );
}

function Voto({ partita, onElimina }: { partita: Partita; onElimina: (posto: number) => void }) {
  const t = usaT(dizionari);
  return (
    <section className="schermata">
      <h2>{t("voto")}</h2>
      <p>{t("votoLocale")}</p>
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
  const t = usaT(dizionari);
  const [testo, setTesto] = useState("");

  function invia(e: FormEvent) {
    e.preventDefault();
    onTenta(testo);
  }

  return (
    <form className="schermata allineata" onSubmit={invia}>
      <h2>{t("scopertoTitolo", { nome: nomeScoperto })}</h2>
      <p>{t("scopertoTesto")}</p>
      <label className="campo">
        {t("parolaLabel")}
        <input
          autoFocus
          autoComplete="off"
          maxLength={MAX_CARATTERI_PAROLA}
          autoCapitalize="none"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
        />
      </label>
      <button className="btn primario" type="submit">
        {t("conferma")}
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
  const t = usaT(dizionari);
  const esito = esitoSessione(sessione);
  const vincitore = esito?.vincitore;
  // Un suono diverso per chi ha vinto, una volta sola quando compare la schermata finale.
  useEffect(() => {
    if (vincitore) suona(vincitore === "civili" ? "civili" : "impostori");
  }, [vincitore]);
  if (!esito) return null;
  const impostori = partita.impostori.map((p) => nomeDi(partita, p)).join(", ");

  return (
    <section className="schermata">
      <h2>{esito.vincitore === "civili" ? t("vincitoCivili") : t("vincitoImpostori")}</h2>
      <p>
        <Ricco testo={t("laParolaEra", { parola: g(partita.parola) })} />
      </p>
      <p className="muted">{t("impostoriElenco", { nomi: impostori })}</p>
      <button className="btn primario" onClick={onNuova}>
        {t("nuovaPartita")}
      </button>
    </section>
  );
}
