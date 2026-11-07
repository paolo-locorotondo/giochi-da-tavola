import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { creaStanza, eseguiAzione, mancantiDi, nuovoCodice, nuovoToken, vistaDi, type DaClient, type DaServer, type Stanza } from "./stanze";

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
  for (const [token, socket] of connessioni.get(stanza.codice) ?? []) {
    const m: DaServer = { t: "vista", vista: vistaDi(stanza, token, connesso) };
    for (const ws of socket) invia(ws, m);
  }
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
    try {
      switch (m.t) {
        case "crea": {
          if (stanze.size >= MAX_STANZE) throw new Error("Il server è pieno: riprova tra poco");
          if (!Array.isArray(m.nomi) || m.nomi.length > MAX_NOMI) throw new Error(`Al massimo ${MAX_NOMI} giocatori`);
          token = nuovoToken();
          const codice = nuovoCodice(stanze);
          stanza = creaStanza(codice, m.nomi, m.config, token, m.gioco);
          stanze.set(codice, stanza);
          collega(ws, stanza, token);
          break;
        }
        case "entra": {
          const s = stanze.get(String(m.codice).toUpperCase());
          if (!s) throw new Error("Partita non trovata: controlla il codice o il link");
          stanza = s;
          // Il token vale solo se la stanza lo conosce: uno sconosciuto ne riceve uno nuovo.
          token = typeof m.token === "string" && s.telefoni.has(m.token) ? m.token : nuovoToken();
          collega(ws, s, token);
          break;
        }
        case "azione":
          if (!stanza) throw new Error("Non sei in una partita");
          eseguiAzione(stanza, token, m.azione, eConnesso(stanza.codice));
          aggiornaTutti(stanza);
          break;
        case "sollecita": {
          if (!stanza || token !== stanza.tokenHost) throw new Error("Solo l'organizzatore può sollecitare");
          const da = new Set(mancantiDi(stanza));
          for (const [t, socket] of connessioni.get(stanza.codice) ?? []) {
            const p = stanza.telefoni.get(t);
            if (p != null && da.has(p)) for (const w of socket) invia(w, { t: "sollecito" });
          }
          break;
        }
        case "chiudi": {
          if (!stanza || token !== stanza.tokenHost) throw new Error("Solo l'organizzatore può chiudere la partita");
          const codice = stanza.codice;
          for (const socket of connessioni.get(codice)?.values() ?? []) for (const w of socket) invia(w, { t: "chiusa" });
          stanze.delete(codice);
          connessioni.delete(codice);
          stanza = null;
          break;
        }
      }
    } catch (e) {
      invia(ws, { t: "errore", messaggio: e instanceof Error ? e.message : "Errore" });
    }
  });

  ws.on("close", () => {
    clearInterval(battito);
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
