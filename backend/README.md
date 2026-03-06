# Mediu-Raportare - Backend

Acesta este modulul server rapid (Backend-ul) al aplicației `Mediu-Raportare`, responsabil cu operarea logicii complexe de validare Excel a mediilor raportate de operatori și salvarea limitelor de instalație.

## Stack Tehnologic
- **Node.js** cu framework-ul **Express.js** pentru servirea pachetelor JSON pe portul 5000.
- **Sequelize** (ORM conectat la baza de date file-based **SQLite**) pentru structura dinamic-relațională (Plants 1:N Aggregates).
- **Puppeteer** pentru verificările web încrucișate (Cross-Site Validation) a datelor publice, utilizând simularea unui browser curat și izolat Chromium.
- **Multer** pentru recepționarea fișierelor Excel `.xls` / `.xlsm` exclusiv din **RAM** (nu poluează mașina cu date stocate pe parcursul validării).
- **xlsx** - Motor de procesare masivă a calculelor pentru array-urile mari de tabele de mediu. Ignoră macro-urile (scripturile Visual Basic) ascunse.

## Structura Bazei de Date (din baza `database.sqlite`)

Baza de date relațională persistă datele între sesiuni și se adaptează automat.  Structura este minimalistă:
1. `User` - Modele simple pentru autentificarea administratorilor și operarea Tokenului de securitate JWT (JSON Web Tokens). (ex. bcrypt, jsonwebtoken).
2. `Plant` - Definește o Centrală Termoelectrică principală (CTE). Ex: CTE PROGRESU, CTE GROZAVESTI, etc.
3. `Aggregate` - Copil relațional (FK: `plantId`); reține configurația generatorilor de reabilitare. Ex: IA1, IA2... Fiecare agregat adăpostește ca proprietate JSON propriile reguli - stringurile de *limite admise* de noxe.

## Responsabilități Controller Rapoarte (`reportController.js`)
Motorul principal care transformă un fișier Excel în date reale:
- Folosește logica `SheetNames` de a găsi fix acea filă care conține agregatul selectat prin parametrul aplicației. Trimite eroare (status 400) dacă tab-ul sau instalația respectivă nu există în mod clar în tabel.
- Colectează **toate depășirile** de factori fizici din limitele primite de la baza de date pentru acel Agregat și expune rezultatele arătând precis **`Rândul din Excel`** în care a apărut valoarea interzisă.
- Căută lipsa de date (ore complet sărite) pentru a putea expune și număra "Orele de nefuncționare", inclusiv pe baza datei și numărului aferent de dinaintea header-ului Excel.
- Trimite automat parametrii descoperiți ca rapoarte zilnice agregate (Tabel de medii finale) la componenta scraper a Puppeteer-ului (`elcenScraper.js`). 

## Logica Scraper-ului Puppeteer (`elcenScraper.js`)
- Este rulat temporar în context Sandbox (`--no-sandbox`).
- Navighează autonom pagina principală eLCEN, localizează form-ul tip bloc (Calendar UI) care conține graficele, alege Centrala respectivă, face refresh și găsește exact Media Zilnică postată public pe internet de un alt operator în paralel cu cele declarate de utilizatorul de bază local.

## Inițializare Locală Manuală (fără Docker)
```bash
# 1. Instalarea bibliotecilor din NPM
npm install

# 2. Generarea modelului de bază prin logica automată Sequelize (Rulează scripturile) / Pornirea în mod Dev (Nodemon)
npm run dev
```

Aceasta presupune ca la prima accesare a bazei de date API-ul va forța `sequelize.sync()`. Pentru conectarea între amândouă servere, recomandăm execuția globală prin `docker-compose`.
