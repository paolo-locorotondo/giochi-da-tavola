import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { usaT } from "@gdt/i18n";
import { dizionari } from "./locales";
import "./campo-testo.css";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "maxLength" | "children"> {
  /** Etichetta visibile sopra il campo (se manca, passare `aria-label` o `aria-labelledby`). */
  label?: ReactNode;
  value: string;
  onChange: (valore: string) => void;
  maxLength: number;
  /** Se presente il campo è un'area di testo con queste righe. */
  righe?: number;
  /** Aiuto sotto il campo (es. un suggerimento), legato al campo da `aria-describedby`. */
  aiuto?: ReactNode;
}

/**
 * Campo di testo con limite di caratteri: mostra il contatore («7/12») e, al massimo, il bordo
 * di errore con il messaggio «Massimo 12 caratteri». Conta i simboli interi, come `limitaTesto`.
 */
export function CampoTesto({ label, value, onChange, maxLength, righe, aiuto, className, id, "aria-describedby": descr, ...resto }: Props) {
  const t = usaT(dizionari);
  const auto = useId();
  const idCampo = id ?? `ct-${auto}`;
  const idSotto = `${idCampo}-sotto`;
  const idAiuto = `${idCampo}-aiuto`;
  const n = Array.from(value).length;
  const pieno = n >= maxLength;
  const comuni = {
    id: idCampo,
    value,
    maxLength,
    className: `ct-input${className ? ` ${className}` : ""}`,
    "aria-invalid": pieno || undefined,
    "aria-describedby": [descr, aiuto ? idAiuto : undefined, idSotto].filter(Boolean).join(" "),
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };
  return (
    <div className="campo ct-campo">
      {label !== undefined && <label htmlFor={idCampo}>{label}</label>}
      {righe ? <textarea rows={righe} {...(resto as object)} {...comuni} /> : <input type="text" {...resto} {...comuni} />}
      <div className="ct-sotto" id={idSotto}>
        <span className="ct-errore" role="status">
          {pieno && (
            <>
              <CircleAlert size={16} aria-hidden="true" />
              {t("massimoCaratteri", { max: maxLength })}
            </>
          )}
        </span>
        <span className="ct-conto">
          {n}/{maxLength}
        </span>
      </div>
      {aiuto && (
        <span className="suggerimento" id={idAiuto}>
          {aiuto}
        </span>
      )}
    </div>
  );
}
