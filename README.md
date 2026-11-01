# Meal Planner

PWA personale (Vite + Preact) per ricette, lista della spesa e planner dei pasti. Hosting su GitHub Pages, dati su Google Sheet via Google Apps Script.

Stato: **Fase 0 (fondamenta)**. Le tre sezioni sono ancora placeholder.

## Avvio

```bash
npm install
npm run dev        # sviluppo
npm run build      # build in dist/
npm run preview    # anteprima della build
```

Accedi con il token `mock` per usare i dati fittizi locali. Un token errato viene rifiutato (con il backend reale lo verifica Apps Script).

## Modalità mock

- Dati in `mock/mock.xlsx` (copia servita da `public/mock/mock.xlsx`). Rigenerali con `npm run mock:generate` (scrive in entrambe le cartelle).
- Le modifiche fatte in app restano in `localStorage`; il pulsante "Reset mock" le cancella.
- Il file va caricato via HTTP (dev server o preview), non da `file://`.

## Setup Google Apps Script

1. Crea un Google Sheet e importa `mock/mock.xlsx` (stessi fogli e intestazioni).
2. Estensioni > Apps Script: incolla `apps-script/Code.gs`.
3. Impostazioni progetto > Proprietà dello script: `TOKEN` = la tua password.
4. Distribuisci come Web App (esegui come "Me", accesso "Chiunque") e incolla l'URL in `GAS_URL` in `src/config.js`.

## Deploy

Il workflow `.github/workflows/deploy.yml` pubblica su GitHub Pages ad ogni push su `main` (Settings > Pages > Source: GitHub Actions). Vite usa `base: './'`.
