# SCES – Super Cool Evaluation System

## ⚠️ Disclaimer

Dieses Projekt wurde vollständig mit [Claude](https://claude.ai) (Anthropic) erstellt.
Ich habe ehrlich gesagt keine Ahnung, was im Code wirklich passiert –
aber es funktioniert. 🎉

## Voraussetzungen

- Node.js **18** oder neuer
- **Cloudflare-Konto**

# Installation

## 1. Backend (Cloudflare Worker + D1)

Wechseln in das Worker-Verzeichnis:

```bash
cd worker
```

NPM-Pakete installieren:

```bash
npm install
```

Bei Cloudflare anmelden:

```bash
npx wrangler login
```

D1-Datenbank erstellen:

```bash
npm run db:create
```

> Die ausgegebene `database_id` in `worker/wrangler.toml` eintragen.

Initialisieren der Datenbank:

```bash
npm run db:init
```

Den Worker bei Cloudflare hochladen:

```bash
npm run deploy
```
> `frontend/.env.example` in `frontend/.env` umbenennen.

> Die ausgegebene Worker-URL (z. B. `https://sces-api.example.workers.dev`) in `frontend/.env` als `VITE_API_URL` eingetragen.

## 2. Frontend (Cloudflare Pages)

Wechseln in das Frontend-Verzeichnis:

```bash
cd ../frontend
```

NPM-Pakete installieren:

```bash
npm install
```

Build erstellen:

```bash
npm run build
```

Frontend auf Cloudflare Pages hochladen:

```bash
npx wrangler pages deploy dist --project-name sces
```

Beim ersten Deployment:

> **Create a new project**

> **Production Branch:** `master`

---

# Lokale Entwicklung

## Backend

```bash
cd worker
npm run db:init:local
npm run dev
```

## Frontend

```bash
cd frontend
npm run dev
```

---

# Sicherheitshinweise

- Das Standardpasswort **`admin123`** sollte unmittelbar nach der ersten Inbetriebnahme geändert werden.
- Die API ist per **CORS** für alle Ursprünge freigegeben.
- Admin-Endpunkte sind ausschließlich über das Admin-Passwort (HTTP-Header) geschützt.
- Das Passwort wird serverseitig ausschließlich als **SHA-256-Hash** gespeichert.
- Bewertungslinks sind öffentlich zugänglich und besitzen **keinen Schutz gegen Mehrfachabgaben**.
