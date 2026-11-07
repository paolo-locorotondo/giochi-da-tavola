import { useEffect, type CSSProperties } from "react";
import { staParlando } from "./voce";

/** Dopo la durata si aspetta ancora che il narratore finisca la frase, ma non oltre questi secondi. */
const ATTESA_VOCE_MAX = 20;

/**
 * Schermata che copre il passaggio tra un ruolo e l'altro e tra notte e giorno.
 * È sempre identica (testo, durata, aspetto), qualunque sia la schermata che segue:
 * chi riapre gli occhi troppo presto non ricava nulla.
 */
export function Transizione({ secondi, onFine }: { secondi: number; onFine: () => void }) {
  useEffect(() => {
    let intervallo: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      const limite = Date.now() + ATTESA_VOCE_MAX * 1000;
      const prova = () => {
        if (staParlando() && Date.now() < limite) return;
        clearInterval(intervallo);
        onFine();
      };
      intervallo = setInterval(prova, 250);
      prova();
    }, secondi * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(intervallo);
    };
  }, [secondi, onFine]);

  return (
    <section className="schermata transizione" aria-live="polite">
      <span className="transizione-luna" aria-hidden="true" />
      <h2>Occhi chiusi</h2>
      <p>Chi ha appena toccato il telefono lo lascia al centro e torna a dormire.</p>
      <p className="muted">Il narratore sta per chiamare il prossimo.</p>
      <div className="transizione-barra" aria-hidden="true">
        <span style={{ "--durata": `${secondi}s` } as CSSProperties} />
      </div>
    </section>
  );
}
