import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { NOMI_VARIANTI, type Varianti as DatiVarianti } from "../logica";

/**
 * Le varianti facoltative: impostazioni iniziali della stanza, spente di base.
 * Lo usano la creazione online, quella contro i bot e l'apertura veloce.
 */
export function Varianti({ valore, onCambia }: { valore: DatiVarianti; onCambia: (v: DatiVarianti) => void }) {
  const t = usaT(dizionari);
  return (
    <fieldset className="ul-nomi-crea ul-senza-bordo" aria-describedby="ul-varianti-aiuto">
      <legend>{t("variantiTitolo")}</legend>
      <span className="suggerimento" id="ul-varianti-aiuto">
        {t("variantiAiuto")}
      </span>
      {NOMI_VARIANTI.map((nome) => (
        <label key={nome} className="ul-opzione">
          <input type="checkbox" checked={valore[nome]} onChange={(e) => onCambia({ ...valore, [nome]: e.target.checked })} />
          <span>
            <strong>{t(`variante_${nome}`)}</strong>
            <br />
            <span className="muted">{t(`variante_${nome}Desc`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Elenco a parole delle varianti accese (per il riepilogo in sala e sul tavolo); vuoto se nessuna. */
export function elencoVarianti(t: ReturnType<typeof usaT<typeof dizionari.it>>, v: DatiVarianti): string {
  return NOMI_VARIANTI.filter((n) => v[n])
    .map((n) => t(`variante_${n}`))
    .join(", ");
}

/** Riga di riepilogo delle varianti accese; niente se sono tutte spente. */
export function RiepilogoVarianti({ varianti }: { varianti: DatiVarianti }) {
  const t = usaT(dizionari);
  const elenco = elencoVarianti(t, varianti);
  if (!elenco) return null;
  return (
    <p className="muted ul-riepilogo-varianti">{t("variantiAttive", { elenco })}</p>
  );
}
