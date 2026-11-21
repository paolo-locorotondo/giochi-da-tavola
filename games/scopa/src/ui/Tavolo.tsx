import { useEffect, useState } from "react";
import { Bell, Bot, Sparkles } from "lucide-react";
import { CartaGrafica, dizionariCarte, nomeCarta, type Carta } from "@gdt/carte";
import { usaT, type Traduttore } from "@gdt/i18n";
import { dizionari } from "../locales";
import type { it } from "../locales/it";
import type { Evento } from "../logica";
import type { Vista } from "../online";
import { Riepilogo, nomeSquadra } from "./Riepilogo";

type T = Traduttore<typeof it>;
type TC = ReturnType<typeof usaT<typeof dizionariCarte.it>>;

/** Cosa può fare il tavolo: online passa dal server, offline dalla partita sul telefono. */
export interface Comandi {
  azione: (a: Record<string, unknown>) => void;
  /** Solo online: l'organizzatore sollecita chi è di turno. */
  sollecita?: () => void;
  /** Solo online: l'organizzatore vede «Simula mossa col bot». */
  conBot?: boolean;
}

function testoEvento(t: T, tc: TC, e: Evento, nome: (p: number) => string): string {
  switch (e.tipo) {
    case "nuovoRound":
      return t("ev_nuovoRound");
    case "gioca":
      return e.prese > 0
        ? t("ev_prende", { nome: nome(e.posto), carta: nomeCarta(tc, e.carta), n: e.prese })
        : t("ev_cala", { nome: nome(e.posto), carta: nomeCarta(tc, e.carta) });
    case "scopa":
      return t("ev_scopa", { nome: nome(e.posto) });
    case "distribuzione":
      return t("ev_distribuzione", { n: e.mano });
    case "ultimaPresa":
      return t("ev_ultimaPresa", { nome: nome(e.posto), n: e.carte });
    case "fineRound":
      return t("ev_fineRound");
    case "bot":
      return t("ev_bot", { nome: nome(e.posto) });
  }
}

export function Tavolo({ v, comandi }: { v: Vista; comandi: Comandi }) {
  const c = comandi;
  const t = usaT(dizionari);
  const tc = usaT(dizionariCarte);
  /** Carta toccata con più prese possibili: aspetta la scelta. */
  const [scelta, setScelta] = useState<Carta | null>(null);
  /** La presa in anteprima (indice), evidenziata sul tavolo. */
  const [anteprima, setAnteprima] = useState(0);
  const nome = (p: number | null) => v.nomi.find((n) => n.posto === p)?.nome ?? "";
  const inRound = v.fase === "partita" && v.riepilogo === null;

  // Se il turno passa (o la mano cambia), la scelta in sospeso non vale più.
  useEffect(() => {
    if (!v.mioTurno) setScelta(null);
  }, [v.mioTurno]);

  // «Annulla» anche con il tasto Esc.
  useEffect(() => {
    if (!scelta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setScelta(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [scelta]);

  const tocca = (carta: Carta) => {
    if (!v.mioTurno) return;
    const prese = v.prese[carta.id] ?? [];
    if (prese.length > 1) {
      setScelta(carta);
      setAnteprima(0);
    } else c.azione({ tipo: "gioca", carta: carta.id });
  };
  const prendi = (presa: number[]) => {
    if (scelta) c.azione({ tipo: "gioca", carta: scelta.id, presa });
    setScelta(null);
  };

  const combinazioni = scelta ? (v.prese[scelta.id] ?? []) : [];
  const evidenziate = new Set(combinazioni[anteprima] ?? []);
  const io = v.nomi.find((n) => n.posto === v.io);
  const turnoGiocatore = v.nomi.find((n) => n.posto === v.turno);

  const stato = (() => {
    if (!inRound) return v.fase === "fine" ? t("fineTitolo") : t("fineRoundTitolo");
    return v.mioTurno ? t("toccaATe") : t("toccaANome", { nome: nome(v.turno) });
  })();

  return (
    <section className="schermata allineata sc-tavolo">
      <div className="sc-testa">
        <p className="sc-stato" role="status" aria-live="polite">
          {stato}
        </p>
        <p className="sc-sotto">
          {t("round", { n: v.round })}
          {inRound && ` · ${t("manoDi", { n: v.mani.corrente, tot: v.mani.totale })}`}
        </p>
        <Punteggio v={v} />
      </div>

      {!inRound && v.riepilogo && <Riepilogo v={v} comandi={c} />}

      <Giocatori v={v} />

      {inRound && (
        <section className="sc-area" aria-labelledby="sc-tavolo-titolo">
          <h3 id="sc-tavolo-titolo" className="sc-titoletto">
            {t("tavolo")}
          </h3>
          {v.tavolo.length === 0 ? (
            <p className="muted sc-vuoto">{t("tavoloVuoto")}</p>
          ) : (
            <ul className="sc-carte-tavolo">
              {v.tavolo.map((carta) => (
                <li key={carta.id}>
                  <CartaGrafica carta={carta} evidenziata={evidenziate.has(carta.id)} />
                </li>
              ))}
            </ul>
          )}
          <div className="sc-contatori">
            <span className="sc-contatore">
              <CartaGrafica dorso dimensione="mini" etichetta={t("mazzo", { n: v.mazzo })} />
              <span>{t("mazzo", { n: v.mazzo })}</span>
            </span>
            {io && (
              <span className="sc-contatore">
                <CartaGrafica dorso dimensione="mini" etichetta={t("miePrese")} />
                <span>
                  {t("preseN", { n: io.prese })} · {t("scopeN", { n: io.scope })}
                </span>
              </span>
            )}
          </div>
        </section>
      )}

      {inRound && scelta && (
        <div className="sc-presa" role="group" aria-labelledby="sc-presa-titolo">
          <h3 id="sc-presa-titolo">{t("presaTitolo", { carta: nomeCarta(tc, scelta) })}</h3>
          <p className="muted">{t("presaAiuto")}</p>
          <div className="sc-combinazioni">
            {combinazioni.map((comb, i) => {
              const carte = comb.map((id) => v.tavolo.find((x) => x.id === id)!).filter(Boolean);
              return (
                <button
                  key={comb.join(",")}
                  type="button"
                  className="btn sc-combinazione"
                  aria-label={t("presaAria", { carte: carte.map((x) => nomeCarta(tc, x)).join(", ") })}
                  aria-pressed={anteprima === i}
                  onPointerEnter={() => setAnteprima(i)}
                  onFocus={() => setAnteprima(i)}
                  onClick={() => prendi(comb)}
                >
                  <span className="sc-comb-carte" aria-hidden="true">
                    {carte.map((x) => (
                      <CartaGrafica key={x.id} carta={x} dimensione="mini" />
                    ))}
                  </span>
                  <span aria-hidden="true">{carte.map((x) => x.valore).join(" + ")}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="btn" onClick={() => setScelta(null)}>
            {t("annulla")}
          </button>
        </div>
      )}

      {v.io !== null && inRound && (
        <section className="sc-area" aria-labelledby="sc-mano-titolo">
          <h3 id="sc-mano-titolo" className="sc-titoletto">
            {t("tuaMano")}
          </h3>
          <ul className="sc-mano">
            {v.mano.map((carta) => (
              <li key={carta.id}>
                <CartaGrafica carta={carta} selezionata={scelta?.id === carta.id} disabilitata={!v.mioTurno} onClick={() => tocca(carta)} />
              </li>
            ))}
          </ul>
          <p className="muted sc-aiuto">{v.mioTurno ? t("toccaUnaCarta") : t("aspettaTurno")}</p>
        </section>
      )}

      {inRound && v.host && c.conBot && turnoGiocatore && (
        <div className="sc-azioni">
          {c.sollecita && (
            <button className="btn" onClick={c.sollecita}>
              <Bell size={18} aria-hidden="true" /> {t("sollecita", { nome: turnoGiocatore.nome })}
            </button>
          )}
          <button className="btn" onClick={() => c.azione({ tipo: "mossaBot", posto: turnoGiocatore.posto })} aria-describedby="sc-bot-aiuto">
            <Bot size={18} aria-hidden="true" /> {t("botMossa", { nome: turnoGiocatore.nome })}
          </button>
          <span className="muted" id="sc-bot-aiuto" style={{ gridColumn: "1 / -1" }}>
            {t("botAiuto")}
          </span>
        </div>
      )}
      {inRound && v.io !== null && turnoGiocatore && !turnoGiocatore.collegato && v.io !== v.turno && (
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
            <ul className="sc-eventi">
              {[...v.eventi].reverse().map((e, i) => (
                <li key={i}>
                  {e.tipo === "scopa" && <Sparkles size={16} aria-hidden="true" />} {testoEvento(t, tc, e, nome)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}

/** Punti della partita per squadra, con la soglia. */
function Punteggio({ v }: { v: Vista }) {
  const t = usaT(dizionari);
  return (
    <p className="sc-punteggio" aria-label={t("punteggio")}>
      {([0, 1] as const).map((sq) => (
        <span key={sq} className={`sc-punti${v.miaSquadra === sq ? " sc-mia" : ""}`}>
          {t("puntiSquadra", { nome: nomeSquadra(t, v, sq), n: v.punti[sq] })}
        </span>
      ))}
      <span className="sc-soglia">({t("aSoglia", { soglia: v.config.soglia })})</span>
    </p>
  );
}

function Giocatori({ v }: { v: Vista }) {
  const t = usaT(dizionari);
  const altri = v.nomi.filter((n) => n.posto !== v.io);
  const inRound = v.fase === "partita" && v.riepilogo === null;
  return (
    <ul className="sc-giocatori" aria-label={t("giocatori")}>
      {altri.map((n) => {
        const inTurno = inRound && v.turno === n.posto;
        const ruolo = v.miaSquadra === null ? null : n.squadra === v.miaSquadra ? t("compagno") : t("avversario");
        return (
          <li key={n.posto} className={`sc-giocatore${inTurno ? " sc-turno" : ""}`} aria-current={inTurno ? "true" : undefined}>
            <span className="sc-giocatore-nome">
              <span className={`pallino${n.collegato ? " on" : ""}`} aria-hidden="true" /> {n.nome}
              {ruolo && <span className="sc-ruolo">{ruolo}</span>}
            </span>
            <span className="sc-giocatore-dati">
              {inRound && `${t("inManoN", { n: n.carte })} · `}
              {inRound && `${t("preseN", { n: n.prese })} · `}
              {t("scopeN", { n: n.scope })}
              {inTurno ? ` · ${t("diTurno")}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
