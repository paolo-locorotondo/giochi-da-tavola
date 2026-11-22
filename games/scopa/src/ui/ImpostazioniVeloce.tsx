import { usaT } from "@gdt/i18n";
import type { ImpostazioniVeloce } from "@gdt/collegamento";
import { dizionari } from "../locales";
import { SOGLIE, SOGLIA_PREDEFINITA, type Soglia } from "../regole";
import { Opzioni } from "./ScopaLocale";

/**
 * Impostazioni di Scopa scelte da chi apre una stanza veloce: solo i punti per vincere. Quanti
 * giocatori e le coppie li chiede la schermata condivisa (`ApriVeloce`); `configVeloce` completa `posti`.
 */
export interface ConfigVeloceScopa {
  soglia: Soglia;
}

function Campi({ config, cambia }: { config: ConfigVeloceScopa; cambia: (c: ConfigVeloceScopa) => void }) {
  const t = usaT(dizionari);
  return (
    <Opzioni
      legenda={t("sogliaTitolo")}
      nome="soglia-veloce"
      valore={config.soglia}
      onCambia={(soglia) => cambia({ ...config, soglia })}
      voci={SOGLIE.map((x) => ({ valore: x, titolo: t(`soglia_${x}`), desc: t(`soglia_${x}Desc`) }))}
    />
  );
}

export const impostazioniVeloce: ImpostazioniVeloce<ConfigVeloceScopa> = {
  iniziale: { soglia: SOGLIA_PREDEFINITA },
  disegna: (config, cambia) => <Campi config={config} cambia={cambia} />,
};
