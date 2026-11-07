import { useEffect, useMemo, useRef, useState } from "react";
import { creaRng } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
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
  type Segno,
} from "../logica";
import "./tris.css";

type Modalita = "telefono" | "due";

const PAUSA_TELEFONO = 450;

export function TrisLocale() {
  const t = usaT(dizionari);
  const [modalita, setModalita] = useState<Modalita>("telefono");
  const [livello, setLivello] = useState<Difficolta>("medio");
  const [mioSegno, setMioSegno] = useState<Segno>("X");
  const [inizia, setInizia] = useState<Segno>("X");
  const [partita, setPartita] = useState<Partita>(() => nuovaPartita("X"));
  const [punteggio, setPunteggio] = useState(punteggioVuoto);
  const rng = useRef(creaRng(Math.floor(Math.random() * 2 ** 32)));

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
      registra(muovi(partita, mossaTelefono(partita, livello, rng.current)));
    }, PAUSA_TELEFONO);
    return () => window.clearTimeout(id);
  }, [turnoTelefono, partita, livello]);

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
