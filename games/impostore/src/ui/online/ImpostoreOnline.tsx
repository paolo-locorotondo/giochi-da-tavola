import { useEffect, useState, type FormEvent } from "react";
import { MAX_CARATTERI_NOME, limitaRighe } from "@gdt/engine";
import { suona } from "@gdt/suoni";
import QRCode from "qrcode";
import { Copy, Eye, EyeOff } from "lucide-react";
import { NOME_LINGUA, usaLingua, usaT, type Lingua } from "@gdt/i18n";
import { dizionari } from "../../locales";
import { testoMessaggio } from "../../errori-ui";
import { g, Ricco } from "../Ricco";
import { categorie, lingueParole, nomeCategoria, impostoriConsigliati, impostoriMassimi, type Categoria, type Vista } from "../../online";
import { MAX_CARATTERI_PAROLA } from "../../parole";
import { leggiToken, useCollegamento, type Collegamento } from "./collegamento";
import "./online.css";

export function ImpostoreOnline({ codiceIniziale, onLocale }: { codiceIniziale: string | null; onLocale: () => void }) {
  const c = useCollegamento(codiceIniziale);
  const t = usaT(dizionari);
  const [inserisci, setInserisci] = useState(false);

  // Errori transitori (es. "nome già scelto") spariscono dopo qualche secondo.
  useEffect(() => {
    if (!c.errore) return;
    const id = setTimeout(c.azzeraErrore, 4000);
    return () => clearTimeout(id);
  }, [c.errore]); // eslint-disable-line react-hooks/exhaustive-deps

  const stato = !c.connesso ? <p className="avviso">{t("connessione")}</p> : null;

  // Senza vista e senza connessione da troppo tempo: meglio dirlo e proporre l'alternativa.
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
  const err = c.errore ? <p className="errore">{testoMessaggio(t, c.errore)}</p> : null;

  if (c.chiusa) {
    return (
      <section className="schermata">
        <h2>{t("partitaChiusa")}</h2>
        <p className="muted">{t("partitaChiusaTesto")}</p>
        <button className="btn primario" onClick={() => window.location.assign("/impostore")}>
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
        {err}
      </>
    );
  }

  return (
    <>
      {c.nonRaggiungibile && !c.connesso ? (
        <p className="avviso">{t("connessionePersa")}</p>
      ) : (
        stato
      )}
      {c.sollecitato && <p className="avviso">{t("toccaATe")}</p>}
      {err}
      <Testata c={c} v={c.vista} />
      <Partita c={c} v={c.vista} />
      {c.vista.host && <ChiudiPartita c={c} />}
    </>
  );
}

/** In cima a ogni schermata: chi sono io e, a richiesta, codice stanza e chi è collegato. */
function Testata({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const io = v.nomi.find((n) => n.posto === v.io);
  const link = c.codice ? `${window.location.origin}/impostore/${c.codice}` : "";
  const collegati = v.nomi.filter((n) => n.collegato).length;
  const stato = (n: Vista["nomi"][number]) => {
    if (v.fase !== "sala" && !n.inGioco) return t("statoNonPartecipa");
    if (n.collegato) return t("statoCollegato");
    return n.occupato ? t("statoScollegato") : t("statoNonEntrato");
  };
  return (
    <div className="intestazione-partita">
      <p className="chi-sono">
        {io ? <Ricco testo={t(v.host ? "seiTuOrganizzatore" : "seiTu", { nome: g(io.nome) })} /> : t("senzaNome")}
      </p>
      <details className="accordion">
        <summary>
          <span>
            {t("stanza", { codice: c.codice ?? "", n: collegati })}
          </span>
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
                {n.organizzatore ? " *" : ""}
                {n.posto === v.io ? ` ${t("tu")}` : ""} · {stato(n)}
              </li>
            ))}
          </ul>
          <p className="muted">{t("organizzatoreLegenda")}</p>
        </div>
      </details>
    </div>
  );
}

/** Copia il link della stanza. Su HTTP locale l'appunti può non esistere: il bottone allora si nasconde. */
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

function EntraConCodice({ c, onIndietro }: { c: Collegamento; onIndietro: () => void }) {
  const t = usaT(dizionari);
  const [codice, setCodice] = useState("");
  function invia(e: FormEvent) {
    e.preventDefault();
    const c5 = codice.trim().toUpperCase();
    // Se questo telefono era già nella partita, si presenta con il suo token: così rientra nel suo posto
    // (e, per l'organizzatore, resta organizzatore).
    c.invia({ t: "entra", codice: c5, token: leggiToken(c5) });
  }
  return (
    <form className="schermata allineata" onSubmit={invia}>
      <label className="campo">
        {t("codiceLabel")}
        <input autoFocus autoCapitalize="characters" value={codice} onChange={(e) => setCodice(e.target.value)} />
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

function Crea({ c, onEntra }: { c: Collegamento; onEntra: () => void }) {
  const t = usaT(dizionari);
  const linguaApp = usaLingua();
  const [lingua, setLingua] = useState<Lingua>(linguaApp);
  const [testo, setTesto] = useState("");
  const [scelta, setScelta] = useState<number | null>(null);
  const [categoria, setCategoria] = useState<Categoria>("cibi");
  const [votiVisibili, setVotiVisibili] = useState(true);
  const [indiziScritti, setIndiziScritti] = useState(false);

  const nomi = testo
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  const consigliati = impostoriConsigliati(Math.max(nomi.length, 3));
  const massimi = impostoriMassimi(Math.max(nomi.length, 3));
  const numImpostori = scelta !== null && scelta <= massimi ? scelta : consigliati;

  return (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        c.invia({ t: "crea", nomi, config: { numImpostori, categoria, lingua, votiVisibili, indiziScritti } });
      }}
    >
      <label className="campo">
        {t("giocatoriLabel")}
        <textarea rows={6} value={testo} onChange={(e) => setTesto(limitaRighe(e.target.value, MAX_CARATTERI_NOME))} placeholder={t("segnapostoNomi")} />
        <span className="suggerimento">{t("ognunoSceglieNome")}</span>
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
      </label>
      <label className="campo">
        {t("linguaParole")}
        <select value={lingua} onChange={(e) => setLingua(e.target.value as Lingua)}>
          {lingueParole.map((l) => (
            <option key={l} value={l}>
              {NOME_LINGUA[l]}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        {t("categoria")}
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
          {categorie.map((k) => (
            <option key={k} value={k}>
              {nomeCategoria(k, lingua)}
            </option>
          ))}
        </select>
      </label>
      <label className="spunta">
        <input type="checkbox" checked={votiVisibili} onChange={(e) => setVotiVisibili(e.target.checked)} />
        {t("votiInDiretta")}
      </label>
      <label className="spunta">
        <input type="checkbox" checked={indiziScritti} onChange={(e) => setIndiziScritti(e.target.checked)} />
        {t("indiziScritti")}
      </label>
      {c.errore && <p className="errore">{testoMessaggio(t, c.errore)}</p>}
      <button className="btn primario" type="submit" disabled={!c.connesso}>
        {t("creaPartita")}
      </button>
      <button className="btn" type="button" onClick={onEntra}>
        {t("hoUnCodice")}
      </button>
    </form>
  );
}

/** Rivedere la propria carta dopo la fase "carte": nascosta finché non la tocchi, la vedi solo tu. */
function RivediCarta({ v }: { v: Vista }) {
  const t = usaT(dizionari);
  const [aperta, setAperta] = useState(false);
  if (!v.carta || !["indizi", "voto", "tentativo"].includes(v.fase)) return null;
  return (
    <div className="rivedi">
      <button className="btn" onClick={() => setAperta(!aperta)}>
        {aperta ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        {` ${aperta ? t("nascondiCarta") : t("rivediCarta")}`}
      </button>
      {aperta && (
        <div className="carta">
          {v.carta.ruolo === "impostore" ? (
            <p className="grande">{t("seiImpostoreNonConosci")}</p>
          ) : (
            <>
              <p>{t("laParolaE")}</p>
              <p className="grande">{v.carta.parola}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Partita({ c, v }: { c: Collegamento; v: Vista }) {
  return (
    <>
      <Fase c={c} v={v} />
      <RivediCarta v={v} />
    </>
  );
}

function Fase({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const nome = (p: number | null) => v.nomi.find((n) => n.posto === p)?.nome ?? "";

  if (v.io === null && v.fase !== "sala") {
    const liberi = v.nomi.filter((n) => n.inGioco && !n.collegato);
    return (
      <section className="schermata allineata">
        <h2>{t("partitaInCorso")}</h2>
        {liberi.length > 0 ? (
          <>
            <p>{t("eriGia")}</p>
            <div className="giocatori">
              {liberi.map((n) => (
                <button key={n.posto} className="btn" onClick={() => c.azione({ tipo: "riprendi", posto: n.posto })}>
                  {n.nome}
                </button>
              ))}
            </div>
            <p className="muted">{t("nonEriTraiGiocatori")}</p>
          </>
        ) : (
          <p className="muted">{t("linkATuttiCollegati")}</p>
        )}
        {c.errore && <p className="errore">{testoMessaggio(t, c.errore)}</p>}
      </section>
    );
  }

  switch (v.fase) {
    case "sala":
      return <Sala c={c} v={v} />;
    case "carte":
      return <Carta c={c} v={v} />;
    case "indizi":
      return v.indizi ? (
        <IndiziScritti c={c} v={v} nome={nome} />
      ) : (
        <section className="schermata">
          <h2>{t("indizi")}</h2>
          <p>
            <Ricco testo={t("indiziVoceOnline", { nome: g(nome(v.primo)) })} />
          </p>
          {v.host ? (
            <button className="btn primario" onClick={() => c.azione({ tipo: "avanti" })}>
              {t("passaAlVoto")}
            </button>
          ) : (
            <p className="muted">{t("organizzatoreAvviaVoto")}</p>
          )}
        </section>
      );
    case "voto":
      return <Voto c={c} v={v} nome={nome} />;
    case "tentativo":
      return <Tentativo c={c} v={v} nome={nome} />;
    case "fine":
      return <Fine c={c} v={v} nome={nome} />;
  }
}

/** QR code del link, disegnato nel telefono: funziona anche su HTTP locale, senza internet. */
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
  return <div className="qr" aria-label={t("qrAria")} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Invito({ codice }: { codice: string }) {
  const t = usaT(dizionari);
  const link = `${window.location.origin}/impostore/${codice}`;
  const [copiato, setCopiato] = useState(false);
  // Su http://192.168… (non HTTPS) il browser non offre né Condividi né appunti.
  const puoCondividere = typeof navigator.share === "function" || !!navigator.clipboard;
  async function condividi() {
    try {
      if (navigator.share) await navigator.share({ title: t("condividiTitolo"), text: t("condividiTesto"), url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopiato(true);
      }
    } catch {
      /* annullato o non disponibile: resta il link scritto */
    }
  }
  return (
    <div className="invito">
      <p className="muted">{t("codicePartita")}</p>
      <p className="grande codice">{codice}</p>
      <p className="muted link-invito">{link}</p>
      <QrInvito link={link} />
      {puoCondividere ? (
        <button className="btn" onClick={condividi}>
          {copiato ? t("linkCopiato") : t("condividiLink")}
        </button>
      ) : (
        <p className="muted">{t("nessunCondividi")}</p>
      )}
    </div>
  );
}

function Sala({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const liberi = v.nomi.filter((n) => !n.occupato).length;
  const inSala = v.nomi.length - liberi;
  return (
    <section className="schermata allineata">
      {c.codice && v.host && <Invito codice={c.codice} />}
      {v.io === null ? (
        <>
          <h2>{t("chiSei")}</h2>
          <p className="muted">{t("toccaIlNome")}</p>
          <div className="giocatori">
            {v.nomi.map((n) => (
              <button
                key={n.posto}
                className="btn"
                disabled={n.occupato}
                onClick={() => c.azione({ tipo: "occupa", posto: n.posto })}
              >
                {n.nome}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2>{t("ciao", { nome: v.nomi.find((n) => n.posto === v.io)?.nome ?? "" })}</h2>
          <p className="muted">{t("aspettaGliAltri")}</p>
        </>
      )}
      <p>{t("entrati", { dentro: inSala, totale: v.nomi.length })}</p>
      <ul className="elenco">
        {v.nomi.map((n) => (
          <li key={n.posto} className={n.occupato ? "" : "assente"}>
            <span>
              {n.nome}
              {n.organizzatore ? " *" : ""} {n.occupato ? "✓" : "…"}
            </span>
            {v.host && n.occupato && n.posto !== v.io && (
              <button className="btn piccolo" onClick={() => c.azione({ tipo: "libera", posto: n.posto })}>
                {t("libera")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {v.host && (
        <div className="azioni">
          <button className="btn primario" disabled={inSala < 3} onClick={() => c.azione({ tipo: "avvia" })}>
            {t("avviaPartita", { n: inSala })}
          </button>
        </div>
      )}
    </section>
  );
}

function Carta({ c, v }: { c: Collegamento; v: Vista }) {
  const t = usaT(dizionari);
  const [scoperta, setScoperta] = useState(false);
  if (!v.carta) return null;
  const mioNome = v.nomi.find((n) => n.posto === v.io)?.nome;
  // Scoprire la carta vale come "visto": il server conta chi l'ha guardata.
  function scopri() {
    setScoperta(true);
    c.azione({ tipo: "visto" });
  }
  return (
    <section className="schermata">
      <p className="muted">
        <Ricco testo={t("cartaTua", { nome: g(mioNome ?? "") })} />
      </p>
      <div className="carta">
        {!scoperta ? (
          <button className="btn primario" onClick={scopri}>
            {t("scopri")}
          </button>
        ) : v.carta.ruolo === "impostore" ? (
          <>
            <p>{t("seiImpostore")}</p>
            <p className="grande">{t("nonConosciParola")}</p>
          </>
        ) : (
          <>
            <p>{t("laParolaE")}</p>
            <p className="grande">{v.carta.parola}</p>
          </>
        )}
      </div>
      <ProgressoCarte viste={v.viste} totale={v.nomi.filter((n) => n.inGioco).length} />
      <div className="azioni">
        {scoperta && (
          <button className="btn" onClick={() => setScoperta(false)}>
            <EyeOff size={18} aria-hidden="true" /> {t("nascondi")}
          </button>
        )}
        {v.host && (
          <button
            className="btn primario"
            disabled={v.viste < v.nomi.filter((n) => n.inGioco).length}
            onClick={() => c.azione({ tipo: "avanti" })}
          >
            {t("tuttiHannoVisto")}
          </button>
        )}
      </div>
    </section>
  );
}

/** Quanti hanno già guardato la propria carta: barra e testo, così non dipende dal solo colore. */
function ProgressoCarte({ viste, totale }: { viste: number; totale: number }) {
  const t = usaT(dizionari);
  const percentuale = totale > 0 ? Math.round((viste / totale) * 100) : 0;
  return (
    <div className="progresso">
      <p className="muted">
        <Ricco testo={t("hannoVistoLaCarta", { viste: g(viste), totale })} />
      </p>
      <div className="progresso-barra" role="progressbar" aria-valuemin={0} aria-valuemax={totale} aria-valuenow={viste}>
        <span style={{ width: `${percentuale}%` }} />
      </div>
    </div>
  );
}

function ElencoIndizi({ v, nome }: { v: Vista; nome: (p: number | null) => string }) {
  if (!v.indizi) return null;
  return (
    <ol className="elenco">
      {v.indizi.scritti.map((i, n) => (
        <li key={n}>
          <span>
            <strong>{nome(i.posto)}</strong>: {i.testo}
          </span>
        </li>
      ))}
    </ol>
  );
}

function IndiziScritti({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const t = usaT(dizionari);
  const [testo, setTesto] = useState("");
  const ind = v.indizi;
  if (!ind) return null;
  const mioTurno = ind.turno !== null && ind.turno === v.io;
  const giocatore = v.nomi.find((n) => n.posto === ind.turno);
  return (
    <section className="schermata allineata">
      <h2>{t("indizi")}</h2>
      <ElencoIndizi v={v} nome={nome} />
      {mioTurno ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            c.azione({ tipo: "indizio", testo });
            setTesto("");
          }}
        >
          <p>{t("toccaATeScrivi")}</p>
          <input autoFocus autoComplete="off" maxLength={60} value={testo} onChange={(e) => setTesto(e.target.value)} />
          <button className="btn primario" type="submit" disabled={!testo.trim()}>
            {t("invia")}
          </button>
        </form>
      ) : ind.turno !== null ? (
        <p className="muted">
          <Ricco testo={t(giocatore && !giocatore.collegato ? "toccaAScollegato" : "toccaA", { nome: g(nome(ind.turno)) })} />
        </p>
      ) : (
        <p className="muted">{t("hannoScrittoTutti")}</p>
      )}
      {c.errore && <p className="errore">{testoMessaggio(t, c.errore)}</p>}
      {v.host && (
        <div className="mancanti">
          {ind.turno !== null && !mioTurno && (
            <button className="btn" onClick={() => c.invia({ t: "sollecita" })}>
              {t("sollecitaNome", { nome: nome(ind.turno) })}
            </button>
          )}
          <button className="btn primario" disabled={ind.turno !== null} onClick={() => c.azione({ tipo: "avanti" })}>
            {t("passaAlVoto")}
          </button>
        </div>
      )}
    </section>
  );
}

function Voto({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const t = usaT(dizionari);
  const voto = v.voto;
  if (!voto) return null;
  const sonoInGioco = v.nomi.find((n) => n.posto === v.io)?.inGioco ?? false;
  return (
    <section className="schermata allineata">
      <h2>{voto.ballottaggio ? t("ballottaggio") : t("votazione")}</h2>
      {voto.ballottaggio && v.ultimoEsito && <p className="muted">{t("pareggioRivota")}</p>}
      {v.indizi && (
        <details className="accordion">
          <summary>{t("indiziDati")}</summary>
          <div className="accordion-corpo">
            <ElencoIndizi v={v} nome={nome} />
          </div>
        </details>
      )}
      <p className="muted">{t("hannoVotato", { votato: voto.hannoVotato, totale: voto.totale })}</p>
      {sonoInGioco ? (
        <div className="giocatori">
          {voto.candidati
            .filter((p) => p !== v.io)
            .map((p) => (
              <button
                key={p}
                className={`btn voto${voto.mioVoto === p ? " primario" : ""}`}
                onClick={() => c.azione({ tipo: "vota", posto: p })}
              >
                {nome(p)}
                {voto.conteggi && <span className="contatore">{voto.conteggi[p] ?? 0}</span>}
              </button>
            ))}
        </div>
      ) : (
        <p className="muted">{t("nonPartecipi")}</p>
      )}
      {sonoInGioco && voto.mioVoto !== null && <p className="muted">{t("haiVotato", { nome: nome(voto.mioVoto) })}</p>}
      {v.host && voto.mancanti && voto.mancanti.length > 0 && (
        <div className="mancanti">
          <p>{t("mancano")}</p>
          <ul className="elenco">
            {voto.mancanti.map((p) => (
              <li key={p}>
                <span>
                  {nome(p)} {v.nomi.find((n) => n.posto === p)?.collegato ? "" : t("scollegatoSuffisso")}
                </span>
              </li>
            ))}
          </ul>
          <button className="btn" onClick={() => c.invia({ t: "sollecita" })}>
            {t("sollecita")}
          </button>
        </div>
      )}
    </section>
  );
}

function Tentativo({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const t = usaT(dizionari);
  const [testo, setTesto] = useState("");
  const tocca = v.io !== null && v.io === v.eliminato;
  return tocca ? (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        c.azione({ tipo: "tenta", testo });
      }}
    >
      <h2>{t("seiStatoScoperto")}</h2>
      <p>{t("indovinaParola")}</p>
      <input autoFocus autoComplete="off" maxLength={MAX_CARATTERI_PAROLA} autoCapitalize="none" value={testo} onChange={(e) => setTesto(e.target.value)} />
      <button className="btn primario" type="submit">
        {t("conferma")}
      </button>
    </form>
  ) : (
    <section className="schermata">
      <h2>{t("eLImpostore", { nome: nome(v.eliminato) })}</h2>
      <p className="muted">{t("staIndovinando")}</p>
    </section>
  );
}

function Fine({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const t = usaT(dizionari);
  const f = v.fine;
  const vincitore = f?.vincitore;
  useEffect(() => {
    if (vincitore) suona(vincitore === "civili" ? "civili" : "impostori");
  }, [vincitore]);
  if (!f) return null;
  const e = v.ultimoEsito;
  return (
    <section className="schermata">
      <h2>{f.vincitore === "civili" ? t("vincitoCivili") : t("vincitoImpostori")}</h2>
      <p>
        <Ricco testo={t("laParolaEra", { parola: g(f.parola) })} />
      </p>
      <p className="muted">{t("impostoriElenco", { nomi: f.impostori.map(nome).join(", ") })}</p>
      {f.eliminato !== null && <p className="muted">{t("eliminato", { nome: nome(f.eliminato) })}</p>}
      {e && (
        <p className="muted">
          {f.eliminato === null ? `${t("pareggioNessuno")} ` : ""}
          {t("votiUltima", {
            elenco: Object.entries(e.conteggi)
              .sort((a, b) => b[1] - a[1])
              .map(([p, n]) => t("votiDi", { nome: nome(Number(p)), voti: t("votoConteggio", { n }) }))
              .join(", "),
          })}
        </p>
      )}
      {v.host ? (
        <button className="btn primario" onClick={() => c.azione({ tipo: "nuova" })}>
          {t("nuovaStessaSala")}
        </button>
      ) : (
        <p className="muted">{t("altraPartita")}</p>
      )}
    </section>
  );
}
