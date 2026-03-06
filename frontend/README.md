# Mediu-Raportare - Frontend

Acesta este modulul client-side (Frontend) al aplicației `Mediu-Raportare`, dezvoltat cu tehnologii moderne pentru a oferi o experiență de utilizare rapidă și o interfață grafică responsivă.

## Stack Tehnologic
- **React 18** - Bibliotecă pentru construirea interfețelor cu utilizatorul.
- **Vite** - Build tool ultra-rapid pentru dezvoltare frontend.
- **Tailwind CSS** - Framework de utility-first CSS pentru stilizarea rapidă și flexibilă a componentelor.
- **Axios** - Client HTTP pentru comunicarea cu instanța API din backend.
- **React Router Dom** - Gestionarea rutelor interne din aplicație (SPA).
- **Recharts** - Generare de grafice dinamice pentru analizele orelor/datelor de pe agregate.

## Structură Proiect

```
src/
├── assets/         # Imagini, logo-uri.
├── components/     # Componente reutilizabile de interfață (Layout, ChartModal, Navbar).
├── pages/          # Ecranele principale ale aplicației:
│   ├── Login.jsx       # Pagina de autentificare
│   ├── Dashboard.jsx   # Inima aplicației - Verificarea Excel-urilor și a alertelor
│   ├── Settings.jsx    # Administrarea centralelor, agregatelor și configurarea limitelor de emisii
├── services/       # Containere pentru call-urile externe (api.js - configurare Axios).
├── index.css       # Importul setărilor globale de TailwindCSS.
└── main.jsx        # Punctul de intrare (Entry Point) pentru instanța de React.
```

## Funcționalități Esențiale

1. **Dashboard-ul de Verificare**:
   - Acceptă încărcarea fișierelor `.xls`, `.xlsx` și `.xlsm`.
   - Efectuează o rutină inteligentă de auto-alegere a Centralei (Plant) și Agregatului din numele fișierului, oferind posibilitatea de corecție manuală.
   - Prezintă un centralizator al rezultatelor analizei, inclusiv:
     - Date confirmate ca fiind **complet goale** (Agregat oprit).
     - **Timpul de nefuncționare**: O listă expandabilă și indexată cu orele în care senzorii/agregatele nu au înregistrat emisii (lipsă date).
     - **Discrepanțele Mediei Orar-Zilnic**: Alerte dacă media comunicată aritmetic și calculul matematic preluat de algoritmul Excel nu coincid.
     - **Alarmane Depășire**: Analiză individuală la nivel orar pentru fiecare noxă (SO2, Nox, CO, etc.), indicată cu linia și rândul exact (`[Rând Excel: X]`).

2. **Panoul de Setări Administrtive**:
   - Gestiunea nodurilor energetice din baza de date folosind interfețe de tip tree/cards.
   - Crearea, vizualizarea și ștergerea de Noi Agregate/Centrale (din interfață dreapta sau drop-down grid).
   - Aplicarea limitelor maxime admise (parametrizate fin) pentru valorile fizice reale măsurate pe fiecare generator.

## Inițializare Locală Manuală (fără Docker)
```bash
# 1. Instalarea pachetelor dependente
npm install

# 2. Pornirea build-ului în modul observator (Dev Mode)
npm run dev

# 3. Compilarea producției
npm run build
```

_Notă: Pentru instalare facilă a întregului proiect (front + back), vă rugăm folosiți la rădăcina proiectului comanda globală `docker-compose up --build`._
