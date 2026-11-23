import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Bot, Layers } from "lucide-react";
import { CartaGrafica, Mano, dizionariCarte, nomeCarta, type OrdineMano } from "@gdt/carte";
import { BarraAzioni, PannelloInfo, RegistroEventi, TavoloCarte, ZonaCarte, type AzioneTavolo, type PropsPostoGiocatore } from "@gdt/carte/tavolo";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { valorePunti, type Carta } from "../carte";
import { attacca, burraco, leggi, type Combinazione, type Interpretazione } from "../combinazioni";
import { avanza, type Evento } from "../logica";
import type { Vista } from "../online";

type T = ReturnType<typeof usaT<typeof dizionari.it>>;
type TC = ReturnType<typeof usaT<typeof dizionariCarte.it>>;

/** Cosa può fare il tavolo: online passa dal server, offline dalla partita sul telefono. */
export interface Comandi {
  azione: (a: Record<string, unknown>) => void;
  /** Solo online: l'organizzatore sollecita chi è di turno. */
  sollecita?: () => void;
  /** Solo online: l'organizzatore vede «Simula mossa col bot». */
  conBot?: boolean;
}

const CHIAVE_ORDINE = "gdt.burraco.ordine";
function leggiOrdine(): OrdineMano {
  try {
    return localStorage.getItem(CHIAVE_ORDINE) === "valore" ? "valore" : "seme";
  } catch {
    return "seme";
  }
}
function scriviOrdine(o: OrdineMano) {
  try {
    localStorage.setItem(CHIAVE_ORDINE, o);
  } catch {
    /* niente memoria: si riparte per seme */
  }
}

/** Indice breve di una posizione di scala: A, 2…10, J, Q, K, A. */
function indice(tc: TC, pos: number): string {
  if (pos === 1 || pos === 14) return tc("indiceAsso");
  if (pos === 11) return tc("indiceFante");
  if (pos === 12) return tc("indiceRegina");
  if (pos === 13) return tc("indiceRe");
  return String(pos);
}

function nomeValore(tc: TC, v: number): string {
  return tc(`valoreF_${v}` as Parameters<TC>[0]);
}

function titoloComb(t: T, tc: TC, c: Interpretazione): string {
  if (c.tipo === "tris") return t("trisDi", { valore: nomeValore(tc, c.posate[0]!.come) });
  return t("scalaDi", { seme: tc(`seme_${c.seme}` as Parameters<TC>[0]) });
}

function testoAnteprima(t: T, tc: TC, l: Interpretazione): string {
  const punti = l.posate.reduce((s, p) => s + valorePunti(p.carta), 0);
  if (l.tipo === "tris") return t("anteprimaTris", { valore: nomeValore(tc, l.posate[0]!.come), punti });
  return t("anteprimaScala", {
    seme: tc(`seme_${l.seme}` as Parameters<TC>[0]),
    da: indice(tc, l.posate[0]!.come),
    a: indice(tc, l.posate[l.posate.length - 1]!.come),
    punti,
  });
}

function testoEvento(t: T, tc: TC, e: Evento, nome: (p: number) => string): string {
  switch (e.tipo) {
    case "nuovaMano":
      return t("ev_nuovaMano", { n: e.mano });
    case "pesca":
      return t("ev_pesca", { nome: nome(e.posto) });
    case "pila":
      return t("ev_pila", { nome: nome(e.posto), n: e.carte });
    case "cala":
      return t("ev_cala", { nome: nome(e.posto), nuove: e.nuove, attaccate: e.attaccate });
    case "scarta":
      return t("ev_scarta", { nome: nome(e.posto), carta: nomeCarta(tc, e.carta) });
    case "pozzetto":
      return t(e.diretta ? "ev_pozzettoDiretta" : "ev_pozzettoScarto", { nome: nome(e.posto) });
    case "burraco":
      return t("ev_burraco", { nome: nome(e.posto), tipo: t(`tipoBurraco_${e.tipoBurraco}` as Parameters<T>[0]) });
    case "chiusura":
      return t("ev_chiusura", { nome: nome(e.posto) });
    case "fineTallone":
      return t("ev_fineTallone");
    case "stallo":
      return t("ev_stallo");
    case "bot":
      return t("ev_bot", { nome: nome(e.posto) });
  }
}

export function Tavolo({ v, comandi }: { v: Vista; comandi: Comandi }) {
  const c = comandi;
  const t = usaT(dizionari);
  const tc = usaT(dizionariCarte);
  const [scelte, setScelte] = useState<number[]>([]);
  const [confermaChiusura, setConfermaChiusura] = useState(false);
  const nome = (p: number | null) => v.nomi.find((n) => n.posto === p)?.nome ?? "";
  const inMano = v.fase === "partita" && v.fineMano === null;
  const gioca = inMano && v.mioTurno && v.fasePasso === "giocare";
  const pesca = inMano && v.mioTurno && v.fasePasso === "pescare";
  const mia = v.miaSquadra;

  // Le carte scelte che non sono più in mano (calate, scartate) escono dalla scelta.
  const idsMano = useMemo(() => new Set(v.carte.map((x) => x.id)), [v.carte]);
  useEffect(() => {
    setScelte((s) => (s.every((id) => idsMano.has(id)) ? s : s.filter((id) => idsMano.has(id))));
  }, [idsMano]);
  useEffect(() => {
    if (!gioca) setConfermaChiusura(false);
  }, [gioca, scelte]);

  // Carte appena arrivate (pescata, monte, pozzetto): evidenziate finché non cambia di nuovo la mano.
  const precedenti = useRef<Set<number> | null>(null);
  const [nuove, setNuove] = useState<number[]>([]);
  const [avvisoPozzetto, setAvvisoPozzetto] = useState<number | null>(null);
  useEffect(() => {
    const prima = precedenti.current;
    precedenti.current = idsMano;
    if (!prima) return;
    const arrivate = v.carte.filter((x) => !prima.has(x.id)).map((x) => x.id);
    if (arrivate.length > 0) setNuove(arrivate);
    else if (v.carte.length < prima.size) setNuove([]);
    setAvvisoPozzetto(arrivate.length >= 11 && v.eventi.at(-1)?.tipo === "pozzetto" ? arrivate.length : null);
  }, [idsMano]); // eslint-disable-line react-hooks/exhaustive-deps

  const carteScelte = scelte.map((id) => v.carte.find((x) => x.id === id)).filter((x): x is Carta => x !== undefined);
  const lettura = carteScelte.length >= 3 ? leggi(carteScelte) : null;
  const ultimaCarta = v.carte.length === 1;
  const sqPresa = mia !== null && v.squadre[mia - 1]!.pozzettoPreso;
  const unaScelta = carteScelte.length === 1 ? carteScelte[0]! : null;
  const chiudeScartando = gioca && unaScelta !== null && ultimaCarta && sqPresa;

  const mie = v.combinazioni.filter((x) => x.squadra === mia);
  const loro = v.combinazioni.filter((x) => x.squadra !== mia);

  const stato = (() => {
    if (v.fase === "fine") return t("fineTitolo");
    if (v.fase === "fineMano") return t("fineManoTitolo");
    if (v.mioTurno) return v.fasePasso === "pescare" ? t("toccaATePesca") : t("toccaATeGioca");
    return t("toccaANome", { nome: nome(v.turno) });
  })();

  const nomeSquadra = (sq: number) =>
    mia !== null ? (sq === mia ? t("noi") : t("loro")) : v.nomi.filter((n) => n.squadra === sq).map((n) => n.nome).join(" · ");

  const cala = () => {
    if (carteScelte.length === 0) return;
    c.azione({ tipo: "cala", gruppi: [{ carte: scelte }] });
  };
  const attaccaA = (comb: Combinazione) => c.azione({ tipo: "cala", gruppi: [{ carte: scelte, su: comb.id }] });
  const scarta = () => {
    if (!unaScelta) return;
    if (chiudeScartando && !confermaChiusura) {
      setConfermaChiusura(true);
      return;
    }
    setConfermaChiusura(false);
    c.azione({ tipo: "scarta", carta: unaScelta.id });
  };
  const prendi = () => c.azione(v.pilaBloccata ? { tipo: "prendiPila", gruppo: scelte } : { tipo: "prendiPila" });

  const turnoGiocatore = v.nomi.find((n) => n.posto === v.turno);
  const attaccabili = gioca && carteScelte.length > 0 ? mie.filter((x) => attacca(x, carteScelte) !== null) : [];
  const combDiCarta = (id: number) => v.combinazioni.find((x) => x.posate.some((p) => p.carta.id === id));
  const colonne = (lista: readonly Combinazione[]) => lista.map((x) => x.posate.map((p) => p.carta));
  const etichettaCarta = (carta: Carta) => {
    const x = combDiCarta(carta.id);
    if (!x) return undefined;
    const posata = x.posate.find((p) => p.carta.id === carta.id);
    const base = posata?.matta ? t("cartaMatta", { carta: nomeCarta(tc, carta) }) : nomeCarta(tc, carta);
    const b = burraco(x);
    const dove = `${titoloComb(t, tc, x)}${b ? ` (${t(`burraco_${b}`)})` : ""}`;
    return attaccabili.includes(x) ? `${base}, ${dove}. ${t("attaccaQuiAria", { nome: dove })}` : `${base}, ${dove}`;
  };
  const attaccaDaCarta = (carta: Carta) => {
    const x = combDiCarta(carta.id);
    if (x && attaccabili.includes(x)) attaccaA(x);
  };

  // Gli altri in senso orario, a partire da chi gioca dopo di me (chi guarda senza giocare li vede tutti).
  const nGiocatori = v.nomi.length;
  const altri: PropsPostoGiocatore[] = [];
  for (let p = avanza(v.io ?? nGiocatori, nGiocatori), k = 0; k < (v.io === null ? nGiocatori : nGiocatori - 1); p = avanza(p, nGiocatori), k++) {
    const g = v.nomi.find((x) => x.posto === p);
    if (g)
      altri.push({
        nome: g.nome,
        carte: g.carte,
        diTurno: inMano && v.turno === g.posto,
        collegato: g.collegato,
        squadra: v.miaSquadra === null ? undefined : g.squadra === v.miaSquadra ? t("compagno") : t("avversario"),
      });
  }

  const azioni: AzioneTavolo[] = [];
  if (v.io !== null && inMano) {
    if (confermaChiusura && unaScelta) {
      azioni.push({ id: "si-chiudi", etichetta: t("siChiudiMano"), variante: "primaria", larga: false, onTocca: scarta });
      azioni.push({ id: "annulla", etichetta: t("annulla"), onTocca: () => setConfermaChiusura(false) });
    } else {
      azioni.push({ id: "pesca", etichetta: t("pesca"), variante: pesca ? "primaria" : "secondaria", larga: false, disabilitata: !pesca, onTocca: () => c.azione({ tipo: "pesca" }) });
      azioni.push({
        id: "prendi",
        etichetta: t("prendiMonte"),
        icona: <Layers size={18} />,
        disabilitata: !pesca || !v.possoPrendere || (v.pilaBloccata && scelte.length !== 2),
        onTocca: prendi,
      });
      azioni.push({ id: "cala", etichetta: t("cala"), variante: gioca && lettura ? "primaria" : "secondaria", larga: false, disabilitata: !gioca || !lettura, onTocca: cala });
      azioni.push({
        id: "scarta",
        etichetta: chiudeScartando ? t("chiudiMano") : t("scarta"),
        nomeAria: !chiudeScartando && unaScelta ? t("scartaAria", { carta: nomeCarta(tc, unaScelta) }) : undefined,
        variante: gioca && unaScelta ? "primaria" : "secondaria",
        larga: false,
        disabilitata: !gioca || !unaScelta,
        onTocca: scarta,
      });
      azioni.push({ id: "deseleziona", etichetta: t("deseleziona"), disabilitata: scelte.length === 0, onTocca: () => setScelte([]) });
    }
  }
  if (inMano && v.host && c.conBot && turnoGiocatore) {
    if (c.sollecita)
      azioni.push({ id: "sollecita", etichetta: t("sollecita", { nome: turnoGiocatore.nome }), icona: <Bell size={18} />, onTocca: c.sollecita });
    azioni.push({
      id: "bot",
      etichetta: t("botMossa", { nome: turnoGiocatore.nome }),
      icona: <Bot size={18} />,
      descrittaDa: "bu-bot-aiuto",
      onTocca: () => c.azione({ tipo: "mossaBot", posto: turnoGiocatore.posto }),
    });
  }

  return (
    <section className="schermata allineata bu-tavolo">
      <div className="bu-testa">
        <p className="muted bu-riga-mano">
          {t("manoN", { n: v.mano })} · {v.config.obiettivo === 0 ? t("unaSolaMano") : t("finoA", { n: v.config.obiettivo })}
        </p>
        <p className="bu-stato" role="status" aria-live="polite">
          {stato}
        </p>
      </div>

      <div className="bu-squadre">
        {[1, 2].map((sq) => (
          <div key={sq} className={`bu-squadra${sq === mia ? " bu-nostra" : ""}`}>
            <span className="bu-squadra-nome">{nomeSquadra(sq)}</span>
            <span className="bu-squadra-punti">{t("punti", { n: v.squadre[sq - 1]!.punti })}</span>
            <span className="bu-squadra-pozzetto">{v.squadre[sq - 1]!.pozzettoPreso ? t("pozzettoPreso") : t("pozzettoDaPrendere")}</span>
          </div>
        ))}
      </div>

      {(v.fase === "fineMano" || v.fase === "fine") && <FineMano c={c} v={v} nome={nome} nomeSquadra={nomeSquadra} />}

      {inMano && (
        <TavoloCarte posti={altri} disposizione="sopra">
          <ZonaCarte
            titolo={`${t("combinazioniLoro", { n: loro.length })}${t("combinazioniLoroBurraco", { n: loro.filter((x) => burraco(x) !== null).length })}`}
            disposizione="colonne"
            gruppi={colonne(loro)}
            vuota={t("nessunaCombinazione")}
            etichetta={etichettaCarta}
          />
          <ZonaCarte
            titolo={t("combinazioniNostre", { n: mie.length })}
            disposizione="colonne"
            gruppi={colonne(mie)}
            vuota={t("nessunaCombinazione")}
            evidenziate={attaccabili.flatMap((x) => x.posate.map((p) => p.carta.id))}
            etichetta={etichettaCarta}
            onTocca={attaccabili.length > 0 ? attaccaDaCarta : undefined}
          />
          <div className="bu-centro">
            <ZonaCarte titolo={t("tallone")} disposizione="pila" coperte={v.mazzo} dimensione="piccola" />
            <ZonaCarte titolo={t("monte")} disposizione="pila" carte={v.scarti} dimensione="piccola" vuota={t("monteVuoto")} />
            {v.scarti.length > 1 && (
              <PannelloInfo titolo={t("monte")}>
                <p className="muted bu-nota">{t("monteCarte", { n: v.scarti.length })}</p>
                <ul className="bu-monte">
                  {[...v.scarti].reverse().map((x) => (
                    <li key={x.id}>
                      <CartaGrafica carta={x} dimensione="mini" />
                    </li>
                  ))}
                </ul>
              </PannelloInfo>
            )}
          </div>
        </TavoloCarte>
      )}

      {inMano && attaccabili.length > 0 && <p className="muted bu-nota">{t("attaccaAiuto")}</p>}
      {inMano && v.pilaBloccata && (
        <p className="avviso">
          {t("monteBloccato")} {pesca && v.possoPrendere ? t("monteBloccatoScegli") : ""}
        </p>
      )}

      {avvisoPozzetto !== null && (
        <p className="avviso" role="status">
          {t("pozzettoArrivato", { n: avvisoPozzetto })}
        </p>
      )}

      {v.io !== null && (
        <Mano
          ventaglio
          carte={v.carte}
          selezione={scelte}
          onSeleziona={setScelte}
          ordineIniziale={leggiOrdine()}
          onOrdine={scriviOrdine}
          nuove={nuove}
          diTurno={inMano && v.mioTurno}
        />
      )}

      {v.io !== null && inMano && (
        <div className="bu-barra">
          <p className="bu-anteprima" aria-live="polite">
            {carteScelte.length === 0
              ? t("selezione", { n: 0 })
              : `${t("selezione", { n: carteScelte.length })} · ${
                  lettura ? testoAnteprima(t, tc, lettura) : carteScelte.length < 3 ? t("anteprimaPoche") : t("anteprimaNonValida")
                }`}
          </p>
          {v.vietata !== null && <p className="muted bu-nota">{t("nonRiscartare")}</p>}
          {confermaChiusura && unaScelta && <p className="bu-conferma">{t("chiudiConferma", { carta: nomeCarta(tc, unaScelta) })}</p>}
        </div>
      )}

      <BarraAzioni azioni={azioni} />
      {azioni.some((a) => a.id === "bot") && (
        <p className="muted bu-nota" id="bu-bot-aiuto">
          {t("botAiuto")}
        </p>
      )}

      {inMano && v.io !== null && turnoGiocatore && !turnoGiocatore.collegato && v.io !== v.turno && (
        <p className="avviso">{t("inAttesaDi", { nome: turnoGiocatore.nome })}</p>
      )}

      <RegistroEventi titolo={t("eventiTitolo")} voci={v.eventi.map((e) => testoEvento(t, tc, e, nome))} massimo={v.eventi.length} />
    </section>
  );
}

function FineMano({ c, v, nome, nomeSquadra }: { c: Comandi; v: Vista; nome: (p: number | null) => string; nomeSquadra: (sq: number) => string }) {
  const t = usaT(dizionari);
  const fine = v.fase === "fine";
  const r = v.ultima;
  const motivo = v.fineMano
    ? v.fineMano.motivo === "chiusura"
      ? t("motivo_chiusura", { nome: nome(v.fineMano.chi) })
      : t(v.fineMano.motivo === "tallone" ? "motivo_tallone" : "motivo_stallo")
    : "";
  const esito = (() => {
    if (!fine) return null;
    if (v.vincitore === null) return t("pareggio");
    if (v.miaSquadra !== null) return v.vincitore === v.miaSquadra ? t("vinciamo") : t("vincono");
    return t("vinceNome", { nome: nomeSquadra(v.vincitore) });
  })();
  const righe = ["calate", "burraco", "chiusura", "inMano", "pozzetto", "totale"] as const;
  return (
    <div className="bu-avviso">
      <h3>{fine ? t("fineTitolo") : t("fineManoTitolo")}</h3>
      {esito && <p className="bu-esito">{esito}</p>}
      {motivo && <p>{motivo}</p>}
      {r && (
        <table className="bu-punti">
          <caption className="muted">{t("tabellaPunti")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("voce")}</th>
              <th scope="col">{nomeSquadra(1)}</th>
              <th scope="col">{nomeSquadra(2)}</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((k) => (
              <tr key={k} className={k === "totale" ? "bu-riga-totale" : undefined}>
                <th scope="row">{t(`riga_${k}`)}</th>
                <td>{r[0][k]}</td>
                <td>{r[1][k]}</td>
              </tr>
            ))}
            <tr className="bu-riga-totale">
              <th scope="row">{t("riga_partita")}</th>
              <td>{v.squadre[0].punti}</td>
              <td>{v.squadre[1].punti}</td>
            </tr>
          </tbody>
        </table>
      )}
      {v.host ? (
        <button className="btn primario" onClick={() => c.azione({ tipo: fine ? "ricomincia" : "prossimaMano" })}>
          {fine ? t("ricomincia") : t("prossimaMano")}
        </button>
      ) : (
        <p className="muted">{fine ? t("aspettoRicomincia") : t("aspettoProssima")}</p>
      )}
    </div>
  );
}
