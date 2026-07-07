## Voraussetzungen

- [Node.js](https://nodejs.org) 18+
- Cloudflare-Konto

## 1. Backend (Worker + D1) einrichten

```bash
cd worker
npm install
npx wrangler login
npm run db:create
```

`db:create` gibt eine `database_id` aus. Diese in **`worker/wrangler.toml`** beim Feld `database_id` eintragen (Platzhalter `HIER_DEINE_DATABASE_ID_EINTRAGEN` ersetzen).

```bash
npm run db:init
npm run deploy
```

Nach dem Deploy zeigt Wrangler die Worker-URL an, z. B.
`https://bewertung-api.DEIN-SUBDOMAIN.workers.dev` – diese URL wird im Frontend gebraucht.

---

## 2. Frontend (Pages) einrichten

```bash
cd ../frontend
npm install
```

`.env`-Datei anlegen (Vorlage: `.env.example`) und die Worker-URL eintragen:

```
VITE_API_URL=https://bewertung-api.DEIN-SUBDOMAIN.workers.dev
```

Build erstellen:

```bash
npm run build      # Ergebnis liegt in frontend/dist
```

### Auf Cloudflare Pages veröffentlichen

```bash
npx wrangler pages deploy dist --project-name bewertung
```

## Lokale Entwicklung

Zwei Terminals:

```bash
# Terminal 1 – Worker + lokale D1
cd worker
npm run db:init:local      # einmalig: lokale DB-Tabellen
npm run dev                # läuft auf http://localhost:8787

# Terminal 2 – Frontend
cd frontend
# .env: VITE_API_URL=http://localhost:8787
npm run dev                # läuft auf http://localhost:5173
```

## Sicherheitshinweise

- Standardpasswort `admin123` unbedingt ändern.
- Die API ist per CORS für alle Ursprünge geöffnet; Admin-Endpunkte sind durch das Passwort (per Header) geschützt. Das Passwort wird serverseitig nur als SHA-256-Hash gespeichert.
- Bewertungslinks sind öffentlich und ohne Schutz gegen Mehrfachabgabe.
