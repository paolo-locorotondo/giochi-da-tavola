import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeftRight, Copy } from "lucide-react";
import QRCode from "qrcode";
import { MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { testoMessaggio } from "../errori-ui";
import { SOGLIE, SOGLIA_PREDEFINITA, type Posti, type Soglia } from "../regole";
import type { Vista } from "../online";
import { Opzioni } from "./ScopaLocale";
import { nomeSquadra } from "./Riepilogo";
import { Tavolo } from "./Tavolo";
import { leggiToken, useCollegamento, type Collegamento } from "./collegamento";

export function ScopaOnline({ codiceIniziale, onLocale }: { codiceIniziale: string | null; onLocale?: () => void }) {
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
        <button className="btn primario" onClick={() => window.location.assign("/scopa")}>
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
  const [posti, setPosti] = useState<Posti>(2);
  const [nomi, setNomi] = useState<string[]>(["", "", "", ""]);
  const [soglia, setSoglia] = useState<Soglia>(SOGLIA_PREDEFINITA);
  const puliti = nomi.slice(0, posti).map((n) => n.trim());
  const distinti = new Set(puliti.map((n) => n.toLowerCase())).size === puliti.length;
  const validi = puliti.every(Boolean) && distinti;
  const cambia = (i: number, v: string) => setNomi(nomi.map((n, k) => (k === i ? v : n)));
  return (
    <form
      className="schermata allineata"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (validi) c.invia({ t: "crea", gioco: "scopa", nomi: puliti, config: { posti, soglia } });
      }}
    >
      <Opzioni
        legenda={t("quantiGiocatori")}
        nome="posti"
        valore={posti}
        onCambia={setPosti}
        voci={([2, 4] as const).map((p) => ({ valore: p, titolo: t(`posti_${p}`), desc: t(`posti_${p}Desc`) }))}
      />
      <fieldset className="sc-gruppo sc-senza-bordo">
        <legend>{t("nomiGiocatori")}</legend>
        {nomi.slice(0, posti).map((n, i) => (
          <label key={i} className="campo">
            {t("nomeGiocatore", { n: i + 1 })}
            <input value={n} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={(e) => cambia(i, e.target.value)} />
          </label>
        ))}
        <span className="suggerimento">{t("nomiAiuto")}</span>
      </fieldset>
      <Opzioni
        legenda={t("sogliaTitolo")}
        nome="soglia"
        valore={soglia}
        onCambia={setSoglia}
        voci={SOGLIE.map((x) => ({ valore: x, titolo: t(`soglia_${x}`), desc: t(`soglia_${x}Desc`) }))}
      />

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
  const link = c.codice ? `${window.location.origin}/scopa/${c.codice}` : "";
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
  const [scambio, setScambio] = useState<number | null>(null);
  const tocca = (posto: number) => {
    if (scambio === null) setScambio(posto);
    else {
      if (scambio !== posto) c.azione({ tipo: "squadre", a: scambio, b: posto });
      setScambio(null);
    }
  };
  return (
    <section className="schermata allineata">
      <p className="muted">{t("coppieAiuto")}</p>
      <p className="muted">{t("riepilogoConfig", { posti: v.config.posti, soglia: v.config.soglia })}</p>
      {v.config.posti === 4 && (
        <div className="sc-coppie">
          <h3>{t("coppie")}</h3>
          <ul className="sc-coppie-lista">
            {([0, 1] as const).map((sq) => (
              <li key={sq}>{nomeSquadra(t, v, sq)}</li>
            ))}
          </ul>
          {v.host && (
            <>
              <p className="muted">{t("coppieScambia")}</p>
              <div className="giocatori">
                {v.nomi.map((n) => (
                  <button key={n.posto} className="btn" aria-pressed={scambio === n.posto} onClick={() => tocca(n.posto)}>
                    <ArrowLeftRight size={16} aria-hidden="true" /> {n.nome}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
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
