# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

## 2.3.1 — 2026-11-15

- Nou: butoane de distribuire pe rețele sociale (vertical, pe marginea din stânga; fără scripturi externe, doar linkuri deschise la clic); bara de zoom cu lupă și „potrivire ecran” revine pe marginea din dreapta, centrată pe verticală; corectat afișarea suprapusă la zoom mare (panourile cu înălțimi în vh/vw nu mai ies din ecran).

## 2.3.0 — 2026-11-15

- Nou: accesibilitate pe toate ecranele — butonul „Aa” (mărimea textului, contrast ridicat, fără animații, text lizibil, linkuri subliniate, citire cu voce), săgeata „Înapoi sus” și „Sari la conținut”; fereastra se potrivește mereu ecranului; zoom-ul cu lupă și „potrivire ecran” stau acum pe marginea din stânga (fff-kit 1.6.0).

## 2.2.7 — 2026-11-15

- Nou: texturi fractale hiper-detaliate (fff-texturi 1.1.2) — fundalul și suprafețele mari (carduri, panouri, antete, butoane; filele și dialogurile ascunse la încărcare, când se deschid) primesc un material generat local (WebGL2, fără rețea și fără imagini), care se repetă fără cusătură; culorile aplicației rămân ale ei. Se oprește din dialogul „Transparență” sau cu `?notex=1`.

## 2.2.0 — 2026-11-02 (reîmprospătare kit)

- Nou (kit): **Sincronizare între dispozitive** (`FFF.sync`) — în dialogul «Transparență» (clic pe versiune → Copie de siguranță): conectezi două dispozitive direct (WebRTC, cod/QR, fără server și fără cont) și își schimbă datele aplicației; cea mai recentă valoare câștigă, secretele (chei API, parole) nu se trimit, ștergerile nu se propagă. Aplicarea trece prin importul kitului (confirmare, chei permise, rollback).
- Nou (kit): **Istoric local — «mașina timpului»** (`FFF.history`) — instantanee automate ale datelor (IndexedDB, fără secrete), diferență față de starea curentă și restaurare reversibilă; «Șterge datele aplicației» șterge și istoricul.
- Module adăugate: `qr`, `p2p`, `sync`, `history` (+~140 KB). Versiunea aplicației nu se schimbă.

## 2.2.0 — 2026-10-27

Anterior: v2.1.0.

- Nou: **acoperirea monitorizării**. Aplicația ține acum o evidență a intervalelor în care fila a fost deschisă (un puls la ~60 s; un gol mai mare de 5 minute începe un interval nou) și o arată în „Istoric de funcționare (30 de zile)”: „Fila a fost deschisă X% din timp de la <data> …”, cu avertismentul că întreruperile cât fila e închisă nu se înregistrează. Evidența se păstrează într-o cheie separată (`outpost_watch_v1`, maxim 400 de intervale) și nu intră în exportul jurnalului. **Numărătoarea începe la prima pornire cu 2.2.0**: trecutul nu se poate reconstitui, iar linia apare după cel puțin o oră de date.
- Procentele de funcționare existente NU s-au schimbat (tot calculate din episoade); acoperirea le explică, nu le corectează.
- Test nou `tests/coverage.test.mjs` (16 verificări: calcul pe intervale, puls, gol, date invalide, 7 limbi). Existente: `limits-history` și `status-page` trec.
- Textele noi: RO și EN scrise, fr/it/es/pt/de/hu traducere automată, neverificată nativ.
- Neimplementat: monitorizare în fundal / push (imposibil fără server); `fff-r8.test.mjs` (cere `axe-core`, indisponibil aici).

## 2.1.0 — 2026-10-27

Anterior: v2.0.0.

- Nou: panoul „Limitele monitorizării din browser” (doar cât fila e deschisă; CORS; „Mut” poate fi local; procentele pot supraestima disponibilitatea), în 8 limbi; notă lângă „Ascultare automată”.
- Nou: buton „Test sunet” (ton grav + ton acut).
- Nou: „Istoric de funcționare (30 de zile)” pe fiecare stație (bare zilnice UTC).
- Documentație: „Stare” și „Offline” în README.
- Teste: `tests/limits-history.test.mjs` (23 de verificări).
- Notă: traducerile noilor texte în FR/IT/ES/PT/DE/HU sunt automate, neverificate de vorbitori nativi.
