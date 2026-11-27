import { useEffect, useMemo, useState } from "react";
import { Copy, DoorOpen, Play, Share2, Timer, Users } from "lucide-react";
import { usaT, type Traduttore } from "@gdt/i18n";
import type { ComandoSala, VistaSalaVeloce } from "@gdt/engine";
import { chiaveErroreSala, dizionari } from "./locales";
import type { it } from "./locales/it";
import "./sala-veloce.css";

type T = Traduttore<typeof it>;

/** I testi della partita veloce, per i giochi che devono scriverne uno (es. il pulsante «Partita veloce»). */
export const usaTestiVeloce = (): T => usaT(dizionari);

/** Il testo di un errore: quelli della sala sono qui, gli altri li traduce il gioco. */
export function testoErroreVeloce(t: T, messaggio: string, delGioco: (m: string) => string): string {
  const k = chiaveErroreSala(messaggio.replace(/:.*$/, ""));
  return k ? t(k) : delGioco(messaggio);
}

/** Minuti e secondi («1:05»). */
export function formatoTempo(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Quanti ms restano, contati dal telefono a partire da quanto dice il server (1 s di scarto al massimo). */
function useResta(sala: VistaSalaVeloce): number {
  const scadenza = useMemo(() => Date.now() + sala.restaMs, [sala]);
  const [ora, setOra] = useState(() => Date.now());
  useEffect(() => {
    setOra(Date.now());
    const id = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sala]);
  return Math.max(0, scadenza - ora);
}

interface Props {
  c: {
    sala: VistaSalaVeloce | null;
    errore: string | null;
    connesso: boolean;
    esciDaSala: () => void;
    comandoSala: (c: ComandoSala) => void;
  };
  /** Il gioco traduce le sue impostazioni (es. «A punti, fino a 500»). */
  riepilogo: (config: unknown) => string;
  /** Traduce gli errori che non sono della sala (es. le impostazioni non valide). */
  testoErrore?: (messaggio: string) => string;
}

/** L'indirizzo che porta alla «Partita veloce» del gioco (la stanza aperta si vede lì, con «Entra»). */
export const linkVeloce = (gioco: string): string => `${window.location.origin}/${gioco}?veloce=1`;

/** Vero se l'indirizzo chiede di aprire subito la «Partita veloce» (link di invito). */
export const veloceDaIndirizzo = (): boolean => new URLSearchParams(window.location.search).has("veloce");

/** Copia e condividi il link d'invito: la condivisione c'è solo dove il telefono la offre. */
function InvitaVeloce({ gioco }: { gioco: string }) {
  const t = usaT(dizionari);
  const [copiato, setCopiato] = useState(false);
  const link = linkVeloce(gioco);
  const puoiCopiare = typeof navigator !== "undefined" && !!navigator.clipboard;
  const puoiCondividere = typeof navigator !== "undefined" && typeof navigator.share === "function";
  // Senza https (es. in sviluppo dal telefono con l'indirizzo IP) il browser nasconde appunti e condivisione:
  // resta il link scritto, da selezionare e copiare a mano.
  if (!puoiCopiare && !puoiCondividere) {
    return (
      <div className="sv-invita">
        <label className="campo">
          {t("linkVeloceScritto")}
          <input type="text" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <p className="muted">{t("linkVeloceAiuto")}</p>
      </div>
    );
  }
  return (
    <div className="sv-invita">
      <div className="azioni">
        {puoiCopiare && (
          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopiato(true);
              } catch {
                /* permesso negato: resta il pulsante di condivisione, se c'è */
              }
            }}
          >
            <Copy size={18} aria-hidden="true" /> {copiato ? t("linkCopiato") : t("copiaLinkVeloce")}
          </button>
        )}
        {puoiCondividere && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.share({ url: link }).catch(() => {
                /* annullato dall'utente: niente da fare */
              });
            }}
          >
            <Share2 size={18} aria-hidden="true" /> {t("condividiLinkVeloce")}
          </button>
        )}
      </div>
      <p className="muted">{t("linkVeloceAiuto")}</p>
    </div>
  );
}

/** Sala d'attesa della partita veloce, uguale per tutti i giochi. */
export function SalaVeloce({ c, riepilogo, testoErrore }: Props) {
  const sala = c.sala;
  if (!sala) return null;
  return <SalaDentro sala={sala} c={c} riepilogo={riepilogo} testoErrore={testoErrore} />;
}

function SalaDentro({ sala, c, riepilogo, testoErrore }: Props & { sala: VistaSalaVeloce }) {
  const t = usaT(dizionari);
  const resta = useResta(sala);
  const [conferma, setConferma] = useState(false);
  const n = sala.giocatori.length;
  const mancano = sala.posti - n;
  const secondi = Math.ceil(resta / 1000);
  const minuti = sala.attesaMs / 60_000;
  const puoiAprire = sala.host && sala.minimo !== null && n >= sala.minimo && sala.momento !== "scaduta" && n < sala.posti;
  const lettera = (k: number) => String.fromCharCode(65 + k);

  const elencoGiocatori = (g: VistaSalaVeloce["giocatori"][number]) => (
    <li key={g.id} className={`chip${g.collegato ? "" : " assente"}`}>
      <span className={`pallino${g.collegato ? " on" : ""}`} aria-hidden="true" />
      <span className="sv-nome">{g.nome}</span>
      <span className="muted">
        {[g.organizzatore ? t("organizza") : null, g.io ? t("tu") : null, g.collegato ? t("collegato") : t("assente")]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </li>
  );

  /** Pulsante per cambiare squadra (con «scelte in sala»): sé stessi, o chiunque se si organizza. */
  const sposta = (g: VistaSalaVeloce["giocatori"][number]) => {
    if (sala.squadre !== "scelte" || !sala.postiSquadre || (!g.io && !sala.host)) return null;
    return sala.postiSquadre.map((posti, k) => {
      if (k === g.squadra || sala.giocatori.filter((x) => x.squadra === k).length >= posti.length) return null;
      return (
        <button
          key={k}
          type="button"
          className="btn piccolo"
          onClick={() => c.comandoSala({ comando: "squadra", id: g.id, squadra: k })}
        >
          {g.io ? t("passaInSquadra", { lettera: lettera(k) }) : `${g.nome}: ${t("spostaIn", { lettera: lettera(k) })}`}
        </button>
      );
    });
  };

  return (
    <section className="schermata allineata sv-sala">
      <h2>{t("salaAttesa")}</h2>
      <p className="muted sv-riepilogo">
        {[riepilogo(sala.config), t("attesaDi", { tempo: t("minuti", { n: minuti }) })].filter(Boolean).join(" · ")}
        {" · "}
        {t("codiceSala", { codice: sala.codice })}
      </p>

      {sala.momento === "attesa" && (
        <p className="sv-stato" role="status">
          <Users size={20} aria-hidden="true" /> {mancano > 0 ? t("aspettoAltri", { n: mancano }) : t("stanzaPiena")}
        </p>
      )}

      {sala.momento === "conto" &&
        (sala.host ? (
          <div className="avviso sv-conto" role="status">
            <p>{t("avvisoConto", { s: secondi })}</p>
            <p className="sv-contatore" aria-hidden="true">
              {secondi}
            </p>
          </div>
        ) : (
          <div className="avviso sv-conto" role="status">
            <p>{t(sala.squadre === "scelte" && mancano === 0 ? "contoScelte" : "contoAltri", { s: secondi })}</p>
          </div>
        ))}

      {sala.momento === "scaduta" &&
        (sala.host ? (
          <div className="avviso" role="status">
            <strong>{t("scadutaTitolo")}</strong>
            <p>{t("scadutaTesto")}</p>
          </div>
        ) : (
          <p className="avviso" role="status">
            {t("scadutaAltri")}
          </p>
        ))}

      {sala.momento === "attesa" && mancano > 0 && <InvitaVeloce gioco={sala.gioco} />}

      <p className="sv-timer" role="timer">
        <Timer size={20} aria-hidden="true" /> {t("restano", { tempo: formatoTempo(resta) })}
      </p>

      {sala.postiSquadre && sala.squadre !== "caso" ? (
        <div className="sv-squadre" aria-label={t("giocatoriInSala")}>
          {sala.postiSquadre.map((posti, k) => {
            const dentro = sala.giocatori.filter((g) => g.squadra === k);
            return (
              <div key={k} className="sv-squadra">
                <h3>{t("squadraN", { lettera: lettera(k) })}</h3>
                <ul className="chip-elenco sv-colonna">
                  {dentro.map((g) => (
                    <li key={g.id} className="sv-voce">
                      <ul className="chip-elenco">{elencoGiocatori(g)}</ul>
                      {sposta(g)}
                    </li>
                  ))}
                  {Array.from({ length: Math.max(0, posti.length - dentro.length) }, (_, i) => (
                    <li key={`v${i}`} className="chip assente sv-vuoto">
                      {t("postoLibero")}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <ul className="chip-elenco sv-colonna" aria-label={t("giocatoriInSala")}>
            {sala.giocatori.map(elencoGiocatori)}
            {Array.from({ length: Math.max(0, sala.posti - n) }, (_, i) => (
              <li key={`v${i}`} className="chip assente sv-vuoto">
                {t("postoLibero")}
              </li>
            ))}
          </ul>
          {sala.squadre === "caso" && <p className="muted">{t("daSorteggiare")}</p>}
        </>
      )}

      {c.errore && (
        <p className="errore" role="alert">
          {testoErroreVeloce(t, c.errore, testoErrore ?? ((m) => m))}
        </p>
      )}

      <div className="azioni">
        {sala.host && sala.momento === "conto" && (
          <>
            <button type="button" className="btn primario" onClick={() => c.comandoSala({ comando: "apriAdesso" })}>
              <Play size={18} aria-hidden="true" /> {t("apriAdesso")}
            </button>
            <button type="button" className="btn" onClick={() => c.comandoSala({ comando: "annullaAvvio" })}>
              {t("continuaAspettare")}
            </button>
          </>
        )}
        {sala.host && sala.momento === "scaduta" && (
          <button type="button" className="btn primario" onClick={() => c.comandoSala({ comando: "aspettaAncora" })}>
            {t("aspettaAncora")}
          </button>
        )}
        {puoiAprire && sala.momento === "attesa" && (
          <button type="button" className="btn primario" onClick={() => c.comandoSala({ comando: "apriAdesso" })}>
            <Play size={18} aria-hidden="true" /> {t("apriAdessoCon", { n })}
          </button>
        )}
        <button type="button" className="btn" onClick={c.esciDaSala}>
          <DoorOpen size={18} aria-hidden="true" /> {t("esciDallaSala")}
        </button>
      </div>

      {sala.host && (
        <div className="chiudi">
          {conferma ? (
            <>
              <p>{t("chiudiConferma")}</p>
              <div className="azioni">
                <button type="button" className="btn pericolo" onClick={() => c.comandoSala({ comando: "chiudiSala" })}>
                  {t("siChiudi")}
                </button>
                <button type="button" className="btn" onClick={() => setConferma(false)}>
                  {t("noContinua")}
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="btn pericolo-contorno" onClick={() => setConferma(true)}>
              {t("chiudiStanza")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
