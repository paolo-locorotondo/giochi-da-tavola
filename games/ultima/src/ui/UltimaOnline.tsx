import { useEffect, useState, type FormEvent } from "react";
import { Copy, Minus, Plus } from "lucide-react";
import QRCode from "qrcode";
import { MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { testoMessaggio } from "../errori-ui";
import { MAX_GIOCATORI, MIN_GIOCATORI, VARIANTI_BASE } from "../logica";
import { SOGLIA_MAX, SOGLIA_MIN, SOGLIA_PREDEFINITA, type ModoPunteggio, type Vista } from "../online";
import { Tavolo } from "./Tavolo";
import { RiepilogoVarianti, Varianti } from "./Varianti";
import { leggiToken, useCollegamento, type Collegamento } from "./collegamento";

export function UltimaOnline({ codiceIniziale, onLocale }: { codiceIniziale: string | null; onLocale?: () => void }) {
  const c = useCollegamento(codiceIniziale);
  const t = usaT(dizionari);
  const [inserisci, setInserisci] = useState(false);

  // Gli errori transitori spariscono dopo qualche secondo.
  useEffect(() => {
    if (!c.errore) return;
    const id = setTimeout(c.azzeraErrore, 4000);
    return () => clearTimeout(id);
  }, [c.errore]); // eslint-disable-line react-hooks/exhaustive-deps

  const stato = !c.connesso ? <p className="avviso">{t("connessione")}</p> : null;
  const err = c.errore ? (
    <p className="errore" role="alert">
      {testoMessaggio(t, c.errore)}
    </p>
  ) : null;

  if (!c.vista && !c.connesso && c.nonRaggiungibile && !c.chiusa) {
    return (
      <section className="schermata">
        <h2>{t("serverNonRaggiungibile")}</h2>
        <p className="muted">{t("serverNonRaggiungibileTesto")}</p>
        <button className="btn primario" onClick={() => window.location.reload()}>
          {t("riprova")}
        </button>
        {onLocale && (
          <button className="btn" onClick={onLocale}>
            {t("giocaControBot")}
          </button>
        )}
      </section>
    );
  }

  if (c.chiusa) {
    return (
      <section className="schermata">
        <h2>{t("partitaChiusa")}</h2>
        <p className="muted">{t("partitaChiusaTesto")}</p>
        <button className="btn primario" onClick={() => window.location.assign("/ultima")}>
          {t("tornaAlGioco")}
        </button>
      </section>
    );
  }

  if (!c.vista) {
    if (codiceIniziale) {
      return (
        <section className="schermata">
          {stato}
          {err}
          <p className="muted">{t("entroNella", { codice: codiceIniziale })}</p>
        </section>
      );
    }
    if (inserisci) return <EntraConCodice c={c} onIndietro={() => setInserisci(false)} />;
    return (
      <>
        {stato}
        <Crea c={c} onEntra={() => setInserisci(true)} />
      </>
    );
  }

  const v = c.vista;
  return (
    <>
      {c.nonRaggiungibile && !c.connesso ? <p className="avviso">{t("connessionePersa")}</p> : stato}
      {c.sollecitato && <p className="avviso">{t("toccaATe")}</p>}
      {err}
      <Testata c={c} v={v} />
      <Fase c={c} v={v} />
      {v.host && <ChiudiPartita c={c} />}
    </>
  );
}

function Crea({ c, onEntra }: { c: Collegamento; onEntra: () => void }) {
  const t = usaT(dizionari);
  const [nomi, setNomi] = useState<string[]>(["", ""]);
  const [modo, setModo] = useState<ModoPunteggio>("singolo");
  const [soglia, setSoglia] = useState(SOGLIA_PREDEFINITA);
  const [varianti, setVarianti] = useState(VARIANTI_BASE);
  const puliti = nomi.map((n) => n.trim());
  const distinti = new Set(puliti.map((n) => n.toLowerCase())).size === puliti.length;
  const sogliaOk = Number.isInteger(soglia) && soglia >= SOGLIA_MIN && soglia <= SOGLIA_MAX;
  const validi = puliti.every(Boolean) && distinti && (modo === "singolo" || sogliaOk);
  const cambia = (i: number, v: string) => setNomi(nomi.map((n, k) => (k === i ? v : n)));
  return (
    <form
      className="schermata allineata"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (validi) c.invia({ t: "crea", gioco: "ultima", nomi: puliti, config: { modo, soglia, varianti } });
      }}
    >
      <fieldset className="ul-nomi-crea" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend>{t("nomiGiocatori")}</legend>
        {nomi.map((n, i) => (
          <div key={i} className="ul-riga-nome">
            <label className="campo">
              {t("nomeGiocatore", { n: i + 1 })}
              <input value={n} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={(e) => cambia(i, e.target.value)} />
            </label>
            {nomi.length > MIN_GIOCATORI && (
              <button type="button" className="btn" aria-label={t("togliGiocatore", { n: i + 1 })} onClick={() => setNomi(nomi.filter((_, k) => k !== i))}>
                <Minus size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        <span className="suggerimento">{t("nomiAiuto")}</span>
        {nomi.length < MAX_GIOCATORI && (
          <button type="button" className="btn" onClick={() => setNomi([...nomi, ""])}>
            <Plus size={18} aria-hidden="true" /> {t("aggiungiGiocatore")}
          </button>
        )}
      </fieldset>

      <fieldset className="ul-nomi-crea" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend>{t("comeSiVince")}</legend>
        {(["singolo", "punti"] as const).map((m) => (
          <label key={m} className="ul-opzione">
            <input type="radio" name="modo" checked={modo === m} onChange={() => setModo(m)} />
            <span>
              <strong>{t(m === "singolo" ? "modoSingolo" : "modoPunti")}</strong>
              <br />
              <span className="muted">{t(m === "singolo" ? "modoSingoloDesc" : "modoPuntiDesc")}</span>
            </span>
          </label>
        ))}
        {modo === "punti" && (
          <label className="campo">
            {t("soglia")}
            <input
              type="number"
              inputMode="numeric"
              min={SOGLIA_MIN}
              max={SOGLIA_MAX}
              step={10}
              value={soglia}
              aria-invalid={!sogliaOk}
              onChange={(e) => setSoglia(Number(e.target.value))}
            />
            <span className="suggerimento">{t("sogliaAiuto", { min: SOGLIA_MIN, max: SOGLIA_MAX })}</span>
          </label>
        )}
      </fieldset>

      <Varianti valore={varianti} onCambia={setVarianti} />

      {c.errore && <p className="errore">{testoMessaggio(t, c.errore)}</p>}
      <button className="btn primario" type="submit" disabled={!c.connesso || !validi}>
        {t("creaPartita")}
      </button>
      <button className="btn" type="button" onClick={onEntra}>
        {t("hoUnCodice")}
      </button>
    </form>
  );
}

function EntraConCodice({ c, onIndietro }: { c: Collegamento; onIndietro: () => void }) {
  const t = usaT(dizionari);
  const [codice, setCodice] = useState("");
  function invia(e: FormEvent) {
    e.preventDefault();
    const c5 = codice.trim().toUpperCase();
    c.invia({ t: "entra", codice: c5, token: leggiToken(c5) });
  }
  return (
    <form className="schermata allineata" onSubmit={invia}>
      <label className="campo">
        {t("codiceLabel")}
        <input autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false} value={codice} onChange={(e) => setCodice(e.target.value)} />
      </label>
      {c.errore && <p className="errore">{testoMessaggio(t, c.errore)}</p>}
      <button className="btn primario" type="submit">
        {t("entra")}
      </button>
      <button className="btn" type="button" onClick={onIndietro}>
        {t("indietro")}
      </button>
    </form>
  );
}

/** In cima: chi sono io e, a richiesta, codice, QR e chi è collegato. */
function Testata({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const io = v.nomi.find((n) => n.posto === v.io);
  const link = c.codice ? `${window.location.origin}/ultima/${c.codice}` : "";
  const collegati = v.nomi.filter((n) => n.collegato).length;
  const stato = (n: Vista["nomi"][number]) => (n.collegato ? t("statoCollegato") : n.occupato ? t("statoScollegato") : t("statoNonEntrato"));
  return (
    <div className="intestazione-partita">
      <p className="chi-sono">{io ? t(v.host ? "seiTuOrganizzatore" : "seiTu", { nome: io.nome }) : t("stoGuardando")}</p>
      <details className="accordion">
        <summary>
          <span>{t("stanza", { codice: c.codice ?? "", n: collegati })}</span>
        </summary>
        <div className="accordion-corpo">
          <div className="codice-riga">
            <span className="muted">{t("codicePartita")}</span>
            <strong>{c.codice}</strong>
            <CopiaLink link={link} />
          </div>
          <QrInvito link={link} />
          <ul className="chip-elenco" aria-label={t("giocatoriNellaStanza")}>
            {v.nomi.map((n) => (
              <li key={n.posto} className={`chip${n.collegato ? "" : " assente"}`}>
                <span className={`pallino${n.collegato ? " on" : ""}`} aria-hidden="true" />
                {n.nome}
                {n.organizzatore ? " *" : ""} · {stato(n)}
              </li>
            ))}
          </ul>
          <p className="muted">{t("organizzatoreLegenda")}</p>
        </div>
      </details>
    </div>
  );
}

function CopiaLink({ link }: { link: string }) {
  const t = usaT(dizionari);
  const [copiato, setCopiato] = useState(false);
  if (!navigator.clipboard) return null;
  return (
    <button
      type="button"
      className="btn piccolo"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopiato(true);
        } catch {
          /* permesso negato: resta il link scritto */
        }
      }}
    >
      <Copy size={16} aria-hidden="true" /> {copiato ? t("copiato") : t("copiaLink")}
    </button>
  );
}

/** QR code del link, disegnato nel telefono: funziona anche senza internet. */
function QrInvito({ link }: { link: string }) {
  const t = usaT(dizionari);
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let vivo = true;
    QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((s) => vivo && setSvg(s))
      .catch(() => vivo && setSvg(""));
    return () => {
      vivo = false;
    };
  }, [link]);
  if (!svg) return null;
  // Lo SVG lo genera la nostra libreria a partire dal link: nessun contenuto esterno.
  return <div className="qr" role="img" aria-label={t("qrAria")} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function ChiudiPartita({ c }: { c: Collegamento }) {
  const t = usaT(dizionari);
  const [conferma, setConferma] = useState(false);
  return (
    <section className="schermata allineata chiudi">
      {conferma ? (
        <>
          <p>{t("chiudiPerTutti")}</p>
          <button className="btn pericolo" onClick={() => c.invia({ t: "chiudi" })}>
            {t("siChiudi")}
          </button>
          <button className="btn" onClick={() => setConferma(false)}>
            {t("noContinua")}
          </button>
        </>
      ) : (
        <button className="btn pericolo-contorno" onClick={() => setConferma(true)}>
          {t("chiudiPartita")}
        </button>
      )}
    </section>
  );
}

function Fase({ c, v }: { c: Collegamento; v: Vista }) {
  if (v.fase === "sala") return <Sala c={c} v={v} />;
  return (
    <>
      {v.io === null && <LiberiDaRiprendere c={c} v={v} />}
      <Tavolo v={v} comandi={{ azione: c.azione, sollecita: () => c.invia({ t: "sollecita" }), conBot: true }} />
    </>
  );
}

/** Chi guarda può prendere il posto di un giocatore caduto (come il rientro da un altro telefono). */
function LiberiDaRiprendere({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const liberi = v.nomi.filter((n) => n.occupato && !n.collegato);
  if (liberi.length === 0) return <p className="muted">{t("stoGuardandoTesto")}</p>;
  return (
    <>
      <p>{t("eriGia")}</p>
      <div className="giocatori">
        {liberi.map((n) => (
          <button key={n.posto} className="btn" onClick={() => c.azione({ tipo: "riprendi", posto: n.posto })}>
            {n.nome}
          </button>
        ))}
      </div>
    </>
  );
}

function Sala({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const scelti = v.nomi.filter((n) => n.occupato).length;
  const tutti = scelti === v.nomi.length;
  return (
    <section className="schermata allineata">
      <p className="muted">{v.config.modo === "singolo" ? t("riepilogoSingolo") : t("riepilogoPunti", { soglia: v.config.soglia })}</p>
      <RiepilogoVarianti varianti={v.config.varianti} />
      {v.io === null ? (
        <>
          <h2>{t("chiSei")}</h2>
          <p className="muted">{t("toccaIlNome")}</p>
          <div className="giocatori">
            {v.nomi.map((n) => (
              <button key={n.posto} className="btn" disabled={n.occupato} onClick={() => c.azione({ tipo: "occupa", posto: n.posto })}>
                {n.nome}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2>{t("ciao", { nome: v.nomi.find((n) => n.posto === v.io)?.nome ?? "" })}</h2>
          <p className="muted" role="status">
            {tutti ? t("tuttiPronti") : t("aspettaGiocatori", { n: scelti, tot: v.nomi.length })}
          </p>
        </>
      )}
      {v.host && (
        <button className="btn primario" disabled={!tutti} onClick={() => c.azione({ tipo: "avvia" })}>
          {t("avviaPartita")}
        </button>
      )}
      {!v.host && tutti && v.io !== null && <p className="muted">{t("aspettaOrganizzatore")}</p>}
    </section>
  );
}

