import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import {
  candidatiNotte,
  classificaVoti,

  descrittoreNotte,
  FASI_NOTTE,
  MAX_GIOCATORI,
  MIN_GIOCATORI,
  contadiniRestanti,
  primaFaseDellaNotte,
  specialiPredefiniti,
  SPECIALI,
  VERSIONE_STATO,
  lupiPer,
  riduci,
  sceltaNotte,
  ruoloAttivo,
  linciatoEraLupo,
  gufoLetale,
  massoni,
  votantiSecondoTurno,
  statoIniziale,
  type Fase,
  type FaseNotte,
  type Ruolo,
  type Stato,
} from "../logica";
import { MAX_CARATTERI_NOME, limitaRighe } from "@gdt/engine";
import { traduttore, usaLingua, usaT, type Lingua, type Traduttore } from "@gdt/i18n";
import { validaConfigurazione, type ErroreConfigurazione } from "../validazione";
import { dizionari } from "../locales";
import { audioAttivo, seguiAudio, suona, type NomeSuono } from "@gdt/suoni";
import { usaPreferenza } from "@gdt/preferenze";
import { parla, silenzio } from "./voce";
import { Transizione } from "./Transizione";
import { descrizioneRuolo, nomeRuolo, pluraleRuolo } from "../personaggi";
import { TRANSIZIONE } from "../impostazioni";
import "./lupus.css";

/** Il verso di chi muore, uno per ruolo: con un ruolo nuovo il compilatore chiede il suo suono. */
const SUONO_MORTO: Record<Ruolo, NomeSuono> = {
  lupo: "mortoLupo",
  contadino: "mortoContadino",
  veggente: "mortoVeggente",
  medico: "mortoMedico",
  indemoniato: "mortoLupo",
  massone: "mortoContadino",
  medium: "mortoVeggente",
  criceto: "mortoContadino",
  gufo: "mortoContadino",
};

const CHIAVE = "gdt-lupus-partita";

/** Si entra in queste fasi con la schermata di transizione: ogni ruolo della notte e l'alba. */
const FASI_CON_TRANSIZIONE: ReadonlySet<Fase> = new Set<Fase>([...FASI_NOTTE.map((d) => d.fase), "alba"]);

function caricaStato(): Stato {
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (raw) {
      const s = JSON.parse(raw) as Stato;
      // Le partite salvate con un'altra versione della forma dello stato si scartano.
      if (s.versione === VERSIONE_STATO && Array.isArray(s.giocatori) && s.ruoli && Array.isArray(s.vivi)) {
        return { ...statoIniziale(), ...s };
      }
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
  const t = usaT(dizionari);
  const [s, dispatch] = useReducer(riduci, undefined, caricaStato);

  // La partita sopravvive al refresh della pagina.
  useEffect(() => salvaStato(s), [s]);
  const [voce, setVoce] = useState(true);
  // L'interruttore audio delle impostazioni comanda su tutto: spento, la voce si ferma; riacceso, riparte la fase corrente.
  const [audio, setAudio] = useState(audioAttivo);
  useEffect(() => seguiAudio(() => setAudio(audioAttivo())), []);

  // Il narratore parla quando cambia la fase.
  const lingua = usaLingua();
  useEffect(() => {
    if (!voce || !audio || s.giocatori.length === 0) return;
    const testo = frasePerFase(s, lingua);
    if (testo) parla(testo, lingua);
    return silenzio;
  }, [s.fase, s.notte, s.eliminato, voce, audio, s.giocatori.length, lingua]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Transizione: quando la fase cambia verso un ruolo della notte o l'alba, prima della nuova schermata
  // se ne vede una sempre uguale. Si decide durante il render, così la schermata dopo non compare neanche per un attimo.
  const secondi = Number(usaPreferenza("lupus", TRANSIZIONE));
  const [faseVista, setFaseVista] = useState(s.fase);
  const [inTransizione, setInTransizione] = useState(false);
  if (faseVista !== s.fase) {
    setFaseVista(s.fase);
    setInTransizione(secondi > 0 && FASI_CON_TRANSIZIONE.has(s.fase));
  }
  const fineTransizione = useCallback(() => setInTransizione(false), []);

  if (s.giocatori.length === 0) {
    return (
      <Configurazione
        onAvvia={(opzioni) => dispatch({ tipo: "avvia", seme: Math.floor(Math.random() * 2 ** 32), ...opzioni })}
      />
    );
  }

  const contenuto = (() => {
    if (inTransizione) return <Transizione secondi={secondi} giorno={s.fase === "alba"} onFine={fineTransizione} />;
    switch (s.fase) {
      case "carte":
        return <Carte s={s} dispatch={dispatch} />;
      case "lupi":
      case "veggente":
      case "medico":
      case "gufo":
      case "medium":
      case "massoni":
        return <Notte s={s} dispatch={dispatch} />;
      case "alba":
        return <Alba s={s} dispatch={dispatch} />;
      case "discussione":
        return <Discussione dispatch={dispatch} />;
      case "voto":
      case "voto2":
        return <Voto s={s} dispatch={dispatch} />;
      case "arringhe":
        return <Arringhe s={s} dispatch={dispatch} />;
      case "esito":
        return <Esito s={s} dispatch={dispatch} />;
      case "fine":
        return <Fine s={s} dispatch={dispatch} />;
    }
  })();

  return (
    <>
      <label className="voce">
        <input type="checkbox" checked={voce} onChange={(e) => setVoce(e.target.checked)} /> {t("voceNarratore")}
        {audio ? "" : t("audioSpento")}
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
  const t = usaT(dizionari);
  const lingua = usaLingua();
  const vivi = s.vivi.length;
  return (
    <details className="accordion" style={{ marginTop: "1.25rem" }}>
      <summary>
        {t("ruoliNarratoreTitolo", { vivi, tot: s.giocatori.length })}
      </summary>
      <div className="accordion-corpo">
        <p className="accordion-nota">{t("soloNarratore")}</p>
        <ul className="ruoli-narratore">
          {s.giocatori.map((g) => {
            const vivo = s.vivi.includes(g.posto);
            return (
              <li key={g.posto} className={vivo ? "" : "morto"}>
                <span className="nome-g">{g.nome}</span>
                <span className="stato">
                  {t("statoRuolo", { ruolo: nomeRuolo(s.ruoli[g.posto] ?? "contadino", lingua), stato: vivo ? t("vivo") : t("morto") })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

type T = Traduttore<typeof dizionari.it>;

/** « Era Contadino.» se la partita svela i ruoli di chi muore, altrimenti nulla. */
function ruoloDetto(s: Stato, posto: number | null | undefined, t: T, lingua: Lingua): string {
  if (!s.svelaRuoli || posto === null || posto === undefined) return "";
  return " " + t("eraRuolo", { ruolo: nomeRuolo(s.ruoli[posto] ?? "contadino", lingua) });
}

/** Cosa dice il narratore a voce in ogni fase, nella lingua scelta. */
function frasePerFase(s: Stato, lingua: Lingua): string | null {
  const t = traduttore(dizionari, lingua);
  switch (s.fase) {
    case "lupi":
    case "veggente":
    case "medico":
    case "gufo":
    case "medium":
    case "massoni": {
      const apertura = primaFaseDellaNotte(s, s.fase) ? t("vNotte", { notte: s.notte }) + " " : "";
      const frase =
        s.fase === "lupi"
          ? s.notte === 1 && s.primaNotteSenzaVittima
            ? "vLupiPrima"
            : "vLupi"
          : s.fase === "veggente"
            ? "vVeggente"
            : s.fase === "medium"
              ? "vMedium"
              : s.fase === "massoni"
                ? "vMassoni"
                : s.fase === "gufo"
                  ? "vGufo"
                  : "vMedico";
      return apertura + t(frase);
    }
    case "alba":
      if (s.mortiNotte.length > 1) {
        return t("vAlbaMorti", {
          nomi: s.mortiNotte.map((p) => nomeDi(s, p)).join(", "),
          ruolo: s.mortiNotte.map((p) => ruoloDetto(s, p, t, lingua)).join(""),
        });
      }
      return s.mortiNotte.length
        ? t("vAlbaMorto", { nome: nomeDi(s, s.mortiNotte[0] ?? null), ruolo: ruoloDetto(s, s.mortiNotte[0], t, lingua) })
        : t("vAlbaNessuno");
    case "discussione":
      return t("vDiscussione");
    case "voto":
      return t("vVoto");
    case "arringhe":
      return t("vArringhe", { nomi: (s.indiziati ?? []).map((p) => nomeDi(s, p)).join(", ") });
    case "voto2":
      return t("vSecondoTurno");
    case "esito":
      return t("vLinciato", { nome: nomeDi(s, s.eliminato), ruolo: ruoloDetto(s, s.eliminato, t, lingua) });
    case "fine":
      return s.vincitore === "villaggio" ? t("vFineVillaggio") : s.vincitore === "criceto" ? t("vFineCriceto") : t("vFineLupi");
    default:
      return null;
  }
}

/** Segnaposto per mettere il nome in grassetto dentro una frase tradotta. */
const SEGNO = "\u0000";

type D = (a: Parameters<typeof riduci>[1]) => void;

/** La frase dell'errore di configurazione, nella lingua scelta. */
function testoErrore(e: ErroreConfigurazione, t: T): string {
  switch (e.codice) {
    case "nome-vuoto":
      return t("errNomeVuoto", { posto: e.posto });
    case "nome-duplicato":
      return t("errNomeDuplicato", { nome: e.nome });
    case "pochi":
      return t("errPochi", { minimo: e.minimo });
    case "tanti":
      return t("errTanti", { massimo: e.massimo });
  }
}

interface OpzioniPartita {
  nomi: string[];
  speciali: Ruolo[];
  svelaRuoli: boolean;
  narratoreGioca: boolean;
  primaNotteSenzaVittima: boolean;
}

function Configurazione({ onAvvia }: { onAvvia: (o: OpzioniPartita) => void }) {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  const [testo, setTesto] = useState("");
  const [svela, setSvela] = useState(false);
  const [narratoreGioca, setNarratoreGioca] = useState(false);
  const [primaSenza, setPrimaSenza] = useState(true);
  // Scelte dell'utente sugli speciali; quelle non toccate seguono il numero di giocatori.
  const [scelti, setScelti] = useState<Partial<Record<Ruolo, boolean>>>({});
  const [errore, setErrore] = useState<ErroreConfigurazione | null>(null);
  const nomi = testo
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  const n = nomi.length;
  const predefiniti = specialiPredefiniti(n);
  const speciali = SPECIALI.map((x) => x.ruolo).filter((r) => scelti[r] ?? predefiniti.includes(r));
  const contadini = contadiniRestanti(n, speciali);

  function invia(e: FormEvent) {
    e.preventDefault();
    const problema = validaConfigurazione(nomi);
    if (problema) {
      setErrore(problema);
      return;
    }
    setErrore(null);
    onAvvia({ nomi, speciali, svelaRuoli: svela, narratoreGioca, primaNotteSenzaVittima: primaSenza });
  }

  return (
    <form className="schermata allineata" onSubmit={invia}>
      <label className="campo">
        {t("giocatoriLabel", { min: MIN_GIOCATORI, max: MAX_GIOCATORI })}
        <textarea
          rows={8}
          value={testo}
          onChange={(e) => setTesto(limitaRighe(e.target.value, MAX_CARATTERI_NOME))}
          placeholder={t("placeholderNomi")}
        />
      </label>
      <p className="suggerimento">{t("ordineOrario")}</p>
      {n >= MIN_GIOCATORI ? (
        <fieldset className="composizione">
          <legend>{t("composizioneTitolo")}</legend>
          <p className="suggerimento">
            {t("ruoliElenco", {
              elenco: [
                t("ruoliLupi", { n: lupiPer(n) }),
                `1 ${nomeRuolo("veggente", lingua).toLowerCase()}`,
                ...SPECIALI.filter((x) => speciali.includes(x.ruolo)).map((x) =>
                  x.quanti > 1
                    ? `${x.quanti} ${pluraleRuolo(x.ruolo, lingua).toLowerCase()}`
                    : `1 ${nomeRuolo(x.ruolo, lingua).toLowerCase()}`,
                ),
                t("ruoliContadini", { n: Math.max(0, contadini) }),
              ].join(", "),
            })}
          </p>
          {SPECIALI.map((x) => (
            <label key={x.ruolo} className="spunta">
              <input
                type="checkbox"
                checked={speciali.includes(x.ruolo)}
                onChange={(e) => setScelti((v) => ({ ...v, [x.ruolo]: e.target.checked }))}
              />
              {t("conSpeciale", { ruolo: nomeRuolo(x.ruolo, lingua) })}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="suggerimento">{t("ruoliAutomatici")}</p>
      )}
      <label className="spunta">
        <input type="checkbox" checked={primaSenza} onChange={(e) => setPrimaSenza(e.target.checked)} />
        {t("primaNotteSenzaVittima")}
      </label>
      <label className="spunta">
        <input type="checkbox" checked={svela} onChange={(e) => setSvela(e.target.checked)} />
        {t("svelaRuoli")}
      </label>
      <label className="spunta">
        <input
          type="checkbox"
          checked={narratoreGioca}
          onChange={(e) => setNarratoreGioca(e.target.checked)}
        />
        {narratoreGioca ? t("narratoreGioca") : t("narratoreNonGioca")}
      </label>
      {errore && <p className="errore">{testoErrore(errore, t)}</p>}
      <button className="btn primario" type="submit">
        {t("inizia")}
      </button>
    </form>
  );
}

function Carte({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  const g = s.giocatori[s.indiceCarta];
  if (!g) return null;
  if (!s.cartaMostrata) {
    return (
      <section className="schermata">
        <p className="muted">
          {t("cartaDi", { n: s.indiceCarta + 1, tot: s.giocatori.length })}
        </p>
        <p>{t("passaA")}</p>
        <h2>{g.nome}</h2>
        <button className="btn primario" onClick={() => dispatch({ tipo: "mostraCarta" })}>
          {t("mostraRuolo")}
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
      <p className="muted">{t("guardaSoloTu", { nome: g.nome })}</p>
      <div className="carta">
        <p className="grande">{nomeRuolo(ruolo, lingua)}</p>
        <p>{descrizioneRuolo(ruolo, lingua)}</p>
        {compagni.length > 0 && <p className="muted">{t("compagni", { nomi: compagni.map((c) => c.nome).join(", ") })}</p>}
      </div>
      <button className="btn" onClick={() => dispatch({ tipo: "prossimaCarta" })}>
        {t("hoVistoPassa")}
      </button>
    </section>
  );
}

/** Chiavi del dizionario per ogni fase della notte: titolo e pulsante che chiude il turno (dice sempre di tornare a dormire). */
const TESTI_NOTTE: Record<
  FaseNotte,
  {
    titolo: "titoloLupi" | "titoloVeggente" | "titoloMedico" | "titoloMedium" | "titoloMassoni" | "titoloGufo";
    fine: "fineLupi" | "fineVeggente" | "fineMedico" | "fineMedium" | "fineMassoni" | "fineGufo";
  }
> = {
  medium: { titolo: "titoloMedium", fine: "fineMedium" },
  massoni: { titolo: "titoloMassoni", fine: "fineMassoni" },
  gufo: { titolo: "titoloGufo", fine: "fineGufo" },
  lupi: { titolo: "titoloLupi", fine: "fineLupi" },
  veggente: { titolo: "titoloVeggente", fine: "fineVeggente" },
  medico: { titolo: "titoloMedico", fine: "fineMedico" },
};

function Notte({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const fase = s.fase as FaseNotte;
  const d = descrittoreNotte(fase);
  if (!d) return null;
  const scelto = sceltaNotte(s, d);
  // I lupi non possono sbranarsi tra loro e il veggente non indaga su di sé; il medico non può ripetere la stessa protezione.
  const candidati = candidatiNotte(s);
  // La prima notte i lupi si riconoscono soltanto: nessuna scelta.
  const senzaScelta = !d.sceglie(s);
  // Chi guarda una sola persona (il veggente): scelta fatta, gli altri nomi si bloccano.
  const bloccato = (p: number) => d.unaSolaScelta && scelto !== null && scelto !== p;
  const risultato =
    fase === "veggente" && s.ispezionato !== null
      ? s.ruoli[s.ispezionato] === "lupo"
        ? t("eUnLupo")
        : s.ruoli[s.ispezionato] === "criceto"
          ? t("eUnCriceto")
          : t("nonELupo")
      : fase === "medium" && s.linciato !== null && ruoloAttivo(s, d)
        ? t(linciatoEraLupo(s) ? "mediumLupo" : "mediumNonLupo", { nome: nomeDi(s, s.linciato) })
        : fase === "massoni" && ruoloAttivo(s, d)
          ? t("massoniSono", { nomi: massoni(s).map((p) => nomeDi(s, p)).join(", ") })
          : null;

  return (
    <section className="schermata">
      <p className="muted">{t("notteOcchiChiusi", { notte: s.notte })}</p>
      <h2>{t(TESTI_NOTTE[fase].titolo)}</h2>
      <p className="muted">{t("soloChiHaRuolo")}</p>
      {senzaScelta && fase === "lupi" && <p>{t("lupiSiRiconoscono")}</p>}
      {fase === "gufo" && <p>{t(gufoLetale(s) ? "gufoLetaleNota" : "gufoNota")}</p>}
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
        disabled={scelto === null && !senzaScelta}
        onClick={() => dispatch({ tipo: "avanti" })}
      >
        {t(TESTI_NOTTE[fase].fine)}
      </button>
    </section>
  );
}

function Alba({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  const morti = s.mortiNotte;
  // I nomi dei morti in grassetto dentro la frase tradotta (uno o più).
  const grassetti = morti.flatMap((p, i) => [i > 0 ? ", " : "", <strong key={p}>{nomeDi(s, p)}</strong>]);
  const frase = morti.length > 1 ? t("albaMorti", { nomi: SEGNO }) : t("albaMorto", { nome: SEGNO });
  return (
    <section className="schermata">
      <h2>{t("albaTitolo")}</h2>
      {morti.length > 0 ? (
        <p>
          {frase.split(SEGNO).flatMap((pezzo, i) => (i === 0 ? [pezzo] : [...grassetti, pezzo]))}
          {morti.map((p) => ruoloDetto(s, p, t, lingua)).join("")}
        </p>
      ) : (
        <p>{t("albaNessuno")}</p>
      )}
      <button
        className="btn primario"
        onClick={() => dispatch({ tipo: s.vincitore ? "dopoVoto" : "avanti" })}
      >
        {s.vincitore ? t("vediRisultato") : t("discuteVota")}
      </button>
    </section>
  );
}

const SECONDI_DISCUSSIONE = 180;

function Discussione({ dispatch }: { dispatch: D }) {
  const t = usaT(dizionari);
  // Il timer è facoltativo e non blocca nulla: parte solo se lo si avvia.
  const [scadenza, setScadenza] = useState<number | null>(null);
  const [rimasti, setRimasti] = useState(SECONDI_DISCUSSIONE);
  useEffect(() => {
    if (scadenza === null) return;
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((scadenza - Date.now()) / 1000));
      setRimasti(r);
      if (r === 0) {
        clearInterval(id);
        navigator.vibrate?.(400);
        suona("fineTurno");
      }
    }, 250);
    return () => clearInterval(id);
  }, [scadenza]);
  const tempo = `${Math.floor(rimasti / 60)}:${String(rimasti % 60).padStart(2, "0")}`;

  return (
    <section className="schermata">
      <h2>{t("discussioneTitolo")}</h2>
      <p className="muted">{t("discussioneTesto")}</p>
      {scadenza === null ? (
        <button
          className="btn"
          onClick={() => {
            setRimasti(SECONDI_DISCUSSIONE);
            setScadenza(Date.now() + SECONDI_DISCUSSIONE * 1000);
          }}
        >
          {t("avviaTimer")}
        </button>
      ) : (
        <p className="grande" role="timer">
          {rimasti > 0 ? t("tempoRimasto", { tempo }) : t("tempoFinito")}
        </p>
      )}
      <button className="btn primario" onClick={() => dispatch({ tipo: "avanti" })}>
        {t("vaiAlVoto")}
      </button>
    </section>
  );
}

function Arringhe({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const nomi = (s.indiziati ?? []).map((p) => nomeDi(s, p));
  const gufato = s.gufato !== null && (s.indiziati ?? []).includes(s.gufato) && !gufoLetale(s) ? s.gufato : null;
  return (
    <section className="schermata">
      <h2>{t("arringheTitolo")}</h2>
      <p>{nomi.length < 2 ? t("arringheUno", { a: nomi[0] ?? "" }) : t("arringheTesto", { nomi: nomi.join(", ") })}</p>
      {gufato !== null && <p className="muted">{t("arringheGufato", { nome: nomeDi(s, gufato) })}</p>}
      <button className="btn primario" onClick={() => dispatch({ tipo: "avanti" })}>
        {t("vaiSecondoTurno")}
      </button>
    </section>
  );
}

function Voto({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const secondo = s.fase === "voto2";
  const [voti, setVoti] = useState<Record<number, number>>({});
  // Primo turno: votano tutti (vivi e fantasmi) e si vota tra i vivi. Secondo: solo i vivi non indiziati, tra i due indiziati.
  const candidati = secondo ? (s.indiziati ?? []) : s.vivi;
  const votanti = secondo ? votantiSecondoTurno(s) : s.giocatori.length;
  const totale = Object.values(voti).reduce((a, b) => a + b, 0);
  const cambia = (p: number, d: number) => setVoti((v) => ({ ...v, [p]: Math.max(0, (v[p] ?? 0) + d) }));

  // Passando dal primo al secondo turno i contatori ripartono da zero.
  useEffect(() => setVoti({}), [s.fase]);

  const pronto = totale === votanti;
  const classifica = classificaVoti(s, candidati, voti);
  const [primo, secondoPosto] = classifica;
  // Pareggio tra i primi due (primo turno: il secondo posto) o tra gli indiziati: lo decide il «Benvenuto!».
  const pari =
    pronto &&
    primo !== undefined &&
    secondoPosto !== undefined &&
    (voti[primo] ?? 0) === (voti[secondoPosto] ?? 0) &&
    (secondo || candidati.length > 2);
  const nomeBenvenuto = s.benvenuto === null ? t("narratoreBenvenuto") : nomeDi(s, s.benvenuto);

  return (
    <section className="schermata allineata">
      <h2>{secondo ? t("secondoTurno") : t("primoTurno")}</h2>
      <p className="muted">
        {secondo ? t("secondoIstruzioni", { totale, votanti }) : t("votoIstruzioni", { totale, votanti })}
      </p>
      {candidati.map((p) => (
        <div key={p} className="riga-voto">
          <span>{nomeDi(s, p)}</span>
          <button className="btn" onClick={() => cambia(p, -1)} aria-label={`${t("meno")} ${nomeDi(s, p)}`}>
            {t("meno")}
          </button>
          <strong>{voti[p] ?? 0}</strong>
          <button
            className="btn"
            disabled={totale >= votanti}
            onClick={() => cambia(p, 1)}
            aria-label={`${t("piu")} ${nomeDi(s, p)}`}
          >
            {t("piu")}
          </button>
        </div>
      ))}
      {pari && <p className="muted">{t("paritaBenvenuto", { nome: nomeBenvenuto })}</p>}
      <button
        className="btn primario"
        disabled={!pronto}
        onClick={() => dispatch({ tipo: "chiudiVoto", voti })}
      >
        {secondo ? t("chiudiSecondoTurno") : t("chiudiPrimoTurno")}
      </button>
    </section>
  );
}

function Esito({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  return (
    <section className="schermata">
      <h2>{t("eliminatoTitolo", { nome: nomeDi(s, s.eliminato) })}</h2>
      {s.svelaRuoli && s.eliminato !== null && (
        <p>{t("eraRuolo", { ruolo: nomeRuolo(s.ruoli[s.eliminato] ?? "contadino", lingua) })}</p>
      )}
      <button className="btn primario" onClick={() => dispatch({ tipo: "dopoVoto" })}>
        {s.vincitore ? t("vediRisultato") : t("scendeNotte")}
      </button>
    </section>
  );
}

function Fine({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  useEffect(() => {
    suona(s.vincitore === "lupi" ? "fineLupi" : "fineContadini");
  }, [s.vincitore]);
  return (
    <section className="schermata">
      <h2>{s.vincitore === "villaggio" ? t("vinceVillaggio") : s.vincitore === "criceto" ? t("vinceCriceto") : t("vinconoLupi")}</h2>
      <ul className="elenco-ruoli">
        {s.giocatori.map((g) => (
          <li key={g.posto} className={s.vivi.includes(g.posto) ? "" : "morto"}>
            {t("ruoloDi", { nome: g.nome, ruolo: nomeRuolo(s.ruoli[g.posto] ?? "contadino", lingua) })}
          </li>
        ))}
      </ul>
      <button className="btn primario" onClick={() => dispatch({ tipo: "azzera" })}>
        {t("nuovaPartita")}
      </button>
    </section>
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
