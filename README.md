# UniTrack

App personale per tracciare il libretto universitario, pensata per gli studenti dell'Università di Pisa. Si collega direttamente a ESSE3 e mostra media ponderata, base di laurea e avanzamento CFU in tempo reale.

![UniTrack screenshot](src/assets/hero.png)

---

## Funzionalità

- **Login con le credenziali ESSE3** (le stesse del portale studenti UniPi)
- **Media ponderata** calcolata secondo il regolamento del Dipartimento di Informatica (30L vale 32, idoneità escluse)
- **Base di laurea /110** (conversione diretta dalla media)
- **Barra CFU** con avanzamento sul totale del corso
- **Lista esami superati** ordinata per data
- **Lista esami da sostenere** (collassabile)
- **Sessione persistente** tramite `localStorage` — nessun login ad ogni avvio

---

## Stack tecnologico

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- PWA con `vite-plugin-pwa` (installabile su desktop e mobile)
- Proxy verso ESSE3 tramite Vite in locale e Vercel in produzione

---

## Installazione come app (PWA)

L'app è installabile direttamente dal browser, senza passare da App Store o Play Store.

### iPhone / iPad (Safari)

1. Apri l'URL dell'app in Safari
2. Tocca il tasto **Condividi** (rettangolo con freccia in su)
3. Scorri e seleziona **"Aggiungi alla schermata Home"**
4. Conferma con **Aggiungi**

L'app si aprirà a schermo intero senza la barra di Safari.

### Android (Chrome)

1. Apri l'URL in Chrome
2. Comparirà un banner **"Aggiungi a schermata Home"** — tocca **Installa**
3. In alternativa: menu (⋮) → **"Installa app"**

### Computer — Chrome / Edge

1. Apri l'URL nel browser
2. Clicca l'icona di installazione nella barra degli indirizzi (schermo con freccia)
3. Clicca **"Installa"**

L'app si aprirà in una finestra dedicata senza interfaccia del browser.

### Computer — Safari (macOS)

1. Apri l'URL in Safari
2. Menu **File** → **"Aggiungi alla Dock"**

---

## Sviluppo locale

```bash
npm install
npm run dev
```

L'app gira su `http://localhost:5173`. Il proxy Vite reindirizza automaticamente le chiamate verso `studenti.unipi.it`, quindi non serve configurazione aggiuntiva.

---

## Deploy su Vercel

Il file `vercel.json` configura il proxy verso ESSE3:

```json
{
  "rewrites": [
    {
      "source": "/e3rest/:path*",
      "destination": "https://www.studenti.unipi.it/e3rest/:path*"
    }
  ]
}
```

Per pubblicare:

1. Carica il progetto su GitHub
2. Vai su [vercel.com](https://vercel.com) e importa il repository
3. Lascia le impostazioni di default e clicca **Deploy**

Vercel assegna un URL pubblico con HTTPS, necessario per il funzionamento della PWA su mobile.

---

## Struttura del progetto

```
src/
├── api.ts              # Chiamate API ESSE3 (login, libretto)
├── App.tsx             # Componente principale e calcolo statistiche
├── main.tsx            # Entry point React
├── index.css           # Import Tailwind
├── types.ts            # Tipi TypeScript (Exam, StudentInfo, LibrettoRow)
└── components/
    ├── LoginPage.tsx   # Pagina di accesso
    ├── ExamCard.tsx    # Card singolo esame
    └── ExamModal.tsx   # Modal dettaglio esame
```

---

## Rigenera le icone PWA

Se modifichi `public/pwa-icon.svg`, rigenera i PNG con:

```bash
npm run generate-pwa-assets
```

---

## Note sulla sicurezza

Le credenziali vengono usate esclusivamente per autenticarsi su ESSE3 e non vengono mai inviate a server di terze parti. Il token di sessione è memorizzato nel `localStorage` del browser — per rimuoverlo basta fare logout dall'app.

---

## Limitazioni

- Funziona con atenei che usano ESSE3/CINECA. Testato su **Università di Pisa, Dipartimento di Informatica**.
- Il totale CFU è impostato a **120**. Per corsi diversi, modifica la costante `TOTAL_CFU` in `App.tsx`.
- Il calcolo della media segue le regole del Dipartimento di Informatica UniPi. Per altri dipartimenti verificare il proprio regolamento.
