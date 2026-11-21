import { useEffect, useState } from "react";
import { Bell, Bot, Copy, Handshake, RotateCw, Scissors } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { COLORI, TAGLIO_MS, gruppiDellaMano, valoreGruppo, type Carta as DatiCarta, type Colore, type Evento } from "../logica";
import type { Vista } from "../online";
import { Carta, ICONA_COLORE, nomeCarta, nomeColore } from "./Carta";
import { RiepilogoVarianti } from "./Varianti";

type T = ReturnType<typeof usaT<typeof dizionari.it>>;

/** Cosa può fare il tavolo: online passa dal server, offline dalla partita sul telefono. */
export interface Comandi {
  azione: (a: Record<string, unknown>) => void;
  /** Solo online: l'organizzatore sollecita chi è di turno. */
  sollecita?: () => void;
  /** Solo online: l'organizzatore vede «Simula mossa col bot». */
  conBot?: boolean;
}

function testoEvento(t: T, e: Evento, nome: (p: number) => string): string {
  switch (e.tipo) {
    case "nuovoRound":
      return t("ev_nuovoRound");
    case "gioca":
      return e.quante && e.quante > 1
        ? t("ev_giocaPiu", { nome: nome(e.posto), n: e.quante, carta: nomeCarta(t, e.carta, e.colore) })
        : t("ev_gioca", { nome: nome(e.posto), carta: nomeCarta(t, e.carta, e.colore) });
    case "pesca":
      return t("ev_pesca", { nome: nome(e.posto) });
    case "passa":
      return t("ev_passa", { nome: nome(e.posto) });
    case "salta":
      return t("ev_salta", { nome: nome(e.posto) });
    case "inverti":
      return t("ev_inverti");
    case "taglio":
      return t("ev_taglio", { nome: nome(e.posto), carta: nomeCarta(t, e.carta) });
    case "scambio":
      return t("ev_scambio", { nome: nome(e.posto), con: nome(e.con) });
    case "rotazione":
      return t("ev_rotazione");
    case "piu2":
      return e.quante ? t("ev_piu2Piu", { nome: nome(e.posto), n: e.quante }) : t("ev_piu2", { nome: nome(e.posto) });
    case "piu4":
      return t("ev_piu4", { nome: nome(e.posto) });
    case "cumulo":
      return t("ev_cumulo", { nome: nome(e.posto), n: e.quante });
    case "pescaCumulo":
      return t("ev_pescaCumulo", { nome: nome(e.posto), n: e.quante });
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

/** Mosse che chiudono l'effetto di uno scambio di mani (dopo, le righe non sono più evidenziate). */
const MOSSE = new Set(["gioca", "pesca", "passa", "accetta", "sfida", "pescaCumulo", "taglio", "nuovoRound"]);

/** Se l'ultima mossa è stata uno Scambio o una Rotazione: quali posti evidenziare. */
function maniCambiate(v: Vista): { tipo: "scambio" | "rotazione"; posti: number[] } | null {
  for (let i = v.eventi.length - 1; i >= 0; i--) {
    const e = v.eventi[i]!;
    if (e.tipo === "scambio") return { tipo: "scambio", posti: [e.posto, e.con] };
    if (e.tipo === "rotazione") return { tipo: "rotazione", posti: v.nomi.map((n) => n.posto) };
    if (MOSSE.has(e.tipo)) return null;
  }
  return null;
}

/**
 * Secondi rimasti per tagliare, contati dal momento in cui il telefono riceve la finestra
 * (il server tiene l'ora vera, con un secondo di tolleranza). 0 = finestra scaduta o assente.
 */
function useSecondiTaglio(taglio: Vista["taglio"]): number {
  const chiave = taglio ? `${taglio.posto}:${taglio.carta.id}` : null;
  const [restano, setRestano] = useState(0);
  useEffect(() => {
    if (!chiave) {
      setRestano(0);
      return;
    }
    const fine = Date.now() + TAGLIO_MS;
    const aggiorna = () => setRestano(Math.max(0, Math.ceil((fine - Date.now()) / 1000)));
    aggiorna();
    const id = setInterval(aggiorna, 250);
    return () => clearInterval(id);
  }, [chiave]);
  return restano;
}

export function Tavolo({ v, comandi }: { v: Vista; comandi: Comandi }) {
  const c = comandi;
  const t = usaT(dizionari);
  /** Un Jolly toccato: aspetta la scelta del colore. */
  const [jolly, setJolly] = useState<DatiCarta | null>(null);
  /** Uno Scambio con il colore già scelto: aspetta il giocatore con cui scambiare. */
  const [scambio, setScambio] = useState<{ carta: DatiCarta; colore: Colore } | null>(null);
  /** «Più carte»: null = modalità spenta; altrimenti gli id scelti e quello che resta in cima (null = il primo giocabile). */
  const [gruppo, setGruppo] = useState<{ ids: number[]; cima: number | null } | null>(null);
  const nome = (p: number | null) => v.nomi.find((n) => n.posto === p)?.nome ?? "";
  const turno = v.turno;
  const giocabili = new Set(v.giocabili);
  const inRound = v.fase === "partita" && v.fineRound === null;
  const sfidaIo = inRound && v.mioTurno && v.sfida !== null;

  // Se il turno passa, la scelta del colore in sospeso non vale più.
  useEffect(() => {
    if (!v.mioTurno) {
      setJolly(null);
      setScambio(null);
      setGruppo(null);
    }
  }, [v.mioTurno]);

  const gruppiMano = v.config.varianti.piuUguali && v.mioTurno && !v.haPescato && !sfidaIo ? gruppiDellaMano(v.mano, v.giocabili) : [];
  const idsInGruppi = new Set(gruppiMano.flat().map((c) => c.id));
  const scelte = gruppo ? gruppo.ids.map((id) => v.mano.find((c) => c.id === id)).filter((c): c is DatiCarta => c !== undefined) : [];
  const valoreScelto = scelte[0] ? valoreGruppo(scelte[0]) : null;
  const cimeScelte = scelte.filter((c) => giocabili.has(c.id));
  const cima = cimeScelte.find((c) => c.id === gruppo?.cima) ?? cimeScelte[0] ?? null;
  const toccaInGruppo = (carta: DatiCarta) => {
    if (!gruppo) return;
    const dentro = gruppo.ids.includes(carta.id);
    if (!dentro && (!idsInGruppi.has(carta.id) || (valoreScelto !== null && valoreGruppo(carta) !== valoreScelto))) return;
    setGruppo({ ids: dentro ? gruppo.ids.filter((x) => x !== carta.id) : [...gruppo.ids, carta.id], cima: gruppo.cima });
  };
  const calaGruppo = () => {
    if (!cima || scelte.length < 2) return;
    c.azione({ tipo: "gioca", carta: cima.id, insieme: scelte.filter((x) => x.id !== cima.id).map((x) => x.id) });
    setGruppo(null);
  };
  const nomeValore = (carta: DatiCarta) => (carta.tipo === "numero" ? String(carta.valore) : carta.tipo === "salta" ? t("valoreSalta") : t("valorePiu2"));

  const tocca = (carta: DatiCarta) => {
    if (gruppo) return toccaInGruppo(carta);
    if (!v.mioTurno || !giocabili.has(carta.id)) return;
    if (carta.tipo === "jolly" || carta.tipo === "piu4" || carta.tipo === "scambio" || carta.tipo === "rotazione") setJolly(carta);
    else c.azione({ tipo: "gioca", carta: carta.id });
  };
  const giocaJolly = (colore: Colore) => {
    if (jolly?.tipo === "scambio") setScambio({ carta: jolly, colore });
    else if (jolly) c.azione({ tipo: "gioca", carta: jolly.id, colore });
    setJolly(null);
  };

  const stato = (() => {
    if (v.fase === "fine") return v.vincitore === v.io ? t("haiVintoPartita") : t("haVintoPartita", { nome: nome(v.vincitore) });
    if (v.fase === "fineRound" && v.fineRound) return v.fineRound.vincitore === v.io ? t("haiVintoRound") : t("haVintoRound", { nome: nome(v.fineRound.vincitore) });
    return v.mioTurno ? t("toccaATe") : t("toccaANome", { nome: nome(turno) });
  })();

  const turnoGiocatore = v.nomi.find((n) => n.posto === turno);
  const aperte = v.ultime.filter((u) => !u.dichiarata && u.posto !== v.io);
  const ultimaAperta = aperte[0] ?? null;
  const mia = v.ultime.find((u) => u.posto === v.io);
  const possoDirUltima = inRound && v.io !== null && mia !== undefined && !mia.dichiarata;
  const cumuloIo = inRound && v.mioTurno && v.cumulo !== null && v.cumulo.posto === v.io ? v.cumulo : null;
  const conPiu2 = cumuloIo !== null && v.giocabili.length > 0;
  const posso = inRound && v.io !== null;
  const mazzoVuoto = v.mazzo === 0;
  const cambiate = inRound ? maniCambiate(v) : null;
  const secondiTaglio = useSecondiTaglio(inRound ? v.taglio : null);
  const tagliabili = secondiTaglio > 0 ? v.mano.filter((x) => v.puoTagliare.includes(x.id)) : [];
  const nessunaGiocabile = v.mioTurno && !sfidaIo && !v.sceltaColore && giocabili.size === 0;

  return (
    <section className="schermata allineata ul-tavolo">
      <p className="ul-stato" role="status" aria-live="polite">
        {stato}
      </p>
      <p className="muted" style={{ margin: 0, textAlign: "center" }}>
        {t("round", { n: v.round })} · {v.config.modo === "singolo" ? t("riepilogoSingolo") : t("riepilogoPunti", { soglia: v.config.soglia })}
      </p>
      <RiepilogoVarianti varianti={v.config.varianti} />

      {v.fase !== "partita" || v.fineRound ? <FineRound c={c} v={v} nome={nome} /> : null}

      <Giocatori v={v} evidenza={cambiate} />
      {cambiate && (
        <p className="muted ul-mani-cambiate" role="status">
          {cambiate.tipo === "rotazione" ? <RotateCw size={18} aria-hidden="true" /> : <Handshake size={18} aria-hidden="true" />}{" "}
          {cambiate.tipo === "rotazione" ? t("maniPassate") : t("ev_scambio", { nome: nome(cambiate.posti[0]!), con: nome(cambiate.posti[1]!) })}
        </p>
      )}

      {inRound && (
        <div className="ul-centro">
          {v.scoperta && <Carta carta={v.scoperta} t={t} colore={v.colore} grande />}
          <button
            type="button"
            className="ul-mazzo"
            disabled={!(v.mioTurno && !v.haPescato && !sfidaIo && !v.sceltaColore && !cumuloIo)}
            aria-label={t("pescaAria", { n: v.mazzo })}
            onClick={() => c.azione({ tipo: "pesca" })}
          >
            <span>{t("pesca")}</span>
            <span>{v.cumulo ? t("mazzoConCumulo", { n: v.mazzo, c: v.cumulo.quante }) : t("mazzo", { n: v.mazzo })}</span>
          </button>
          <div className="ul-info">
            {v.colore ? <ColoreInCorso t={t} colore={v.colore} /> : <span className="muted">{t("aspettoColore", { nome: nome(turno) })}</span>}
            <span className="muted">{t("verso", { verso: v.verso === 1 ? t("versoOrario") : t("versoAntiorario") })}</span>
          </div>
        </div>
      )}

      {inRound && v.taglio && secondiTaglio > 0 && (
        <div className="ul-taglio">
          <div
            className="ul-taglio-barra"
            role="progressbar"
            aria-label={t("tagliaBarra")}
            aria-valuemin={0}
            aria-valuemax={TAGLIO_MS / 1000}
            aria-valuenow={secondiTaglio}
            aria-valuetext={t("tagliaFinestra", { n: secondiTaglio })}
          >
            <span key={`${v.taglio.posto}:${v.taglio.carta.id}`} />
          </div>
          {tagliabili.length > 0 ? (
            <>
              <p className="muted" id="ul-taglia-aiuto">
                {t("tagliaAiuto")} {t("tagliaFinestra", { n: secondiTaglio })}
              </p>
              <div className="ul-azioni">
                {tagliabili.map((x) => (
                  <button key={x.id} className="btn primario" aria-describedby="ul-taglia-aiuto" onClick={() => c.azione({ tipo: "taglia", carta: x.id })}>
                    <Scissors size={18} aria-hidden="true" /> {t("tagliaBtn", { carta: nomeCarta(t, x) })}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">{t("tagliaAltri", { carta: nomeCarta(t, v.taglio.carta), nome: nome(v.taglio.posto), n: secondiTaglio })}</p>
          )}
        </div>
      )}

      {inRound && v.sceltaColore && (
        <div className="ul-avviso">
          <h3>{t("scegliColoreTitolo")}</h3>
          <p>{t("scegliColoreTesto")}</p>
          <SceltaColore t={t} onScegli={(colore) => c.azione({ tipo: "scegliColore", colore })} />
        </div>
      )}

      {cumuloIo && (
        <div className="ul-avviso">
          <h3>{t("cumuloTitolo")}</h3>
          <p>{cumuloIo.da === null ? t("cumuloTestoPrima", { n: cumuloIo.quante }) : t("cumuloTesto", { nome: nome(cumuloIo.da), n: cumuloIo.quante })}</p>
          <p className="muted">{conPiu2 ? t("cumuloAiuto") : t("cumuloNessun2")}</p>
          <div className="ul-azioni">
            <button className="btn primario" onClick={() => c.azione({ tipo: "pescaCumulo" })}>
              {t("cumuloPesca", { n: cumuloIo.quante })}
            </button>
          </div>
        </div>
      )}
      {inRound && v.cumulo && !cumuloIo && <p className="avviso">{t("inAttesaCumulo", { nome: nome(v.cumulo.posto), n: v.cumulo.quante })}</p>}

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

      {scambio && (
        <div className="ul-avviso">
          <h3>{t("scambioTitolo")}</h3>
          <p className="muted">{t("scambioTesto")}</p>
          <div className="ul-bersagli">
            {v.nomi
              .filter((n) => n.posto !== v.io)
              .map((n) => (
                <button
                  key={n.posto}
                  type="button"
                  className="btn"
                  onClick={() => {
                    c.azione({ tipo: "gioca", carta: scambio.carta.id, colore: scambio.colore, scambiaCon: n.posto });
                    setScambio(null);
                  }}
                >
                  <Handshake size={18} aria-hidden="true" /> {t("scambioCon", { nome: n.nome, n: n.carte })}
                </button>
              ))}
          </div>
          <button className="btn" onClick={() => setScambio(null)}>
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
          {aperte.map((u) => (
            <button key={u.posto} className="btn pericolo" onClick={() => c.azione({ tipo: "beccato", posto: u.posto })} aria-describedby="ul-beccato-aiuto">
              {t("beccato", { nome: nome(u.posto) })}
            </button>
          ))}
        </div>
      )}
      {posso && ultimaAperta && (
        <p className="muted" id="ul-beccato-aiuto">
          {t("beccatoAiuto", { nome: nome(ultimaAperta.posto) })}
        </p>
      )}
      {mia?.dichiarata && inRound && <p className="muted">{t("ultimaDetto")}</p>}

      {v.io !== null && (
        <>
          <h3 style={{ margin: 0 }}>{t("tuaMano")}</h3>
          {gruppiMano.length > 0 && !gruppo && (
            <button type="button" className="btn" onClick={() => setGruppo({ ids: [], cima: null })}>
              <Copy size={18} aria-hidden="true" /> {t("piuCarteBtn")}
            </button>
          )}
          {gruppo && (
            <div className="ul-avviso ul-gruppo">
              <p className="muted" role="status">
                {scelte.length === 0 || !scelte[0]
                  ? t("piuCarteAiuto")
                  : scelte.length < 2
                    ? t("piuCarteNessuna")
                    : t("piuCarteBarraAria", { n: scelte.length, valore: nomeValore(scelte[0]) })}
              </p>
              {cimeScelte.length > 1 && (
                <div className="ul-cime" role="group" aria-label={t("piuCarteCima")}>
                  <span>{t("piuCarteCima")}</span>
                  {cimeScelte.map((x) => (
                    <Carta key={x.id} carta={x} t={t} scelta={cima?.id === x.id} onClick={() => setGruppo({ ...gruppo, cima: x.id })} />
                  ))}
                </div>
              )}
              <div className="ul-azioni">
                <button type="button" className="btn primario" disabled={!cima || scelte.length < 2} onClick={calaGruppo}>
                  {t("piuCarteCala", { n: scelte.length })}
                </button>
                <button type="button" className="btn" onClick={() => setGruppo(null)}>
                  {t("annulla")}
                </button>
              </div>
            </div>
          )}
          <div className="ul-mano" role="group" aria-label={t("tuaMano")}>
            {v.mano.map((carta) => {
              const dentro = gruppo?.ids.includes(carta.id) ?? false;
              const spenta = gruppo
                ? !dentro && (!idsInGruppi.has(carta.id) || (valoreScelto !== null && valoreGruppo(carta) !== valoreScelto))
                : !v.mioTurno || !giocabili.has(carta.id);
              return (
                <Carta
                  key={carta.id}
                  carta={carta}
                  t={t}
                  onClick={() => tocca(carta)}
                  spenta={spenta}
                  scelta={gruppo ? dentro : undefined}
                  tagliabile={!gruppo && tagliabili.includes(carta)}
                />
              );
            })}
          </div>
        </>
      )}

      {inRound && v.host && c.conBot && turnoGiocatore && (
        <div className="ul-azioni">
          {c.sollecita && <button className="btn" onClick={c.sollecita}>
            <Bell size={18} aria-hidden="true" /> {t("sollecita", { nome: turnoGiocatore.nome })}
          </button>}
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

function Giocatori({ v, evidenza }: { v: Vista; evidenza: { posti: number[] } | null }) {
  const t = usaT(dizionari);
  return (
    <ul className="ul-giocatori" aria-label={t("giocatori")}>
      {v.nomi.map((n) => {
        const inTurno = v.turno === n.posto;
        return (
          <li
            key={n.posto}
            className={`ul-giocatore${inTurno ? " ul-turno" : ""}${evidenza?.posti.includes(n.posto) ? " ul-cambiata" : ""}`}
            aria-current={inTurno ? "true" : undefined}
          >
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

function FineRound({ c, v, nome }: { c: Comandi; v: Vista; nome: (p: number | null) => string }) {
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
