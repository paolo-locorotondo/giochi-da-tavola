import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import {
  anteprimaDi,
  avviaSala,
  creaStanza,
  entraVeloce,
  eseguiAzione,
  mancantiDi,
  nuovoCodice,
  nuovoToken,
  vistaDi,
  vistaSalaDi,
  type DaClient,
  type DaServer,
  type Stanza,
} from "./stanze";
import { comando, esci, tick, type Effetto } from "./veloce";

/**
 * Server di gioco: serve l'app (cartella `STATIC_DIR`) e tiene le partite via WebSocket su `/ws`.
 * È lo stesso programma sul PC (docker compose up) e su un hosting online.
 */

const PORTA = Number(process.env.PORT ?? 8080);
const STATICI = resolve(process.env.STATIC_DIR ?? "../web/dist");
/** Impostato da `pnpm dev` (src/dev.ts): il sito lo serve Vite, questo processo tiene solo le partite. */
const SOLO_SERVER = process.env.SOLO_SERVER === "1";
const ORE_INATTIVITA = 6;
const MAX_STANZE = 300;
const MAX_BYTE_MESSAGGIO = 4096;
const MAX_NOMI = 60;

const stanze = new Map<string, Stanza>();
/** Connessioni aperte per stanza: token → socket. Più schede dello stesso browser condividono il token. */
const connessioni = new Map<string, Map<string, Set<WebSocket>>>();

const eConnesso = (codice: string) => (token: string) => (connessioni.get(codice)?.get(token)?.size ?? 0) > 0;

const TIPI: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const http = createServer((req, res) => {
  const percorso = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
  if (percorso === "/salute") {
    res.writeHead(200, { "content-type": "text/plain" }).end("ok");
    return;
  }
  if (SOLO_SERVER && percorso === "/sw.js") {
    // Se su questa porta è stato installato in passato il sito (service worker), qui si rimuove da solo.
    res
      .writeHead(200, { "content-type": "text/javascript", "cache-control": "no-cache" })
      .end(
        "self.addEventListener('install',()=>self.skipWaiting());" +
          "self.addEventListener('activate',e=>e.waitUntil((async()=>{" +
          "for(const k of await caches.keys())await caches.delete(k);" +
          "await self.registration.unregister();" +
          "for(const c of await self.clients.matchAll({type:'window'}))c.navigate(c.url);})()));",
      );
    return;
  }
  if (SOLO_SERVER) {
    // `pnpm dev`: qui non c'è il sito (è su Vite), solo le partite via WebSocket.
    res
      .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
      .end("Questo è solo il server di gioco (pnpm dev). Il sito è su http://localhost:5173");
    return;
  }
  let file = normalize(join(STATICI, percorso));
  if (!file.startsWith(STATICI)) {
    res.writeHead(403).end();
    return;
  }
  // Single Page Application: ogni indirizzo che non è un file riceve index.html.
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(STATICI, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end("App non trovata: esegui prima pnpm build");
    return;
  }
  const ext = extname(file);
  res.writeHead(200, {
    "content-type": TIPI[ext] ?? "application/octet-stream",
    "cache-control": ext === ".html" || file.endsWith("sw.js") ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server: http, path: "/ws", maxPayload: MAX_BYTE_MESSAGGIO });

function invia(ws: WebSocket, m: DaServer) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
}

function aggiornaTutti(stanza: Stanza) {
  const connesso = eConnesso(stanza.codice);
  const ora = Date.now();
  for (const [token, socket] of connessioni.get(stanza.codice) ?? []) {
    const m: DaServer = stanza.sala
      ? { t: "salaVeloce", sala: vistaSalaDi(stanza, token, ora, connesso) }
      : { t: "vista", vista: vistaDi(stanza, token, connesso) };
    for (const ws of socket) invia(ws, m);
  }
}

function inviaA(codice: string, token: string, m: DaServer) {
  for (const ws of connessioni.get(codice)?.get(token) ?? []) invia(ws, m);
}

function chiudiStanza(stanza: Stanza, m: DaServer | null) {
  if (m) for (const socket of connessioni.get(stanza.codice)?.values() ?? []) for (const w of socket) invia(w, m);
  stanze.delete(stanza.codice);
  connessioni.delete(stanza.codice);
}

/** Esegue ciò che chiede la sala d'attesa veloce dopo un'operazione o un passo del tempo. */
function applicaEffetto(stanza: Stanza, effetto: Effetto) {
  if (effetto.t === "niente") return;
  if (effetto.t === "chiudi") {
    chiudiStanza(stanza, effetto.motivo === "vuota" ? null : { t: "fuoriSala", motivo: effetto.motivo });
    return;
  }
  if (effetto.t === "avvia") {
    try {
      avviaSala(stanza);
    } catch (e) {
      // Non dovrebbe succedere (il gioco accetta la sua config): si chiude invece di restare a metà.
      chiudiStanza(stanza, { t: "errore", messaggio: e instanceof Error ? e.message : "sconosciuto" });
      return;
    }
  } else if (stanza.sala) {
    // L'organizzatore della sala è il primo arrivato rimasto.
    stanza.tokenHost = stanza.sala.arrivati[0]!.token;
  }
  stanza.ultimaAttivita = Date.now();
  aggiornaTutti(stanza);
}

function collega(ws: WebSocket, stanza: Stanza, token: string) {
  let mappa = connessioni.get(stanza.codice);
  if (!mappa) connessioni.set(stanza.codice, (mappa = new Map()));
  // Più connessioni con lo stesso token (due schede dello stesso browser) convivono:
  // chiudere la vecchia le faceva rimbalzare all'infinito ("Connessione al server…").
  let insieme = mappa.get(token);
  if (!insieme) mappa.set(token, (insieme = new Set()));
  insieme.add(ws);
  if (!stanza.telefoni.has(token)) stanza.telefoni.set(token, null);
  invia(ws, { t: "benvenuto", codice: stanza.codice, token });
  aggiornaTutti(stanza);
}

wss.on("connection", (ws) => {
  let stanza: Stanza | null = null;
  let token = "";
  let vivo = true;
  ws.on("pong", () => (vivo = true));
  const battito = setInterval(() => {
    if (!vivo) return ws.terminate();
    vivo = false;
    ws.ping();
  }, 25_000);

  ws.on("message", (dati) => {
    let m: DaClient;
    try {
      m = JSON.parse(String(dati)) as DaClient;
    } catch {
      return;
    }
    // La stanza può essere stata chiusa da un altro telefono (o dal tempo, per le sale veloci).
    if (stanza && !stanze.has(stanza.codice)) stanza = null;
    try {
      switch (m.t) {
        case "crea": {
          if (stanze.size >= MAX_STANZE) throw new Error("serverPieno");
          if (!Array.isArray(m.nomi) || m.nomi.length > MAX_NOMI) throw new Error(`maxGiocatori:${MAX_NOMI}`);
          token = nuovoToken();
          const codice = nuovoCodice(stanze);
          stanza = creaStanza(codice, m.nomi, m.config, token, m.gioco);
          stanze.set(codice, stanza);
          collega(ws, stanza, token);
          break;
        }
        case "entra": {
          const s = stanze.get(String(m.codice).toUpperCase());
          if (!s) throw new Error("partitaNonTrovata");
          // Sala d'attesa veloce: rientra solo chi c'era già (con il suo token).
          if (s.sala && !(typeof m.token === "string" && s.sala.arrivati.some((a) => a.token === m.token))) throw new Error("stanzaVeloce");
          stanza = s;
          // Il token vale solo se la stanza lo conosce: uno sconosciuto ne riceve uno nuovo.
          token = typeof m.token === "string" && s.telefoni.has(m.token) ? m.token : nuovoToken();
          collega(ws, s, token);
          break;
        }
        case "anteprimaVeloce":
          invia(ws, { t: "anteprima", gioco: String(m.gioco), sala: anteprimaDi(stanze, String(m.gioco)) });
          break;
        case "veloce":
        case "coda": {
          if (stanza) throw new Error(stanza.sala ? "giaInSala" : "giaInPartita");
          const gioco = typeof m.gioco === "string" ? m.gioco : "impostore";
          const opz = m.t === "veloce" ? { codice: m.codice, apri: m.apri } : {};
          const nuovo = nuovoToken();
          let esito: ReturnType<typeof entraVeloce>;
          try {
            esito = entraVeloce(stanze, gioco, nuovo, m.nome, opz, Date.now(), MAX_STANZE);
          } catch (e) {
            // La stanza vista prima è cambiata: si manda l'errore e la situazione di adesso.
            const motivo = e instanceof Error ? e.message : "";
            if (motivo === "salaCambiata" || motivo === "salaApertaNelFrattempo") {
              invia(ws, { t: "errore", messaggio: motivo });
              invia(ws, { t: "anteprima", gioco, sala: anteprimaDi(stanze, gioco) });
              break;
            }
            throw e;
          }
          stanza = esito.stanza;
          token = nuovo;
          // Prima il collegamento (benvenuto e token salvato), poi l'eventuale avvio con tutti.
          collega(ws, stanza, token);
          applicaEffetto(stanza, esito.effetto);
          if (!stanze.has(stanza.codice)) stanza = null;
          break;
        }
        case "esciDaSala":
        case "esciDaCoda": {
          if (!stanza?.sala || !stanza.gioco.veloce) break;
          const s = stanza;
          const effetto = esci(s.sala!, s.gioco.veloce!, token, Date.now());
          inviaA(s.codice, token, { t: "fuoriSala", motivo: "uscito" });
          s.telefoni.delete(token);
          connessioni.get(s.codice)?.delete(token);
          stanza = null;
          applicaEffetto(s, effetto);
          break;
        }
        case "sala": {
          if (!stanza?.sala || !stanza.gioco.veloce) throw new Error("nonInSala");
          applicaEffetto(stanza, comando(stanza.sala, stanza.gioco.veloce, token, m, Date.now()));
          break;
        }
        case "azione":
          if (!stanza) throw new Error("nonInPartita");
          eseguiAzione(stanza, token, m.azione, eConnesso(stanza.codice));
          aggiornaTutti(stanza);
          break;
        case "sollecita": {
          if (!stanza || token !== stanza.tokenHost) throw new Error("soloHostSollecita");
          const da = new Set(mancantiDi(stanza));
          for (const [t, socket] of connessioni.get(stanza.codice) ?? []) {
            const p = stanza.telefoni.get(t);
            if (p != null && da.has(p)) for (const w of socket) invia(w, { t: "sollecito" });
          }
          break;
        }
        case "chiudi": {
          if (!stanza || token !== stanza.tokenHost) throw new Error("soloHostChiude");
          chiudiStanza(stanza, stanza.sala ? { t: "fuoriSala", motivo: "chiusa" } : { t: "chiusa" });
          stanza = null;
          break;
        }
      }
    } catch (e) {
      invia(ws, { t: "errore", messaggio: e instanceof Error ? e.message : "sconosciuto" });
    }
  });

  ws.on("close", () => {
    clearInterval(battito);
    // In sala veloce il posto non si libera subito: lo tiene la grazia (vedi `tick`).
    if (stanza) {
      const mappa = connessioni.get(stanza.codice);
      const insieme = mappa?.get(token);
      insieme?.delete(ws);
      if (insieme?.size === 0) mappa?.delete(token);
      // Gli altri vedono subito che questo giocatore risulta scollegato.
      if (stanze.has(stanza.codice)) aggiornaTutti(stanza);
    }
  });
});

// Le stanze inattive da ore si cancellano: nessun archivio, tutto in memoria.
setInterval(() => {
  const limite = Date.now() - ORE_INATTIVITA * 3_600_000;
  for (const [c, s] of stanze) {
    if (s.ultimaAttivita < limite) {
      stanze.delete(c);
      connessioni.delete(c);
    }
  }
}, 600_000);

// Sale d'attesa veloci: un solo orologio da 1 s fa scorrere attese, conti e grazie.
setInterval(() => {
  const ora = Date.now();
  for (const s of [...stanze.values()]) {
    if (!s.sala || !s.gioco.veloce) continue;
    try {
      const prima = s.sala.arrivati.map((x) => x.token);
      const effetto = tick(s.sala, s.gioco.veloce, ora, eConnesso(s.codice));
      // Chi ha perso il posto per la grazia non è più della stanza (il suo token non vale più).
      if (s.sala) for (const t of prima) if (!s.sala.arrivati.some((x) => x.token === t)) s.telefoni.delete(t);
      applicaEffetto(s, effetto);
    } catch (e) {
      console.error("sala veloce", s.codice, e);
    }
  }
}, 1_000);

http.listen(PORTA, () => {
  if (SOLO_SERVER) {
    console.log(`Server di gioco avviato sulla porta ${PORTA} (nessuna pagina qui: apri il sito su http://localhost:5173)`);
    return;
  }
  console.log(`Giochi da tavola: server avviato sulla porta ${PORTA}`);
  console.log(`App servita da ${STATICI}`);
  console.log("");
  const inDocker = existsSync("/.dockerenv");
  const ipPc = process.env.HOST_IP?.trim();
  if (ipPc) {
    console.log(`  Dai telefoni (stesso WiFi del PC) apri:  http://${ipPc}:${PORTA}`);
  } else if (inDocker) {
    // Dentro Docker il programma non vede la rete del PC: l'IP lo conosce solo Windows.
    console.log("  Dai telefoni (stesso WiFi del PC) apri:  http://<IP-DEL-PC>:" + PORTA);
    console.log("  L'IP del PC: apri PowerShell, scrivi  ipconfig  e copia 'Indirizzo IPv4' (es. 192.168.1.20).");
    console.log("  Per vederlo qui stampato:  $env:HOST_IP='192.168.1.20'; docker compose up");
  } else {
    for (const reti of Object.values(networkInterfaces())) {
      for (const r of reti ?? []) {
        if (r.family === "IPv4" && !r.internal) console.log(`  Dai telefoni (stesso WiFi del PC) apri:  http://${r.address}:${PORTA}`);
      }
    }
  }
  console.log(`  Su questo PC apri:  http://localhost:${PORTA}`);
});
