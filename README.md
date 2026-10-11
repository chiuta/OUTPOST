# OUTPOST

**Ultima actualizare:** 11 octombrie 2026

Post de ascultare pentru site-urile tale: un monitor de accesibilitate (reachability) într-un singur fișier HTML, care rulează numai în browser.

**Live:** https://chiuta.github.io/OUTPOST/

![Captura de ecran](screenshot.png)

## Ce este

OUTPOST verifică, din browserul tău, dacă site-urile pe care le adaugi „răspund”, păstrează istoricul verificărilor și al căderilor și îți arată un status pe stație („Contact”, „Silent”, „Faint”). Nu există server, cont sau telemetrie; lista de stații și jurnalul rămân în `localStorage`-ul browserului tău. La prima deschidere lista este goală (poți adăuga trei stații-exemplu cu un clic).

Interfața aplicației este în limba engleză.

## Funcții

Verificate în cod și, unde se poate, în teste automate (Chromium headless, rețea simulată):
- Adăugare de stații (URL, etichetă, categorie, subcategorie, server), grupare după categorie sau server, sortare (health, latență, nume, recent), filtru „doar probleme”.
- „Listen now” + „Auto-listen” (30 s … 30 min), timeout 5–30 s, „Confirm after” 1–3 verificări înainte ca o stație să fie afișată ca „Silent”.
- Trei semnale: cerere `HEAD` cu `mode: no-cors`, probă `favicon.ico` de pe origine, iar opțional (dezactivat implicit) rezoluție DNS prin Cloudflare DNS-over-HTTPS.
- Episoade de cădere (început, sfârșit, durată, notă), predicție orientativă „typically back within…”, buget de 30 de zile față de o țintă de uptime, scor „Health”.
- Ferestre de mentenanță (30 min … „până o închid eu”), note de tip runbook per stație, memento repetat, ore de liniște, sunet și notificări de browser la schimbare.
- „Canary” opțional (dezactivat implicit): verifică google.com și cloudflare.com ca să deosebească o problemă a conexiunii tale de una a stațiilor.
- Export/import al jurnalului (JSON), „Share status page” (instantaneu HTML static), insignă SVG per stație, sincronizare între taburi, rezumat „While you were away”.
- Scurtături: `/` (câmpul de adăugare), `L` (listen now), `E` (export).

## Manual de utilizare

1. Deschide pagina. La început lista este goală; apasă „Add 3 example stations” ca să vezi cum arată, sau scrie un URL în „Add a station” și apasă „Add station”.
2. Apasă „Listen now” (sau alege „Auto-listen”). Fiecare stație primește o stare: „Contact” (a răspuns ceva), „Silent” (nu a răspuns), „Faint” (semnale contradictorii).
3. Deschide „How the listening works” din subsol pentru explicația semnalelor.
4. Folosește „Export log” pentru copie de rezervă și „Import log” pentru a muta lista pe alt browser/dispozitiv (la import poți înlocui sau îmbina).
5. „Share status page” descarcă un fișier HTML static, fără script, pe care îl poți încărca oriunde.
6. Pentru a activa semnalul DNS sau „canary”, bifează-le în panoul de comenzi (vezi mai jos ce se trimite și cui).

## Confidențialitate și rețea

- **Stocare locală:** `localStorage`, cheia `outpost_state_v1` (stații, istoric, episoade, note, setări, ultimele adrese IP rezolvate). Dacă stocarea e blocată, aplicația afișează un avertisment și funcționează doar în sesiunea curentă.
- **Către ce site-uri se conectează:** la prima deschidere, către niciunul. După ce adaugi stații, browserul tău trimite fiecărei stații câte o cerere `HEAD` și una pentru `/favicon.ico`; stația vede adresa ta IP, ca la orice vizitator.
- **Opțional, dezactivat implicit:** „DNS signal” trimite numele fiecărei gazde la `cloudflare-dns.com`; „Canary” contactează `www.google.com` și `www.cloudflare.com` după fiecare serie de verificări. Dacă le activezi, acei terți primesc adresa ta IP și (pentru DNS) numele gazdelor monitorizate.
- Nu există scripturi, fonturi sau imagini încărcate de pe alte domenii. Pagina are o politică CSP (`Content-Security-Policy`) care permite doar scriptul/stilul din fișier.
- Permisiuni cerute doar când bifezi: notificări (la bifarea „Notify on change”), sunet (Web Audio).
- Fișierul exportat (`outpost-log-*.json`) conține lista ta de stații, note și ultimele IP-uri: tratează-l ca privat.

## Limite și avertismente

- **„Contact” înseamnă doar că ceva a răspuns la nivel de rețea.** Din browser nu se poate citi codul HTTP: o pagină de eroare (404, 500, 502) sau o pagină de întreținere tot apare ca „Contact”. „Silent” poate însemna și că problema este la tine (rețea, VPN, extensie de blocare, firewall), nu la site.
- Nu verifică conținutul paginii, certificatul TLS sau expirarea domeniului.
- O pagină servită prin HTTPS (ca GitHub Pages) nu poate verifica stații `http://` (conținut mixt blocat de browser): acestea sunt marcate „Unlogged” cu explicație, nu „Silent”. Deschide fișierul local (`file://`) pentru stații HTTP.
- Monitorizarea funcționează doar cât tab-ul este deschis; browserele încetinesc temporizatoarele din taburile inactive, iar telefonul blocat nu verifică. Nu înlocuiește un serviciu de monitorizare pe server.
- Nu am testat verificările pe stații reale prin internet; testele automate au folosit rețea simulată.

## Rulare locală / offline

Descarcă `index.html` și deschide-l în browser. Fișierul în sine nu are nevoie de internet; verificările au, firește, nevoie de acces la stațiile monitorizate.

## Licență

CC0 1.0 Universal (dedicare în domeniul public), conform declarației din fișier; vezi `LICENSE`.

## Autor

Alexio — Alexandru-Ionuț Chiuță, contact: alexio@trom.tf

## English summary

OUTPOST is a single-file, browser-only reachability monitor (no server, no account, no telemetry). A fresh install contacts nothing; it only probes the stations you add (HEAD no-cors request plus /favicon.ico). Optional, off by default: Cloudflare DNS-over-HTTPS lookups and a Google/Cloudflare canary. "Contact" only means that something answered; it cannot read HTTP status codes. State lives in localStorage; imported files are validated. CC0 1.0.

## Istoric / Changelog

### 11 octombrie 2026
- Adresele invalide (cu spații sau fără nume de gazdă valid, ex. „not a url !!”) sunt acum respinse cu „Not a valid URL” în loc să fie adăugate.
- Conținutul este încadrat în `<main>`: 0 încălcări axe (landmark, region); fundalul acoperă acum toată înălțimea paginii.
