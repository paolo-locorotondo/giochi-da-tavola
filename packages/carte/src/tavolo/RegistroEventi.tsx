import { usaT } from "@gdt/i18n";
import { dizionari } from "../locales";
import "./tavolo.css";

export interface PropsRegistroEventi {
  /** Le voci già scritte dal gioco, dalla più vecchia alla più recente. Il componente non le compone. */
  voci: readonly string[];
  /** Titolo dell'accordion (base: «Cosa è successo»). */
  titolo?: string;
  /** Quante voci mostrare, le più recenti per prime (base: 20). */
  massimo?: number;
}

/**
 * Il registro «Cosa è successo»: un accordion chiuso, in fondo alla schermata. Le voci più recenti stanno in cima.
 * Usa la stessa classe `accordion` dell'app (definita in `apps/web`), così ha lo stesso aspetto degli altri.
 */
export function RegistroEventi({ voci, titolo, massimo = 20 }: PropsRegistroEventi) {
  const t = usaT(dizionari);
  const recenti = voci.slice(-massimo).reverse();
  return (
    <details className="accordion cg-registro">
      <summary>{titolo ?? t("registroTitolo")}</summary>
      <div className="accordion-corpo">
        {recenti.length === 0 ? (
          <p className="cg-registro-vuoto">{t("registroVuoto")}</p>
        ) : (
          <ol className="cg-registro-voci">
            {recenti.map((v, i) => (
              <li key={`${voci.length - i}`}>{v}</li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
