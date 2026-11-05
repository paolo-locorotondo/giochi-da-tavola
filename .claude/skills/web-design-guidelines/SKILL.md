---
name: web-design-guidelines
description: Revisione di componenti UI e pagine per accessibilità, form, focus, animazioni, tipografia, safe area, touch e dark mode. Usare quando si scrive o si modifica una schermata o un componente, e prima di dichiararli finiti.
---

# Web design guidelines (copia locale)

Le regole stanno in [guidelines.md](guidelines.md), copia locale del file di Vercel (`vercel-labs/web-interface-guidelines`). Non scaricare nulla durante la revisione: usa solo quel file.

## Come si usa

1. Leggi [guidelines.md](guidelines.md) per intero.
2. Leggi i file indicati dall'utente, o chiedi quali rivedere.
3. Controlla il codice contro tutte le regole, con priorità a: accessibilità, focus, form, touch, safe area, dark mode.
4. Riporta i risultati nel formato `file:line` descritto in fondo a `guidelines.md`.
5. Per le regole aggiuntive su touch, navigazione e consegna vedi [ui-mobile-checklist](../ui-mobile-checklist/SKILL.md).

## Per giochi-da-tavola

- Il progetto è Vite + React, non Next.js: ignora le regole su `<Link>`, idratazione, `priority` delle immagini e `next/*`.
- Le regole sulla lingua valgono nello spirito per l'italiano: `…` al posto di `...`, virgolette « » o “ ”. La regola «Title Case» è solo per l'inglese: in italiano titoli e pulsanti in maiuscolo iniziale (sentence case).
- Le app sono PWA offline: niente `<link rel="preconnect">` o font da CDN.
- Mai `user-scalable=no` o `maximum-scale=1`.

Fonte: `vercel-labs/web-interface-guidelines`, copiato il 2026-11-05 (file letto integralmente, nessuno script).
