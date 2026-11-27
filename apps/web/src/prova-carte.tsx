/**
 * PROVA dei giochi di carte, solo sviluppo (`pnpm dev`, /prova-carte.html). Non è nella build: vite.config.ts parte
 * solo da index.html, e packages/engine/src/prova-fuori-dalla-build.test.ts controlla che nessun file dell'app importi
 * i moduli di prova.
 *
 * Burraco: si sceglie la situazione (mani, combinazioni calate, scarti, turno, pozzetti) e si gioca con il tavolo vero e
 * le regole vere; i bot muovono da soli quando tocca a loro. Ci sono alcuni casi pronti da caricare con un tocco.
 */
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { usaT } from "@gdt/i18n";
import {
  IO,
  Tavolo,
  dizionari,
  testoMessaggio,
  agisci,
  botDiTurno,
  muoviBot,
  partitaDiProva,
  vistaLocale,
  type DescrizioneProva,
  type PartitaLocale,
} from "@gdt/burraco/prova";
import "./tema.css";
import "./index.css";

/** Casi pronti: ognuno ricrea una situazione da provare. */
const CASI: Record<string, { titolo: string; d: DescrizioneProva }> = {
  stallo: {
    titolo: "Stallo in chiusura (pozzetto preso, nessun burraco)",
    d: {
      giocatori: 2,
      mani: ["jc 10q", "3f 4f 5f 8p 9p kq"],
      combinazioni: "1: scala cuori 6-10\n1: 8q 9q 2f jq qq",
      scarti: "4c 9f",
      turno: 1,
      fase: "giocare",
      pozzettiPresi: [true, false],
    },
  },
  matta: {
    titolo: "Matta che scorre (2♥ 3♥ 2♥ + 4♥, 3♦ 2♦ 5♦ 6♦ + 4♦)",
    d: {
      giocatori: 2,
      mani: ["4c 4q 6c 8q kf 9p", "3f 4f 5f 8p 9p kq"],
      combinazioni: "1: 2c 3c 2c\n1: 3q 2q 5q 6q",
      scarti: "9f",
      turno: 1,
      fase: "giocare",
      pozzettiPresi: [false, false],
    },
  },
  tanti: {
    titolo: "Tanti tris e scale lunghe, a 4",
    d: {
      giocatori: 4,
      mani: ["3c 5f 4q 8p jf qp kp ac 2f 10f", "3p 4p 6p 9p kf 7f 8f 10p", "5q 6q 3f", "jq qq kq 5c"],
      // Ogni carta c'è due volte nel doppio mazzo (i jolly quattro): i tris usano tre semi, le scale un solo seme.
      combinazioni: [
        "1: scala cuori 3-9",
        "1: scala quadri 7-13 +j",
        "1: tris 7",
        "1: tris 9 +j",
        "2: scala picche 1-13 +j",
        "2: tris 4",
        "2: tris 8",
        "2: tris 10",
        "2: scala fiori 2-6",
      ].join("\n"),
      scarti: "6c 2p 10c kc 3q 2c 7p qf",
      turno: 1,
      fase: "pescare",
      pozzettiPresi: [false, false],
    },
  },
};

function Campo({ etichetta, valore, onCambia, righe = 2 }: { etichetta: string; valore: string; onCambia: (v: string) => void; righe?: number }) {
  return (
    <label className="campo">
      {etichetta}
      <textarea rows={righe} value={valore} onChange={(e) => onCambia(e.target.value)} spellCheck={false} />
    </label>
  );
}

function Burraco() {
  const t = usaT(dizionari);
  const [d, setD] = useState<DescrizioneProva>(CASI.stallo!.d);
  const [partita, setPartita] = useState<PartitaLocale | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [mossa, setMossa] = useState<string | null>(null);
  const cambia = <K extends keyof DescrizioneProva>(k: K, v: DescrizioneProva[K]) => setD((x) => ({ ...x, [k]: v }));

  const prepara = (descrizione: DescrizioneProva) => {
    try {
      setPartita(partitaDiProva(descrizione));
      setErrore(null);
      setMossa(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => prepara(d), []); // eslint-disable-line react-hooks/exhaustive-deps

  // I bot muovono da soli, uno alla volta.
  useEffect(() => {
    if (!partita || botDiTurno(partita) === null) return;
    const id = setTimeout(() => setPartita((p) => (p ? muoviBot(p) : p)), 700);
    return () => clearTimeout(id);
  }, [partita]);

  const v = useMemo(() => (partita ? vistaLocale(partita) : null), [partita]);
  const azione = (a: Record<string, unknown>) => {
    if (!partita) return;
    try {
      setPartita(agisci(partita, a as { tipo: string }, () => 1));
      setMossa(null);
    } catch (e) {
      setMossa(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <main className="app" style={{ display: "grid", gap: 12, alignContent: "start" }}>
      <h2 style={{ margin: 0, fontFamily: "var(--font-titoli)" }}>Prova Burraco</h2>
      <div className="azioni">
        {Object.entries(CASI).map(([k, c]) => (
          <button
            key={k}
            type="button"
            className="btn"
            onClick={() => {
              setD(c.d);
              prepara(c.d);
            }}
          >
            {c.titolo}
          </button>
        ))}
      </div>
      <details className="accordion">
        <summary>Situazione (modifica e tocca «Prepara»)</summary>
        <div className="accordion-corpo" style={{ display: "grid", gap: 8 }}>
          <p className="muted" style={{ margin: 0 }}>
            Carte: valore e seme, separate da spazi: «7c» (cuori), «aq» (quadri), «10f» (fiori), «kp» (picche), «j» jolly.
            Combinazioni: una per riga con la squadra, «1: tris 9», «2: tris 9 +j», «1: scala cuori 3-9», oppure le carte («1: 2c 3c 2c»).
          </p>
          <label className="campo">
            Giocatori
            <select value={d.giocatori} onChange={(e) => cambia("giocatori", Number(e.target.value) as 2 | 4)}>
              <option value={2}>2</option>
              <option value={4}>4 (tu e il compagno contro due bot)</option>
            </select>
          </label>
          {Array.from({ length: d.giocatori }, (_, i) => (
            <Campo
              key={i}
              etichetta={i === 0 ? "La tua mano (posto 1)" : `Mano del posto ${i + 1}${d.giocatori === 4 && i === 2 ? " (compagno)" : ""}`}
              valore={d.mani[i] ?? ""}
              onCambia={(x) => cambia("mani", Object.assign([...d.mani], { [i]: x }))}
            />
          ))}
          <Campo etichetta="Combinazioni calate" valore={d.combinazioni} onCambia={(x) => cambia("combinazioni", x)} righe={5} />
          <Campo etichetta="Scarti (dal fondo alla cima)" valore={d.scarti} onCambia={(x) => cambia("scarti", x)} />
          <label className="campo">
            Turno di
            <select value={d.turno} onChange={(e) => cambia("turno", Number(e.target.value))}>
              {Array.from({ length: d.giocatori }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i === 0 ? "te (posto 1)" : `posto ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            Fase
            <select value={d.fase} onChange={(e) => cambia("fase", e.target.value as "pescare" | "giocare")}>
              <option value="pescare">Deve pescare</option>
              <option value="giocare">Ha già pescato: cala o scarta</option>
            </select>
          </label>
          <label className="spunta">
            <input type="checkbox" checked={d.pozzettiPresi[0]} onChange={(e) => cambia("pozzettiPresi", [e.target.checked, d.pozzettiPresi[1]])} />
            Squadra 1 (tu) ha già preso il pozzetto
          </label>
          <label className="spunta">
            <input type="checkbox" checked={d.pozzettiPresi[1]} onChange={(e) => cambia("pozzettiPresi", [d.pozzettiPresi[0], e.target.checked])} />
            Squadra 2 ha già preso il pozzetto
          </label>
          <button type="button" className="btn primario" onClick={() => prepara(d)}>
            Prepara
          </button>
          {errore && <p className="errore">{errore}</p>}
        </div>
      </details>
      {v && <Tavolo v={v} comandi={{ azione, errore: mossa ? testoMessaggio(t, mossa) : null }} />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Burraco />
  </StrictMode>,
);

export { IO };
