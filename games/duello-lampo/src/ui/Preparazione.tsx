import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { creaRng, limitaTesto, MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { MANI_MAX, MANI_PREDEFINITE, maniACaso, totaleRound, type ImpostazioniSfida, type Mani, type Sfida } from "../logica";
import {
  ID_MINIGIOCHI,
  MINIGIOCHI,
  miniGioco,
  sceltePermesse,
  valoriBase,
  valoriCompleti,
  type ImpostazioneMiniGioco,
  type ValoriImpostazioni,
} from "../minigiochi";
import type { T } from "./minigiochi";

interface Props {
  iniziale: Scelte;
  onInizia(sfida: Sfida, nomi: readonly [string, string]): void;
}

/** Cosa si ricorda sul telefono tra una sfida e l'altra. */
export interface Scelte {
  mani: Record<string, number>;
  /** Le impostazioni di ogni mini gioco, sempre complete. */
  impostazioni: Record<string, ValoriImpostazioni>;
  nomi: [string, string];
}

const CHIAVE = "gdt-duello-lampo-scelte-3";

const tutti = (n: number): Record<string, number> => Object.fromEntries(ID_MINIGIOCHI.map((id) => [id, n]));

/** Le impostazioni di ogni mini gioco, completate e corrette a partire da `grezze` (anche vuote). */
function impostazioniComplete(grezze: ImpostazioniSfida = {}): Record<string, ValoriImpostazioni> {
  return Object.fromEntries(MINIGIOCHI.map((m) => [m.id, valoriCompleti(m.impostazioni, grezze[m.id])]));
}

export function scelteIniziali(): Scelte {
  const predefinite: Scelte = { mani: tutti(MANI_PREDEFINITE), impostazioni: impostazioniComplete(), nomi: ["", ""] };
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return predefinite;
    const v = JSON.parse(grezzo) as Partial<Scelte>;
    // Un mini gioco tolto dal registro, uno nuovo o un valore strano: si ripiega sul predefinito, in silenzio.
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
    const grezze = v.impostazioni && typeof v.impostazioni === "object" ? (v.impostazioni as ImpostazioniSfida) : {};
    return {
      mani: Object.values(mani).some((n) => n > 0) ? mani : predefinite.mani,
      impostazioni: impostazioniComplete(grezze),
      nomi,
    };
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

/** Il testo di un valore numerico: «5 s», «4×4» o il numero. */
function testoValore(formato: "numero" | "secondi" | "griglia", n: number, t: T): string {
  if (formato === "secondi") return t("imp_secondi", { n: String(n).replace(".", ",") });
  if (formato === "griglia") return t("imp_griglia", { n });
  return String(n);
}

/** Il titolo di un'impostazione: per «trova» è condiviso tra panda e smile. */
function chiaveTitolo(id: string, chiave: string): string {
  return ["panda", "smile"].includes(id) ? `imp_trova_${chiave}` : `mg_${id}_imp_${chiave}`;
}

/** Le impostazioni «a livelli» (1, 2, 3…) si leggono con un nome invece del numero. */
const NOMI_LIVELLI = new Set(["stop:velocita"]);

function PannelloImpostazioni({
  id,
  nome,
  imp,
  valori,
  onCambia,
  onBase,
}: {
  id: string;
  nome: string;
  imp: readonly ImpostazioneMiniGioco[];
  valori: ValoriImpostazioni;
  onCambia(chiave: string, valore: number | boolean): void;
  onBase(): void;
}) {
  const t = usaT(dizionari);
  const tt = t as (chiave: string, parametri?: Record<string, string | number>) => string;
  const modificate = imp.filter((i) => valori[i.chiave] !== i.base).length;

  return (
    <details className="accordion dl-imp">
      <summary>
        <span className="dl-imp-titolo">{t("impostazioni")}</span>
        {modificate > 0 && <span className="chip dl-imp-modificate">{t("impModificate", { n: modificate })}</span>}
      </summary>
      <div className="accordion-corpo" role="group" aria-label={t("impostazioniDi", { nome })}>
        {imp.map((i) => {
          const titolo = tt(chiaveTitolo(id, i.chiave));
          const idCampo = `dl-imp-${id}-${i.chiave}`;
          if (i.tipo === "interruttore") {
            const spento = i.disattivo?.(valori) === true;
            return (
              <label key={i.chiave} className={`dl-imp-interruttore${spento ? " dl-imp-interruttore--spento" : ""}`}>
                <input
                  type="checkbox"
                  role="switch"
                  checked={valori[i.chiave] === true}
                  disabled={spento}
                  aria-describedby={spento ? `${idCampo}-aiuto` : undefined}
                  onChange={(e) => onCambia(i.chiave, e.target.checked)}
                />
                <span className="dl-imp-etichetta">
                  {titolo}
                  {spento && (
                    <span className="suggerimento" id={`${idCampo}-aiuto`}>
                      {t("imp_ruotano_spento")}
                    </span>
                  )}
                </span>
              </label>
            );
          }
          const permesse = sceltePermesse(i, valori);
          const aLivelli = NOMI_LIVELLI.has(`${id}:${i.chiave}`);
          return (
            <fieldset key={i.chiave} className="dl-imp-scelta">
              <legend className="dl-imp-etichetta">{titolo}</legend>
              <div className="dl-imp-opzioni">
                {permesse.map((v) => (
                  <label key={v} className="scelta-opzione">
                    <input
                      type="radio"
                      name={idCampo}
                      value={v}
                      checked={valori[i.chiave] === v}
                      onChange={() => onCambia(i.chiave, v)}
                    />
                    <span>{aLivelli ? tt(`mg_${id}_imp_${i.chiave}_${v}`) : testoValore(i.formato, v, t)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        <button type="button" className="btn" disabled={modificate === 0} onClick={onBase}>
          {t("valoriBase")}
        </button>
      </div>
    </details>
  );
}

export function Preparazione({ iniziale, onInizia }: Props) {
  const t = usaT(dizionari);
  const [mani, setMani] = useState<Record<string, number>>(iniziale.mani);
  const [impostazioni, setImpostazioni] = useState<Record<string, ValoriImpostazioni>>(iniziale.impostazioni);
  const [nomi, setNomi] = useState<[string, string]>(iniziale.nomi);

  const cambia = (id: string, delta: number) =>
    setMani((m) => ({ ...m, [id]: Math.min(MANI_MAX, Math.max(0, (m[id] ?? 0) + delta)) }));
  const totale = totaleRound(mani as Mani);
  const valido = totale > 0;

  /** Cambia un valore e ricontrolla gli altri (es. meno caselle che cambiano se la griglia si restringe). */
  const cambiaImp = (id: string, chiave: string, valore: number | boolean) =>
    setImpostazioni((tutte) => ({
      ...tutte,
      [id]: valoriCompleti(miniGioco(id).impostazioni, { ...tutte[id], [chiave]: valore }),
    }));
  const riportaBase = (id: string) => setImpostazioni((tutte) => ({ ...tutte, [id]: valoriBase(miniGioco(id).impostazioni) }));

  const inizia = () => {
    if (!valido) return;
    salva({ mani, impostazioni, nomi });
    onInizia({ mani, impostazioni }, [nomi[0].trim() || t("nomeBasso"), nomi[1].trim() || t("nomeAlto")]);
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
          {MINIGIOCHI.map((mg) => {
            const id = mg.id;
            const nome = t(`mg_${id}_nome` as "mg_via_nome");
            const n = mani[id] ?? 0;
            const imp = mg.impostazioni ?? [];
            return (
              <li key={id} className={`dl-mg-riga${n === 0 ? " dl-mg-riga--spenta" : ""}`}>
                <div className="dl-mg-voce">
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
                </div>
                {imp.length > 0 && (
                  <PannelloImpostazioni
                    id={id}
                    nome={nome}
                    imp={imp}
                    valori={impostazioni[id] ?? valoriBase(imp)}
                    onCambia={(chiave, valore) => cambiaImp(id, chiave, valore)}
                    onBase={() => riportaBase(id)}
                  />
                )}
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

