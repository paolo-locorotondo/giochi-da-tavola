import { useState } from "react";
import { CampoTesto } from "@gdt/collegamento";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { creaRng, limitaTesto, MAX_CARATTERI_NOME } from "@gdt/engine";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { MANI_MAX, MANI_PREDEFINITE, maniACaso, ordineCompleto, totaleRound, type ImpostazioniSfida, type Mani, type Ordine, type Sfida } from "../logica";
import {
  ID_MINIGIOCHI,
  MINIGIOCHI,
  miniGioco,
  sceltePermesse,
  tuttiBase,
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
  /** Ordine dei mini giochi: di base a caso; con `mio` vale `elenco`. */
  ordine: Ordine;
  /** I mini giochi nell'ordine scelto con le frecce (sempre completo). */
  elenco: string[];
}

const CHIAVE = "gdt-duello-lampo-scelte-3";

/** Versione dei dati salvati: la 4 ha reso «gli errori contano −1» acceso di base (vedi `scelteIniziali`). */
const VERSIONE_DATI = 4;

const tutti = (n: number): Record<string, number> => Object.fromEntries(ID_MINIGIOCHI.map((id) => [id, n]));

/** Le impostazioni di ogni mini gioco, completate e corrette a partire da `grezze` (anche vuote). */
function impostazioniComplete(grezze: ImpostazioniSfida = {}): Record<string, ValoriImpostazioni> {
  return Object.fromEntries(MINIGIOCHI.map((m) => [m.id, valoriCompleti(m.impostazioni, grezze[m.id])]));
}

export function scelteIniziali(): Scelte {
  const predefinite: Scelte = {
    mani: tutti(MANI_PREDEFINITE),
    impostazioni: impostazioniComplete(),
    nomi: ["", ""],
    ordine: "caso",
    elenco: [...ID_MINIGIOCHI],
  };
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
    let grezze = v.impostazioni && typeof v.impostazioni === "object" ? (v.impostazioni as ImpostazioniSfida) : {};
    // Salvataggi di prima della versione 4: «errori» valeva spento di base, quindi quel valore non è una scelta: si riparte dalla base.
    if ((v as { versione?: number }).versione !== VERSIONE_DATI) {
      grezze = Object.fromEntries(Object.entries(grezze).map(([id, valori]) => [id, Object.fromEntries(Object.entries(valori ?? {}).filter(([k]) => k !== "errori"))]));
    }
    return {
      mani: Object.values(mani).some((n) => n > 0) ? mani : predefinite.mani,
      impostazioni: impostazioniComplete(grezze),
      nomi,
      // Senza una scelta salvata l'ordine è casuale; il proprio ordine resta finché non lo si cambia.
      ordine: v.ordine === "mio" ? "mio" : "caso",
      elenco: ordineCompleto(v.elenco),
    };
  } catch {
    return predefinite;
  }
}

function salva(s: Scelte): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({ ...s, versione: VERSIONE_DATI }));
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
  if (chiave === "errori") return "imp_errori"; // comune a tutti i mini giochi in cui si può sbagliare
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
            const aiuto = spento ? t("imp_ruotano_spento") : i.chiave === "errori" ? t("imp_errori_aiuto") : null;
            return (
              <label key={i.chiave} className={`dl-imp-interruttore${spento ? " dl-imp-interruttore--spento" : ""}`}>
                <input
                  type="checkbox"
                  role="switch"
                  checked={valori[i.chiave] === true}
                  disabled={spento}
                  aria-describedby={aiuto ? `${idCampo}-aiuto` : undefined}
                  onChange={(e) => onCambia(i.chiave, e.target.checked)}
                />
                <span className="dl-imp-etichetta">
                  {titolo}
                  {aiuto && (
                    <span className="suggerimento" id={`${idCampo}-aiuto`}>
                      {aiuto}
                    </span>
                  )}
                </span>
              </label>
            );
          }
          const permesse = sceltePermesse(i, valori);
          const aLivelli = NOMI_LIVELLI.has(`${id}:${i.chiave}`);
          if (i.contatore) {
            const attuale = Number(valori[i.chiave]);
            const pos = permesse.indexOf(attuale);
            const prima = permesse[pos - 1];
            const dopo = permesse[pos + 1];
            return (
              <div key={i.chiave} className="dl-imp-contatore">
                <span className="dl-imp-etichetta" id={`${idCampo}-titolo`}>
                  {titolo}
                </span>
                <span className="dl-mani" role="group" aria-labelledby={`${idCampo}-titolo`}>
                  <button
                    type="button"
                    className="btn dl-mani-tasto"
                    aria-label={t("impMeno", { titolo })}
                    disabled={prima === undefined}
                    onClick={() => prima !== undefined && onCambia(i.chiave, prima)}
                  >
                    <Minus size={20} aria-hidden="true" />
                  </button>
                  <output className="dl-mani-numero" aria-live="polite" aria-label={t("impValore", { titolo, n: attuale })}>
                    {attuale}
                  </output>
                  <button
                    type="button"
                    className="btn dl-mani-tasto"
                    aria-label={t("impPiu", { titolo })}
                    disabled={dopo === undefined}
                    onClick={() => dopo !== undefined && onCambia(i.chiave, dopo)}
                  >
                    <Plus size={20} aria-hidden="true" />
                  </button>
                </span>
              </div>
            );
          }
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
  const [ordine, setOrdine] = useState<Ordine>(iniziale.ordine);
  const [elenco, setElenco] = useState<string[]>(iniziale.elenco);
  /** Il mini gioco appena spostato: il suo pulsante resta a fuoco dopo lo spostamento. */
  const [spostato, setSpostato] = useState<{ id: string; verso: -1 | 1 } | null>(null);
  const mio = ordine === "mio";

  /** Sposta un mini gioco di un posto su (−1) o giù (+1) nell'elenco. */
  const sposta = (id: string, verso: -1 | 1) => {
    const i = elenco.indexOf(id);
    const j = i + verso;
    if (i < 0 || j < 0 || j >= elenco.length) return;
    const nuovo = [...elenco];
    [nuovo[i], nuovo[j]] = [nuovo[j] as string, nuovo[i] as string];
    setElenco(nuovo);
    // Il fuoco segue il mini gioco spostato (sulla stessa freccia), così si può continuare a spostarlo.
    setSpostato({ id, verso });
  };
  // In «il mio ordine» l'elenco si mostra nell'ordine scelto; a caso, nell'ordine del registro.
  const mostrati = mio ? elenco.map((id) => miniGioco(id)) : MINIGIOCHI;
  const sequenza = elenco.filter((id) => (mani[id] ?? 0) > 0);

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

  const riportaBaseTutte = () => setImpostazioni(impostazioniComplete());
  const tuttoDiBase = MINIGIOCHI.every((m) => tuttiBase(m.impostazioni, impostazioni[m.id] ?? valoriBase(m.impostazioni)));

  const inizia = () => {
    if (!valido) return;
    salva({ mani, impostazioni, nomi, ordine, elenco });
    onInizia({ mani, impostazioni, ordine, elenco }, [nomi[0].trim() || t("nomeBasso"), nomi[1].trim() || t("nomeAlto")]);
  };

  return (
    <section className="schermata allineata dl-prep">
      <CampoTesto
        label={t("giocatoreBasso")}
        value={nomi[0]}
        placeholder={t("nomeBasso")}
        autoComplete="off"
        spellCheck={false}
        maxLength={MAX_CARATTERI_NOME}
        onChange={(v) => setNomi([limitaTesto(v, MAX_CARATTERI_NOME), nomi[1]])}
      />
      <CampoTesto
        label={t("giocatoreAlto")}
        value={nomi[1]}
        placeholder={t("nomeAlto")}
        autoComplete="off"
        spellCheck={false}
        maxLength={MAX_CARATTERI_NOME}
        onChange={(v) => setNomi([nomi[0], limitaTesto(v, MAX_CARATTERI_NOME)])}
      />

      <fieldset className="scelta dl-minigiochi" aria-describedby="dl-mg-aiuto">
        <legend className="scelta-titolo">{t("minigiochiTitolo")}</legend>
        <p className="scelta-aiuto" id="dl-mg-aiuto">
          {t("minigiochiAiuto", { max: MANI_MAX })}
        </p>
        <fieldset className="dl-ordine" aria-describedby="dl-ordine-aiuto">
          <legend className="dl-imp-etichetta">{t("ordine")}</legend>
          <div className="scelta-opzioni dl-ordine-opzioni">
            {(["caso", "mio"] as const).map((o) => (
              <label key={o} className="scelta-opzione">
                <input type="radio" name="dl-ordine" value={o} checked={ordine === o} onChange={() => setOrdine(o)} />
                <span>{t(o === "caso" ? "ordineCaso" : "ordineMio")}</span>
              </label>
            ))}
          </div>
          <p className="suggerimento" id="dl-ordine-aiuto">
            {t(mio ? "ordineMioAiuto" : "ordineCasoAiuto")}
          </p>
        </fieldset>
        <ul className="dl-mg-elenco">
          {mostrati.map((mg, posizione) => {
            const id = mg.id;
            const nome = t(`mg_${id}_nome` as "mg_via_nome");
            const n = mani[id] ?? 0;
            const imp = mg.impostazioni ?? [];
            return (
              <li key={id} className={`dl-mg-riga${n === 0 ? " dl-mg-riga--spenta" : ""}`}>
                {mio && (
                  <div className="dl-sposta" role="group" aria-label={t("spostaDi", { nome })}>
                    <span className="dl-sposta-pos" aria-hidden="true">
                      {posizione + 1}
                    </span>
                    <button
                      type="button"
                      className="btn dl-mani-tasto"
                      aria-label={t("spostaSu", { nome })}
                      disabled={posizione === 0}
                      ref={(el) => {
                        if (el && spostato?.id === id && spostato.verso === -1) el.focus();
                      }}
                      onClick={() => sposta(id, -1)}
                    >
                      <ChevronUp size={20} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn dl-mani-tasto"
                      aria-label={t("spostaGiu", { nome })}
                      disabled={posizione === mostrati.length - 1}
                      ref={(el) => {
                        if (el && spostato?.id === id && spostato.verso === 1) el.focus();
                      }}
                      onClick={() => sposta(id, 1)}
                    >
                      <ChevronDown size={20} aria-hidden="true" />
                    </button>
                  </div>
                )}
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
          <button type="button" className="btn" onClick={() => setMani(tutti(0))}>
            {t("nessuno")}
          </button>
          <button type="button" className="btn" onClick={() => setMani(maniACaso(creaRng(Math.floor(Math.random() * 2 ** 32))))}>
            {t("aCaso")}
          </button>
          <button type="button" className="btn" disabled={tuttoDiBase} onClick={riportaBaseTutte}>
            {t("ripristinaImp")}
          </button>
        </div>
        {valido ? (
          <>
            <p className="suggerimento dl-totale" role="status">
              {t("totaleRound", { n: totale })}
            </p>
            <p className="suggerimento dl-sequenza">
              {mio
                ? sequenza.map((id) => t("sequenzaVoce", { nome: t(`mg_${id}_nome` as "mg_via_nome"), n: mani[id] ?? 0 })).join(" · ")
                : t("sequenzaCaso")}
            </p>
          </>
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

