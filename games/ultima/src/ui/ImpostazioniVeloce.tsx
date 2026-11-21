import { useState } from "react";
import { usaT } from "@gdt/i18n";
import type { ImpostazioniVeloce } from "@gdt/collegamento";
import { dizionari } from "../locales";
import { SOGLIA_MAX, SOGLIA_MIN, SOGLIA_PREDEFINITA, type ConfigOnline } from "../online";

/**
 * Impostazioni di Ultima! scelte da chi apre una stanza veloce (stesse della creazione: modo di
 * punteggio e soglia). Le nuove opzioni della partita (varianti) si aggiungono qui e in `leggiConfig`.
 */
function Campi({ config, cambia }: { config: ConfigOnline; cambia: (c: ConfigOnline) => void }) {
  const t = usaT(dizionari);
  const [testo, setTesto] = useState(String(config.soglia));
  const sogliaOk = sogliaValida(config.soglia);
  return (
    <fieldset className="ul-nomi-crea ul-senza-bordo">
      <legend>{t("comeSiVince")}</legend>
      {(["singolo", "punti"] as const).map((m) => (
        <label key={m} className="ul-opzione">
          <input type="radio" name="modo-veloce" checked={config.modo === m} onChange={() => cambia({ ...config, modo: m })} />
          <span>
            <strong>{t(m === "singolo" ? "modoSingolo" : "modoPunti")}</strong>
            <br />
            <span className="muted">{t(m === "singolo" ? "modoSingoloDesc" : "modoPuntiDesc")}</span>
          </span>
        </label>
      ))}
      {config.modo === "punti" && (
        <label className="campo">
          {t("soglia")}
          <input
            type="number"
            inputMode="numeric"
            min={SOGLIA_MIN}
            max={SOGLIA_MAX}
            step={10}
            value={testo}
            aria-invalid={!sogliaOk}
            onChange={(e) => {
              setTesto(e.target.value);
              cambia({ ...config, soglia: Number(e.target.value) });
            }}
          />
          <span className="suggerimento">{t("sogliaAiuto", { min: SOGLIA_MIN, max: SOGLIA_MAX })}</span>
        </label>
      )}
    </fieldset>
  );
}

const sogliaValida = (s: number) => Number.isInteger(s) && s >= SOGLIA_MIN && s <= SOGLIA_MAX;

export const impostazioniVeloce: ImpostazioniVeloce<ConfigOnline> = {
  iniziale: { modo: "singolo", soglia: SOGLIA_PREDEFINITA },
  disegna: (config, cambia) => <Campi config={config} cambia={cambia} />,
  valida: (config) => config.modo === "singolo" || sogliaValida(config.soglia),
};
