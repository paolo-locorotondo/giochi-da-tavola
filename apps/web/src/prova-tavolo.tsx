/**
 * PROVA del tavolo comune: dati finti per Scopa, Burraco e Ultima!, con i componenti veri di `@gdt/carte/tavolo`.
 * Solo sviluppo (`pnpm dev`, /prova-tavolo.html). Nessuna regola di gioco: serve a vedere layout, tema e tocco a 375 px.
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Mano, type Carta } from "@gdt/carte";
import { BarraAzioni, PannelloInfo, RegistroEventi, SegnapostoPosa, TavoloCarte, ZonaCarte } from "@gdt/carte/tavolo";
import "./tema.css";
import "./index.css";

let n = 0;
const c = (valore: number, seme: Carta["seme"] = "cuori"): Carta => ({ id: ++n, seme, valore, mazzo: "francese" } as Carta);
const jolly = (): Carta => ({ id: ++n, seme: null, valore: 0, mazzo: "francese" } as Carta);

function Intestazione({ titolo, tema, setTema }: { titolo: string; tema: string; setTema: () => void }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <h2 style={{ margin: 0, fontFamily: "var(--font-titoli)" }}>{titolo}</h2>
      <button type="button" className="cg-azione" onClick={setTema} style={{ padding: "0 12px" }}>
        Tema: {tema === "dark" ? "scuro" : "chiaro"}
      </button>
    </header>
  );
}

function Scopa() {
  const [sel, setSel] = useState<number[]>([]);
  const [terra] = useState([c(1, "quadri"), c(2, "fiori"), c(6, "picche"), c(7, "cuori")]);
  const [mano] = useState([c(7, "quadri"), c(3, "picche"), c(12, "fiori")]);
  const [selMano, setSelMano] = useState<number[]>([]);
  return (
    <>
      <TavoloCarte posti={[{ nome: "Bot 1", carte: 1, punti: "4 punti" }]}>
        <ZonaCarte titolo="A terra" carte={terra} selezione={sel} onSeleziona={setSel} dimensione="piccola" />
        <SegnapostoPosa onTocca={() => {}} />
      </TavoloCarte>
      <Mano
        carte={mano}
        selezione={selMano}
        onSeleziona={(s) => setSelMano(s.slice(-1))}
        multipla={false}
        riordino={false}
        diTurno
        riepilogo="Mazzo: 18 carte · 9 prese · nessuna scopa"
      />
      <BarraAzioni
        azioni={[
          { id: "annulla", etichetta: "Annulla", onTocca: () => setSel([]) },
          { id: "conferma", etichetta: "Conferma", variante: "primaria", onTocca: () => {} },
        ]}
      />
      <RegistroEventi voci={["Bot 1 posa il Sei di picche", "Tu prendi il Sette di cuori"]} />
    </>
  );
}

function Burraco() {
  const [mano] = useState([c(1), c(2), c(3), c(4), c(5), c(6), c(7), c(8), c(9), c(11, "fiori"), c(12, "picche")]);
  const [sel, setSel] = useState<number[]>([]);
  return (
    <>
      <TavoloCarte
        disposizione="sopra"
        posti={[{ nome: "Bruno", carte: 11 }, { nome: "Carla", carte: 11, squadra: "compagna" }, { nome: "Dario", carte: 11 }]}
      >
        <ZonaCarte
          titolo="Loro · 0 punti"
          disposizione="colonne"
          gruppi={[[c(5, "picche"), c(6, "picche"), jolly(), c(8, "picche")], [c(9, "cuori"), c(9, "fiori"), c(9, "picche")]]}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 8 }}>
          <ZonaCarte titolo="Mazzo" disposizione="pila" coperte={41} />
          <ZonaCarte titolo="Scarti" disposizione="pila" carte={[c(3), c(13, "quadri")]} />
          <PannelloInfo titolo="Scarti">
            <ZonaCarte titolo="Tutti gli scarti" carte={[c(3), c(13, "quadri")]} />
          </PannelloInfo>
        </div>
        <ZonaCarte
          titolo="Noi · 0 punti"
          disposizione="colonne"
          gruppi={[[c(10, "cuori"), c(11, "cuori"), c(12, "cuori"), c(13, "cuori")]]}
        />
      </TavoloCarte>
      <Mano carte={mano} selezione={sel} onSeleziona={setSel} ventaglio diTurno />
      <BarraAzioni
        azioni={[
          { id: "cala", etichetta: "Cala", variante: "primaria", onTocca: () => {} },
          { id: "scarta", etichetta: "Scarta", onTocca: () => {} },
          { id: "sollecita", etichetta: "Sollecita", onTocca: () => {} },
          { id: "bot", etichetta: "Simula mossa col bot", onTocca: () => {} },
        ]}
      />
      <RegistroEventi voci={["Dario scarta il Re di quadri"]} />
    </>
  );
}

function Ultima() {
  const [mano] = useState([c(3), c(5, "picche"), c(7, "fiori"), c(2, "quadri"), c(9), c(1, "picche"), c(4, "fiori")]);
  const [sel, setSel] = useState<number[]>([]);
  const posti = [
    { nome: "Bea", carte: 7 },
    { nome: "Ciro", carte: 5 },
    { nome: "Dina", carte: 1, diTurno: true },
    { nome: "Elia", carte: 4 },
    { nome: "Gigi", carte: 8 },
  ];
  return (
    <>
      <TavoloCarte posti={posti}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <ZonaCarte titolo="Mazzo" disposizione="pila" coperte={30} />
          <ZonaCarte titolo="Scoperta" disposizione="pila" carte={[c(7, "cuori")]} />
        </div>
      </TavoloCarte>
      <Mano carte={mano} selezione={sel} onSeleziona={(s) => setSel(s.slice(-1))} multipla={false} ventaglio diTurno />
      <BarraAzioni
        azioni={[
          { id: "ultima", etichetta: "Ultima!", variante: "primaria", onTocca: () => {} },
          { id: "passa", etichetta: "Passa", onTocca: () => {} },
        ]}
      />
    </>
  );
}

function Dieci() {
  // 10 giocatori: tu in basso (la mano) e 9 avversari intorno al tavolo.
  const nomi = ["Bea", "Ciro", "Dina", "Elia", "Gigi", "Hana", "Igor", "Lia", "Marco"];
  const posti = nomi.map((nome, i) => ({ nome, carte: (i % 4) + 1, diTurno: i === 2 }));
  return (
    <>
      <TavoloCarte posti={posti}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <ZonaCarte titolo="Mazzo" disposizione="pila" coperte={20} />
          <ZonaCarte titolo="Scoperta" disposizione="pila" carte={[c(7, "cuori")]} />
        </div>
      </TavoloCarte>
      <Mano carte={[c(3), c(5, "picche"), c(7, "fiori")]} selezione={[]} onSeleziona={() => {}} ventaglio diTurno />
    </>
  );
}

function Prova() {
  const [tema, setTema] = useState(document.documentElement.getAttribute("data-tema") ?? "dark");
  const cambia = () => {
    const nuovo = tema === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-tema", nuovo);
    setTema(nuovo);
  };
  const [quale, setQuale] = useState(new URLSearchParams(location.search).get("gioco") ?? "scopa");
  const scegli = (g: string) => {
    history.replaceState(null, "", `?gioco=${g}`);
    setQuale(g);
  };
  return (
    <main style={{ display: "grid", gap: 12, padding: "12px 16px 32px", maxWidth: 480, margin: "0 auto" }}>
      <Intestazione titolo="Prova tavolo" tema={tema} setTema={cambia} />
      <div className="cg-azioni">
        {["scopa", "burraco", "ultima", "dieci"].map((g) => (
          <button key={g} type="button" className={`cg-azione ${quale === g ? "cg-azione-primaria" : ""}`} onClick={() => scegli(g)}>
            {g === "scopa" ? "Scopa a 2" : g === "burraco" ? "Burraco a 4" : g === "ultima" ? "Ultima! a 6" : "Tavolo a 10"}
          </button>
        ))}
      </div>
      {quale === "burraco" ? <Burraco /> : quale === "ultima" ? <Ultima /> : quale === "dieci" ? <Dieci /> : <Scopa />}
      <TavoloCarte posti={[{ nome: "Posto con nome molto lungo da andare a capo", carte: 3, collegato: false, squadra: "Squadra 2" }]} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Prova />
  </StrictMode>,
);
