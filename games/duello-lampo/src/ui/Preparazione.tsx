import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { creaRng, limitaTesto, MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { MANI_MAX, MANI_PREDEFINITE, maniACaso, totaleRound, type Mani, type Sfida } from "../logica";
import { ID_MINIGIOCHI } from "../minigiochi";

interface Props {
  iniziale: Scelte;
  onInizia(sfida: Sfida, nomi: readonly [string, string]): void;
}

/** Cosa si ricorda sul telefono tra una sfida e l'altra. */
export interface Scelte {
  mani: Record<string, number>;
  nomi: [string, string];
}

const CHIAVE = "gdt-duello-lampo-scelte-2";

const tutti = (n: number): Record<string, number> => Object.fromEntries(ID_MINIGIOCHI.map((id) => [id, n]));

export function scelteIniziali(): Scelte {
  const predefinite: Scelte = { mani: tutti(MANI_PREDEFINITE), nomi: ["", ""] };
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return predefinite;
    const v = JSON.parse(grezzo) as Partial<Scelte>;
    // Un mini gioco tolto dal registro, un mini gioco nuovo o un valore strano: si ripiega sul predefinito, in silenzio.
    const salvate: Partial<Record<string, unknown>> = v.mani && typeof v.mani === "object" ? v.mani : {};
    const mani = Object.fromEntries(
      ID_MINIGIOCHI.map((id) => {
        const n = salvate[id];
        return [id, typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MANI_MAX ? n : MANI_PREDEFINITE];
      }),
    );
    const nomi: [string, string] = Array.isArray(v.nomi)
      ? [limitaTesto(String(v.nomi[0] ?? ""), MAX_CARATTERI_NOME), limitaTesto(String(v.nomi[1] ?? ""), MAX_CARATTERI_NOME)]
      : ["", ""];
    return { mani: Object.values(mani).some((n) => n > 0) ? mani : predefinite.mani, nomi };
  } catch {
    return predefinite;
  }
}

function salva(s: Scelte): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(s));
  } catch {
    /* archivio non disponibile: vale per questa visita */
  }
}

export function Preparazione({ iniziale, onInizia }: Props) {
  const t = usaT(dizionari);
  const [mani, setMani] = useState<Record<string, number>>(iniziale.mani);
  const [nomi, setNomi] = useState<[string, string]>(iniziale.nomi);

  const cambia = (id: string, delta: number) =>
    setMani((m) => ({ ...m, [id]: Math.min(MANI_MAX, Math.max(0, (m[id] ?? 0) + delta)) }));
  const totale = totaleRound(mani as Mani);
  const valido = totale > 0;

  const inizia = () => {
    if (!valido) return;
    salva({ mani, nomi });
    onInizia({ mani }, [nomi[0].trim() || t("nomeBasso"), nomi[1].trim() || t("nomeAlto")]);
  };

  return (
    <section className="schermata allineata dl-prep">
      <label className="campo">
        {t("giocatoreBasso")}
        <input
          type="text"
          value={nomi[0]}
          placeholder={t("nomeBasso")}
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_CARATTERI_NOME}
          onChange={(e) => setNomi([limitaTesto(e.target.value, MAX_CARATTERI_NOME), nomi[1]])}
        />
      </label>
      <label className="campo">
        {t("giocatoreAlto")}
        <input
          type="text"
          value={nomi[1]}
          placeholder={t("nomeAlto")}
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_CARATTERI_NOME}
          onChange={(e) => setNomi([nomi[0], limitaTesto(e.target.value, MAX_CARATTERI_NOME)])}
        />
      </label>

      <fieldset className="scelta dl-minigiochi" aria-describedby="dl-mg-aiuto">
        <legend className="scelta-titolo">{t("minigiochiTitolo")}</legend>
        <p className="scelta-aiuto" id="dl-mg-aiuto">
          {t("minigiochiAiuto", { max: MANI_MAX })}
        </p>
        <ul className="dl-mg-elenco">
          {ID_MINIGIOCHI.map((id) => {
            const nome = t(`mg_${id}_nome` as "mg_via_nome");
            const n = mani[id] ?? 0;
            return (
              <li key={id} className={`dl-mg-voce${n === 0 ? " dl-mg-voce--spenta" : ""}`}>
                <span className="dl-mg-testo">
                  <span className="dl-mg-nome">{nome}</span>
                  <span className="suggerimento">{t(`mg_${id}_regola` as "mg_via_regola")}</span>
                </span>
                <span className="dl-mani" role="group" aria-label={t("maniDi", { nome })}>
                  <button
                    type="button"
                    className="btn dl-mani-tasto"
                    aria-label={t("menoMani", { nome })}
                    disabled={n <= 0}
                    onClick={() => cambia(id, -1)}
                  >
                    <Minus size={20} aria-hidden="true" />
                  </button>
                  <output className="dl-mani-numero" aria-live="polite" aria-label={t("maniNumero", { nome, n })}>
                    {n}
                  </output>
                  <button
                    type="button"
                    className="btn dl-mani-tasto"
                    aria-label={t("piuMani", { nome })}
                    disabled={n >= MANI_MAX}
                    onClick={() => cambia(id, 1)}
                  >
                    <Plus size={20} aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="dl-mg-azioni">
          <button type="button" className="btn" onClick={() => setMani(tutti(MANI_PREDEFINITE))}>
            {t("tutti")}
          </button>
          <button type="button" className="btn" onClick={() => setMani(maniACaso(creaRng(Math.floor(Math.random() * 2 ** 32))))}>
            {t("aCaso")}
          </button>
        </div>
        {valido ? (
          <p className="suggerimento dl-totale" role="status">
            {t("totaleRound", { n: totale })}
          </p>
        ) : (
          <p className="errore" role="alert">
            {t("nessunoScelto")}
          </p>
        )}
      </fieldset>

      <button type="button" className="btn primario dl-grande" disabled={!valido} onClick={inizia}>
        {t("inizia")}
      </button>
    </section>
  );
}
