# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

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
