import { usaT } from "@gdt/i18n";
import type { ImpostazioniVeloce } from "@gdt/collegamento";
import { dizionari } from "../locales";
import { OBIETTIVI, OBIETTIVO_BASE, PILA_BASE, PILE, type Obiettivo, type Pila } from "../regole";
import { Opzioni } from "./BurracoLocale";

/**
 * Impostazioni del Burraco scelte da chi apre una stanza veloce (le stesse della stanza con codice:
 * punti da raggiungere e scarti). Quanti giocatori e le coppie li chiede la schermata condivisa.
 */
export interface ConfigVeloceBurraco {
  obiettivo: Obiettivo;
  pila: Pila;
}

function Campi({ config, cambia }: { config: ConfigVeloceBurraco; cambia: (c: ConfigVeloceBurraco) => void }) {
  const t = usaT(dizionari);
  return (
    <>
      <Opzioni
        legenda={t("obiettivoTitolo")}
        nome="obiettivo-veloce"
        valore={String(config.obiettivo)}
        onCambia={(v) => cambia({ ...config, obiettivo: Number(v) as Obiettivo })}
        voci={OBIETTIVI.map((o) => ({ valore: String(o), titolo: t(`obiettivo_${o}`) }))}
      />
      <Opzioni
        legenda={t("pilaTitolo")}
        nome="pila-veloce"
        valore={config.pila}
        onCambia={(pila) => cambia({ ...config, pila })}
        voci={PILE.map((p) => ({ valore: p, titolo: t(`pila_${p}`), desc: t(`pila_${p}Desc`) }))}
      />
    </>
  );
}

export const impostazioniVeloce: ImpostazioniVeloce<ConfigVeloceBurraco> = {
  iniziale: { obiettivo: OBIETTIVO_BASE, pila: PILA_BASE },
  disegna: (config, cambia) => <Campi config={config} cambia={cambia} />,
};
