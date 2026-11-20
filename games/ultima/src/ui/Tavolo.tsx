import { useEffect, useState } from "react";
import { Bell, Bot } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { COLORI, type Carta as DatiCarta, type Colore, type Evento } from "../logica";
import type { Vista } from "../online";
import { Carta, ICONA_COLORE, nomeCarta, nomeColore } from "./Carta";

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

export function Tavolo({ v, comandi }: { v: Vista; comandi: Comandi }) {
  const c = comandi;
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
      <p className="ul-stato" role="status" aria-live="polite">
        {stato}
      </p>
      <p className="muted" style={{ margin: 0, textAlign: "center" }}>
        {t("round", { n: v.round })} · {v.config.modo === "singolo" ? t("riepilogoSingolo") : t("riepilogoPunti", { soglia: v.config.soglia })}
      </p>

      {v.fase !== "partita" || v.fineRound ? <FineRound c={c} v={v} nome={nome} /> : null}

      <Giocatori v={v} />

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

function Giocatori({ v }: { v: Vista }) {
  const t = usaT(dizionari);
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
