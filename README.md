# UniTrack

App web per studenti dell'Università di Pisa che permette di visualizzare il libretto esami, monitorare i crediti acquisiti e calcolare la media in tempo reale, direttamente dal portale ESSE3 di UniPi.

---

## Funzionalità

- **Login sicuro** tramite credenziali del portale UniPi (Basic Auth su ESSE3)
- **Libretto esami** con elenco degli esami superati e da sostenere
- **Statistiche** in tempo reale:
  - Media ponderata /30
  - Proiezione base di laurea /110
  - Conteggio esami superati
- **Barra progresso CFU** rispetto al totale del corso (120 CFU)
- **Aggiornamento manuale** del libretto con il pulsante "Aggiorna"
- **Aggiunta/modifica/eliminazione esami** tramite modal (per simulare scenari futuri)
- **Sessione persistente** tramite `localStorage` — nessun login ad ogni avvio

---

## Stack tecnologico

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) come build tool e dev server
- [Tailwind CSS v4](https://tailwindcss.com/) per lo stile
- API REST ESSE3 (CINECA) tramite proxy Vite

---

## Struttura del progetto

```
src/
├── api.ts              # Chiamate API ESSE3 (login, libretto)
├── App.tsx             # Componente principale
├── main.tsx            # Entry point React
├── index.css           # Import Tailwind
├── types.ts            # Tipi TypeScript (Exam, StudentInfo, LibrettoRow)
└── components/
    ├── LoginPage.tsx   # Pagina di accesso
    ├── ExamCard.tsx    # Card singolo esame
    └── ExamModal.tsx   # Modal per aggiungere/modificare esami
```

---

## Requisiti

- Node.js 18+
- npm 9+
- Accesso alla rete UniPi (necessario per raggiungere il proxy ESSE3)

---

## Installazione e avvio

```bash
# Clona il repository
git clone <url-repo>
cd unitrack

# Installa le dipendenze
npm install

# Avvia il dev server
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`.

---

## Configurazione del proxy

Il dev server Vite deve fare da proxy verso il portale ESSE3 di UniPi per evitare errori CORS. Assicurati che `vite.config.ts` contenga:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/e3rest': {
        target: 'https://studenti.unipi.it',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
```

---

## Note sulla sicurezza

- Le credenziali vengono usate esclusivamente per autenticarsi su ESSE3 e non vengono mai inviate a server di terze parti.
- Il token di sessione (Basic Auth in Base64) viene salvato in `localStorage` per mantenere la sessione attiva tra i refresh. Per rimuoverlo è sufficiente fare logout dall'app.
- L'app comunica direttamente con l'API ESSE3 di UniPi tramite il proxy locale — nessun backend intermedio.

---

## Limitazioni note

- Funziona solo con atenei che usano ESSE3/CINECA come sistema di gestione carriera. Testato su **Università di Pisa**.
- Il totale CFU è impostato a **120** (laurea magistrale). Per corsi triennali modificare la costante `TOTAL_CFU` in `App.tsx`.
- Le tasse e le prenotazioni esami non sono disponibili via API — i relativi portali UniPi (`studenti.unipi.it`, `esami.unipi.it`) non espongono endpoint REST accessibili dall'esterno.

---

## Build per produzione

```bash
npm run build
```

L'output sarà nella cartella `dist/`. Da notare che in produzione il proxy Vite non è disponibile — sarà necessario configurare un reverse proxy (es. Nginx) che instradi `/e3rest` verso `studenti.unipi.it`.
