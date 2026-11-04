/**
 * Carte originali (non sono quelle del gioco commerciale): parola da far indovinare
 * e cinque parole vietate. Formato compatto "parola: vietata, vietata, ...".
 */
const GREZZE = `
Pizza: forno, mozzarella, pomodoro, Napoli, impasto
Spiaggia: mare, sabbia, ombrellone, estate, costume
Compleanno: torta, candeline, regalo, anni, festa
Dentista: denti, trapano, carie, studio, bocca
Aeroplano: volare, ali, pilota, aeroporto, cielo
Biblioteca: libri, prestito, silenzio, leggere, scaffale
Calcio: pallone, gol, porta, squadra, arbitro
Gelato: cono, coppetta, freddo, gusto, crema
Vacanza: ferie, viaggio, mare, valigia, riposo
Matrimonio: sposa, anello, chiesa, nozze, sposo
Ospedale: medico, malato, infermiere, ambulanza, curare
Scuola: studente, maestro, classe, banco, lezione
Pioggia: ombrello, nuvole, acqua, bagnato, temporale
Chitarra: corde, suonare, musica, strumento, plettro
Fotografia: macchina, scatto, immagine, foto, album
Treno: binario, stazione, vagone, biglietto, locomotiva
Caffè: tazzina, espresso, bar, caffeina, moka
Neve: bianca, inverno, sci, freddo, fiocco
Pirata: nave, tesoro, benda, mare, uncino
Cinema: film, schermo, popcorn, sala, biglietto
Orologio: ore, polso, lancette, tempo, minuti
Computer: tastiera, mouse, schermo, internet, portatile
Pompiere: fuoco, idrante, incendio, casco, sirena
Vampiro: sangue, denti, Dracula, notte, mordere
Natale: albero, regali, Babbo, dicembre, presepe
Palestra: allenamento, pesi, muscoli, sport, abbonamento
Banca: soldi, conto, prestito, cassiere, bancomat
Cucchiaio: minestra, forchetta, posate, mangiare, zuppa
Fantasma: spirito, lenzuolo, paura, castello, spettro
Dormire: letto, sogno, notte, cuscino, riposare
Supermercato: spesa, carrello, cassa, prodotti, negozio
Mago: bacchetta, incantesimo, magia, cappello, trucco
Montagna: vetta, scalare, alta, neve, escursione
Telefono: chiamare, squillo, cellulare, numero, rispondere
Ombrello: pioggia, manico, aprire, bagnato, riparo
Bicicletta: pedali, ruote, manubrio, sella, pedalare
Cuoco: cucina, ristorante, chef, pentola, piatti
Lupo: bosco, ululare, cappuccetto, pecora, branco
Specchio: riflesso, vedere, vetro, bagno, immagine
Palloncino: gonfiare, aria, scoppiare, festa, elio
Giardino: fiori, prato, piante, erba, annaffiare
Poliziotto: ladro, arrestare, divisa, pistola, carabiniere
Pittore: quadro, colori, pennello, tela, dipingere
Compiti: scuola, casa, quaderno, studiare, esercizi
Ristorante: cameriere, menù, tavolo, cena, conto
Elefante: proboscide, zanne, grande, Africa, grigio
Pigiama: notte, letto, dormire, indossare, vestito
Torta: dolce, forno, farina, compleanno, panna
Albero: foglie, tronco, rami, bosco, radici
Principessa: castello, principe, regina, favola, corona
Autostrada: macchina, pedaggio, casello, corsia, velocità
Barba: peli, rasoio, viso, uomo, baffi
Cioccolato: dolce, cacao, tavoletta, fondente, marrone
Tennis: racchetta, rete, palla, campo, Federer
Luna: notte, cielo, satellite, stelle, piena
Uovo: gallina, guscio, tuorlo, frittata, colazione
Supereroe: mantello, poteri, Superman, salvare, maschera
Sciare: neve, montagna, piste, sci, inverno
Passaporto: viaggio, documento, frontiera, straniero, foto
Spazzolino: denti, dentifricio, lavare, bagno, setole
Cavallo: galoppo, sella, stalla, zoccoli, fantino
Fumetto: nuvoletta, disegni, supereroi, pagina, vignetta
Parrucchiere: capelli, taglio, forbici, phon, asciugare
Tuono: fulmine, temporale, rumore, cielo, lampo
Coltello: tagliare, lama, cucina, affilato, forchetta
Zaino: schiena, scuola, spalle, borsa, viaggio
Tartaruga: guscio, lenta, mare, rettile, carapace
Chiave: porta, serratura, aprire, chiudere, casa
Piscina: nuotare, acqua, tuffo, costume, bagnino
Semaforo: rosso, verde, giallo, strada, incrocio
Carnevale: maschera, coriandoli, travestimento, febbraio, sfilata
Pecora: lana, gregge, belare, agnello, pascolo
Mercato: bancarelle, vendere, comprare, frutta, piazza
Astronauta: spazio, razzo, luna, tuta, navicella
Radio: musica, ascoltare, stazione, onde, frequenza
Cappello: testa, copricapo, sole, indossare, berretto
Matita: scrivere, disegnare, gomma, punta, temperare
Formaggio: latte, mucca, topo, parmigiano, stagionato
Dinosauro: preistoria, estinto, giganti, fossile, rettile
Caramella: zucchero, dolce, bambini, scartare, gusto
Ladro: rubare, polizia, furto, banda, derubare
Birra: bere, luppolo, boccale, schiuma, spina
Giraffa: collo, alta, Africa, macchie, savana
Sedia: sedersi, tavolo, gambe, seduta, schienale
Fiume: acqua, ponte, scorre, sponda, mare
Casa: abitare, tetto, porte, finestre, famiglia
Strega: scopa, magia, Halloween, pozione, cappello
Esame: studiare, voto, scuola, professore, promosso
Pallavolo: rete, schiacciata, palla, squadra, muro
Pasta: spaghetti, sugo, acqua, bollire, cuocere
Lampadina: luce, accendere, elettricità, lampada, buio
Formica: insetto, piccola, formicaio, lavoratrice, cicala
Vino: uva, bottiglia, rosso, bicchiere, cantina
Cassetto: scrivania, mobile, aprire, comodino, tirare
Fuoco: fiamma, bruciare, caldo, legna, accendino
Tenda: campeggio, dormire, montare, finestra, telo
Panettiere: pane, forno, farina, negozio, pagnotta
Prigione: carcere, detenuto, sbarre, cella, evadere
Sveglia: mattina, suonare, orologio, dormire, ora
Miele: ape, dolce, alveare, vasetto, api
Luna park: giostre, ruota, divertimento, montagne russe, biglietti
Dado: gioco, numeri, lanciare, facce, sei
Stella: cielo, notte, brillare, luce, galassia
Granchio: mare, chele, spiaggia, camminare, crostaceo
Spaventapasseri: campo, paglia, uccelli, cappello, contadino
Rubinetto: acqua, lavandino, aprire, goccia, bagno
Videogioco: console, giocare, joystick, schermo, livello
Tatuaggio: pelle, disegno, ago, inchiostro, corpo
Bosco: alberi, funghi, foresta, passeggiata, animali
Ruota panoramica: giro, alta, luna park, vista, cabina
Cantante: canzone, microfono, voce, concerto, cantare
Orso: miele, bosco, letargo, peluche, grizzly
Insalata: verdura, lattuga, condire, olio, pomodori
Ginocchio: gamba, piegare, articolazione, caduta, rotula
Nuvola: cielo, bianca, pioggia, grigia, vapore
Funivia: montagna, cabina, salire, cavo, impianto
Vulcano: lava, eruzione, Etna, cratere, fuoco
Pinguino: freddo, ghiaccio, Antartide, bianco, nero
Tombola: numeri, cartella, estrarre, Natale, bingo
Fisarmonica: strumento, mantice, tasti, suonare, musica
Cravatta: collo, nodo, camicia, giacca, elegante
Serratura: chiave, porta, scassinare, chiudere, lucchetto
Portafoglio: soldi, tasca, banconote, carte, borsellino
Occhiali: vista, lenti, naso, vedere, montatura
Bagnoschiuma: doccia, sapone, lavarsi, profumo, vasca
Cacciavite: vite, attrezzi, girare, utensile, avvitare
Carte da gioco: mazzo, poker, scopa, briscola, assi
Pallone: calcio, rotondo, calciare, gonfio, sfera
Gufo: notte, uccello, occhi, saggio, Harry Potter
Burro: latte, pane, spalmare, giallo, cucina
Elicottero: pale, volare, eliporto, soccorso, cielo
Cartolina: vacanza, francobollo, spedire, saluti, scrivere
Treno merci: vagoni, carico, binario, trasporto, locomotiva
Tovaglia: tavolo, cucina, pranzo, stoffa, apparecchiare
Sandalo: piede, estate, spiaggia, scarpa, infradito
Gondola: Venezia, canale, gondoliere, barca, remo
Pagliaccio: circo, naso rosso, ridere, clown, trucco
Circo: tendone, acrobata, leone, pagliaccio, spettacolo
Trapunta: letto, coperta, inverno, piumone, caldo
Biglietto: treno, cinema, comprare, ingresso, prezzo
`;

export interface Carta {
  parola: string;
  vietate: string[];
}

export const CARTE: Carta[] = GREZZE.split("\n")
  .map((r) => r.trim())
  .filter((r) => r.includes(":"))
  .map((r) => {
    const [parola = "", resto = ""] = r.split(":");
    return { parola: parola.trim(), vietate: resto.split(",").map((v) => v.trim()) };
  });
