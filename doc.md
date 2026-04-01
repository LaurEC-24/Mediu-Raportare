# Manualul Aplicației - Mediu-Raportare

## Despre Aplicație
Aplicația "Mediu-Raportare" este un instrument intern modernizat, conceput pentru automatizarea verificării, analizei și monitorizării datelor de Mediu privind emisiile orare din rapoartele de la diverse instalații și centrale.

Scopul principal este validarea rapoartelor generate din sistemul SAM (fișiere Excel .xls, .xlsx, .xlsm), simplificând detectarea depășirilor, calculul mediilor aritmetice și verificarea încrucișată a cifrelor publice postate pe site-ul oficial ELCEN, precum și identificarea exactă a momentelor de oprire sau nefuncționare a agregatelor (lipsă date).

## Componente și Funcționare

### 1. Sistemul de Autentificare
Aplicația este protejată de un mecanism de Login, având rolul de a împiedica accesul neautorizat la modificarea setărilor și încărcarea documentelor. După autentificarea cu succes, utilizatorul obține acces total la rutele platformei.

### 2. Management Limite Generale (Centrale și Agregate)
Secțiunea de "Setări" permite administrarea infrastructurii energetice monitorizate.
- Structură ierarhică: Centrale (Ex: CTE SUD, CTE PROGRESU) care au asociate Agregate (Ex: IA1, IA2, IA3, IA4).
- Limitele permise (ex. SO2, Nox, Pulberi, CO, O2, Umiditate mas, Temperatura, Presiune) pot fi configurate independent pentru fiecare agregat.
- Datele (structura de organizare și limitele) sunt stocate permanent într-o bază de date SQLite (`database.sqlite`), persistând între sesiuni sau reinițializări Docker.

### 3. Modulul Principal de Verificare (Dashboard)
Nucleul funcțional al aplicației.

1. **Încărcarea Maintence-Free a Fișierului**: Suportă formate moderne și legacy (.xlsx, .xls) precum și tab-uri cu macro-uri VBA (.xlsm), pe care le ignoră la citirea datelor pure. 
2. **Auto-Detecție Inteligentă**: Încearcă să deducă automat din denumirea fișierului ce Plant (Centrală) și ce Agregat a generat fișierul. Operatorul uman are mereu posibilitatea să selecteze/schimbe manual aceste informații din drop-down.
3. **Verificare Existență Agregat**: Aplicația necesită și verifică ca denumirea agregatului selectat să corespundă fix cu unul din tab-urile existente în fișier (ex. "IA4"). Dacă tab-ul lipsește, operațiunea se oprește precis și previne rezultate gresite.
4. **Validarea Limitelor și Indexarea Alertelor**: Analizează emisiile și semnalează dacă s-au depășit barierele (la mediile orare sau zilnice), arătând utilizatorului exact pe ce `Rând Excel` se pot identifica acestea în fișier pentru a se verifica ușor.
5. **Verificarea Acurateții Mediilor Zilnice**: Calculează media pură din intervalele orare parcurse și o compară direct cu Media Matematică trecută fix de operator la finalul calupului de cifre pentru ziua respectivă (sau la subsolul paginii). Adaugă avertizări prețioase la discrepanțe.
6. **Detectare Opriri (Nefuncționări)**: Rândurile care nu conțin absolut nicio valoare la noxe pentru o oră din zi, dar a căror rubrică de oră și dată se regăsește în coloane, sunt indexate automat și extrase. Afișează totalul orelor oprite și intervalele exact identificate de nefuncționare. De asemenea, avizează și în cazul tab-urilor complet goale.
7. **Integrare Site ELCEN (Verificare site public)**: Utilizatorul poate solicita prin apăsarea celui de-al doilea buton (`🌐 Execută Verificarea Site ELCEN`) extragerea real-time, în back-end, a datelor postate pe site-ul Elcen pentru mediile zilnice din ziele respective, și compararea cu cele calculate în Excel.  O eventuală neconcordanță publică va fi expusă clar de sistem.

## Detalii Tehnice

### Frontend (User Interface)
- **Tehnologie:** Aplicație Single Page creată în **React.js** și ambalată în **Vite** pentru încărcare light-speed.
- **Stilizare:** **Tailwind CSS** asigură module responsive și componentizare vizuală simplă și elegantă (Alerte, Dashboard-uri, Modale).
- **Comunicare:** Preluare date prin AJAX calls cu librăria **Axios** (pe API-ul Express backend). 

### Backend (Server Logic)
- **Tehnologie API:** Server robust în platforma **Node.js** cu framework-ul **Express.js**.
- **Procesare Fișiere:** Sistem rapid din memorie (`multer` în RAM) legat de super-librăria **xlsx** care convertește documentele .xlsx / .xlsm direct la colecții JSON native pentru parcurgerea logică la distanțe mari de celule fără consum mare de CPU. 
- **Baza de Date:** **SQLite** integrat via **Sequelize** ORM pentru a reduce nevoia unei baze server terțe (cum ar fi MySQL), scriind fișiere structurate rapid.
- **Scraping Automat:** Engine complet ascuns cu **Puppeteer** (Chrome Headless) instruit pentru a naviga, selecta perioadele specifice din calendarul ELCEN și compara tabelele HTML publice, extrăgând mediile. 

### Deployment & Mediu
Tot sistemul stă deasupra asistentului **Docker** folosind infrastructură multi-container (front, back). Rularea presupune simplu orchestratorul `docker-compose up --build`. Datele de bază din SQLite rezistă grație mapărilor volumelor docker, la fel și pachetele build-uite, izolând practic sistemul și interdependențele node_modules de PC-ul client fizic.

#### Deployment Portainer (Producție)
Aplicația se instalează din Portainer prin "Add stack", folosind fișierul `docker-compose.prod.yml`.
Pentru o funcționare corectă, definiți direct în codul YAML al stack-ului din Portainer credențiale puternice pentru:
- `DB_USER` și `POSTGRES_USER`
- `DB_PASS` și `POSTGRES_PASSWORD`

Pentru un refresh curat al bazei de date (ștergerea vechilor informații blocate de volume), adăugați varianta finală a numelui volumului la finalul fișierului: `postgres_data_v2`.

#### Gestiunea conturilor noi (Parole)
Nu există interfață grafică de înregistrare. Pentru adăugarea de noi operatori direct în baza de date via DBeaver, parola trebuie criptată `bcrypt`. 
Dintr-un terminal local executați:
`node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('parola_noua', 10).then(console.log);"`
Introduceți rezultatul Hashului în coloana `password` a noului utilizator.

---
*(Fișierul doc este actualizat recurent adăugării modulelor și capabilităților noi analitice ale aplicației)*
