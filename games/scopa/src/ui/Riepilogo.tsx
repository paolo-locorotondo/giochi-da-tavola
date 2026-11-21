import { CartaGrafica, ordinaPerSeme } from "@gdt/carte";
import { usaT, type Traduttore } from "@gdt/i18n";
import { dizionari } from "../locales";
import type { it } from "../locales/it";
import type { Squadra } from "../logica";
import type { Vista } from "../online";
import type { Comandi } from "./Tavolo";

type T = Traduttore<typeof it>;

/** Il nome di una squadra: il giocatore (a 2) oppure «Anna e Carla» (a 4). */
export function nomeSquadra(t: T, v: Vista, sq: Squadra): string {
  const nomi = v.nomi.filter((n) => n.squadra === sq).map((n) => n.nome);
  return nomi.length === 2 ? t("coppia", { a: nomi[0]!, b: nomi[1]! }) : (nomi[0] ?? "");
}

/** Fine round e fine partita: tabella dei punti, ultima presa, prese di ognuno (scoperte solo qui). */
export function Riepilogo({ v, comandi }: { v: Vista; comandi: Comandi }) {
  const t = usaT(dizionari);
  const r = v.riepilogo;
  if (!r) return null;
  const { punti } = r.fine;
  const fine = v.fase === "fine";
  const nomeDi = (p: number) => v.nomi.find((n) => n.posto === p)?.nome ?? "";
  const sq: Squadra[] = [0, 1];
  const [a, b] = punti.conteggi;
  const cella = (vinto: Squadra | null, s: Squadra, testo: string) => (
    <td className={vinto === s ? "sc-vinto" : undefined}>
      {testo}
      {vinto === s && <span className="sc-punto-testo"> · {t("puntoA")}</span>}
    </td>
  );
  const pari = (vinto: Squadra | null) => (vinto === null ? <span className="sc-pari">{t("pari")}</span> : null);

  const esito = (() => {
    if (!fine || v.vincitore === null) return null;
    if (v.miaSquadra === v.vincitore) return v.config.posti === 4 ? t("avetVinto") : t("haiVinto");
    return v.config.posti === 4 ? t("hannoVinto", { nome: nomeSquadra(t, v, v.vincitore) }) : t("haVinto", { nome: nomeSquadra(t, v, v.vincitore) });
  })();

  return (
    <div className="sc-riepilogo">
      <h3>{fine ? t("fineTitolo") : t("fineRoundTitolo")}</h3>
      {esito && <p className="sc-esito">{esito}</p>}
      <p>{t("ultimaPresaDi", { nome: nomeDi(r.fine.ultimaPresa) })}</p>
      <table className="sc-tabella" aria-label={t("tabellaAria")}>
        <thead>
          <tr>
            <th scope="col">{t("voce")}</th>
            {sq.map((s) => (
              <th key={s} scope="col">
                {nomeSquadra(t, v, s)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              {t("voce_carte")} {pari(punti.carte)}
            </th>
            {cella(punti.carte, 0, String(a.carte))}
            {cella(punti.carte, 1, String(b.carte))}
          </tr>
          <tr>
            <th scope="row">
              {t("voce_denari")} {pari(punti.denari)}
            </th>
            {cella(punti.denari, 0, String(a.denari))}
            {cella(punti.denari, 1, String(b.denari))}
          </tr>
          <tr>
            <th scope="row">{t("voce_settebello")}</th>
            {cella(punti.settebello, 0, a.settebello ? t("si") : t("no"))}
            {cella(punti.settebello, 1, b.settebello ? t("si") : t("no"))}
          </tr>
          <tr>
            <th scope="row">
              {t("voce_primiera")} {pari(punti.primiera)}
            </th>
            {cella(punti.primiera, 0, a.primiera === null ? t("nulla") : String(a.primiera))}
            {cella(punti.primiera, 1, b.primiera === null ? t("nulla") : String(b.primiera))}
          </tr>
          <tr>
            <th scope="row">{t("voce_scope")}</th>
            <td>{a.scope}</td>
            <td>{b.scope}</td>
          </tr>
          <tr className="sc-totale">
            <th scope="row">{t("voce_totale")}</th>
            <td>{punti.totale[0]}</td>
            <td>{punti.totale[1]}</td>
          </tr>
          <tr className="sc-totale">
            <th scope="row">{t("puntiPartita")}</th>
            <td>{v.punti[0]}</td>
            <td>{v.punti[1]}</td>
          </tr>
        </tbody>
      </table>

      <details className="accordion">
        <summary>
          <span>{t("vediPrese")}</span>
        </summary>
        <div className="accordion-corpo">
          {v.nomi.map((n) => (
            <div key={n.posto} className="sc-prese-di">
              <h4>
                {t("preseDi", { nome: n.nome })} ({r.prese[n.posto - 1]!.length})
              </h4>
              <ul className="sc-prese-lista">
                {ordinaPerSeme(r.prese[n.posto - 1]!).map((c) => (
                  <li key={c.id}>
                    <CartaGrafica carta={c} dimensione="mini" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {v.host ? (
        <button className="btn primario" onClick={() => comandi.azione({ tipo: fine ? "ricomincia" : "prossimoRound" })}>
          {fine ? t("ricomincia") : t("prossimoRound")}
        </button>
      ) : (
        <p className="muted">{fine ? t("aspettoRicomincia") : t("aspettoProssimo")}</p>
      )}
    </div>
  );
}
