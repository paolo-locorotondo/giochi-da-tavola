import { useEffect, useState } from "react";
import { Bell, Bot } from "lucide-react";
import { Mano, dizionariCarte, nomeCarta, type Carta } from "@gdt/carte";
import { BarraAzioni, RegistroEventi, SegnapostoPosa, TavoloCarte, ZonaCarte, type AzioneTavolo, type PropsPostoGiocatore } from "@gdt/carte/tavolo";
import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import { avanza } from "../logica";
import type { Vista } from "../online";
import { Riepilogo, nomeSquadra } from "./Riepilogo";
import { carteDiPresa, presaPronta, toccaTavolo } from "./composizione";
import { testoEvento } from "./testoEvento";

/** Cosa può fare il tavolo: online passa dal server, offline dalla partita sul telefono. */
export interface Comandi {
  azione: (a: Record<string, unknown>) => void;
  /** Solo online: l'organizzatore sollecita chi è di turno. */
  sollecita?: () => void;
  /** Solo online: l'organizzatore vede «Simula mossa col bot». */
  conBot?: boolean;
}

/**
 * Gli altri giocatori in senso orario, partendo da chi gioca dopo di me (alla mia sinistra). Chi guarda senza giocare
 * li vede tutti, dal posto 1.
 */
function altriInGiro(v: Vista): Vista["nomi"] {
  const n = v.nomi.length;
  const rif = v.io ?? n;
  const giro: Vista["nomi"] = [];
  for (let p = avanza(rif, n), k = 0; k < (v.io === null ? n : n - 1); p = avanza(p, n), k++) {
    const g = v.nomi.find((x) => x.posto === p);
    if (g) giro.push(g);
  }
  return giro;
}

/**
 * Il tavolo di Scopa sul tavolo comune di `@gdt/carte/tavolo`. Una mossa: tocchi una carta della mano, poi sul tavolo
 * le carte da prendere una a una e «Conferma» (oppure «Posa qui» se la carta non prende niente). «Annulla» o Esc
 * lasciano la carta in mano. La mossa parte solo se è lecita: lo controllano `composizione.ts` e il server.
 */
export function Tavolo({ v, comandi }: { v: Vista; comandi: Comandi }) {
  const c = comandi;
  const t = usaT(dizionari);
  const tc = usaT(dizionariCarte);
  /** La carta della mano scelta col primo tocco. */
  const [sceltaId, setSceltaId] = useState<number | null>(null);
  /** Le carte a terra toccate finora per comporre la presa. */
  const [toccate, setToccate] = useState<number[]>([]);
  /** Messaggio breve dopo un tocco che non vale (carta a terra non prendibile). */
  const [rifiuto, setRifiuto] = useState(false);
  const nome = (p: number | null) => v.nomi.find((n) => n.posto === p)?.nome ?? "";
  const inRound = v.fase === "partita" && v.riepilogo === null;
  const scelta = v.mioTurno ? (v.mano.find((x) => x.id === sceltaId) ?? null) : null;

  const azzera = () => {
    setSceltaId(null);
    setToccate([]);
    setRifiuto(false);
  };

  // Se il turno passa (o la carta non è più in mano), la scelta in sospeso non vale più.
  useEffect(() => {
    if (!scelta && sceltaId !== null) azzera();
  }, [scelta, sceltaId]);

  // «Annulla» anche con il tasto Esc.
  useEffect(() => {
    if (!scelta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && azzera();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [scelta]);

  const combinazioni = scelta ? (v.prese[scelta.id] ?? []) : [];
  const prendibili = carteDiPresa(combinazioni);
  const pronta = presaPronta(combinazioni, toccate);

  /** Primo tocco: una carta della mano. Toccarla di nuovo annulla; un'altra la sostituisce. */
  const scegli = (selezione: number[]) => {
    if (!v.mioTurno) return;
    setToccate([]);
    setRifiuto(false);
    setSceltaId(selezione[0] ?? null);
  };
  const gioca = (presa?: number[]) => {
    if (!scelta) return;
    c.azione(presa ? { tipo: "gioca", carta: scelta.id, presa } : { tipo: "gioca", carta: scelta.id });
    azzera();
  };
  /** Tocchi successivi: le carte a terra, una alla volta. La mossa parte con «Conferma». */
  const toccaTerra = (carta: Carta) => {
    if (!scelta) return;
    const esito = toccaTavolo(combinazioni, toccate, carta.id);
    if (esito.tipo === "parziale") {
      setToccate(esito.toccate);
      setRifiuto(false);
    } else setRifiuto(true);
  };

  const io = v.nomi.find((n) => n.posto === v.io);
  const turnoGiocatore = v.nomi.find((n) => n.posto === v.turno);
  const a4 = v.nomi.length === 4;

  const stato = (() => {
    if (!inRound) return v.fase === "fine" ? t("fineTitolo") : t("fineRoundTitolo");
    return v.mioTurno ? t("toccaATe") : t("toccaANome", { nome: nome(v.turno) });
  })();

  const posti: PropsPostoGiocatore[] = altriInGiro(v).map((n) => ({
    nome: n.nome,
    carte: inRound ? n.carte : 0,
    diTurno: inRound && v.turno === n.posto,
    collegato: n.collegato,
    squadra: a4 && v.miaSquadra !== null ? (n.squadra === v.miaSquadra ? t("compagno") : t("avversario")) : undefined,
    punti: inRound ? `${t("preseBreve", { n: n.prese })} · ${t("scopeBreve", { n: n.scope })}` : t("scopeBreve", { n: n.scope }),
  }));

  const aiuto = (() => {
    if (!inRound || v.io === null) return null;
    if (!v.mioTurno) return t("aspettaTurno");
    if (!scelta) return t("toccaUnaCarta");
    if (rifiuto) return t("nonPrendibile");
    if (combinazioni.length === 0) return t("presaNessuna");
    if (pronta) return t("presaPronta");
    return combinazioni.length === 1 ? t("presaUna") : t("presaAiuto");
  })();

  const azioni: AzioneTavolo[] = [];
  if (inRound && scelta) {
    azioni.push({ id: "annulla", etichetta: t("annulla"), onTocca: azzera });
    if (combinazioni.length > 0)
      azioni.push({ id: "conferma", etichetta: t("conferma"), variante: "primaria", larga: false, disabilitata: !pronta, onTocca: () => pronta && gioca(pronta) });
  }
  if (inRound && v.host && c.conBot && turnoGiocatore) {
    if (c.sollecita)
      azioni.push({ id: "sollecita", etichetta: t("sollecita", { nome: turnoGiocatore.nome }), icona: <Bell size={18} />, onTocca: c.sollecita });
    azioni.push({
      id: "bot",
      etichetta: t("botMossa", { nome: turnoGiocatore.nome }),
      icona: <Bot size={18} />,
      descrittaDa: "sc-bot-aiuto",
      onTocca: () => c.azione({ tipo: "mossaBot", posto: turnoGiocatore.posto }),
    });
  }

  return (
    <section className="schermata allineata sc-tavolo">
      <div className="sc-testa">
        <p className="sc-stato" role="status" aria-live="polite">
          {stato}
        </p>
        <p className="sc-sotto">
          {t("round", { n: v.round })}
          {inRound && ` · ${t("manoDi", { n: v.mani.corrente, tot: v.mani.totale })}`}
        </p>
        <Punteggio v={v} />
      </div>

      {!inRound && v.riepilogo && <Riepilogo v={v} comandi={c} />}

      {inRound && (
        <TavoloCarte posti={posti}>
          <ZonaCarte
            titolo={t("aTerra")}
            carte={v.tavolo}
            dimensione="normale"
            vuota={t("tavoloVuoto")}
            selezione={toccate}
            evidenziate={[...prendibili]}
            etichetta={(x) => (prendibili.has(x.id) ? t("puoiPrenderla", { carta: nomeCarta(tc, x) }) : undefined)}
            onTocca={scelta ? toccaTerra : undefined}
          />
          {scelta && combinazioni.length === 0 && <SegnapostoPosa onTocca={() => gioca()} />}
        </TavoloCarte>
      )}

      {v.io !== null && inRound && (
        <Mano
          carte={v.mano}
          selezione={scelta ? [scelta.id] : []}
          onSeleziona={scegli}
          multipla={false}
          riordino={false}
          disabilitata={() => !v.mioTurno}
          diTurno={v.mioTurno}
          riepilogo={io && `${t("mazzo", { n: v.mazzo })} · ${t("preseN", { n: io.prese })} · ${t("scopeN", { n: io.scope })}`}
        />
      )}

      {aiuto && (
        <p className={rifiuto ? "sc-rifiuto" : "muted sc-aiuto"} role="status" aria-live="polite">
          {aiuto}
        </p>
      )}

      <BarraAzioni azioni={azioni} />
      {azioni.some((a) => a.id === "bot") && (
        <p className="muted sc-aiuto" id="sc-bot-aiuto">
          {t("botAiuto")}
        </p>
      )}

      {inRound && v.io !== null && turnoGiocatore && !turnoGiocatore.collegato && v.io !== v.turno && (
        <p className="avviso">{t("inAttesaDi", { nome: turnoGiocatore.nome })}</p>
      )}

      <RegistroEventi titolo={t("eventiTitolo")} voci={v.eventi.map((e) => testoEvento(t, tc, e, nome))} massimo={v.eventi.length} />
    </section>
  );
}

/** Punti della partita per squadra, con la soglia. */
function Punteggio({ v }: { v: Vista }) {
  const t = usaT(dizionari);
  return (
    <p className="sc-punteggio" aria-label={t("punteggio")}>
      {([0, 1] as const).map((sq) => (
        <span key={sq} className={`sc-punti${v.miaSquadra === sq ? " sc-mia" : ""}`}>
          {t("puntiSquadra", { nome: nomeSquadra(t, v, sq), n: v.punti[sq] })}
        </span>
      ))}
      <span className="sc-soglia">({t("aSoglia", { soglia: v.config.soglia })})</span>
    </p>
  );
}
