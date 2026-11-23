import { useEffect, useMemo, useState } from "react";
import { creaRng } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { cancellaPartita, leggiPartita, scriviPartita } from "@gdt/preferenze";
import { dizionari } from "../locales";
import {
  DIFFICOLTA,
  aggiungiEsito,
  altro,
  mossaTelefono,
  muovi,
  nuovaPartita,
  punteggioVuoto,
  type Difficolta,
  type Partita,
  type Punteggio,
  type Segno,
} from "../logica";
import "./tris.css";

type Modalita = "telefono" | "due";

const PAUSA_TELEFONO = 450;

const GIOCO = "tris";
/** Versione dello schema della partita salvata (alzarla scarta i salvataggi vecchi). */
const VERSIONE_SALVATAGGIO = 1;

interface Salvataggio {
  modalita: Modalita;
  livello: Difficolta;
  mioSegno: Segno;
  inizia: Segno;
  partita: Partita;
  punteggio: Punteggio;
  seme: number;
}

const eSegno = (x: unknown): x is Segno => x === "X" || x === "O";
const eConteggio = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0;

/** Controllo del salvataggio: griglia di 9 caselle valide, turno, punteggio. */
function eSalvataggio(d: unknown): d is Salvataggio {
  const s = d as Salvataggio;
  const p = s?.partita;
  return (
    (s.modalita === "telefono" || s.modalita === "due") &&
    DIFFICOLTA.includes(s.livello) &&
    eSegno(s.mioSegno) &&
    eSegno(s.inizia) &&
    eConteggio(s.seme) &&
    Array.isArray(p?.griglia) &&
    p.griglia.length === 9 &&
    p.griglia.every((c) => c === null || eSegno(c)) &&
    eSegno(p.turno) &&
    (p.esito === null || p.esito === undefined) &&
    eConteggio(s.punteggio?.X) &&
    eConteggio(s.punteggio?.O) &&
    eConteggio(s.punteggio?.pareggi)
  );
}

/** Il caso della mossa del telefono dipende solo da seme e posizione: dopo un refresh la mossa è la stessa. */
const rngMossa = (seme: number, p: Partita) => creaRng(`${seme}:${p.griglia.map((c) => c ?? "-").join("")}`);

export function TrisLocale() {
  const t = usaT(dizionari);
  // Dopo un refresh a partita iniziata si riprende da dove si era, senza domande.
  const [ripresa] = useState(() => leggiPartita(GIOCO, VERSIONE_SALVATAGGIO, eSalvataggio));
  const [modalita, setModalita] = useState<Modalita>(ripresa?.modalita ?? "telefono");
  const [livello, setLivello] = useState<Difficolta>(ripresa?.livello ?? "medio");
  const [mioSegno, setMioSegno] = useState<Segno>(ripresa?.mioSegno ?? "X");
  const [inizia, setInizia] = useState<Segno>(ripresa?.inizia ?? "X");
  const [partita, setPartita] = useState<Partita>(() => ripresa?.partita ?? nuovaPartita("X"));
  const [punteggio, setPunteggio] = useState(() => ripresa?.punteggio ?? punteggioVuoto());
  const [seme] = useState(() => ripresa?.seme ?? Math.floor(Math.random() * 2 ** 32));

  // Si salva solo con una partita iniziata e non finita: a partita finita il salvataggio si cancella.
  const iniziata = !partita.esito && partita.griglia.some((c) => c !== null);
  useEffect(() => {
    if (iniziata) scriviPartita(GIOCO, VERSIONE_SALVATAGGIO, { modalita, livello, mioSegno, inizia, partita, punteggio, seme } satisfies Salvataggio);
    else cancellaPartita(GIOCO);
  }, [iniziata, modalita, livello, mioSegno, inizia, partita, punteggio, seme]);

  const telefonoSegno: Segno | null = modalita === "telefono" ? altro(mioSegno) : null;
  const turnoTelefono = telefonoSegno !== null && partita.turno === telefonoSegno && !partita.esito;

  /** Chi gioca quel segno: in due sono X e O, contro il telefono «tu» e «telefono». */
  const ruolo = (s: Segno): "X" | "O" | "Tu" | "Telefono" =>
    modalita === "due" ? s : s === mioSegno ? "Tu" : "Telefono";

  const registra = (p: Partita) => {
    const esito = p.esito;
    if (esito) setPunteggio((pt) => aggiungiEsito(pt, esito));
    setPartita(p);
  };

  // Tocca al telefono: una piccola pausa, poi muove.
  useEffect(() => {
    if (!turnoTelefono) return;
    const id = window.setTimeout(() => {
      registra(muovi(partita, mossaTelefono(partita, livello, rngMossa(seme, partita))));
    }, PAUSA_TELEFONO);
    return () => window.clearTimeout(id);
  }, [turnoTelefono, partita, livello, seme]);

  /** Nuova partita, iniziando a turno: chi iniziava prima ora gioca per secondo. */
  const nuova = () => {
    const primo = altro(inizia);
    setInizia(primo);
    setPartita(nuovaPartita(primo));
  };

  /** Cambiare modalità, livello o segno riparte da zero, anche col punteggio. */
  const riparti = (segno: Segno = mioSegno) => {
    setPunteggio(punteggioVuoto());
    setInizia("X");
    setPartita(nuovaPartita("X"));
    setMioSegno(segno);
  };

  const tocca = (i: number) => {
    if (partita.esito || turnoTelefono || partita.griglia[i] !== null) return;
    registra(muovi(partita, i));
  };

  const nomeCasella = (i: number) => t("casella", { riga: Math.floor(i / 3) + 1, colonna: (i % 3) + 1 });
  const linea = useMemo(() => new Set(partita.esito?.linea ?? []), [partita.esito]);

  const stato = partita.esito
    ? partita.esito.vincitore
      ? t(`vince${ruolo(partita.esito.vincitore)}`)
      : t("pareggio")
    : turnoTelefono
      ? t("pensa")
      : t(`tocca${ruolo(partita.turno)}`);

  const etichettaSegno = (s: Segno) => (modalita === "due" ? s : `${s} (${t(ruolo(s) === "Tu" ? "tu" : "telefono")})`);

  return (
    <section className="schermata allineata tris">
      <fieldset className="scelta">
        <legend className="scelta-titolo">{t("modalita")}</legend>
        <div className="scelta-opzioni tris-opzioni-2">
          {(["telefono", "due"] as const).map((m) => (
            <label key={m} className="scelta-opzione">
              <input
                type="radio"
                name="modalita"
                checked={modalita === m}
                onChange={() => {
                  setModalita(m);
                  riparti();
                }}
              />
              <span>{m === "telefono" ? t("contro") : t("in2")}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {modalita === "telefono" && (
        <>
          <fieldset className="scelta">
            <legend className="scelta-titolo">{t("livello")}</legend>
            <div className="scelta-opzioni tris-opzioni-3">
              {DIFFICOLTA.map((d) => (
                <label key={d} className="scelta-opzione">
                  <input
                    type="radio"
                    name="livello"
                    checked={livello === d}
                    onChange={() => {
                      setLivello(d);
                      riparti();
                    }}
                  />
                  <span>{t(d)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="scelta">
            <legend className="scelta-titolo">{t("segnoTuo")}</legend>
            <div className="scelta-opzioni tris-opzioni-2">
              {(["X", "O"] as const).map((s) => (
                <label key={s} className="scelta-opzione">
                  <input type="radio" name="segno" checked={mioSegno === s} onChange={() => riparti(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <p className="tris-stato" role="status" aria-live="polite">
        {stato}
      </p>

      <div className="tris-griglia" role="group" aria-label={t("griglia")}>
        {partita.griglia.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`tris-casella${c ? ` tris-${c}` : ""}${linea.has(i) ? " tris-vincente" : ""}`}
            aria-label={
              c ? t("casellaSegno", { posizione: nomeCasella(i), segno: c }) : t("casellaVuota", { posizione: nomeCasella(i) })
            }
            aria-disabled={c !== null || !!partita.esito || turnoTelefono}
            onClick={() => tocca(i)}
          >
            {c}
          </button>
        ))}
      </div>

      <button type="button" className="btn primario" disabled={turnoTelefono} onClick={nuova}>
        {t("nuovaPartita")}
      </button>

      <div className="tris-punteggio">
        <h3>{t("punteggio")}</h3>
        <ul className="chip-elenco">
          <li className="chip">{t("vittorie", { chi: etichettaSegno("X"), n: punteggio.X })}</li>
          <li className="chip">{t("vittorie", { chi: etichettaSegno("O"), n: punteggio.O })}</li>
          <li className="chip">{t("pareggi", { n: punteggio.pareggi })}</li>
        </ul>
        <button type="button" className="btn" onClick={() => setPunteggio(punteggioVuoto())}>
          {t("azzera")}
        </button>
      </div>
    </section>
  );
}
