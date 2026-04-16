# Deploy Design — Mirigliani M.me
**Data:** 2026-04-16

---

## Contesto

Deploy del progetto M.me su VPS Hostinger esistente.
VPS condivisa con progetto MPS (M.Cloud) — isolamento totale obbligatorio.

---

## Architettura

```
mirigliani.me (HTTPS)          api.mirigliani.me (HTTPS)
       │                                │
       ▼                                ▼
  Nginx: serve                   Nginx: proxy
  /opt/M.me/frontend/dist        → 127.0.0.1:3001
  (static SPA)
                                        │
                                        ▼
                                  PM2 → node dist/app.js
                                  (name: "mme", port 3001)
                                        │
                                        ▼
                                  Prisma → PostgreSQL "M.me"
```

---

## Isolamento da MPS (M.Cloud)

| Risorsa | M.me | MPS — NON TOCCARE |
|---|---|---|
| PM2 | `mme` | `mps` |
| PostgreSQL | `"M.me"` | `bhs` |
| Path | `/opt/M.me/` | `/opt/mps/` |
| Nginx | `mirigliani.me`, `api.mirigliani.me` | `mirigliani.cloud` |

---

## Environment

**`/opt/M.me/backend/.env`** (creato manualmente, mai committato):

```env
DATABASE_URL="postgresql://mirigliani_usr:PASSWORD@localhost:5432/M.me"
SESSION_SECRET=<64 char hex random>
SESSION_SALT=<32 char hex random>
NODE_ENV=production
PORT=3001
```

**DB setup** (una volta sola):
```sql
CREATE USER mirigliani_usr WITH PASSWORD 'PASSWORD';
CREATE DATABASE "M.me" OWNER mirigliani_usr;
```

> Nota: `"M.me"` va sempre tra virgolette doppie in PostgreSQL (contiene punto).

**Uploads** — `/opt/M.me/uploads/` persiste tra deploy, non nel repo.

**Seed** — eseguito solo al primo deploy per creare il Super Admin.
Deploy successivi: solo `prisma migrate deploy`, nessun seed.

---

## Nginx

### `/etc/nginx/sites-available/mirigliani.me` (aggiornamento)

Il frontend usa `baseURL: '/api'` (relativo) — Nginx gestisce tutto su un unico dominio:
- `/api/*` e `/uploads/*` → proxy a Fastify 3001
- `/*` → SPA statica da `/opt/M.me/frontend/dist`

```nginx
server {
    listen 80;
    server_name mirigliani.me www.mirigliani.me;
    return 301 https://mirigliani.me$request_uri;
}

server {
    listen 443 ssl;
    server_name www.mirigliani.me;
    ssl_certificate     /etc/letsencrypt/live/mirigliani.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mirigliani.me/privkey.pem;
    return 301 https://mirigliani.me$request_uri;
}

server {
    listen 443 ssl;
    server_name mirigliani.me;
    ssl_certificate     /etc/letsencrypt/live/mirigliani.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mirigliani.me/privkey.pem;

    root /opt/M.me/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 350m;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> `api.mirigliani.me` non è necessario per la SPA — può essere aggiunto in futuro per accesso diretto API da tool esterni.

### SSL (dopo config Nginx)

```bash
certbot --nginx -d mirigliani.me -d www.mirigliani.me
certbot renew --dry-run
```

---

## PM2 — `ecosystem.config.js`

```js
module.exports = {
  apps: [{
    name: 'mme',
    script: './backend/dist/app.js',
    cwd: '/opt/M.me',
    instances: 1,
    node_args: '--max-old-space-size=512',
    env: { NODE_ENV: 'production' },
    error_file: '/var/log/pm2/mme-error.log',
    out_file: '/var/log/pm2/mme-out.log',
  }]
}
```

---

## Deploy Script — `deploy.sh`

Eseguito sul VPS per ogni deploy successivo al primo.
Non tocca MPS/mps/bhs/mirigliani.cloud.

```bash
#!/bin/bash
set -e

# ISOLAMENTO: questo script tocca SOLO /opt/M.me e PM2 "mme"
# NON modificare: mps, bhs, mirigliani.cloud

cd /opt/M.me
git pull origin main

cd backend
npm ci
npm run build
npx prisma migrate deploy

cd ../frontend
npm ci
npm run build

pm2 restart mme
echo "Deploy M.me completato."
```

---

## Setup Iniziale (una-tantum, non nel repo)

Passi da eseguire manualmente sul VPS la prima volta:

```bash
# 1. DB
sudo -u postgres psql -c "CREATE USER mirigliani_usr WITH PASSWORD 'PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE \"M.me\" OWNER mirigliani_usr;"

# 2. Clone repo
cd /opt/M.me
git init
git remote add origin https://github.com/spawn5m/M.me
git pull origin main

# 3. Crea .env
cp backend/.env.example backend/.env
# → editare manualmente con segreti reali

# 4. Build backend
cd backend
npm ci
npm run build
npx prisma migrate deploy
npx tsx prisma/seed.ts   # solo prima volta

# 5. Build frontend
cd ../frontend
npm ci
npm run build

# 6. Nginx
cp /opt/M.me/docs/nginx/mirigliani.me /etc/nginx/sites-available/mirigliani.me
cp /opt/M.me/docs/nginx/api.mirigliani.me /etc/nginx/sites-available/api.mirigliani.me
ln -s /etc/nginx/sites-available/api.mirigliani.me /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 7. SSL
certbot --nginx -d mirigliani.me -d www.mirigliani.me
certbot --nginx -d api.mirigliani.me

# 8. PM2
cd /opt/M.me
pm2 start ecosystem.config.js
pm2 save
```

---

## File da creare nel repo

| File | Scopo |
|---|---|
| `ecosystem.config.js` | Config PM2 |
| `deploy.sh` | Script deploy ripetibile |
| `backend/.env.example` | Template variabili (senza segreti) |
| `docs/nginx/mirigliani.me` | Config Nginx completo (SPA + proxy /api/ + /uploads/) |
