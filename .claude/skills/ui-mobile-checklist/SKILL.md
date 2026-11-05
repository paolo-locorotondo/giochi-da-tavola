---
name: ui-mobile-checklist
description: Regole di UX per telefono (touch, form, navigazione, movimento, tema chiaro/scuro) e checklist di consegna di una schermata. Usare prima di dichiarare finita una schermata o un componente della PWA.
---

# Checklist UI per telefono

Sintesi in italiano e adattata a una PWA React di `references/quick-reference.md` e `references/pro-rules.md` di `nextlevelbuilder/ui-ux-pro-max-skill` (MIT). Le regole nate per app native iOS/Android sono tradotte in CSS/web. Sono ordinate per priorità: se due regole confliggono vale quella più in alto.

Per la forma visiva (colori, raggi, tipografia) vedi [ui-giochi-da-tavola](../ui-giochi-da-tavola/SKILL.md). Per focus, form e animazioni a livello di codice vedi [web-design-guidelines](../web-design-guidelines/SKILL.md).

## 1. Accessibilità (critica)

- Contrasto: testo normale 4,5:1, testo grande 3:1, **bordi e icone che portano significato 3:1**. Calcolalo, non a occhio, per entrambi i temi.
- Il colore non è mai l'unico segnale: aggiungi icona o testo (stato collegato/non collegato, giusto/sbagliato, ruolo).
- Pulsanti con sola icona: `aria-label`. Icone decorative accanto a testo: `aria-hidden="true"`.
- Focus visibile con `:focus-visible` (2–3 px, contrasto 3:1). Niente `outline: none` senza sostituto.
- Annunci dinamici (conteggi, esiti, errori): `aria-live="polite"` o `role="status"`; un messaggio completo, non solo il numero.
- Ogni azione trascinamento/swipe ha un pulsante equivalente.
- Rispetta `prefers-reduced-motion`.

## 2. Touch e interazione (critica)

- Bersagli di almeno **44×44 px** (il pulsante può essere più piccolo se l'area tappabile è estesa); **8 px** o più tra due bersagli.
- Niente azioni solo `:hover`. Feedback alla pressione entro 100 ms (colore, ombra, `translateY(1–2px)`), senza spostare gli elementi vicini.
- `touch-action: manipulation` sui controlli, `-webkit-tap-highlight-color` impostato di proposito.
- Pulsante disabilitato = `disabled` vero, opacità ridotta (0,4–0,5), senza azione. Durante una richiesta: stato di caricamento e doppio tap ignorato.
- Azioni distruttive (esci dalla stanza, termina partita): conferma o annulla; colore pericolo e distanza dal pulsante principale.
- Un solo pulsante primario per schermata.

## 3. Layout e responsive (alta)

- Parti da 375 px; controlla anche 360 e 430 px, orizzontale e tablet. Mai scroll orizzontale.
- `min-height: 100dvh`, non `100vh`. Padding con `env(safe-area-inset-*)` per intestazioni e barre fisse.
- Testo di base 16 px (sotto, iOS zooma nei campi); interlinea 1,5; righe di 35–60 caratteri.
- Spaziatura a passi di 4/8 px. Gerarchia con dimensione, spazio, contrasto, non solo colore.
- Pulsanti in **griglia**: `repeat(auto-fit, minmax(9.5rem, 1fr))`; il pulsante primario su tutta la riga.
- Testi lunghi (nomi giocatori): `min-width: 0`, `overflow-wrap: anywhere`, preferisci andare a capo al troncare.
- Una barra fissa non deve coprire il campo con il focus; riserva spazio in basso.

## 4. Stile (alta)

- Icone SVG di una sola famiglia (stesso tratto, stessa dimensione per ruolo), mai emoji come icone strutturali. Tratto uniforme, outline o pieno, non misti nello stesso livello.
- Ombre e rilievi da una scala unica (token), mai valori casuali.
- Tema chiaro e scuro progettati insieme, non invertiti: nel scuro colori desaturati/più chiari, bordi comunque visibili.

## 5. Movimento (media)

- Anima solo `transform` e `opacity`; mai `transition: all`.
- Durate da token: pressione 100–150 ms, aprire/chiudere 200–250 ms; l'uscita è più corta dell'entrata (circa 60–70%).
- Il movimento esprime una causa (apri, conferma, scambia), non decora. Una cosa animata alla volta per schermata.
- Interrompibile, mai blocca l'input.

## 6. Form e feedback (media)

- Etichetta **visibile** sopra il campo (non solo placeholder), aiuto sotto, errore sotto il campo collegato con `aria-describedby`, che spiega come correggere.
- `type`/`inputmode`/`autocomplete` giusti; campo alto almeno 44 px (meglio 52); font 16 px; non bloccare il copia-incolla (utile per i codici stanza).
- Valida all'uscita dal campo, non a ogni tasto. Dopo un invio con errori sposta il focus sul primo campo non valido.
- Stati vuoti con un'azione ("Nessun giocatore ancora. Invita qualcuno").
- Conferma di un'azione con un segnale breve (spunta, messaggio), senza rubare il focus.

## 7. Navigazione (alta)

- Il tasto Indietro del telefono funziona e riporta dove ci si aspetta; mantieni lo stato.
- Ogni schermata chiave ha un indirizzo (es. `/impostore/ABC123`).
- Indicatore visibile di dove sei (nome del gioco, passo della partita).
- Azioni pericolose lontane da quelle normali.

## Checklist di consegna

Prima di dichiarare finita una schermata, spunta tutto (e usa [verification-before-completion](../verification-before-completion/SKILL.md): serve evidenza, cioè screenshot letti):

- [ ] Guardata a **375 px**, in tema **scuro e chiaro** (e con lo stile attivo, quando ce n'è più d'uno)
- [ ] Contrasti calcolati: testo 4,5:1, bordi/icone con significato 3:1, in entrambi i temi
- [ ] Bersagli ≥ 44 px, distanziati ≥ 8 px
- [ ] Nessun colore, raggio, ombra o dimensione scritti a mano: solo token
- [ ] Icone SVG dello stesso set, con `aria-label` o `aria-hidden` secondo l'uso
- [ ] Focus visibile e non coperto da barre fisse
- [ ] Prova con movimento ridotto e con testo ingrandito, senza rotture
- [ ] Safe area rispettata (notch, barra dei gesti), niente scroll orizzontale
- [ ] Un solo pulsante primario; azioni distruttive con conferma
- [ ] Testi in italiano, chiari, con stati vuoti e di errore che dicono cosa fare
- [ ] Funziona offline (nessun font o risorsa da rete)

Fonte: `nextlevelbuilder/ui-ux-pro-max-skill` (MIT), `.claude/skills/ui-ux-pro-max/references/`, letti il 2026-11-05; rielaborati, nessuno script copiato.
