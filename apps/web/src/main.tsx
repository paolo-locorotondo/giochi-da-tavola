import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ripristinaAudio, suona } from "@gdt/suoni";
import "./tema.css";
import "./index.css";

ripristinaAudio();

// Feedback sonoro a ogni pulsante (se l'audio è acceso). Chi ha un suono proprio lo dichiara con data-suono="no".
document.addEventListener("click", (e) => {
  const el = (e.target as Element | null)?.closest("button, a, [role=switch]");
  if (el && !el.closest("[data-suono=no]") && !(el as HTMLButtonElement).disabled) suona("click");
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
