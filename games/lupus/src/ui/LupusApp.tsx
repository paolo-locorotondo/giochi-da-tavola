import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import {
  candidatiNotte,
  contaVoti,
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
import { descrizioneRuolo, nomeRuolo } from "../personaggi";
import { TRANSIZIONE } from "../impostazioni";
import "./lupus.css";

/** Il verso di chi muore, uno per ruolo: con un ruolo nuovo il compilatore chiede il suo suono. */
const SUONO_MORTO: Record<Ruolo, NomeSuono> = {
  lupo: "mortoLupo",
  contadino: "mortoContadino",
  veggente: "mortoVeggente",
  medico: "mortoMedico",
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
  }, [s.fase, s.notte, s.ballottaggio, s.eliminato, voce, audio, s.giocatori.length, lingua]); // eslint-disable-line react-hooks/exhaustive-deps

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

/** Il messaggio del voto senza eliminato, dal codice della logica. */
function testoEsito(esito: Stato["esitoVoto"], t: T): string | null {
  if (esito === "ballottaggio") return t("esitoPareggio");
  if (esito === "ancora-pari") return t("esitoAncoraPari");
  return null;
}

/** Cosa dice il narratore a voce in ogni fase, nella lingua scelta. */
function frasePerFase(s: Stato, lingua: Lingua): string | null {
  const t = traduttore(dizionari, lingua);
  switch (s.fase) {
    case "lupi":
    case "veggente":
    case "medico": {
      const apertura = primaFaseDellaNotte(s, s.fase) ? t("vNotte", { notte: s.notte }) + " " : "";
      return apertura + t(s.fase === "lupi" ? (s.notte === 1 && s.primaNotteSenzaVittima ? "vLupiPrima" : "vLupi") : s.fase === "veggente" ? "vVeggente" : "vMedico");
    }
    case "alba":
      return s.mortiNotte.length
        ? t("vAlbaMorto", { nome: nomeDi(s, s.mortiNotte[0] ?? null), ruolo: ruoloDetto(s, s.mortiNotte[0], t, lingua) })
        : t("vAlbaNessuno");
    case "voto":
      return s.ballottaggio ? t("vBallottaggio") : t("vVoto");
    case "esito":
      return s.eliminato !== null
        ? t("vEliminato", { nome: nomeDi(s, s.eliminato), ruolo: ruoloDetto(s, s.eliminato, t, lingua) })
        : testoEsito(s.esitoVoto, t);
    case "fine":
      return s.vincitore === "villaggio" ? t("vFineVillaggio") : t("vFineLupi");
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
                ...speciali.map((r) => `1 ${nomeRuolo(r, lingua).toLowerCase()}`),
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
const TESTI_NOTTE: Record<FaseNotte, { titolo: "titoloLupi" | "titoloVeggente" | "titoloMedico"; fine: "fineLupi" | "fineVeggente" | "fineMedico" }> = {
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
        : t("nonELupo")
      : null;

  return (
    <section className="schermata">
      <p className="muted">{t("notteOcchiChiusi", { notte: s.notte })}</p>
      <h2>{t(TESTI_NOTTE[fase].titolo)}</h2>
      <p className="muted">{t("soloChiHaRuolo")}</p>
      {senzaScelta && <p>{t("lupiSiRiconoscono")}</p>}
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
  const morto = s.mortiNotte[0];
  return (
    <section className="schermata">
      <h2>{t("albaTitolo")}</h2>
      {morto !== undefined ? (
        <p>
          {t("albaMorto", { nome: SEGNO })
            .split(SEGNO)
            .flatMap((pezzo, i) => (i === 0 ? [pezzo] : [<strong key="nome">{nomeDi(s, morto)}</strong>, pezzo]))}
          {ruoloDetto(s, morto, t, lingua)}
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

function Voto({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
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
      <h2>{s.ballottaggio ? t("ballottaggio") : t("votazione")}</h2>
      {testoEsito(s.esitoVoto, t) && <p className="muted">{testoEsito(s.esitoVoto, t)}</p>}
      <p className="muted">
        {t("votoIstruzioni", { totale, vivi: s.vivi.length })}
      </p>
      {candidati.map((p) => (
        <div key={p} className="riga-voto">
          <span>{nomeDi(s, p)}</span>
          <button className="btn" onClick={() => cambia(p, -1)}>
            {t("meno")}
          </button>
          <strong>{voti[p] ?? 0}</strong>
          <button className="btn" disabled={totale >= s.vivi.length} onClick={() => cambia(p, 1)}>
            {t("piu")}
          </button>
        </div>
      ))}
      {pronto && pari.length > 1 && (
        <p className="muted">{t("paritaTra", { nomi: pari.map((p) => nomeDi(s, p)).join(", ") })}</p>
      )}
      <button
        className="btn primario"
        disabled={!pronto}
        onClick={() => dispatch({ tipo: "chiudiVoto", voti })}
      >
        {eliminato === null && pari.length > 1 && !s.ballottaggio
          ? t("vaiBallottaggio")
          : t("chiudiVotazione")}
      </button>
    </section>
  );
}

function Esito({ s, dispatch }: { s: Stato; dispatch: D }) {
  const t = usaT(dizionari);
  const lingua = usaLingua();
  return (
    <section className="schermata">
      {s.eliminato !== null ? (
        <>
          <h2>{t("eliminatoTitolo", { nome: nomeDi(s, s.eliminato) })}</h2>
          {s.svelaRuoli && <p>{t("eraRuolo", { ruolo: nomeRuolo(s.ruoli[s.eliminato] ?? "contadino", lingua) })}</p>}
        </>
      ) : (
        <h2>{testoEsito(s.esitoVoto, t)}</h2>
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
    suona(s.vincitore === "villaggio" ? "fineContadini" : "fineLupi");
  }, [s.vincitore]);
  return (
    <section className="schermata">
      <h2>{s.vincitore === "villaggio" ? t("vinceVillaggio") : t("vinconoLupi")}</h2>
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
