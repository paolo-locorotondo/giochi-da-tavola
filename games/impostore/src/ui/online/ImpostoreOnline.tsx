import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { categorie, impostoriConsigliati, impostoriMassimi, type Categoria, type Vista } from "../../online";
import { useCollegamento, type Collegamento } from "./collegamento";
import "./online.css";

const NOME_CATEGORIA: Record<Categoria, string> = {
  cibi: "Cibi",
  animali: "Animali",
  luoghi: "Luoghi",
  mestieri: "Mestieri",
  sport: "Sport",
  oggetti: "Oggetti",
  trasporti: "Mezzi di trasporto",
};

export function ImpostoreOnline({ codiceIniziale, onLocale }: { codiceIniziale: string | null; onLocale: () => void }) {
  const c = useCollegamento(codiceIniziale);
  const [inserisci, setInserisci] = useState(false);

  // Errori transitori (es. "nome già scelto") spariscono dopo qualche secondo.
  useEffect(() => {
    if (!c.errore) return;
    const id = setTimeout(c.azzeraErrore, 4000);
    return () => clearTimeout(id);
  }, [c.errore]); // eslint-disable-line react-hooks/exhaustive-deps

  const stato = !c.connesso ? <p className="avviso">Connessione al server…</p> : null;

  // Senza vista e senza connessione da troppo tempo: meglio dirlo e proporre l'alternativa.
  if (!c.vista && !c.connesso && c.nonRaggiungibile && !c.chiusa) {
    return (
      <section className="schermata">
        <h2>Server non raggiungibile</h2>
        <p className="muted">
          Non riesco a collegarmi al server di gioco. Controlla la connessione (internet, oppure il WiFi del PC che
          fa da server). Intanto puoi giocare con un solo telefono, anche senza rete.
        </p>
        <button className="btn primario" onClick={onLocale}>
          Gioca con un solo telefono
        </button>
      </section>
    );
  }
  const err = c.errore ? <p className="errore">{c.errore}</p> : null;

  if (c.chiusa) {
    return (
      <section className="schermata">
        <h2>Partita chiusa</h2>
        <p className="muted">L'organizzatore ha chiuso la partita.</p>
        <button className="btn primario" onClick={() => window.location.assign("/impostore")}>
          Torna al gioco
        </button>
      </section>
    );
  }

  if (!c.vista) {
    if (codiceIniziale) {
      return (
        <section className="schermata">
          {stato}
          {err}
          <p className="muted">Entro nella partita {codiceIniziale}…</p>
        </section>
      );
    }
    if (inserisci) return <EntraConCodice c={c} onIndietro={() => setInserisci(false)} />;
    return (
      <>
        {stato}
        <Crea c={c} onEntra={() => setInserisci(true)} />
        {err}
      </>
    );
  }

  return (
    <>
      {c.nonRaggiungibile && !c.connesso ? (
        <p className="avviso">Connessione persa: continuo a riprovare. La partita resta nel server.</p>
      ) : (
        stato
      )}
      {c.sollecitato && <p className="avviso">Tocca a te: vota!</p>}
      {err}
      <Testata c={c} v={c.vista} />
      <Partita c={c} v={c.vista} />
      {c.vista.host && <ChiudiPartita c={c} />}
    </>
  );
}

/** In cima a ogni schermata: chi sono io e, a richiesta, codice stanza e chi è collegato. */
function Testata({ c, v }: { c: Collegamento; v: Vista }) {
  const io = v.nomi.find((n) => n.posto === v.io);
  const link = c.codice ? `${window.location.origin}/impostore/${c.codice}` : "";
  const collegati = v.nomi.filter((n) => n.collegato).length;
  const stato = (n: Vista["nomi"][number]) => {
    if (v.fase !== "sala" && !n.inGioco) return "non partecipa";
    if (n.collegato) return "collegato";
    return n.occupato ? "scollegato" : "non ancora entrato";
  };
  return (
    <div className="testata">
      <p className="chi-sono">
        {io ? (
          <>
            Sei <strong>{io.nome}</strong>
            {v.host ? " · organizzatore" : ""}
          </>
        ) : (
          "Non hai ancora un nome in questa partita"
        )}
      </p>
      <details className="info-stanza">
        <summary>
          Stanza {c.codice} · {collegati} collegati
        </summary>
        <p>
          Codice partita: <strong>{c.codice}</strong>
        </p>
        <p className="muted link-invito">{link}</p>
        <QrInvito link={link} />
        <ul className="elenco">
          {v.nomi.map((n) => (
            <li key={n.posto} className={n.collegato ? "" : "assente"}>
              <span className={`pallino${n.collegato ? " on" : ""}`} aria-hidden="true" />
              <span>
                {n.nome}
                {n.posto === v.io ? " (tu)" : ""} · {stato(n)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function ChiudiPartita({ c }: { c: Collegamento }) {
  const [conferma, setConferma] = useState(false);
  return (
    <section className="schermata allineata chiudi">
      {conferma ? (
        <>
          <p>Chiudere la partita per tutti? Non si può annullare.</p>
          <button className="btn" onClick={() => c.invia({ t: "chiudi" })}>
            Sì, chiudi
          </button>
          <button className="btn" onClick={() => setConferma(false)}>
            No, continua
          </button>
        </>
      ) : (
        <button className="link" onClick={() => setConferma(true)}>
          Chiudi la partita
        </button>
      )}
    </section>
  );
}

function EntraConCodice({ c, onIndietro }: { c: Collegamento; onIndietro: () => void }) {
  const [codice, setCodice] = useState("");
  function invia(e: FormEvent) {
    e.preventDefault();
    c.invia({ t: "entra", codice: codice.trim().toUpperCase() });
  }
  return (
    <form className="schermata allineata" onSubmit={invia}>
      <label className="campo">
        Codice della partita
        <input autoFocus autoCapitalize="characters" value={codice} onChange={(e) => setCodice(e.target.value)} />
      </label>
      {c.errore && <p className="errore">{c.errore}</p>}
      <button className="btn primario" type="submit">
        Entra
      </button>
      <button className="btn" type="button" onClick={onIndietro}>
        Indietro
      </button>
    </form>
  );
}

function Crea({ c, onEntra }: { c: Collegamento; onEntra: () => void }) {
  const [testo, setTesto] = useState("");
  const [scelta, setScelta] = useState<number | null>(null);
  const [categoria, setCategoria] = useState<Categoria>("cibi");
  const [votiVisibili, setVotiVisibili] = useState(true);

  const nomi = testo
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  const consigliati = impostoriConsigliati(Math.max(nomi.length, 3));
  const massimi = impostoriMassimi(Math.max(nomi.length, 3));
  const numImpostori = scelta !== null && scelta <= massimi ? scelta : consigliati;

  return (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        c.invia({ t: "crea", nomi, config: { numImpostori, categoria, votiVisibili } });
      }}
    >
      <label className="campo">
        Giocatori (uno per riga, almeno 3)
        <textarea rows={6} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={"Anna\nLuca\nMarco"} />
        <span className="suggerimento">Ognuno sceglierà il proprio nome dal suo telefono.</span>
      </label>
      <label className="campo">
        Numero di impostori
        <select value={numImpostori} onChange={(e) => setScelta(Number(e.target.value))}>
          {Array.from({ length: massimi }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
              {n === consigliati ? " (consigliato)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        Categoria
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
          {categorie.map((k) => (
            <option key={k} value={k}>
              {NOME_CATEGORIA[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="spunta">
        <input type="checkbox" checked={votiVisibili} onChange={(e) => setVotiVisibili(e.target.checked)} />
        Mostra i voti in diretta durante la votazione
      </label>
      {c.errore && <p className="errore">{c.errore}</p>}
      <button className="btn primario" type="submit" disabled={!c.connesso}>
        Crea la partita
      </button>
      <button className="btn" type="button" onClick={onEntra}>
        Ho un codice: entra
      </button>
    </form>
  );
}

function Partita({ c, v }: { c: Collegamento; v: Vista }) {
  const nome = (p: number | null) => v.nomi.find((n) => n.posto === p)?.nome ?? "";

  if (v.io === null && v.fase !== "sala") {
    const liberi = v.nomi.filter((n) => n.inGioco && !n.collegato);
    return (
      <section className="schermata allineata">
        <h2>Partita in corso</h2>
        {liberi.length > 0 ? (
          <>
            <p>Eri già in questa partita? Tocca il tuo nome per rientrare:</p>
            <div className="giocatori">
              {liberi.map((n) => (
                <button key={n.posto} className="btn" onClick={() => c.azione({ tipo: "riprendi", posto: n.posto })}>
                  {n.nome}
                </button>
              ))}
            </div>
            <p className="muted">Se non eri tra i giocatori, aspetta la prossima partita.</p>
          </>
        ) : (
          <p className="muted">Hai aperto il link a partita iniziata e tutti i giocatori sono collegati. Aspetta la prossima.</p>
        )}
        {c.errore && <p className="errore">{c.errore}</p>}
      </section>
    );
  }

  switch (v.fase) {
    case "sala":
      return <Sala c={c} v={v} />;
    case "carte":
      return <Carta c={c} v={v} />;
    case "indizi":
      return (
        <section className="schermata">
          <h2>Indizi</h2>
          <p>
            Parte <strong>{nome(v.primo)}</strong>: ognuno dice a voce un indizio, in senso orario.
          </p>
          {v.host ? (
            <button className="btn primario" onClick={() => c.azione({ tipo: "avanti" })}>
              Si passa al voto
            </button>
          ) : (
            <p className="muted">L'organizzatore avvierà il voto.</p>
          )}
        </section>
      );
    case "voto":
      return <Voto c={c} v={v} nome={nome} />;
    case "tentativo":
      return <Tentativo c={c} v={v} nome={nome} />;
    case "fine":
      return <Fine c={c} v={v} nome={nome} />;
  }
}

/** QR code del link, disegnato nel telefono: funziona anche su HTTP locale, senza internet. */
function QrInvito({ link }: { link: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let vivo = true;
    QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((s) => vivo && setSvg(s))
      .catch(() => vivo && setSvg(""));
    return () => {
      vivo = false;
    };
  }, [link]);
  if (!svg) return null;
  // Lo SVG lo genera la nostra libreria a partire dal link: nessun contenuto esterno.
  return <div className="qr" aria-label="QR code per entrare nella partita" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Invito({ codice }: { codice: string }) {
  const link = `${window.location.origin}/impostore/${codice}`;
  const [copiato, setCopiato] = useState(false);
  // Su http://192.168… (non HTTPS) il browser non offre né Condividi né appunti.
  const puoCondividere = typeof navigator.share === "function" || !!navigator.clipboard;
  async function condividi() {
    try {
      if (navigator.share) await navigator.share({ title: "Impostore", text: "Entra nella partita:", url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopiato(true);
      }
    } catch {
      /* annullato o non disponibile: resta il link scritto */
    }
  }
  return (
    <div className="invito">
      <p className="muted">Codice partita</p>
      <p className="grande codice">{codice}</p>
      <p className="muted link-invito">{link}</p>
      <QrInvito link={link} />
      {puoCondividere ? (
        <button className="btn" onClick={condividi}>
          {copiato ? "Link copiato" : "Condividi il link"}
        </button>
      ) : (
        <p className="muted">Su questo indirizzo non c'è "Condividi": detta il codice o il link agli altri.</p>
      )}
    </div>
  );
}

function Sala({ c, v }: { c: Collegamento; v: Vista }) {
  const liberi = v.nomi.filter((n) => !n.occupato).length;
  const inSala = v.nomi.length - liberi;
  return (
    <section className="schermata allineata">
      {c.codice && v.host && <Invito codice={c.codice} />}
      {v.io === null ? (
        <>
          <h2>Chi sei?</h2>
          <p className="muted">Tocca il tuo nome.</p>
          <div className="giocatori">
            {v.nomi.map((n) => (
              <button
                key={n.posto}
                className="btn"
                disabled={n.occupato}
                onClick={() => c.azione({ tipo: "occupa", posto: n.posto })}
              >
                {n.nome}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2>Ciao {v.nomi.find((n) => n.posto === v.io)?.nome}</h2>
          <p className="muted">Aspetta che entrino gli altri.</p>
        </>
      )}
      <p>
        Entrati: {inSala} su {v.nomi.length}
      </p>
      <ul className="elenco">
        {v.nomi.map((n) => (
          <li key={n.posto} className={n.occupato ? "" : "assente"}>
            <span>
              {n.nome} {n.occupato ? "✓" : "…"}
            </span>
            {v.host && n.occupato && n.posto !== v.io && (
              <button className="btn piccolo" onClick={() => c.azione({ tipo: "libera", posto: n.posto })}>
                Libera
              </button>
            )}
          </li>
        ))}
      </ul>
      {v.host && (
        <button className="btn primario" disabled={inSala < 3} onClick={() => c.azione({ tipo: "avvia" })}>
          Avvia la partita ({inSala})
        </button>
      )}
    </section>
  );
}

function Carta({ c, v }: { c: Collegamento; v: Vista }) {
  const [scoperta, setScoperta] = useState(false);
  if (!v.carta) return null;
  const mioNome = v.nomi.find((n) => n.posto === v.io)?.nome;
  // Scoprire la carta vale come "visto": il server conta chi l'ha guardata.
  function scopri() {
    setScoperta(true);
    c.azione({ tipo: "visto" });
  }
  return (
    <section className="schermata">
      <p className="muted">
        <strong>{mioNome}</strong> · la tua carta, guarda solo tu
      </p>
      <div className="carta">
        {!scoperta ? (
          <button className="btn primario" onClick={scopri}>
            Scopri
          </button>
        ) : v.carta.ruolo === "impostore" ? (
          <>
            <p>Sei l'impostore</p>
            <p className="grande">Non conosci la parola</p>
          </>
        ) : (
          <>
            <p>La parola è</p>
            <p className="grande">{v.carta.parola}</p>
          </>
        )}
      </div>
      {scoperta && (
        <button className="btn" onClick={() => setScoperta(false)}>
          Nascondi
        </button>
      )}
      <p className="muted">
        Hanno visto la carta: {v.viste} su {v.nomi.filter((n) => n.inGioco).length}
      </p>
      {v.host && (
        <button className="btn primario" onClick={() => c.azione({ tipo: "avanti" })}>
          Tutti hanno visto: via agli indizi
        </button>
      )}
    </section>
  );
}

function Voto({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const voto = v.voto;
  if (!voto) return null;
  const sonoInGioco = v.nomi.find((n) => n.posto === v.io)?.inGioco ?? false;
  return (
    <section className="schermata allineata">
      <h2>{voto.ballottaggio ? "Ballottaggio" : "Votazione"}</h2>
      {voto.ballottaggio && v.ultimoEsito && <p className="muted">Pareggio: si rivota solo tra i pari merito.</p>}
      <p className="muted">
        Hanno votato {voto.hannoVotato} su {voto.totale}. Votare è obbligatorio per tutti.
      </p>
      {voto.esclusi.length > 0 && (
        <p className="muted">Esclusi dal voto dall'organizzatore: {voto.esclusi.map(nome).join(", ")}.</p>
      )}
      {sonoInGioco ? (
        <div className="giocatori">
          {voto.candidati
            .filter((p) => p !== v.io)
            .map((p) => (
              <button
                key={p}
                className={`btn voto${voto.mioVoto === p ? " primario" : ""}`}
                onClick={() => c.azione({ tipo: "vota", posto: p })}
              >
                {nome(p)}
                {voto.conteggi && <span className="contatore">{voto.conteggi[p] ?? 0}</span>}
              </button>
            ))}
        </div>
      ) : (
        <p className="muted">Non partecipi a questa partita.</p>
      )}
      {sonoInGioco && voto.mioVoto !== null && <p className="muted">Hai votato {nome(voto.mioVoto)}. Puoi cambiare finché non votano tutti.</p>}
      {v.host && voto.mancanti && voto.mancanti.length > 0 && (
        <div className="mancanti">
          <p>Mancano:</p>
          <ul className="elenco">
            {voto.mancanti.map((p) => (
              <li key={p}>
                <span>
                  {nome(p)} {v.nomi.find((n) => n.posto === p)?.collegato ? "" : "· scollegato"}
                </span>
                <button className="btn piccolo" onClick={() => c.azione({ tipo: "escludi", posto: p })}>
                  Escludi dal voto
                </button>
              </li>
            ))}
          </ul>
          <button className="btn" onClick={() => c.invia({ t: "sollecita" })}>
            Sollecita
          </button>
          <p className="suggerimento">
            "Escludi" serve se un telefono non torna: non si aspetta più il suo voto, ma nessuno vota al suo posto.
            Se rientra e vota, torna tra i votanti.
          </p>
        </div>
      )}
    </section>
  );
}

function Tentativo({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const [testo, setTesto] = useState("");
  const tocca = v.io !== null && v.io === v.eliminato;
  return tocca ? (
    <form
      className="schermata allineata"
      onSubmit={(e) => {
        e.preventDefault();
        c.azione({ tipo: "tenta", testo });
      }}
    >
      <h2>Sei stato scoperto</h2>
      <p>Puoi ancora vincere: indovina la parola segreta.</p>
      <input autoFocus autoComplete="off" autoCapitalize="none" value={testo} onChange={(e) => setTesto(e.target.value)} />
      <button className="btn primario" type="submit">
        Conferma
      </button>
    </form>
  ) : (
    <section className="schermata">
      <h2>{nome(v.eliminato)} è l'impostore!</h2>
      <p className="muted">Sta provando a indovinare la parola…</p>
    </section>
  );
}

function Fine({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const f = v.fine;
  if (!f) return null;
  const e = v.ultimoEsito;
  return (
    <section className="schermata">
      <h2>{f.vincitore === "civili" ? "Vincono i civili!" : "Vincono gli impostori!"}</h2>
      <p>
        La parola era <strong>{f.parola}</strong>
      </p>
      <p className="muted">Impostori: {f.impostori.map(nome).join(", ")}</p>
      {f.eliminato !== null && <p className="muted">Eliminato: {nome(f.eliminato)}</p>}
      {e && (
        <p className="muted">
          {f.eliminato === null ? "Pareggio anche al ballottaggio: nessuno eliminato. " : ""}
          Voti dell'ultima votazione:{" "}
          {Object.entries(e.conteggi)
            .sort((a, b) => b[1] - a[1])
            .map(([p, n]) => `${nome(Number(p))} ${n} ${n === 1 ? "voto" : "voti"}`)
            .join(", ")}
        </p>
      )}
      {v.host ? (
        <button className="btn primario" onClick={() => c.azione({ tipo: "nuova" })}>
          Nuova partita (stessa sala)
        </button>
      ) : (
        <p className="muted">L'organizzatore può avviare un'altra partita.</p>
      )}
    </section>
  );
}
