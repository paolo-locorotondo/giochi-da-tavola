import { useState } from "react";
import { creaRng, limitaTesto, MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { ROUND_PREDEFINITI, ROUND_SCELTE, sceltaACaso, type Sfida } from "../logica";
import { ID_MINIGIOCHI } from "../minigiochi";

interface Props {
  iniziale: Scelte;
  onInizia(sfida: Sfida, nomi: readonly [string, string]): void;
}

/** Cosa si ricorda sul telefono tra una sfida e l'altra. */
export interface Scelte {
  minigiochi: string[];
  round: number;
  nomi: [string, string];
}

const CHIAVE = "gdt-duello-lampo-scelte";

export function scelteIniziali(): Scelte {
  const predefinite: Scelte = { minigiochi: [...ID_MINIGIOCHI], round: ROUND_PREDEFINITI, nomi: ["", ""] };
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return predefinite;
    const v = JSON.parse(grezzo) as Partial<Scelte>;
    // Un mini gioco tolto dal registro, o un valore strano, si scarta in silenzio.
    const minigiochi = Array.isArray(v.minigiochi) ? v.minigiochi.filter((id) => ID_MINIGIOCHI.includes(id)) : [];
    const round = typeof v.round === "number" && (ROUND_SCELTE as readonly number[]).includes(v.round) ? v.round : ROUND_PREDEFINITI;
    const nomi: [string, string] = Array.isArray(v.nomi)
      ? [String(v.nomi[0] ?? ""), String(v.nomi[1] ?? "")].map((n) => limitaTesto(n, MAX_CARATTERI_NOME)) as [string, string]
      : ["", ""];
    return { minigiochi: minigiochi.length > 0 ? minigiochi : predefinite.minigiochi, round, nomi };
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
  const [scelti, setScelti] = useState<string[]>(iniziale.minigiochi);
  const [round, setRound] = useState(iniziale.round);
  const [nomi, setNomi] = useState<[string, string]>(iniziale.nomi);

  const alterna = (id: string) =>
    setScelti((s) => ID_MINIGIOCHI.filter((x) => (x === id ? !s.includes(id) : s.includes(x))));
  const valido = scelti.length > 0;

  const inizia = () => {
    if (!valido) return;
    salva({ minigiochi: scelti, round, nomi });
    onInizia({ minigiochi: scelti, round }, [nomi[0].trim() || t("nomeBasso"), nomi[1].trim() || t("nomeAlto")]);
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
          {t("minigiochiAiuto")}
        </p>
        <ul className="dl-mg-elenco">
          {ID_MINIGIOCHI.map((id) => (
            <li key={id}>
              <label className="dl-mg-voce">
                <input type="checkbox" checked={scelti.includes(id)} onChange={() => alterna(id)} />
                <span className="dl-mg-testo">
                  <span className="dl-mg-nome">{t(`mg_${id}_nome` as "mg_via_nome")}</span>
                  <span className="suggerimento">{t(`mg_${id}_regola` as "mg_via_regola")}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="dl-mg-azioni">
          <button type="button" className="btn" onClick={() => setScelti([...ID_MINIGIOCHI])}>
            {t("tutti")}
          </button>
          <button type="button" className="btn" onClick={() => setScelti(sceltaACaso(ID_MINIGIOCHI, creaRng(Math.floor(Math.random() * 2 ** 32))))}>
            {t("aCaso")}
          </button>
        </div>
        {!valido && (
          <p className="errore" role="alert">
            {t("nessunoScelto")}
          </p>
        )}
      </fieldset>

      <fieldset className="scelta" aria-describedby="dl-round-aiuto">
        <legend className="scelta-titolo">{t("roundTitolo")}</legend>
        <p className="scelta-aiuto" id="dl-round-aiuto">
          {t("roundAiuto")}
        </p>
        <div className="scelta-opzioni">
          {ROUND_SCELTE.map((n) => (
            <label key={n} className="scelta-opzione">
              <input type="radio" name="dl-round" value={n} checked={round === n} onChange={() => setRound(n)} />
              <span>{n}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" className="btn primario dl-grande" disabled={!valido} onClick={inizia}>
        {t("inizia")}
      </button>
    </section>
  );
}
