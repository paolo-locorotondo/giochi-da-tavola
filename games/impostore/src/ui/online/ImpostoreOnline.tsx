import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { Copy, Eye, EyeOff } from "lucide-react";
import { categorie, impostoriConsigliati, impostoriMassimi, type Categoria, type Vista } from "../../online";
import { leggiToken, useCollegamento, type Collegamento } from "./collegamento";
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
      {c.sollecitato && <p className="avviso">Tocca a te!</p>}
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
    <div className="intestazione-partita">
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
      <details className="accordion">
        <summary>
          <span>
            Stanza {c.codice} · {collegati} collegati
          </span>
        </summary>
        <div className="accordion-corpo">
          <div className="codice-riga">
            <span className="muted">Codice partita</span>
            <strong>{c.codice}</strong>
            <CopiaLink link={link} />
          </div>
          <QrInvito link={link} />
          <ul className="chip-elenco" aria-label="Giocatori nella stanza">
            {v.nomi.map((n) => (
              <li key={n.posto} className={`chip${n.collegato ? "" : " assente"}`}>
                <span className={`pallino${n.collegato ? " on" : ""}`} aria-hidden="true" />
                {n.nome}
                {n.organizzatore ? " *" : ""}
                {n.posto === v.io ? " (tu)" : ""} · {stato(n)}
              </li>
            ))}
          </ul>
          <p className="muted">* organizzatore</p>
        </div>
      </details>
    </div>
  );
}

/** Copia il link della stanza. Su HTTP locale l'appunti può non esistere: il bottone allora si nasconde. */
function CopiaLink({ link }: { link: string }) {
  const [copiato, setCopiato] = useState(false);
  if (!navigator.clipboard) return null;
  return (
    <button
      type="button"
      className="btn piccolo"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopiato(true);
        } catch {
          /* permesso negato: resta il link scritto */
        }
      }}
    >
      <Copy size={16} aria-hidden="true" /> {copiato ? "Copiato" : "Copia link"}
    </button>
  );
}

function ChiudiPartita({ c }: { c: Collegamento }) {
  const [conferma, setConferma] = useState(false);
  return (
    <section className="schermata allineata chiudi">
      {conferma ? (
        <>
          <p>Chiudere la partita per tutti? Non si può annullare.</p>
          <button className="btn pericolo" onClick={() => c.invia({ t: "chiudi" })}>
            Sì, chiudi
          </button>
          <button className="btn" onClick={() => setConferma(false)}>
            No, continua
          </button>
        </>
      ) : (
        <button className="btn pericolo-contorno" onClick={() => setConferma(true)}>
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
    const c5 = codice.trim().toUpperCase();
    // Se questo telefono era già nella partita, si presenta con il suo token: così rientra nel suo posto
    // (e, per l'organizzatore, resta organizzatore).
    c.invia({ t: "entra", codice: c5, token: leggiToken(c5) });
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
  const [indiziScritti, setIndiziScritti] = useState(false);

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
        c.invia({ t: "crea", nomi, config: { numImpostori, categoria, votiVisibili, indiziScritti } });
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
      <label className="spunta">
        <input type="checkbox" checked={indiziScritti} onChange={(e) => setIndiziScritti(e.target.checked)} />
        Indizi scritti nell'app, uno alla volta (per giocare da case diverse)
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

/** Rivedere la propria carta dopo la fase "carte": nascosta finché non la tocchi, la vedi solo tu. */
function RivediCarta({ v }: { v: Vista }) {
  const [aperta, setAperta] = useState(false);
  if (!v.carta || !["indizi", "voto", "tentativo"].includes(v.fase)) return null;
  return (
    <div className="rivedi">
      <button className="btn" onClick={() => setAperta(!aperta)}>
        {aperta ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        {aperta ? " Nascondi la mia carta" : " Rivedi la mia carta"}
      </button>
      {aperta && (
        <div className="carta">
          {v.carta.ruolo === "impostore" ? (
            <p className="grande">Sei l'impostore: non conosci la parola</p>
          ) : (
            <>
              <p>La parola è</p>
              <p className="grande">{v.carta.parola}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Partita({ c, v }: { c: Collegamento; v: Vista }) {
  return (
    <>
      <Fase c={c} v={v} />
      <RivediCarta v={v} />
    </>
  );
}

function Fase({ c, v }: { c: Collegamento; v: Vista }) {
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
      return v.indizi ? (
        <IndiziScritti c={c} v={v} nome={nome} />
      ) : (
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
              {n.nome}
              {n.organizzatore ? " *" : ""} {n.occupato ? "✓" : "…"}
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
        <div className="azioni">
          <button className="btn primario" disabled={inSala < 3} onClick={() => c.azione({ tipo: "avvia" })}>
            Avvia la partita ({inSala})
          </button>
        </div>
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
      <ProgressoCarte viste={v.viste} totale={v.nomi.filter((n) => n.inGioco).length} />
      <div className="azioni">
        {scoperta && (
          <button className="btn" onClick={() => setScoperta(false)}>
            <EyeOff size={18} aria-hidden="true" /> Nascondi
          </button>
        )}
        {v.host && (
          <button
            className="btn primario"
            disabled={v.viste < v.nomi.filter((n) => n.inGioco).length}
            onClick={() => c.azione({ tipo: "avanti" })}
          >
            Tutti hanno visto: via agli indizi
          </button>
        )}
      </div>
    </section>
  );
}

/** Quanti hanno già guardato la propria carta: barra e testo, così non dipende dal solo colore. */
function ProgressoCarte({ viste, totale }: { viste: number; totale: number }) {
  const percentuale = totale > 0 ? Math.round((viste / totale) * 100) : 0;
  return (
    <div className="progresso">
      <p className="muted">
        Hanno visto la carta: <strong>{viste}</strong> su {totale}
      </p>
      <div className="progresso-barra" role="progressbar" aria-valuemin={0} aria-valuemax={totale} aria-valuenow={viste}>
        <span style={{ width: `${percentuale}%` }} />
      </div>
    </div>
  );
}

function ElencoIndizi({ v, nome }: { v: Vista; nome: (p: number | null) => string }) {
  if (!v.indizi) return null;
  return (
    <ol className="elenco">
      {v.indizi.scritti.map((i, n) => (
        <li key={n}>
          <span>
            <strong>{nome(i.posto)}</strong>: {i.testo}
          </span>
        </li>
      ))}
    </ol>
  );
}

function IndiziScritti({ c, v, nome }: { c: Collegamento; v: Vista; nome: (p: number | null) => string }) {
  const [testo, setTesto] = useState("");
  const ind = v.indizi;
  if (!ind) return null;
  const mioTurno = ind.turno !== null && ind.turno === v.io;
  const giocatore = v.nomi.find((n) => n.posto === ind.turno);
  return (
    <section className="schermata allineata">
      <h2>Indizi</h2>
      <ElencoIndizi v={v} nome={nome} />
      {mioTurno ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            c.azione({ tipo: "indizio", testo });
            setTesto("");
          }}
        >
          <p>Tocca a te: scrivi il tuo indizio.</p>
          <input autoFocus autoComplete="off" maxLength={60} value={testo} onChange={(e) => setTesto(e.target.value)} />
          <button className="btn primario" type="submit" disabled={!testo.trim()}>
            Invia
          </button>
        </form>
      ) : ind.turno !== null ? (
        <p className="muted">
          Tocca a <strong>{nome(ind.turno)}</strong>
          {giocatore && !giocatore.collegato ? " · scollegato" : ""}…
        </p>
      ) : (
        <p className="muted">Hanno scritto tutti.</p>
      )}
      {c.errore && <p className="errore">{c.errore}</p>}
      {v.host && (
        <div className="mancanti">
          {ind.turno !== null && !mioTurno && (
            <button className="btn" onClick={() => c.invia({ t: "sollecita" })}>
              Sollecita {nome(ind.turno)}
            </button>
          )}
          <button className="btn primario" disabled={ind.turno !== null} onClick={() => c.azione({ tipo: "avanti" })}>
            Si passa al voto
          </button>
        </div>
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
      {v.indizi && (
        <details className="accordion">
          <summary>Indizi dati</summary>
          <div className="accordion-corpo">
            <ElencoIndizi v={v} nome={nome} />
          </div>
        </details>
      )}
      <p className="muted">
        Hanno votato {voto.hannoVotato} su {voto.totale}. Votare è obbligatorio per tutti.
      </p>
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
              </li>
            ))}
          </ul>
          <button className="btn" onClick={() => c.invia({ t: "sollecita" })}>
            Sollecita
          </button>
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
