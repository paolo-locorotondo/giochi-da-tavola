# Fonti delle skill esterne

Scaricate il 2026-11-05 in cartelle temporanee fuori dal repo con `git clone --depth 1`. Ogni file è stato letto integralmente prima dell'installazione: nessuno script, nessun file eseguibile, nessuna chiamata di rete.

| Cartella | Fonte | Modifiche locali |
|---|---|---|
| `frontend-design` | `anthropics/skills`, `skills/frontend-design` (`SKILL.md` e `LICENSE.txt`) | Nessuna |
| `verification-before-completion` | `obra/superpowers`, `skills/verification-before-completion` | Nessuna |
| `web-design-guidelines` | `vercel-labs/agent-skills` e `vercel-labs/web-interface-guidelines` (`command.md`, salvato come `guidelines.md`) | `SKILL.md` riscritto: usa `guidelines.md` locale, non scarica nulla, aggiunge le note per questo progetto. `guidelines.md` identico a quello di agri-desk |
| `ui-mobile-checklist` | Sintesi dalle `references/` di `nextlevelbuilder/ui-ux-pro-max-skill` (MIT) | Rielaborata in italiano per una PWA web; non copia script né dati |

Scritta da noi, non esterna: `ui-giochi-da-tavola` (token e regole dello stile scelto).

## Non installate, di proposito

- `ui-ux-pro-max` intera: richiede Python, 24 MB di dati (font Google, icone, 21 stack che non usiamo) e produce uno stile generico. Ne abbiamo preso solo le regole utili e alcuni dati di palette, riscritti.
- `react-best-practices`: pensata per Next.js; qui c'è Vite con React 18.
- `theme-factory`: per slide e documenti, non per app.

## Regole di precedenza

- Se una regola esterna contraddice `docs/decisioni.md` o `ui-giochi-da-tavola`, vale il progetto.
- `frontend-design` serve a non cadere in un look da template, ma lo stile di questo progetto è già deciso (A «Tavolo»): non va reinventato a ogni schermata.

## Aggiornamento

Riscarica in una cartella temporanea, leggi la differenza, poi sostituisci i file e aggiorna la data qui sopra.
