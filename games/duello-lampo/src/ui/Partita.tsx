import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { creaRng, type Rng } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { assegna, finita, idCorrente, nuovaPartita, vincitorePartita, type Partita as DatiPartita, type Sfida } from "../logica";
import { NESSUNO, miniGioco, type Lato } from "../minigiochi";
import { suonoConto, suonoFine, suonoPari, suonoPunto } from "../suoni";
import { VISTE } from "./minigiochi";
import "./duello.css";

type Fase = "regola" | "conto" | "gioco" | "esito" | "fine";

const PASSO_CONTO_MS = 800;
/** Dopo l'esito «Avanti» resta spento un attimo: un tocco di troppo del round non deve saltarlo. */
const BLOCCO_ESITO_MS = 700;

interface Esito {
  id: string;
  vincitore: Lato | null;
  risultati: readonly [unknown, unknown];
}

interface Props {
  sfida: Sfida;
  nomi: readonly [string, string];
  /** Torna alla preparazione della sfida. */
  onEsci(): void;
}

const LATI: readonly Lato[] = [1, 0]; // in alto prima, come sullo schermo

function preparaRound(partita: DatiPartita, rng: Rng): unknown {
  const id = idCorrente(partita);
  return id ? miniGioco(id).prepara(rng) : null;
}

/** Tiene lo schermo acceso mentre si gioca, dove il telefono lo permette. */
function usaSchermoAcceso() {
  useEffect(() => {
    let blocco: WakeLockSentinel | null = null;
    let attivo = true;
    const chiedi = () => {
      if (!attivo || document.visibilityState !== "visible") return;
      navigator.wakeLock
        ?.request("screen")
        .then((b) => {
          blocco = b;
        })
        .catch(() => undefined);
    };
    chiedi();
    document.addEventListener("visibilitychange", chiedi);
    // Niente scorrimento della pagina sotto la partita.
    const precedente = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      attivo = false;
      document.removeEventListener("visibilitychange", chiedi);
      document.documentElement.style.overflow = precedente;
      blocco?.release().catch(() => undefined);
    };
  }, []);
}

export function Partita({ sfida, nomi, onEsci }: Props) {
  const t = usaT(dizionari);
  usaSchermoAcceso();

  const [rng] = useState(() => creaRng(Math.floor(Math.random() * 2 ** 32)));
  const [{ partita, config }, setStato] = useState(() => {
    const p = nuovaPartita(sfida);
    return { partita: p, config: preparaRound(p, rng) };
  });
  const [fase, setFase] = useState<Fase>("regola");
  const [pronti, setPronti] = useState<readonly [boolean, boolean]>([false, false]);
  const [conto, setConto] = useState(3);
  const [inizio, setInizio] = useState(0);
  const [esito, setEsito] = useState<Esito | null>(null);
  const [sbloccato, setSbloccato] = useState(false);
  const [confermaEsci, setConfermaEsci] = useState(false);

  const risultati = useRef<[unknown, unknown]>([null, null]);
  const chiuso = useRef(false);
  const chiudiRif = useRef<() => void>(() => undefined);

  // Entrambi pronti: parte il conto alla rovescia.
  useEffect(() => {
    if (fase === "regola" && pronti[0] && pronti[1]) {
      setConto(3);
      setFase("conto");
    }
  }, [fase, pronti]);

  // 3, 2, 1, poi il round.
  useEffect(() => {
    if (fase !== "conto") return;
    suonoConto();
    const id = window.setTimeout(() => {
      if (conto > 1) {
        setConto(conto - 1);
        return;
      }
      risultati.current = [null, null];
      chiuso.current = false;
      setInizio(performance.now());
      setFase("gioco");
    }, PASSO_CONTO_MS);
    return () => window.clearTimeout(id);
  }, [fase, conto]);

  // Il round: si chiude quando serve (tutti hanno risposto, o il primo, o il tempo è finito).
  useEffect(() => {
    if (fase !== "gioco") return;
    const id = idCorrente(partita);
    if (!id) return;
    const mg = miniGioco(id);
    const chiudi = () => {
      if (chiuso.current) return;
      chiuso.current = true;
      const r = [risultati.current[0] ?? NESSUNO, risultati.current[1] ?? NESSUNO] as const;
      const vincitore = mg.vincitore(config, r);
      setEsito({ id, vincitore, risultati: r });
      setStato({ partita: assegna(partita, vincitore), config });
      setFase("esito");
    };
    chiudiRif.current = chiudi;
    const tm = window.setTimeout(chiudi, mg.durataMassima(config) + 500);
    return () => window.clearTimeout(tm);
  }, [fase, partita, config]);

  // Esito: suono e blocco breve di «Avanti».
  useEffect(() => {
    if (fase !== "esito") return;
    if (esito?.vincitore == null) suonoPari();
    else suonoPunto();
    setSbloccato(false);
    const id = window.setTimeout(() => setSbloccato(true), BLOCCO_ESITO_MS);
    return () => window.clearTimeout(id);
  }, [fase, esito]);

  useEffect(() => {
    if (fase === "fine") suonoFine();
  }, [fase]);

  const riporta = (lato: Lato) => (r: unknown) => {
    if (chiuso.current || risultati.current[lato] !== null) return;
    risultati.current[lato] = r;
    const id = idCorrente(partita);
    const tutti = risultati.current[0] !== null && risultati.current[1] !== null;
    if (tutti || (id && miniGioco(id).chiudeAlPrimo)) chiudiRif.current();
  };

  const avanti = () => {
    if (finita(partita)) {
      setFase("fine");
      return;
    }
    setStato({ partita, config: preparaRound(partita, rng) });
    setPronti([false, false]);
    setFase("regola");
  };

  const rivincita = () => {
    const p = nuovaPartita(sfida);
    setStato({ partita: p, config: preparaRound(p, rng) });
    setPronti([false, false]);
    setEsito(null);
    setFase("regola");
  };

  const esciSubito = fase === "gioco" || fase === "conto";
  const idRound = idCorrente(partita);
  const nomeRound = idRound ? t(`mg_${idRound}_nome` as "mg_via_nome") : "";
  const regolaRound = idRound ? t(`mg_${idRound}_regola` as "mg_via_regola") : "";
  const vinceSfida = vincitorePartita(partita);

  const meta = (lato: Lato) => {
    const altro: Lato = lato === 0 ? 1 : 0;
    // All'esito il punteggio è già aggiornato e `round` punta al prossimo: l'etichetta resta quella del round appena giocato.
    const indice = fase === "esito" ? partita.round - 1 : partita.round;
    const etichettaRound = indice >= partita.totale ? t("spareggio") : t("round", { n: indice + 1, tot: partita.totale });

    let corpo;
    if (fase === "regola") {
      corpo = (
        <>
          <h2 className="dl-titolo">{nomeRound}</h2>
          <p className="dl-regola">{regolaRound}</p>
          {pronti[lato] ? (
            <p className="muted" role="status">
              {t("aspettoAltro")}
            </p>
          ) : (
            <button
              type="button"
              className="btn primario dl-grande"
              onClick={() => setPronti((p) => (lato === 0 ? [true, p[1]] : [p[0], true]))}
            >
              {t("pronto")}
            </button>
          )}
        </>
      );
    } else if (fase === "conto") {
      corpo = (
        <p className="dl-conto" aria-hidden="true">
          {conto}
        </p>
      );
    } else if (fase === "gioco" && idRound) {
      const { Vista } = VISTE[idRound] ?? {};
      corpo = Vista ? <Vista config={config} lato={lato} inizio={inizio} principale={lato === 0} onRisultato={riporta(lato)} /> : null;
    } else if (fase === "esito" && esito) {
      const { descrivi } = VISTE[esito.id] ?? { descrivi: () => "" };
      const titolo = esito.vincitore === null ? t("pari") : esito.vincitore === lato ? t("haiVinto") : t("haiPerso", { nome: nomi[esito.vincitore] });
      corpo = (
        <>
          <p className="dl-esito-titolo" role="status">
            {titolo}
          </p>
          <ul className="dl-dettagli">
            {([lato, altro] as const).map((l) => (
              <li key={l}>{t("dettaglio", { chi: l === lato ? t("tu") : nomi[l], valore: descrivi(esito.risultati[l], t) })}</li>
            ))}
          </ul>
          <button type="button" className="btn primario dl-grande" disabled={!sbloccato} onClick={avanti}>
            {finita(partita) ? t("vediRisultato") : t("avanti")}
          </button>
        </>
      );
    } else {
      corpo = (
        <>
          <p className="dl-esito-titolo" role="status">
            {vinceSfida === lato ? t("vintoSfida") : t("persoSfida", { nome: nomi[vinceSfida ?? altro] })}
          </p>
          <div className="dl-azioni">
            <button type="button" className="btn primario dl-grande" onClick={rivincita}>
              {t("rivincita")}
            </button>
            <button type="button" className="btn" onClick={onEsci}>
              {t("cambiaSfida")}
            </button>
          </div>
        </>
      );
    }

    return (
      <section key={lato} className={`dl-meta dl-meta--${lato === 0 ? "basso" : "alto"}`} aria-label={t("campo", { nome: nomi[lato] })}>
        <header className="dl-testa">
          <span>{fase === "fine" ? "" : etichettaRound}</span>
          <span className="dl-punti" role="img" aria-label={t("punti", { nome: nomi[lato], n: partita.punti[lato] })}>
            <span className="dl-punti-nome" aria-hidden="true">
              {nomi[lato]}
            </span>
            <span className="dl-punti-numero" aria-hidden="true">
              {partita.punti[lato]}
            </span>
          </span>
        </header>
        <div className="dl-corpo">{corpo}</div>
      </section>
    );
  };

  return (
    <div className="dl-gioco">
      {meta(LATI[0] as Lato)}
      <div className="dl-centro-barra">
        {esciSubito ? null : confermaEsci ? (
          <div className="dl-conferma" role="group" aria-label={t("esciChiedi")}>
            <span>{t("esciChiedi")}</span>
            <button type="button" className="btn" onClick={() => setConfermaEsci(false)}>
              {t("resta")}
            </button>
            <button type="button" className="btn pericolo" onClick={onEsci}>
              {t("esci")}
            </button>
          </div>
        ) : (
          <button type="button" className="btn dl-esci" aria-label={t("esciAria")} onClick={() => setConfermaEsci(true)}>
            <X size={20} aria-hidden="true" />
            {t("esci")}
          </button>
        )}
      </div>
      {meta(LATI[1] as Lato)}
    </div>
  );
}
