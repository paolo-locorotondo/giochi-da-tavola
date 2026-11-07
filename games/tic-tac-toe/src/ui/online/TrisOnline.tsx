import { useEffect, useState, type FormEvent } from "react";
import { Copy } from "lucide-react";
import QRCode from "qrcode";
import { MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../../locales";
import { testoMessaggio } from "../../errori-ui";
import type { Vista } from "../../online";
import { leggiToken, useCollegamento, type Collegamento } from "./collegamento";

export function TrisOnline({ codiceIniziale, onLocale }: { codiceIniziale: string | null; onLocale: () => void }) {
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
        <button className="btn primario" onClick={onLocale}>
          {t("giocaUnTelefono")}
        </button>
      </section>
    );
  }

  if (c.chiusa) {
    return (
      <section className="schermata">
        <h2>{t("partitaChiusa")}</h2>
        <p className="muted">{t("partitaChiusaTesto")}</p>
        <button className="btn primario" onClick={() => window.location.assign("/tris")}>
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
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const nomi = [a.trim(), b.trim()];
  const validi = nomi[0] !== "" && nomi[1] !== "" && nomi[0]!.toLowerCase() !== nomi[1]!.toLowerCase();
  return (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        if (validi) c.invia({ t: "crea", gioco: "tris", nomi, config: {} });
      }}
    >
      <label className="campo">
        {t("nomeX")}
        <input value={a} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={(e) => setA(e.target.value)} />
      </label>
      <label className="campo">
        {t("nomeO")}
        <input value={b} maxLength={MAX_CARATTERI_NOME} autoComplete="off" spellCheck={false} onChange={(e) => setB(e.target.value)} />
        <span className="suggerimento">{t("ognunoSceglieNome")}</span>
      </label>
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
  const link = c.codice ? `${window.location.origin}/tris/${c.codice}` : "";
  const collegati = v.nomi.filter((n) => n.collegato).length;
  const stato = (n: Vista["nomi"][number]) => (n.collegato ? t("statoCollegato") : n.occupato ? t("statoScollegato") : t("statoNonEntrato"));
  return (
    <div className="intestazione-partita">
      <p className="chi-sono">{io ? t(v.host ? "seiTuOrganizzatore" : "seiTu", { nome: io.nome, segno: io.segno }) : t("stoGuardando")}</p>
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
                {n.nome} ({n.segno}){n.organizzatore ? " *" : ""} · {stato(n)}
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
  const t = usaT(dizionari);
  if (v.fase === "sala") return <Sala c={c} v={v} />;

  const nome = (posto: number | null) => v.nomi.find((n) => n.posto === posto)?.nome ?? "";
  const altroPosto = v.nomi.find((n) => n.posto === (v.io === 1 ? 2 : 1));
  const altroNome = altroPosto?.nome ?? "";

  const stato =
    v.fase === "fine"
      ? v.vincitore !== null
        ? v.vincitore === v.io
          ? t("haiVinto")
          : t("haVinto", { nome: nome(v.vincitore) })
        : t("pareggio")
      : v.mioTurno
        ? t("toccaATe")
        : t("toccaANome", { nome: nome(v.turno) });

  const linea = new Set(v.esito?.linea ?? []);
  const nomeCasella = (i: number) => t("casella", { riga: Math.floor(i / 3) + 1, colonna: (i % 3) + 1 });

  return (
    <section className="schermata allineata tris">
      {v.io === null && <LiberiDaRiprendere c={c} v={v} />}
      <p className="tris-stato" role="status" aria-live="polite">
        {stato}
      </p>
      <div className="tris-griglia" role="group" aria-label={t("griglia")}>
        {v.griglia.map((cas, i) => (
          <button
            key={i}
            type="button"
            className={`tris-casella${cas ? ` tris-${cas}` : ""}${linea.has(i) ? " tris-vincente" : ""}`}
            aria-label={cas ? t("casellaSegno", { posizione: nomeCasella(i), segno: cas }) : t("casellaVuota", { posizione: nomeCasella(i) })}
            aria-disabled={cas !== null || !v.mioTurno}
            onClick={() => {
              if (v.mioTurno && cas === null) c.azione({ tipo: "muovi", casella: i });
            }}
          >
            {cas}
          </button>
        ))}
      </div>

      {v.fase === "partita" && v.io !== null && altroPosto && !altroPosto.collegato && (
        <p className="avviso">{t("inAttesaDi", { nome: altroNome })}</p>
      )}

      {v.fase === "fine" && v.io !== null && (
        <>
          {v.rivincita.altro && !v.rivincita.io && <p className="muted">{t("vuoleRivincita", { nome: altroNome })}</p>}
          <button className="btn primario" disabled={v.rivincita.io} onClick={() => c.azione({ tipo: "rivincita" })}>
            {v.rivincita.io ? t("aspettoRivincita", { nome: altroNome }) : t("rivincita")}
          </button>
        </>
      )}

      <div className="tris-punteggio">
        <h3>{t("punteggio")}</h3>
        <ul className="chip-elenco">
          {v.nomi.map((n) => (
            <li key={n.posto} className="chip">
              {t("vittorie", { chi: `${n.nome} (${n.segno})`, n: v.punteggio[n.segno] })}
            </li>
          ))}
          <li className="chip">{t("pareggi", { n: v.punteggio.pareggi })}</li>
        </ul>
      </div>
    </section>
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
            {n.nome} ({n.segno})
          </button>
        ))}
      </div>
    </>
  );
}

function Sala({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const entrambi = v.nomi.every((n) => n.occupato);
  return (
    <section className="schermata allineata">
      {v.io === null ? (
        <>
          <h2>{t("chiSei")}</h2>
          <p className="muted">{t("toccaIlNome")}</p>
          <div className="giocatori">
            {v.nomi.map((n) => (
              <button key={n.posto} className="btn" disabled={n.occupato} onClick={() => c.azione({ tipo: "occupa", posto: n.posto })}>
                {n.nome} ({n.segno})
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2>{t("ciao", { nome: v.nomi.find((n) => n.posto === v.io)?.nome ?? "" })}</h2>
          <p className="muted">{entrambi ? t("tuttiPronti") : t("aspettaAvversario")}</p>
        </>
      )}
      {v.host && (
        <button className="btn primario" disabled={!entrambi} onClick={() => c.azione({ tipo: "avvia" })}>
          {t("avviaPartita")}
        </button>
      )}
      {!v.host && entrambi && v.io !== null && <p className="muted">{t("aspettaOrganizzatore")}</p>}
    </section>
  );
}
