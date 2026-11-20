import { useEffect, useState, type FormEvent } from "react";
import { Bell, Bot, Copy, Minus, Plus } from "lucide-react";
import QRCode from "qrcode";
import { MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { testoMessaggio } from "../errori-ui";
import { COLORI, MAX_GIOCATORI, MIN_GIOCATORI, type Carta as DatiCarta, type Colore, type Evento } from "../logica";
import { SOGLIA_MAX, SOGLIA_MIN, SOGLIA_PREDEFINITA, type ModoPunteggio, type Vista } from "../online";
import { Carta, ICONA_COLORE, nomeCarta, nomeColore } from "./Carta";
import { leggiToken, useCollegamento, type Collegamento } from "./collegamento";

type T = ReturnType<typeof usaT<typeof dizionari.it>>;

export function UltimaOnline({ codiceIniziale }: { codiceIniziale: string | null }) {
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
        if (validi) c.invia({ t: "crea", gioco: "ultima", nomi: puliti, config: { modo, soglia } });
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
  return <Tavolo c={c} v={v} />;
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

function testoEvento(t: T, e: Evento, nome: (p: number) => string): string {
  switch (e.tipo) {
    case "nuovoRound":
      return t("ev_nuovoRound");
    case "gioca": {
      const base = t("ev_gioca", { nome: nome(e.posto), carta: nomeCarta(t, e.carta, e.colore) });
      return base;
    }
    case "pesca":
      return t("ev_pesca", { nome: nome(e.posto) });
    case "passa":
      return t("ev_passa", { nome: nome(e.posto) });
    case "salta":
      return t("ev_salta", { nome: nome(e.posto) });
    case "inverti":
      return t("ev_inverti");
    case "piu2":
      return t("ev_piu2", { nome: nome(e.posto) });
    case "piu4":
      return t("ev_piu4", { nome: nome(e.posto) });
    case "sfida":
      return e.legale
        ? t("ev_sfidaPersa", { nome: nome(e.posto) })
        : t("ev_sfidaVinta", { nome: nome(e.posto), contro: nome(e.contro) });
    case "accetta":
      return t("ev_accetta", { nome: nome(e.posto) });
    case "coloreScelto":
      return t("ev_coloreScelto", { nome: nome(e.posto), colore: nomeColore(t, e.colore) });
    case "ultima":
      return t("ev_ultima", { nome: nome(e.posto) });
    case "beccato":
      return t("ev_beccato", { nome: nome(e.posto), chi: nome(e.chi) });
    case "bot":
      return t("ev_bot", { nome: nome(e.posto) });
    case "mazzoRimescolato":
      return t("ev_mazzoRimescolato");
    case "fineRound":
      return t("ev_fineRound", { nome: nome(e.posto), punti: e.punti });
  }
}

function Tavolo({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  /** Un Jolly toccato: aspetta la scelta del colore. */
  const [jolly, setJolly] = useState<DatiCarta | null>(null);
  const nome = (p: number | null) => v.nomi.find((n) => n.posto === p)?.nome ?? "";
  const turno = v.turno;
  const giocabili = new Set(v.giocabili);
  const inRound = v.fase === "partita" && v.fineRound === null;
  const sfidaIo = inRound && v.mioTurno && v.sfida !== null;

  // Se il turno passa, la scelta del colore in sospeso non vale più.
  useEffect(() => {
    if (!v.mioTurno) setJolly(null);
  }, [v.mioTurno]);

  const tocca = (carta: DatiCarta) => {
    if (!v.mioTurno || !giocabili.has(carta.id)) return;
    if (carta.tipo === "jolly" || carta.tipo === "piu4") setJolly(carta);
    else c.azione({ tipo: "gioca", carta: carta.id });
  };
  const giocaJolly = (colore: Colore) => {
    if (jolly) c.azione({ tipo: "gioca", carta: jolly.id, colore });
    setJolly(null);
  };

  const stato = (() => {
    if (v.fase === "fine") return v.vincitore === v.io ? t("haiVintoPartita") : t("haVintoPartita", { nome: nome(v.vincitore) });
    if (v.fase === "fineRound" && v.fineRound) return v.fineRound.vincitore === v.io ? t("haiVintoRound") : t("haVintoRound", { nome: nome(v.fineRound.vincitore) });
    return v.mioTurno ? t("toccaATe") : t("toccaANome", { nome: nome(turno) });
  })();

  const turnoGiocatore = v.nomi.find((n) => n.posto === turno);
  const ultimaAperta = v.ultima && !v.ultima.dichiarata ? v.ultima : null;
  const possoDirUltima = inRound && v.io !== null && v.ultima?.posto === v.io && !v.ultima.dichiarata;
  const posso = inRound && v.io !== null;
  const mazzoVuoto = v.mazzo === 0;
  const nessunaGiocabile = v.mioTurno && !sfidaIo && !v.sceltaColore && giocabili.size === 0;

  return (
    <section className="schermata allineata ul-tavolo">
      {v.io === null && <LiberiDaRiprendere c={c} v={v} />}
      <p className="ul-stato" role="status" aria-live="polite">
        {stato}
      </p>
      <p className="muted" style={{ margin: 0, textAlign: "center" }}>
        {t("round", { n: v.round })} · {v.config.modo === "singolo" ? t("riepilogoSingolo") : t("riepilogoPunti", { soglia: v.config.soglia })}
      </p>

      {v.fase !== "partita" || v.fineRound ? <FineRound c={c} v={v} nome={nome} /> : null}

      <Giocatori c={c} v={v} />

      {inRound && (
        <div className="ul-centro">
          {v.scoperta && <Carta carta={v.scoperta} t={t} colore={v.colore} grande />}
          <button
            type="button"
            className="ul-mazzo"
            disabled={!(v.mioTurno && !v.haPescato && !sfidaIo && !v.sceltaColore)}
            aria-label={t("pescaAria", { n: v.mazzo })}
            onClick={() => c.azione({ tipo: "pesca" })}
          >
            <span>{t("pesca")}</span>
            <span>{t("mazzo", { n: v.mazzo })}</span>
          </button>
          <div className="ul-info">
            {v.colore ? <ColoreInCorso t={t} colore={v.colore} /> : <span className="muted">{t("aspettoColore", { nome: nome(turno) })}</span>}
            <span className="muted">{t("verso", { verso: v.verso === 1 ? t("versoOrario") : t("versoAntiorario") })}</span>
          </div>
        </div>
      )}

      {inRound && v.sceltaColore && (
        <div className="ul-avviso">
          <h3>{t("scegliColoreTitolo")}</h3>
          <p>{t("scegliColoreTesto")}</p>
          <SceltaColore t={t} onScegli={(colore) => c.azione({ tipo: "scegliColore", colore })} />
        </div>
      )}

      {sfidaIo && v.sfida && (
        <div className="ul-avviso">
          <h3>{t("sfidaTitolo")}</h3>
          <p>{t("sfidaTesto", { nome: nome(v.sfida.contro), colore: v.colore ? nomeColore(t, v.colore) : "" })}</p>
          {v.sfida.sospetto && <p>{t("sfidaSospetto", { nome: nome(v.sfida.contro) })}</p>}
          <p className="muted">{t("sfidaRegola")}</p>
          <div className="ul-azioni">
            <button className="btn" onClick={() => c.azione({ tipo: "sfida" })}>
              {t("sfida")}
            </button>
            <button className="btn primario" onClick={() => c.azione({ tipo: "accetta" })}>
              {t("accetta")}
            </button>
          </div>
        </div>
      )}
      {inRound && v.sfida && !sfidaIo && <p className="avviso">{t("inAttesaSfida", { nome: nome(turno) })}</p>}

      {jolly && (
        <div className="ul-avviso">
          <h3>{t("sceltaColoreCarta")}</h3>
          <SceltaColore t={t} onScegli={giocaJolly} />
          <button className="btn" onClick={() => setJolly(null)}>
            {t("annulla")}
          </button>
        </div>
      )}

      {v.mioTurno && v.haPescato && !sfidaIo && <p className="muted">{t("hoPescato")}</p>}
      {nessunaGiocabile && !v.haPescato && !mazzoVuoto && <p className="muted">{t("nessunaGiocabile")}</p>}

      {posso && (
        <div className="ul-azioni">
          {v.mioTurno && v.haPescato && !sfidaIo && (
            <button className="btn primario" onClick={() => c.azione({ tipo: "passa" })}>
              {t("passa")}
            </button>
          )}
          {possoDirUltima && (
            <button className="btn primario" onClick={() => c.azione({ tipo: "ultima" })}>
              {t("ultima")}
            </button>
          )}
          {ultimaAperta && ultimaAperta.posto !== v.io && (
            <button className="btn pericolo" onClick={() => c.azione({ tipo: "beccato", posto: ultimaAperta.posto })} aria-describedby="ul-beccato-aiuto">
              {t("beccato", { nome: nome(ultimaAperta.posto) })}
            </button>
          )}
        </div>
      )}
      {posso && ultimaAperta && ultimaAperta.posto !== v.io && (
        <p className="muted" id="ul-beccato-aiuto">
          {t("beccatoAiuto", { nome: nome(ultimaAperta.posto) })}
        </p>
      )}
      {v.io !== null && v.ultima?.posto === v.io && v.ultima.dichiarata && inRound && <p className="muted">{t("ultimaDetto")}</p>}

      {v.io !== null && (
        <>
          <h3 style={{ margin: 0 }}>{t("tuaMano")}</h3>
          <div className="ul-mano" role="group" aria-label={t("tuaMano")}>
            {v.mano.map((carta) => (
              <Carta key={carta.id} carta={carta} t={t} onClick={() => tocca(carta)} spenta={!v.mioTurno || !giocabili.has(carta.id)} />
            ))}
          </div>
        </>
      )}

      {inRound && v.host && turnoGiocatore && (
        <div className="ul-azioni">
          <button className="btn" onClick={() => c.invia({ t: "sollecita" })}>
            <Bell size={18} aria-hidden="true" /> {t("sollecita", { nome: turnoGiocatore.nome })}
          </button>
          <button className="btn" onClick={() => c.azione({ tipo: "mossaBot", posto: turnoGiocatore.posto })} aria-describedby="ul-bot-aiuto">
            <Bot size={18} aria-hidden="true" /> {t("botMossa", { nome: turnoGiocatore.nome })}
          </button>
          <span className="muted" id="ul-bot-aiuto" style={{ gridColumn: "1 / -1" }}>
            {t("botAiuto")}
          </span>
        </div>
      )}
      {inRound && v.io !== null && turnoGiocatore && !turnoGiocatore.collegato && v.io !== turno && (
        <p className="avviso">{t("inAttesaDi", { nome: turnoGiocatore.nome })}</p>
      )}

      <details className="accordion">
        <summary>
          <span>{t("eventiTitolo")}</span>
        </summary>
        <div className="accordion-corpo">
          {v.eventi.length === 0 ? (
            <p className="muted">{t("eventiNessuno")}</p>
          ) : (
            <ul className="ul-eventi">
              {[...v.eventi].reverse().map((e, i) => (
                <li key={i}>{testoEvento(t, e, nome)}</li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}

function ColoreInCorso({ t, colore }: { t: T; colore: Colore }) {
  const Icona = ICONA_COLORE[colore];
  return (
    <span className={`ul-colore-corso ul-${colore}`}>
      <Icona size={20} aria-hidden="true" />
      {t("coloreInCorso", { colore: nomeColore(t, colore) })}
    </span>
  );
}

/** Quattro pulsanti grandi: colore, simbolo e nome (il colore non è l'unico segnale). */
function SceltaColore({ t, onScegli }: { t: T; onScegli: (c: Colore) => void }) {
  return (
    <div className="ul-colori">
      {COLORI.map((colore) => {
        const Icona = ICONA_COLORE[colore];
        return (
          <button key={colore} type="button" className={`btn ul-${colore}`} onClick={() => onScegli(colore)}>
            <Icona size={22} aria-hidden="true" /> {nomeColore(t, colore)}
          </button>
        );
      })}
    </div>
  );
}

function Giocatori({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  void c;
  return (
    <ul className="ul-giocatori" aria-label={t("giocatori")}>
      {v.nomi.map((n) => {
        const inTurno = v.turno === n.posto;
        return (
          <li key={n.posto} className={`ul-giocatore${inTurno ? " ul-turno" : ""}`} aria-current={inTurno ? "true" : undefined}>
            <span className="ul-giocatore-nome">
              <span className={`pallino${n.collegato ? " on" : ""}`} aria-hidden="true" /> {n.nome}
              {n.posto === v.io ? " ★" : ""}
            </span>
            <span className="ul-giocatore-dati">
              {n.carte === 1 ? t("unaCarta") : t("carteDi", { n: n.carte })}
              {v.config.modo === "punti" ? ` · ${t("puntiTot", { n: n.punti })}` : ""}
              {inTurno ? ` · ${t("diTurno")}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function FineRound({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const t = usaT(dizionari);
  const fine = v.fase === "fine";
  const ordinati = [...v.nomi].sort((a, b) => b.punti - a.punti);
  return (
    <div className="ul-avviso">
      <h3>{fine ? t("fineTitolo") : t("fineRoundTitolo")}</h3>
      {v.fineRound && (
        <p>
          {t("ev_fineRound", { nome: nome(v.fineRound.vincitore), punti: v.fineRound.punti })}
        </p>
      )}
      {v.config.modo === "punti" && (
        <>
          <h4 style={{ margin: 0 }}>{t("classifica")}</h4>
          <ol className="ul-classifica" style={{ listStyle: "none" }}>
            {ordinati.map((n) => (
              <li key={n.posto} className={n.posto === v.vincitore || (!fine && n.posto === v.fineRound?.vincitore) ? "ul-vincitore" : undefined}>
                <span>{n.nome}</span>
                <span>
                  {t("puntiTot", { n: n.punti })}
                  {n.puntiInMano ? ` · ${t("inManoRestano", { n: n.puntiInMano })}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      {v.host && (
        <button className="btn primario" onClick={() => c.azione({ tipo: fine ? "ricomincia" : "prossimoRound" })}>
          {fine ? t("ricomincia") : t("prossimoRound")}
        </button>
      )}
      {!v.host && <p className="muted">{fine ? t("aspettoRicomincia") : t("aspettoProssimo")}</p>}
    </div>
  );
}
