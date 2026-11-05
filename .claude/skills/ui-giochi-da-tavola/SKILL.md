---
name: ui-giochi-da-tavola
description: Stile dell'interfaccia di giochi-da-tavola: stile «Tavolo» (verde feltro e oro) con tema scuro e chiaro, token CSS, componenti (lista giochi, scelta modalità, campi, pulsanti in griglia, accordion, carta), icone e architettura pronta per altri stili. Usare quando si crea o si modifica una schermata o un componente visivo, prima di scrivere markup e CSS.
---

# Interfaccia di giochi-da-tavola

Decisioni prese con l'utente guardando tre anteprime (Tavolo, Quiz, Argilla; file temporaneo `stili.html`). Scelto **A · Tavolo** come stile di partenza; ordine di preferenza degli altri: **C · Argilla**, poi **B · Quiz**. Se una regola qui contraddice un'indicazione esplicita dell'utente, vale l'utente.

Per i controlli tecnici e la checklist di consegna usa [ui-mobile-checklist](../ui-mobile-checklist/SKILL.md) e [web-design-guidelines](../web-design-guidelines/SKILL.md). Questa skill decide **come deve apparire**; quelle controllano **che sia fatto bene**. Prima di dichiarare finito: [verification-before-completion](../verification-before-completion/SKILL.md).

## Architettura: stile × tema, tutto a token

- Due attributi su `<html>`: `data-stile` (oggi solo `tavolo`) e `data-tema` (`dark` | `light`). Nessun altro meccanismo.
- Impostazione dell'utente salvata **su quel telefono** in `localStorage` (chiavi `gdt-stile` e `gdt-tema`), sempre dentro `try/catch`. Il tema ha tre valori: `auto` (segue `prefers-color-scheme`, predefinito), `light`, `dark`. In una partita online ognuno vede il proprio stile: non si trasmette.
- Uno script inline in `index.html` imposta gli attributi **prima** del render, per evitare il lampo del tema sbagliato. Aggiorna anche `<meta name="theme-color">` al colore di sfondo.
- I componenti usano **solo** variabili CSS (`var(--…)`). Vietati colori, raggi, ombre e font scritti a mano nei componenti e nei CSS dei giochi (`games/*/src/ui/*.css`). Le differenze fra stili stanno **solo** nel file dei token.
- File dei token unico, in `apps/web/src/` (es. `tema.css`), con un blocco per ogni combinazione `html[data-stile="…"][data-tema="…"]`. Per aggiungere uno stile si aggiungono due blocchi (scuro e chiaro) e una voce nelle impostazioni, nient'altro. Se serve altro, è un segnale che un componente ha un valore fisso: correggi il componente.
- Il flag di tema è un'icona in alto a destra nella lista giochi; la scelta completa (stile e tema) andrà in una schermata Impostazioni quando ci sarà più di uno stile.
- Gli altri stili previsti (da non realizzare ora): **Argilla** (angoli 24 px, nessun bordo, ombre morbide a più strati, viola/rosa) e **Quiz** (bordi neri 3 px, ombre dure, giallo/blu). I token che cambiano fra stili sono quelli della tabella sotto, più `--bw` (spessore bordo) e `--sh` / `--bshadow` (ombre).

## Token dello stile Tavolo

I valori sono stati controllati con il rapporto di contrasto WCAG (non a occhio). Non cambiarli senza ricalcolarli.

| Token | Scuro | Chiaro | Uso |
|---|---|---|---|
| `--bg` | `#0e1a16` | `#f3efe3` | fondo pagina |
| `--s1` | `#16271f` | `#fffdf6` | schede, righe, accordion |
| `--s2` | `#1d3328` | `#e8e2cf` | campi, chip, aree incassate |
| `--bd` | `#2c4a3b` | `#cfc7ae` | bordo decorativo di schede |
| `--bd-ctrl` | `#6f9482` | `#7d7559` | bordo di **campi e controlli** (≥ 3:1 su `--s2`) |
| `--fg` | `#f3efe3` | `#1b2a22` | testo |
| `--mu` | `#9db3a6` | `#4b5e54` | testo secondario (≥ 4,5:1 su `--bg`, `--s1`, `--s2`) |
| `--ac` | `#e3b341` | `#855a06` | accento, pulsante primario |
| `--on-ac` | `#1a1405` | `#ffffff` | testo e icone **sopra** `--ac` |
| `--ac2` | `#3fa66b` | `#1a6b40` | secondo accento (modalità online, stato collegato, avanzamento) |
| `--on-ac2` | `#08140e` | `#ffffff` | testo e icone **sopra** `--ac2` |
| `--r` | `14px` | `14px` | raggio delle schede; `calc(var(--r) - 2px)` per campi e pulsanti |
| `--font-titoli` | `Georgia, "Times New Roman", serif` | idem | titoli e nomi dei giochi |
| `--font-testo` | `system-ui, sans-serif` | idem | tutto il resto |

Errori: testo `#ff8a8a` su scuro e `#a32020` su chiaro (verifica sempre il contrasto sul fondo reale), **sempre con icona o testo**.

Rapporti misurati: testo/sfondo 15,5 (scuro) e 13,0 (chiaro); secondario/campo 6,1 e 5,4; `--on-ac` su `--ac` 9,4 e 6,1; `--on-ac2` su `--ac2` 6,2 e 6,5.

Font: solo di sistema. L'app è offline: niente font da rete e niente `@import`.

## Componenti

Tutti con bersagli ≥ 44 px (consigliato 48–52 px per i controlli principali) e `:focus-visible` con anello `--ac` di 3 px e distanza 2 px.

- **Riga gioco** (lista): riquadro icona 52 px a sinistra (sfondo `--ac`, icona `--on-ac`), nome in `--font-titoli` 1,1rem/700, descrizione in `--mu` 0,85rem, freccia a destra. Altezza minima 76 px. Pressione: `translateY(2px)` in 120 ms.
- **Scelta modalità** («Come giocate?»): due righe-gioco con riquadro icona 60 px. **Un solo telefono** = `wifi-off` su `--ac`; **Ognuno col suo telefono** = `wifi` su `--ac2`. Il significato non è affidato al colore: icona + titolo + sottotitolo.
- **Campo di testo**: etichetta visibile **sopra** (0,9rem/600), contenitore alto ≥ 52 px con icona a sinistra, fondo `--s2`, bordo `--bd-ctrl`, `:focus-within` con anello; aiuto sotto in `--mu` 0,8rem; errore sotto, con icona, legato da `aria-describedby`. Font 16 px. `inputmode`, `autocomplete`, `spellcheck="false"` per nomi e codici; il campo del codice stanza accetta il copia-incolla.
- **Pulsanti**: tutti uguali per altezza (≥ 48 px), raggio, peso 700, con icona opzionale a sinistra. Varianti: **primario** (`--ac`/`--on-ac`, uno solo per schermata), **secondario** (`--s2`, bordo `--bd-ctrl`), **modalità online** (`--ac2`/`--on-ac2`), **pericolo** (separato dagli altri). Disposti sempre in **griglia**: `grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr))`, `gap: .7rem`; il primario occupa tutta la riga (`grid-column: 1 / -1`).
- **Accordion** (info stanza, regole, indizi): `<details>` + `<summary>` ≥ 56 px, icona a sinistra, chevron a destra che ruota di 180° in 200 ms (rispetta il movimento ridotto). Dentro: codice stanza grande in monospace con pulsante «Copia», giocatori come **chip** con pallino di stato **più** testo (collegato/assente). L'intestazione chiusa mostra già l'essenziale («Stanza ABC123 · 4 collegati»).
- **La mia carta**: carta in evidenza con bordo `--ac` 2 px, ruolo in piccolo, parola in `--font-titoli` 2,4rem/800 `--ac`, nota sotto in `--mu`. Sotto: pulsante primario «Nascondi la carta» (la carta è nascosta finché non la tocchi, la vede solo chi gioca) e scheda con avanzamento «Hanno visto la carta: 3 su 5» (barra `--ac2` + testo).
- **Badge e chip**: pillola `border-radius: 999px`, testo ≥ 0,8rem; stato sempre con testo oltre al colore.

## Icone

- Libreria: **`lucide-react`** (SVG, tratto uniforme), importando solo le icone usate (nessuna icona intera). Dimensioni a token: `--icona-s` 20 px, `--icona-m` 24 px, `--icona-l` 28 px nei riquadri. Tratto 2 px, mai mischiare pieno e contorno nello stesso livello.
- Icone dei giochi (provvisorie, da rivedere): Impostore `eye-off`, Lupus in fabula `moon`, Tabù `ban`. Per ogni nuovo gioco: un'icona sola, stessa famiglia, definita nel `manifest` del gioco.
- Mai emoji come icone strutturali. Icona accanto a testo: `aria-hidden="true"`; pulsante con sola icona: `aria-label`.

## Testi

Italiano, voce attiva, frase con maiuscola iniziale (non Title Case), verbo chiaro sul pulsante («Inizia la partita», non «Avanti»). Un'azione ha lo stesso nome in tutto il flusso. Gli errori dicono cosa è successo e cosa fare; gli stati vuoti propongono un'azione.

## Cose da non fare

- Nuovi colori o misure nei componenti: aggiungi un token.
- Stili specifici di un gioco che ridefiniscono i colori: i giochi ereditano i token.
- Ombre e raggi diversi da quelli dei token; animazioni che non siano `transform`/`opacity`.
- Realizzare ora Argilla o Quiz: prima si finisce Tavolo scuro e chiaro, con la verifica a 375 px.
