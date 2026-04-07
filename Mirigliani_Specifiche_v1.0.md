# Mirigliani — Specifiche di Progetto
**Versione 1.0 — Marzo 2026**

---

## 1. Workflow di Sviluppo

Il progetto segue un flusso in tre fasi distinte:

| Fase | Strumento | Scopo |
|---|---|---|
| 1. Prototipazione | Google Stitch | Wireframe e prototipo visivo delle pagine pubbliche — usato come base di partenza per Claude Code, non vincolante |
| 2. Realizzazione | Claude Code | Implementazione completa: frontend, backend, API, database |
| 3. Rifinitura UI | Skill specifiche | Elevare qualità visiva e UX con componenti professionali |

### 1.1 Skill da utilizzare in Claude Code

- **21st.dev** — componenti UI moderni e pronti, stile professionale
- **UI UX Max Pro** — linee guida e pattern UX di alto livello
- Ulteriori skill consigliate da Claude Code da valutare in fase di implementazione

### 1.2 Flusso Operativo

| Step | Azione |
|---|---|
| 1 | Creare prototipo visivo in Google Stitch |
| 2 | Allegare il prototipo al prompt Claude Code come base di partenza — non vincolante, liberamente modificabile in fase di implementazione |
| 3 | Claude Code implementa frontend e backend raffinando il design con 21st.dev e UI UX Max Pro |

---

## 2. Stack Tecnologico

### 2.1 Infrastruttura VPS

| Componente | Versione | Stato |
|---|---|---|
| Provider | Hostinger | Operativo |
| IP Pubblico | 187.124.28.137 | Operativo |
| OS | Ubuntu 24.04.4 LTS | Operativo |
| CPU / RAM | 2 vCPU AMD EPYC / 8 GB RAM / 96 GB SSD | Operativo |
| Node.js | v22.22.1 | Operativo |
| PostgreSQL | 16.13 | Operativo |
| PM2 | 6.0.14 (cluster) | Operativo |
| Nginx | 1.24.0 (reverse proxy + HTTPS) | Operativo |
| Certbot | 2.9.0 (Let's Encrypt, rinnovo auto) | Operativo |
| UFW | 0.36.2 (aperte solo 22/80/443) | Operativo |
| fail2ban | 1.0.2 (ban SSH dopo 3 tentativi) | Operativo |

### 2.2 Stack Applicativo

| Componente | Tecnologia | Motivo |
|---|---|---|
| Linguaggio | **TypeScript** | Type-safety su tutto il progetto — previene bug su ruoli, listini e relazioni complesse |
| Backend / API | Fastify v5 | Già presente su VPS, alte performance, API-first |
| ORM | Prisma v7 | Già presente su VPS, type-safe, migrations |
| Database | PostgreSQL 16 | Già presente su VPS — nuovo DB dedicato |
| Autenticazione | @fastify/secure-session + bcrypt | Già presenti in stack mps |
| Validazione | Zod | Già presente in stack mps — integrazione nativa con TypeScript |
| Frontend pubblico | React + Vite + TypeScript | Hero animato, 21st.dev, UI UX Max Pro, futuro CRM |
| SEO pagine pubbliche | Vite SSG | Pre-rendering statico opzionale per "Per le Imprese Funebri" e "Per i Marmisti" — attivabile senza cambiare stack |
| Area riservata | React + Vite (SPA unica) | Routing client-side, CRUD complessi |
| Email | Nodemailer | Già presente in stack mps |
| PDF | pdf-lib | Già presente — gestione catalogo PDF |
| Process manager | PM2 cluster | Già operativo sulla VPS |

### 2.3 Domini e Porte

| Servizio | Dominio / Porta | Note |
|---|---|---|
| Sito pubblico + Area riservata | mirigliani.me | Nginx → 127.0.0.1:3001, SSL Certbot |
| API REST | api.mirigliani.me | Nginx → 127.0.0.1:3001/api/*, SSL Certbot |
| www redirect | www.mirigliani.me | Redirect 301 → mirigliani.me |

### 2.4 Architettura

```
Browser
   │
Nginx (443 HTTPS)
   ├── mirigliani.me      → 127.0.0.1:3001  (React bundle statico da /dist)
   ├── www.mirigliani.me  → redirect 301 → mirigliani.me
   └── api.mirigliani.me  → 127.0.0.1:3001/api/*  (JSON puro)
                                   │
                             Fastify v5
                             ├── /api/*   → endpoint REST JSON
                             └── /*       → @fastify/static → /dist
                                   │
                               Prisma v7
                                   │
                           PostgreSQL 16
                      (DB: mirigliani, user: mirigliani_usr)
```

| Layer | Percorso | Descrizione |
|---|---|---|
| Browser | https://mirigliani.me | Serve il bundle React/Vite (statico da /dist) |
| Browser | https://api.mirigliani.me | Chiamate REST JSON dal frontend e dalle app |
| Nginx | proxy_pass 127.0.0.1:3001 | Unico processo Fastify gestisce sia statico sia API |
| Fastify | /api/* | Endpoint JSON puri — nessun HTML |
| Fastify | /* | @fastify/static → /dist frontend |
| Prisma | schema.prisma | Modello dati unico, migrations versionati |
| PostgreSQL | DB: mirigliani, user: mirigliani_usr | Isolato dal DB mps esistente |

### 2.5 Struttura Progetto

```
/opt/mirigliani/
├── backend/
│   ├── app.js
│   ├── routes/
│   ├── plugins/
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── main.jsx
│   └── dist/               ← build statico servito da Nginx
└── ecosystem.config.js     ← configurazione PM2
```

| Cartella / File | Contenuto |
|---|---|
| /opt/mirigliani/ | Root applicazione |
| /opt/mirigliani/backend/ | Fastify + Prisma (app.js, routes/, plugins/, prisma/) |
| /opt/mirigliani/frontend/ | React + Vite (src/, dist/ dopo build) |
| /opt/mirigliani/ecosystem.config.js | Configurazione PM2 — porta 3001, max-old-space-size=512 |
| /opt/mirigliani/backend/.env | Variabili d'ambiente (DB, session secret, ecc.) |

### 2.6 Pacchetti npm riutilizzati da stack mps

- **@fastify/cookie, @fastify/secure-session** — gestione sessioni e auth
- **@fastify/multipart** — upload immagini e PDF catalogo
- **@fastify/rate-limit** — protezione endpoint pubblici e login
- **@fastify/static** — serve bundle React in produzione
- **bcrypt** — hashing password utenti
- **zod** — validazione input API, integrazione nativa TypeScript
- **nodemailer** — email transazionali e future mailing massive
- **pdf-lib** — gestione catalogo PDF di sistema
- **dayjs** — formattazione date

### 2.6.1 Pacchetti aggiuntivi per TypeScript

- **typescript** — compilatore TypeScript
- **@types/node, @types/bcrypt, @types/nodemailer** — type definitions
- **tsx** — esecuzione TypeScript in sviluppo (sostituisce ts-node)
- **vite-plugin-ssr** oppure **vite-ssg** — pre-rendering statico pagine pubbliche (opzionale, attivabile in un secondo momento)

### 2.7 Configurazione DNS — DA FARE

Configurare i seguenti record A sul pannello del registrar del dominio `mirigliani.me`:

| Tipo | Nome | Valore | TTL |
|---|---|---|---|
| A | @ | `187.124.28.137` | 3600 |
| A | www | `187.124.28.137` | 3600 |
| A | api | `187.124.28.137` | 3600 |

> ⚠️ Questo documento non deve essere condiviso pubblicamente né caricato su repository Git — contiene l'IP della VPS.

### 2.8 Procedura SSL — DA FARE (dopo propagazione DNS)

Verificare la propagazione DNS con `dig mirigliani.me`, poi eseguire sulla VPS:

| Step | Comando / Azione |
|---|---|
| 1 — Config Nginx | Creare `/etc/nginx/sites-available/mirigliani.me` con proxy verso `127.0.0.1:3001` |
| 2 — Abilitare sito | `ln -s /etc/nginx/sites-available/mirigliani.me /etc/nginx/sites-enabled/` |
| 3 — Test config | `nginx -t` |
| 4 — Reload Nginx | `systemctl reload nginx` |
| 5 — SSL sito | `certbot --nginx -d mirigliani.me -d www.mirigliani.me` |
| 6 — SSL API | `certbot --nginx -d api.mirigliani.me` |
| 7 — Verifica rinnovo | `certbot renew --dry-run` |

> UFW non richiede modifiche — porte 80 e 443 sono già aperte. La porta 3001 resta bloccata dall'esterno, accessibile solo da Nginx internamente.

---

## 3. Struttura del Sito

| Pagina originale | Nome definitivo |
|---|---|
| Home | Home |
| Chi siamo | La Nostra Storia |
| Contattaci | Dove Siamo |
| Imprese Funebri | Per le Imprese Funebri |
| Marmisti | Per i Marmisti |
| Area Riservata | Area Riservata |

**Splash screen eliminato — sostituito da hero animato sulla Home.**

---

## 4. Front End Pubblico

### Home — Dark Editorial Luxury

> ⚠️ La Home ha un design system **separato e distinto** da tutte le altre pagine.
> Riferimento: `DESIGN-home-dark.md` — esportato da Stitch dopo approvazione prototipo.

**Stile:** dark editorial luxury — ispirato al reference fornito (luxury watches site).
**Sfondo:** `#0A1628` navy quasi nero — non bianco, non grigio.
**Tipografia:** Playfair Display Black ALL CAPS ultra-bold ~130px, line-height 0.88.
**Bottoni:** outlined sharp corners, 0px border-radius, bordo oro `#C9A96E`.

Struttura sezioni (layout alternato testo/immagine):
- **Navbar** trasparente, wordmark MIRIGLIANI, CTA "AREA RISERVATA" outlined gold
- **Sezione 1 Hero** — testo sinistra + cofano cut-out destra, headline "ECCELLENZA FUNEBRE."
- **Sezione 2** — testo sinistra + rettangolo dark destra flush right, CTA "SCOPRI I COFANI"
- **Sezione 3** — rettangolo dark sinistra flush left + testo destra, CTA "PER I MARMISTI"
- **Sezione 4** — strip due location (Villamar + Sassari) con linea gold verticale
- **Footer** — `#070F1C`, linea gold 1px in cima, 3 colonne


### Per le Imprese Funebri
- Catalogo pubblico articoli funebri
- Visibile a tutti, senza prezzi

### Per i Marmisti
- Catalogo pubblico articoli marmisti
- Visibile a tutti, con prezzi pubblici

### La Nostra Storia
- Presentazione aziendale
- Due sedi: Villamar (Sud Sardegna) e Sassari
- Servizio consegne a domicilio
- Orari ritiro in sede

### Dove Siamo
- Indirizzi e contatti delle due sedi
- Orari di apertura e ritiro merce
- Mappa interattiva
- Form di contatto

---

## 5. Ruoli e Permessi

| Ruolo | Permessi |
|---|---|
| **Super Admin** | Unico nel sistema. Accesso totale a tutto. |
| **Manager** | CRUD Utenti (tutti, escluso Super Admin) · CRUD Articoli Funebri · CRUD Articoli Marmisti · CRUD Listini |
| **Collaboratore** | CRUD Utenti (solo utenti sotto di lui: Impresario Funebre e Marmista) · Visualizza tutti i listini (escluso Listino Acquisto) |
| **Impresario Funebre** | Accesso ai listini assegnati degli articoli funebri |
| **Marmista** | Accesso ai listini assegnati degli articoli marmisti |

### Regole Generali

- Ogni utente può avere più ruoli
- Ogni Impresario Funebre e Marmista deve avere un responsabile assegnato (Collaboratore o superiore)
- Il Collaboratore vede e gestisce solo gli utenti sotto di lui
- I Manager gestiscono tutti gli utenti, escluso il Super Admin
- Possibilità di creare nuovi ruoli custom con permessi granulari

---

## 6. Gestione Articoli Funebri

### 6.1 Cofani — Campi

| Campo | Tipo | Note |
|---|---|---|
| Codice | Univoco | |
| Categoria | Multipla | |
| Sottocategoria | Multipla | |
| Descrizione | Testo | |
| Essenza | Multipla | |
| Figura | Multipla | |
| Colorazione | Multipla | |
| Finitura | Multipla | |
| Misure Interne | 6 valori | Testa, Piedi, Spalla, Altezza, Larghezza, Profondità |
| Note | Testo | |
| Immagine | Path file | |
| Listino Acquisto | Prezzo | Visibile solo Manager+ |
| Listini Vendita | Multiplo | In base al listino assegnato al cliente |

### 6.2 Accessori — Campi

| Campo | Tipo | Note |
|---|---|---|
| Codice | Univoco | |
| Categoria | Multipla | |
| Sottocategoria | Multipla | |
| Descrizione | Testo | |
| Note | Testo | |
| Immagine | Path file | |
| Pagina PDF | Numero | Pagina nel catalogo PDF di sistema |
| Listino Acquisto | Prezzo | Visibile solo Manager+ |
| Listini Vendita | Multiplo | In base al listino assegnato al cliente |

### 6.3 Operazioni Backend

- CRUD Cofani
- CRUD Accessori
- CRUD di tutti i campi multipli (codice + descrizione)
- CRUD Listini

---

## 7. Gestione Articoli Marmisti

### 7.1 Campi

| Campo | Tipo | Note |
|---|---|---|
| Codice | Univoco | |
| Categoria | Multipla | |
| Descrizione | Testo | |
| Note | Testo | |
| Pagina PDF | Numero | Pagina nel catalogo PDF di sistema |
| Accessorio | Relazione | Opzionale, collegato ad altro articolo marmista |
| Prezzo Pubblico | Prezzo | Visibile nel front-end pubblico |
| Listino Acquisto | Prezzo | Visibile solo Manager+ |
| Listini Vendita | Multiplo | In base al listino assegnato al cliente |

### 7.2 Operazioni Backend

- CRUD Articoli Marmisti
- CRUD di tutti i campi multipli (codice + descrizione)
- CRUD Listini (stessa logica articoli funebri)

---

## 8. Logica Listini

- Ogni listino può essere creato da zero o derivato da un listino base
- Su un listino derivato si applicano sconti o maggiorazioni:
  - In percentuale o valore assoluto
  - Su tutti gli articoli o filtrati per categoria, sottocategoria, o altri campi

### Flag "Aggiorna"

| Flag | Comportamento |
|---|---|
| ✅ Attivo | Il listino derivato si aggiorna automaticamente quando cambia il listino base |
| ⬜ Disattivo | Il listino rimane snapshot al momento della creazione — non segue variazioni future |

---

## 9. Catalogo PDF

- Un unico PDF caricato a sistema (es. catalogo annuale fornitore)
- Gli articoli referenziano il numero di pagina corrispondente nel PDF
- Sostituibile con upload di nuova versione

---

## 10. Back End — Area Riservata

### 10.1 Gestione Utenti
- CRUD Utenti
- CRUD Ruoli (con permessi granulari, possibilità di creare ruoli custom)
- CRUD Assegnazione Manager

### 10.2 Gestione Articoli Funebri
- CRUD Cofani e Accessori
- CRUD di tutti i campi multipli
- CRUD Listini

### 10.3 Gestione Articoli Marmisti
- CRUD Articoli Marmisti
- CRUD di tutti i campi multipli
- CRUD Listini

### 10.4 Marketing
*Sviluppo futuro — mailing list, integrazioni social, campagne.*

---

## 11. App & Roadmap Futura

### 11.1 App iOS e Android
- Le API saranno progettate fin da subito per supportare le app future
- Al momento del lancio app, il sito si espanderà in un CRM leggero

### 11.2 CRM (Sviluppo Futuro)
- Anagrafica completa clienti
- Giro clienti per i Collaboratori (pianificazione visite)
- Mappa con visualizzazione dei giri
- Mailing massive ai clienti
- Integrazione Passepartout per gestione ordini
- Integrazioni social e marketing

---

## 12. Fasi di Sviluppo

### Ambiente
- **Sviluppo locale:** ServBay (no Docker)
- **Produzione:** VPS bhs-vps — deploy solo dopo validazione completa in locale

### Roadmap Fasi

| Fase | Nome | Contenuto | Ambiente |
|---|---|---|---|
| **0** | Setup & Skill | Ambiente locale, MCP servers, tooling Claude Code | Locale |
| **1** | Fondamenta | Schema DB, Auth, struttura progetto TS+Fastify+React | Locale |
| **2** | Front End Pubblico | Home hero, La Nostra Storia, Dove Siamo, cataloghi pubblici | Locale |
| **3** | Back End Area Riservata | CRUD utenti/ruoli, articoli funebri, articoli marmisti, PDF | Locale |
| **4** | Listini | Logica listini base e derivati, flag Aggiorna, filtri | Locale |
| **5** | Area Clienti | Viste Impresario Funebre e Marmista, accesso listini | Locale |
| **6** | Deploy VPS | DNS, Nginx, PM2, SSL, migrazione dati | VPS |

---

## 13. Fase 0 — Setup & Skill

### 13.1 Ambiente locale ServBay

ServBay include già Node.js e PostgreSQL. Verificare che siano attivi e alle versioni corrette:

| Servizio | Versione richiesta | Verifica |
|---|---|---|
| Node.js | v22+ | `node -v` |
| npm | v10+ | `npm -v` |
| PostgreSQL | v16+ | da pannello ServBay |
| Git | qualsiasi | `git --version` |

Creare il database locale dedicato al progetto dal pannello ServBay o via psql:
```sql
CREATE USER mirigliani_usr WITH PASSWORD 'password_locale';
CREATE DATABASE mirigliani OWNER mirigliani_usr;
```

### 13.2 Claude Code — MCP Servers da installare

I MCP server si configurano **globalmente** in `~/.claude.json` e sono disponibili in tutti i progetti.

| MCP Server | Funzione | Priorità |
|---|---|---|
| **21st.dev Magic** | Genera componenti React/UI professionali al volo con ricerca su 21st.dev | ✅ Essenziale |
| **Context7** | Documentazione live di Fastify, Prisma, React, Zod — evita allucinazioni su API v5/v7 | ✅ Essenziale |
| **Prisma MCP** | Assistenza su schema, migrations, query complesse | ✅ Essenziale |
| **Sequential Thinking** | Scompone problemi complessi in passi — utile per la logica listini | 🟡 Consigliato |
| **PostgreSQL** | Query dirette al DB locale in fase di sviluppo e debug | 🟡 Consigliato |

#### Installazione MCP — comando unico

```bash
# 21st.dev Magic (richiede API key da 21st.dev)
claude mcp add --transport http 21st-dev-magic https://mcp.21st.dev/api/mcp?apiKey=<API_KEY>

# Context7
claude mcp add --transport http context7 https://mcp.context7.com/mcp

# Prisma
npx -y prisma mcp

# Sequential Thinking
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# PostgreSQL (puntato al DB locale)
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://mirigliani_usr:password_locale@localhost:5432/mirigliani
```

> Registrarsi su [21st.dev](https://21st.dev) per ottenere l'API key gratuita.

---

### 13.3 Claude Code — Skills da installare

Le Skills si installano **per progetto** nella cartella `.claude/skills/` della root del progetto. Vengono versionate con Git e condivise automaticamente con tutto il team.

| Skill | Funzione | Priorità |
|---|---|---|
| **UI UX Pro Max** | Design intelligence: 50+ stili, 161 palette, 57 font pairing, 99 linee guida UX, supporto React/Vite | ✅ Essenziale |

> **Differenza MCP vs Skill:** Gli MCP server sono strumenti esterni che Claude Code chiama via protocollo. Le Skills sono istruzioni e database locali che guidano il comportamento di Claude Code su un progetto specifico — più leggere, nessuna dipendenza di rete.

#### Installazione UI UX Pro Max

Dalla **root del progetto** (`/opt/mirigliani/` in locale equivalente):

```bash
# Metodo 1 — CLI ufficiale (consigliato)
npm install -g uipro-cli
uipro init --ai claude

# Metodo 2 — curl diretto
mkdir -p .claude/skills/ui-ux-pro-max && \
curl -L -o skill.zip "https://fastmcp.me/Skills/Download/191" && \
unzip -o skill.zip -d .claude/skills/ui-ux-pro-max && \
rm skill.zip

# Metodo 3 — Claude Code marketplace
claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

La skill viene salvata in `.claude/skills/ui-ux-pro-max/` e inclusa nel repository Git.

#### Come funziona in pratica

Una volta installata, la skill si attiva automaticamente per richieste UI/UX. Claude Code:
1. Analizza il tipo di prodotto e i requisiti visivi
2. Genera un design system completo (stile, colori, tipografia) calibrato sul progetto
3. Applica linee guida specifiche per React + Vite
4. Verifica il codice generato contro una checklist di anti-pattern UX

Per il progetto Mirigliani è configurata per usare lo **stack `react`** con stile professionale B2B.

### 13.5 Tooling locale da installare via npm

```bash
# TypeScript e tooling base
npm install -g typescript tsx

# Vite scaffolding
npm install -g create-vite

# Prisma CLI
npm install -g prisma

# UI UX Pro Max CLI
npm install -g uipro-cli

# Verifica installazioni
tsc --version && tsx --version && prisma --version && uipro --version
```

### 13.6 Superpowers — installazione in Claude Code

Superpowers è il framework metodologico che governa **come** Claude Code lavora su tutto il progetto. Va installato una sola volta, è globale.

```bash
# Dentro Claude Code (non nel terminale di sistema)
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace

# Riavviare Claude Code dopo l'installazione
# Poi verificare l'installazione con:
/help
# Devono apparire i comandi: /superpowers:brainstorm, /superpowers:write-plan, /superpowers:execute-plan
```

**Come funziona:**
- Non appena Claude Code rileva che stai costruendo qualcosa, si ferma e fa brainstorming prima di scrivere codice
- Lancia subagent separati per ogni task — evita la deriva del contesto su progetti lunghi
- Impone TDD obbligatorio: test fallente prima, implementazione dopo
- Code review automatica tra ogni task

**Attivare a ogni sessione:**
```
/using-superpowers
```

### 13.7 Verifica finale prima di passare alla Fase 1

- [ ] ServBay attivo con Node.js v22+ e PostgreSQL v16+
- [ ] Database `mirigliani` creato in locale
- [ ] Claude Code aperto e funzionante
- [ ] **Superpowers installato** — `/help` mostra i comandi superpowers
- [ ] MCP 21st.dev Magic configurato e autenticato (API key 21st.dev)
- [ ] MCP Context7 configurato
- [ ] MCP Prisma configurato
- [ ] MCP Sequential Thinking configurato
- [ ] MCP PostgreSQL configurato e puntato al DB locale
- [ ] `typescript`, `tsx`, `prisma`, `uipro-cli` installati globalmente
- [ ] Skill UI UX Pro Max installata nella root del progetto (`.claude/skills/ui-ux-pro-max/`)
- [ ] `CLAUDE.md` nella root del progetto
- [ ] `DESIGN-home-dark.md` nella root del progetto
- [ ] `DESIGN.md` nella root del progetto (da esportare da Stitch)
- [ ] Repository Git inizializzato con branch `phase/0-setup`
- [ ] Prototipo Google Stitch completato (base di partenza per Fase 2)

---

## 14. Fase 1 — Fondamenta

> **Obiettivo:** Progetto funzionante end-to-end con autenticazione, schema DB completo e routing base. Nessuna UI definitiva — l'importante è che tutto giri.

### 14.1 Scaffolding progetto

```bash
# Dalla root del progetto locale (es. ~/Sites/mirigliani in ServBay)
mkdir mirigliani && cd mirigliani

# Backend
mkdir backend && cd backend
npm init -y
npm install fastify @fastify/cookie @fastify/secure-session @fastify/static \
  @fastify/multipart @fastify/rate-limit @fastify/formbody \
  @prisma/client @prisma/adapter-pg bcrypt zod dayjs dotenv
npm install -D typescript tsx prisma @types/node @types/bcrypt nodemon
npx tsc --init
npx prisma init

# Frontend
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

### 14.2 Schema Prisma — modello dati completo

Lo schema deve coprire **tutte le entità** prima di scrivere una singola riga di codice applicativo. Modificare lo schema in seguito è costoso.

Entità principali da modellare:

| Modello | Relazioni chiave |
|---|---|
| `User` | ha molti `Role`, ha un `Manager` (self-relation), appartiene a `UserType` |
| `Role` | ha molti `Permission`, può essere assegnato a molti `User` |
| `Permission` | granulare per risorsa+azione (es. `articles.write`) |
| `CofanoArticle` | ha `Category[]`, `Essence[]`, `Figure[]`, `Color[]`, `Finish[]`, `InternalMeasure`, `PriceList[]` |
| `AccessoryArticle` | ha `Category[]`, `PdfPage`, `PriceList[]` |
| `MarmistaArticle` | ha `Category[]`, opzionale `AccessoryArticle`, `PriceList[]` |
| `PriceList` | può avere `parentList`, flag `autoUpdate`, regole `PriceRule[]` |
| `PriceRule` | filtri per categoria/sottocategoria, tipo sconto (% o assoluto) |
| `PdfCatalog` | unico record — path del PDF di sistema |

### 14.3 Autenticazione

- Sessioni server-side con `@fastify/secure-session` — nessun JWT in questa fase
- Endpoint: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Middleware di autorizzazione per ruolo su ogni route protetta
- Password hashate con `bcrypt` (rounds: 12)
- Rate limiting sul login: max 5 tentativi per IP in 15 minuti

### 14.4 Struttura route Fastify

```
/api/auth/*          → login, logout, me
/api/users/*         → CRUD utenti (protetto: Manager+)
/api/roles/*         → CRUD ruoli (protetto: Manager+)
/api/articles/coffins/*    → CRUD cofani (protetto: Manager+)
/api/articles/accessories/* → CRUD accessori (protetto: Manager+)
/api/articles/marmista/*   → CRUD marmisti (protetto: Manager+)
/api/pricelists/*    → CRUD listini (protetto: Manager+)
/api/catalog/pdf     → gestione PDF catalogo (protetto: Manager+)
/api/public/*        → endpoint pubblici senza auth
/*                   → serve bundle React (frontend)
```

### 14.5 Verifica completamento Fase 1

- [ ] Progetto TypeScript compila senza errori
- [ ] Schema Prisma completo con tutte le entità e relazioni
- [ ] Migration iniziale applicata al DB locale
- [ ] Login/logout funzionante con sessione
- [ ] Middleware ruoli applicato alle route protette
- [ ] Super Admin iniziale creabile via seed script
- [ ] Frontend React si avvia e si connette alle API
- [ ] PM2 (o nodemon in dev) gestisce il processo backend

---

## 15. Fase 2 — Front End Pubblico

> **Obiettivo:** Sito pubblico completo e rifinito — il primo deliverable visibile al cliente.

### 15.1 Pagine da implementare

| Pagina | Design System | Componenti chiave | Note |
|---|---|---|---|
| **Home** | **Dark Editorial** (`DESIGN-home-dark.md`) | Navbar dark, hero, 3 sezioni alternanti, strip location, footer dark | Unica pagina con sfondo scuro |
| **Per le Imprese Funebri** | Light (`DESIGN.md`) | Griglia 3×2 cofani+accessori, filtri, modal dettaglio con misure | Nessun prezzo visibile |
| **Per i Marmisti** | Light (`DESIGN.md`) | Griglia prodotti, filtri, prezzo pubblico in evidenza | Prezzo pubblico visibile |
| **La Nostra Storia** | Light (`DESIGN.md`) | Layout narrativo, foto sedi | Villamar + Sassari |
| **Dove Siamo** | Light (`DESIGN.md`) | Mappa interattiva, cards sedi, form contatto | Google Maps embed o Leaflet |

### 15.2 Ordine di implementazione consigliato

1. **Design system light** — configurare Tailwind tokens, font Google, componenti base
2. **Layout shell** — Navbar (variante dark + light), Footer dark, Footer light, routing React
3. **Home** — implementare con `DESIGN-home-dark.md` come riferimento
4. **Pagine interne** — implementare con `DESIGN.md` come riferimento
5. **Transizione dark→light** — verificare che il passaggio Home→pagine interne sia fluido

### 15.3 Navbar — componente duale

La Navbar è **unico componente** con due varianti visive. Non creare due Navbar separate.

```tsx
// frontend/src/components/layout/Navbar.tsx
interface NavbarProps {
  variant: 'dark' | 'light'
}

// variant='dark' → usata sulla Home
//   sfondo: trasparente su #0A1628
//   testo link: #8A9BB5, hover #FFFFFF
//   wordmark: #FFFFFF
//   CTA "AREA RISERVATA": outlined bordo #C9A96E, testo #C9A96E

// variant='light' → usata su tutte le altre pagine
//   sfondo: #FFFFFF con shadow sottile
//   testo link: #6B7280, hover #1A2B4A
//   wordmark: #1A2B4A
//   CTA "AREA RISERVATA": filled #1A2B4A, testo #FFFFFF
```

```tsx
// frontend/src/App.tsx
import { useLocation } from 'react-router-dom'
const location = useLocation()
<Navbar variant={location.pathname === '/' ? 'dark' : 'light'} />
```

### 15.4 Home — componenti React

| Componente | File | Note |
|---|---|---|
| `HeroDark` | `components/home/HeroDark.tsx` | Headline ultra-bold, CTA outlined gold, immagine cut-out |
| `AlternatingSectionRight` | `components/home/AlternatingSectionRight.tsx` | Testo sx + rettangolo dark dx flush right |
| `AlternatingSectionLeft` | `components/home/AlternatingSectionLeft.tsx` | Rettangolo dark sx flush left + testo dx |
| `LocationStrip` | `components/home/LocationStrip.tsx` | Due location con linea gold verticale |
| `FooterDark` | `components/layout/FooterDark.tsx` | Sfondo #070F1C, linea gold in cima |

### 15.5 Pagine interne — componenti React

| Componente | File | Note |
|---|---|---|
| `ProductGrid` | `components/catalog/ProductGrid.tsx` | Griglia 3×2 con paginatore |
| `ProductCard` | `components/catalog/ProductCard.tsx` | Card con badge, codice, nome, hover gold |
| `ProductModal` | `components/catalog/ProductModal.tsx` | Modal dettaglio con thumbnails, tabella misure, PDF link |
| `FilterBar` | `components/catalog/FilterBar.tsx` | Filtri categoria, sottocategoria, ricerca, chip attivi |
| `Paginator` | `components/catalog/Paginator.tsx` | Numerazione pagine, frecce, contatore articoli |
| `ContactForm` | `components/ContactForm.tsx` | Validazione Zod client-side |
| `MapEmbed` | `components/MapEmbed.tsx` | Pin sedi Villamar e Sassari |
| `FooterLight` | `components/layout/FooterLight.tsx` | Sfondo navy #1A2B4A, testo chiaro |

### 15.6 Design system da configurare prima di scrivere codice

```bash
# Prima di qualsiasi componente, eseguire in Claude Code:
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "funeral wholesale B2B professional italy dark luxury" \
  --design-system -f markdown --stack react
```

Salvare l'output in `.claude/design-system-generated.md` come riferimento aggiuntivo.
I file di riferimento definitivi restano `DESIGN.md` e `DESIGN-home-dark.md` da Stitch.

### 15.7 API pubbliche necessarie (da Fase 1)

```
GET /api/public/coffins              → lista cofani paginata (senza prezzi)
GET /api/public/coffins/:id          → dettaglio cofano con misure interne
GET /api/public/accessories          → lista accessori paginata
GET /api/public/accessories/:id      → dettaglio accessorio con pagina PDF
GET /api/public/marmista             → lista articoli marmisti (con prezzo pubblico)
GET /api/public/marmista/:id         → dettaglio articolo marmista
POST /api/public/contact             → invio form contatto (Nodemailer)
```

### 15.8 SEO — Vite SSG (opzionale)

Se si decide di attivare il pre-rendering statico per le pagine catalogo:

```bash
npm install vite-ssg
```

Attivare solo per: `/imprese-funebri`, `/marmisti` — le altre pagine restano CSR.

### 15.9 Verifica completamento Fase 2

- [ ] `DESIGN.md` e `DESIGN-home-dark.md` presenti nella root del progetto
- [ ] Tailwind tokens configurati per entrambi i design system
- [ ] Font Google (Playfair Display, Inter, JetBrains Mono) caricati
- [ ] Navbar con variante `dark` e `light` funzionante
- [ ] **Home** — hero dark con headline ultra-bold e CTA outlined gold
- [ ] **Home** — sezioni 2 e 3 con layout alternato e immagini flush al bordo
- [ ] **Home** — strip location Villamar e Sassari
- [ ] **Home** — footer dark `#070F1C`
- [ ] **Home** — transizione visiva fluida verso pagine interne (click navbar)
- [ ] Catalogo Imprese Funebri — griglia 3×2 con filtri e paginatore
- [ ] Modal dettaglio cofano — thumbnails, tabella misure 3×2, link PDF
- [ ] Modal dettaglio accessorio — senza tabella misure, PDF prominente
- [ ] Catalogo Marmisti — griglia con prezzi pubblici visibili
- [ ] La Nostra Storia — contenuto e layout completati
- [ ] Dove Siamo — mappa, contatti, form funzionante
- [ ] Form contatto invia email via Nodemailer
- [ ] Tutte le pagine responsive su mobile/tablet/desktop

---

## 16. Fase 3 — Back End Area Riservata

> **Obiettivo:** Tutte le operazioni CRUD del backend completate e accessibili dall'area riservata. Listini esclusi — quelli vanno in Fase 4.

### 16.1 Sezioni da implementare

| Sezione | Ruolo richiesto | Operazioni |
|---|---|---|
| **Gestione Utenti** | Manager+ | CRUD utenti, assegnazione ruoli, assegnazione manager |
| **Gestione Ruoli** | Super Admin | CRUD ruoli, assegnazione permessi granulari |
| **Articoli Cofani** | Manager+ | CRUD cofani, gestione campi multipli |
| **Articoli Accessori** | Manager+ | CRUD accessori, gestione campi multipli |
| **Articoli Marmisti** | Manager+ | CRUD marmisti, relazione accessori |
| **Catalogo PDF** | Manager+ | Upload PDF, sostituzione versione |

### 16.2 UI Area Riservata

- Layout con sidebar navigazione e area contenuto principale
- Tabelle dati con paginazione, ricerca e filtri per ogni entità
- Form modale o inline per creazione/modifica
- Conferma prima di ogni eliminazione
- Feedback visivo su ogni operazione (toast/notifica)
- Gestione upload immagini per cofani/accessori (`@fastify/multipart`)
- Viewer PDF integrato per anteprima catalogo con numero pagina

### 16.3 Gestione campi multipli

I campi multipli (Categoria, Essenza, Figura, Colorazione, Finitura ecc.) hanno tutti la stessa struttura CRUD: codice + descrizione. Costruire un componente generico `MultiValueManager` riutilizzabile per tutti.

### 16.4 Verifica completamento Fase 3

- [ ] Login area riservata funzionante con redirect per ruolo
- [ ] CRUD Utenti completo con assegnazione ruoli e manager
- [ ] CRUD Ruoli con permessi granulari
- [ ] CRUD Cofani completo con tutti i campi incluse Misure Interne
- [ ] CRUD Accessori completo con pagina PDF
- [ ] CRUD Marmisti completo con relazione accessori e prezzi
- [ ] Upload immagini funzionante per cofani e accessori
- [ ] Upload/sostituzione PDF catalogo funzionante
- [ ] Tutti i campi multipli gestibili da UI
- [ ] Permessi per ruolo applicati correttamente su ogni sezione

---

## 17. Fase 4 — Listini

> **Obiettivo:** Implementare la logica listini completa — la parte più complessa del progetto. Va in fase dedicata per poterla testare approfonditamente.

### 17.1 Logica da implementare

**Listino base:**
- Creato da zero con prezzi inseriti manualmente per ogni articolo
- Visibile solo a Manager+

**Listino derivato:**
- Eredita da un listino base (o da altro derivato — max 3 livelli consigliati)
- Applica regole (`PriceRule`) al momento del calcolo:
  - Tipo: sconto o maggiorazione
  - Valore: percentuale o assoluto
  - Scope: tutti gli articoli, oppure filtrati per categoria / sottocategoria / altri campi
- Flag `autoUpdate`:
  - **Attivo** → prezzo calcolato dinamicamente da listino padre ad ogni lettura
  - **Disattivo** → prezzo snapshot — calcolato una volta e salvato staticamente

### 17.2 Algoritmo calcolo prezzo

```
priceFor(article, priceList):
  if priceList.autoUpdate AND priceList.parent:
    basePrice = priceFor(article, priceList.parent)   // ricorsivo
  else:
    basePrice = priceList.snapshotPrices[article.id]

  rules = priceList.rules
    .filter(r => r.matchesArticle(article))
    .sortBy(r => r.specificity)  // più specifico vince

  return applyRules(basePrice, rules)
```

### 17.3 UI Gestione Listini

- Lista listini con indicazione padre/derivato e flag autoUpdate
- Creazione listino da zero o da listino esistente
- Editor regole: selezione scope (tutto / categoria / sottocategoria), tipo e valore
- Anteprima prezzi calcolati prima di salvare
- Pulsante "Ricalcola snapshot" per listini con autoUpdate disattivo
- Assegnazione listino a utente (Impresario Funebre o Marmista)

### 17.4 Verifica completamento Fase 4

- [ ] CRUD listini base funzionante
- [ ] Creazione listino derivato da listino esistente
- [ ] Regole sconto/maggiorazione per percentuale e valore assoluto
- [ ] Filtro regole per categoria e sottocategoria
- [ ] Flag autoUpdate funzionante — calcolo dinamico vs snapshot
- [ ] Snapshot ricalcolabile manualmente
- [ ] Assegnazione listino a singolo utente
- [ ] Anteprima prezzi calcolati corretta
- [ ] Listino Acquisto non visibile a Collaboratori e ruoli inferiori

---

## 18. Fase 5 — Area Clienti

> **Obiettivo:** Vista personalizzata per Impresario Funebre e Marmista — accesso al proprio catalogo con i prezzi del listino assegnato.

### 18.1 Vista Impresario Funebre

- Catalogo cofani e accessori con **prezzi del listino assegnato**
- Filtri per categoria, sottocategoria, essenza, finitura, colorazione
- Scheda dettaglio cofano con misure interne e immagine
- Accesso alla pagina PDF del catalogo per gli accessori
- Nessuna visibilità sul Listino Acquisto

### 18.2 Vista Marmista

- Catalogo articoli marmisti con **prezzi del listino assegnato**
- Filtri per categoria
- Scheda dettaglio con accessori collegati e pagina PDF
- Prezzo marmista in evidenza, prezzo acquisto nascosto

### 18.3 Navigazione area clienti

- Dashboard personale con riepilogo listino assegnato e responsabile
- Link rapidi al catalogo di competenza
- Dati contatto del proprio Manager/Collaboratore
- Profilo utente — modifica password

### 18.4 Verifica completamento Fase 5

- [ ] Login Impresario Funebre mostra solo catalogo funebri con prezzi listino assegnato
- [ ] Login Marmista mostra solo catalogo marmisti con prezzi listino assegnato
- [ ] Filtri catalogo funzionanti per entrambi i ruoli
- [ ] Scheda dettaglio prodotto completa
- [ ] Viewer PDF con apertura alla pagina corretta dell'accessorio
- [ ] Nessuna fuga di dati — prezzi acquisto non accessibili lato client
- [ ] Dashboard personale con info Manager

---

## 19. Fase 6 — Deploy VPS

> **Obiettivo:** Portare in produzione su VPS tutto ciò che è stato validato in locale. Zero sorprese — ogni step è verificabile.

### 19.1 Prerequisiti

- [ ] Fase 0→5 completate e validate in locale
- [ ] Record DNS propagati (verificare con `dig mirigliani.me`)
- [ ] Repository Git aggiornato con ultimo commit stabile

### 19.2 Procedura deploy

| Step | Azione | Comando / Note |
|---|---|---|
| 1 | Accedere alla VPS | `ssh bhs-vps` |
| 2 | Clonare il repository | `git clone <repo> /opt/mirigliani` |
| 3 | Creare utente e DB PostgreSQL | `CREATE USER mirigliani_usr ...` |
| 4 | Configurare `.env` produzione | Copiare `.env.example`, compilare valori reali |
| 5 | Installare dipendenze backend | `cd backend && npm install --production` |
| 6 | Applicare migrations Prisma | `npx prisma migrate deploy` |
| 7 | Eseguire seed Super Admin | `npx tsx prisma/seed.ts` |
| 8 | Build frontend | `cd frontend && npm install && npm run build` |
| 9 | Avviare con PM2 | `pm2 start ecosystem.config.js` |
| 10 | Salvare config PM2 | `pm2 save && pm2 startup` |
| 11 | Configurare Nginx | Creare `/etc/nginx/sites-available/mirigliani.me` |
| 12 | Abilitare sito Nginx | `ln -s ... sites-enabled && nginx -t && systemctl reload nginx` |
| 13 | Generare SSL | `certbot --nginx -d mirigliani.me -d www.mirigliani.me -d api.mirigliani.me` |
| 14 | Smoke test | Aprire `https://mirigliani.me` e verificare tutte le sezioni |

### 19.3 Variabili d'ambiente produzione

| Variabile | Valore |
|---|---|
| `DATABASE_URL` | `postgresql://mirigliani_usr:<pwd>@localhost:5432/mirigliani` |
| `SESSION_SECRET` | stringa random 64 caratteri (generare con `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SMTP_HOST` | da configurare con provider email |
| `SMTP_USER` | da configurare |
| `SMTP_PASS` | da configurare |

### 19.4 Configurazione Nginx — mirigliani.me

```nginx
server {
    listen 443 ssl;
    server_name mirigliani.me www.mirigliani.me api.mirigliani.me;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name mirigliani.me www.mirigliani.me api.mirigliani.me;
    return 301 https://$host$request_uri;
}
```

### 19.5 Verifica completamento Fase 6

- [ ] `https://mirigliani.me` risponde correttamente
- [ ] `https://www.mirigliani.me` redirige a `https://mirigliani.me`
- [ ] `https://api.mirigliani.me` risponde alle chiamate API
- [ ] SSL valido su tutti e tre i domini
- [ ] Login area riservata funzionante in produzione
- [ ] Catalogo pubblico visibile senza login
- [ ] Upload immagini funzionante in produzione
- [ ] PM2 riavvia automaticamente il processo in caso di crash
- [ ] `pm2 save` eseguito — il processo sopravvive a reboot VPS
- [ ] `certbot renew --dry-run` ha successo

---

## 20. Backup Database

### 20.1 Strategia

Backup automatico giornaliero del DB PostgreSQL con `pg_dump`, compresso e caricato su **Google Drive** via `rclone`. Gratuito fino a 15 GB — più che sufficiente per anni di dati.

Retention:
- Ultimi **7 giorni** di backup giornalieri
- Backup **settimanale** conservato per 4 settimane
- Backup **mensile** conservato per 6 mesi

### 20.2 Setup rclone su VPS

```bash
# Installare rclone
curl https://rclone.org/install.sh | sudo bash

# Configurare Google Drive (interattivo — richiede browser una sola volta)
rclone config
# → scegliere "n" new remote
# → nome: gdrive-mirigliani
# → tipo: drive
# → seguire il flusso OAuth nel browser
# → confermare accesso a Google Drive completo

# Testare la connessione
rclone lsd gdrive-mirigliani:
```

### 20.3 Script di backup

Creare `/opt/mirigliani/scripts/backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/mirigliani/backups"
DB_NAME="mirigliani"
DB_USER="mirigliani_usr"
REMOTE="gdrive-mirigliani:backups/mirigliani"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

# Dump compresso
FILENAME="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"

# Upload su Google Drive
rclone copy "$FILENAME" "$REMOTE/daily/"

# Pulizia locale — mantieni solo ultimi 7 giorni
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete

# Pulizia remota — mantieni solo ultimi 7 giorni su daily/
rclone delete --min-age ${KEEP_DAYS}d "$REMOTE/daily/"

echo "Backup completato: $FILENAME"
```

```bash
chmod +x /opt/mirigliani/scripts/backup.sh
```

### 20.4 Schedulazione cron

```bash
crontab -e

# Backup giornaliero alle 02:00
0 2 * * * /opt/mirigliani/scripts/backup.sh >> /var/log/mirigliani-backup.log 2>&1

# Backup settimanale domenica alle 03:00 (copia in weekly/)
0 3 * * 0 rclone copy gdrive-mirigliani:backups/mirigliani/daily/ gdrive-mirigliani:backups/mirigliani/weekly/
```

### 20.5 Ripristino da backup

```bash
# Scaricare backup da Google Drive
rclone copy "gdrive-mirigliani:backups/mirigliani/daily/mirigliani_20260101_020000.sql.gz" /tmp/

# Ripristinare
gunzip -c /tmp/mirigliani_20260101_020000.sql.gz | psql -U mirigliani_usr mirigliani
```

---

## 21. Testing

### 21.1 Stack di test

| Tool | Scopo |
|---|---|
| **Vitest** | Unit e integration test — stesso ecosistema Vite, zero config |
| **@testing-library/react** | Test componenti React |
| **supertest** | Test HTTP endpoint Fastify |
| **@vitest/coverage-v8** | Report copertura codice |

```bash
cd backend && npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
cd ../frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 21.2 Priorità test — cosa testare

**Critico — Fase 4, motore listini:**
```
tests/
  unit/
    priceEngine.test.ts      ← calcolo prezzi, regole, ricorsione
    priceRules.test.ts       ← applicazione sconti/maggiorazioni
    autoUpdate.test.ts       ← flag aggiorna: dinamico vs snapshot
  integration/
    pricelists.api.test.ts   ← endpoint CRUD listini
    auth.api.test.ts         ← login, sessioni, permessi per ruolo
    articles.api.test.ts     ← CRUD articoli con validazione campi
```

**Importante — Fase 1:**
- Auth: login corretto, login errato, rate limiting, sessione scaduta
- Permessi: ogni ruolo accede solo a ciò che gli compete

**Non prioritario:**
- Componenti UI puri senza logica
- Pagine statiche

### 21.3 Esempio test motore prezzi

```typescript
// tests/unit/priceEngine.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePrice } from '../src/lib/priceEngine'

describe('PriceEngine', () => {
  it('applica sconto percentuale su articolo', () => {
    const result = calculatePrice(100, [{ type: 'discount', value: 10, unit: 'percent' }])
    expect(result).toBe(90)
  })

  it('applica maggiorazione assoluta', () => {
    const result = calculatePrice(100, [{ type: 'markup', value: 15, unit: 'absolute' }])
    expect(result).toBe(115)
  })

  it('listino derivato con autoUpdate calcola da padre', () => {
    // test con mock del listino padre
  })

  it('snapshot non cambia se il padre cambia', () => {
    // test flag autoUpdate disattivo
  })
})
```

### 21.4 Comando run test

```bash
# Unit test
npx vitest run

# Watch mode in sviluppo
npx vitest

# Con coverage
npx vitest run --coverage
```

---

## 22. Convenzione Errori API

### 22.1 Schema risposta errore

Tutti gli endpoint restituiscono errori in questo formato:

```typescript
interface ApiError {
  error: string        // codice errore in SCREAMING_SNAKE_CASE
  message: string      // messaggio leggibile per il frontend
  statusCode: number   // HTTP status code
  details?: unknown    // opzionale — dettagli aggiuntivi (es. campi non validi)
}
```

### 22.2 Codici errore standard

| Codice | HTTP | Quando |
|---|---|---|
| `UNAUTHORIZED` | 401 | Nessuna sessione attiva |
| `FORBIDDEN` | 403 | Sessione valida ma ruolo insufficiente |
| `NOT_FOUND` | 404 | Risorsa non trovata |
| `VALIDATION_ERROR` | 422 | Input non valido (Zod) |
| `CONFLICT` | 409 | Risorsa già esistente (es. codice articolo duplicato) |
| `RATE_LIMITED` | 429 | Troppi tentativi login |
| `INTERNAL_ERROR` | 500 | Errore server non gestito |

### 22.3 Esempi

```json
// 401 — nessuna sessione
{ "error": "UNAUTHORIZED", "message": "Effettua il login per continuare", "statusCode": 401 }

// 403 — ruolo insufficiente
{ "error": "FORBIDDEN", "message": "Non hai i permessi per questa operazione", "statusCode": 403 }

// 422 — validazione Zod fallita
{
  "error": "VALIDATION_ERROR",
  "message": "Dati non validi",
  "statusCode": 422,
  "details": [
    { "field": "code", "message": "Il codice è obbligatorio" },
    { "field": "price", "message": "Il prezzo deve essere un numero positivo" }
  ]
}
```

### 22.4 Plugin Fastify errori

```typescript
// backend/src/plugins/errorHandler.ts
app.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    return reply.status(422).send({
      error: 'VALIDATION_ERROR',
      message: 'Dati non validi',
      statusCode: 422,
      details: error.validation
    })
  }
  // log interno + risposta generica per errori non gestiti
  app.log.error(error)
  reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'Errore interno del server',
    statusCode: 500
  })
})
```

---

## 23. Seed Dati

### 23.1 Strategia

I dati base vengono importati da file **Excel** forniti dal cliente. Lo script di seed legge i file `.xlsx` dalla cartella `prisma/seed-data/` e popola le tabelle.

### 23.2 File Excel attesi

Creare un file Excel per ogni entità con i dati da importare:

| File | Foglio | Colonne |
|---|---|---|
| `categorie_funebri.xlsx` | Categorie | codice, descrizione |
| `sottocategorie_funebri.xlsx` | Sottocategorie | codice, descrizione, categoria_codice |
| `essenze.xlsx` | Essenze | codice, descrizione |
| `figure.xlsx` | Figure | codice, descrizione |
| `colorazioni.xlsx` | Colorazioni | codice, descrizione |
| `finiture.xlsx` | Finiture | codice, descrizione |
| `categorie_marmisti.xlsx` | Categorie | codice, descrizione |
| `articoli_cofani.xlsx` | Cofani | codice, descrizione, categoria, essenza, ... |
| `articoli_accessori.xlsx` | Accessori | codice, descrizione, categoria, pagina_pdf, ... |
| `articoli_marmisti.xlsx` | Marmisti | codice, descrizione, categoria, prezzo_pubblico, ... |
| `utenti.xlsx` | Utenti | nome, cognome, email, ruolo, manager_email |

### 23.3 Script di seed

```bash
cd backend && npm install -D xlsx
```

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import bcrypt from 'bcrypt'
import path from 'path'

const prisma = new PrismaClient()
const SEED_DIR = path.join(__dirname, 'seed-data')

function readExcel(filename: string, sheet: string) {
  const wb = XLSX.readFile(path.join(SEED_DIR, filename))
  return XLSX.utils.sheet_to_json(wb.Sheets[sheet])
}

async function main() {
  console.log('Seed: Super Admin...')
  await prisma.user.upsert({
    where: { email: 'admin@mirigliani.me' },
    update: {},
    create: {
      email: 'admin@mirigliani.me',
      password: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD!, 12),
      name: 'Super Admin',
      roles: { connect: [{ name: 'SUPER_ADMIN' }] }
    }
  })

  console.log('Seed: Categorie funebri...')
  const categorie = readExcel('categorie_funebri.xlsx', 'Categorie') as any[]
  for (const row of categorie) {
    await prisma.funeralCategory.upsert({
      where: { code: row.codice },
      update: { description: row.descrizione },
      create: { code: row.codice, description: row.descrizione }
    })
  }

  // ... ripetere per ogni entità

  console.log('Seed completato.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

```bash
# Eseguire seed
npx tsx prisma/seed.ts

# In package.json
"prisma": { "seed": "tsx prisma/seed.ts" }

# Oppure via Prisma
npx prisma db seed
```

### 23.4 Aggiornamento dati

Tutti gli `upsert` usano il **codice** come chiave — rieseguire il seed aggiorna i record esistenti senza duplicati. I file Excel possono essere aggiornati e il seed rieseguito in qualsiasi momento, sia in locale che in produzione.

---

## 24. Git Workflow

### 24.1 Branch strategy

| Branch | Scopo | Regola |
|---|---|---|
| `main` | Produzione — VPS | Solo merge da `develop` dopo validazione completa |
| `develop` | Integrazione | Base di partenza per ogni fase |
| `phase/0-setup` | Fase 0 | Setup ambiente e tooling |
| `phase/1-foundations` | Fase 1 | Schema DB, auth, struttura |
| `phase/2-frontend` | Fase 2 | Front end pubblico |
| `phase/3-backend` | Fase 3 | Area riservata CRUD |
| `phase/4-pricelists` | Fase 4 | Logica listini |
| `phase/5-client-area` | Fase 5 | Area clienti |
| `phase/6-deploy` | Fase 6 | Deploy VPS |

### 24.2 Flusso operativo

```bash
# Iniziare una nuova fase
git checkout develop
git pull
git checkout -b phase/2-frontend

# Sviluppo con Claude Code...

# Fine fase — merge in develop
git checkout develop
git merge phase/2-frontend
git push

# Deploy in produzione — solo da develop validato
git checkout main
git merge develop
git tag v0.2.0
git push && git push --tags

# La VPS fa pull da main
ssh bhs-vps "cd /opt/mirigliani && git pull && npm install && npx prisma migrate deploy && pm2 reload mirigliani"
```

### 24.3 Convenzioni commit

```
feat(phase2): aggiunge hero animato Home
fix(auth): corregge sessione scaduta su reload
refactor(pricelists): semplifica algoritmo calcolo ricorsivo
test(priceEngine): aggiunge test sconto percentuale
chore(deps): aggiorna Prisma a v7.1
```

### 24.4 .gitignore

```gitignore
node_modules/
dist/
.env
.env.local
.env.production
backend/uploads/
backend/backups/
prisma/seed-data/*.xlsx
*.log
```

> I file Excel del seed non vanno nel repository — contengono dati aziendali. Tenerli in locale o su Google Drive.

---

## 25. Logging e Monitoring

### 25.1 Logging con Pino

Fastify usa Pino built-in — nessuna dipendenza aggiuntiva. Configurazione:

```typescript
// backend/src/app.ts
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }  // leggibile in sviluppo
      : undefined                   // JSON puro in produzione
  }
})
```

```bash
npm install -D pino-pretty
```

### 25.2 Log strutturati per eventi chiave

```typescript
// Login riuscito
app.log.info({ userId, role, ip: request.ip }, 'Login effettuato')

// Login fallito
app.log.warn({ email, ip: request.ip, attempt }, 'Tentativo login fallito')

// Errore critico
app.log.error({ error, userId, route }, 'Errore durante operazione critica')
```

### 25.3 PM2 monitoring

```bash
# Stato processi
pm2 status

# Log in tempo reale
pm2 logs mirigliani

# Metriche CPU/RAM
pm2 monit

# Alert su riavvio anomalo — aggiungere in ecosystem.config.js
{
  name: 'mirigliani',
  max_restarts: 10,
  min_uptime: '10s',
  restart_delay: 4000
}
```

### 25.4 Rotazione log

PM2-logrotate è già installato sulla VPS. Verificare configurazione:

```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 26. Gestione File Upload

### 26.1 Strategia — storage locale su VPS

Con ~250 immagini articoli (media 200KB = ~50MB) e 2-4 PDF catalogo (media 25MB = ~75MB), il totale stimato è **sotto 200MB** — storage locale sulla VPS è la scelta corretta. Nessun servizio cloud aggiuntivo, nessun costo, Nginx serve i file statici direttamente.

### 26.2 Struttura cartelle

```
/opt/mirigliani/uploads/
├── images/
│   ├── coffins/          ← immagini cofani
│   │   └── {code}_{timestamp}.webp
│   └── accessories/      ← immagini accessori
│       └── {code}_{timestamp}.webp
└── pdf/
    └── catalog_{timestamp}.pdf   ← massimo 1 PDF attivo per tipo
```

### 26.3 Convenzioni file

- **Formato immagini:** conversione automatica in **WebP** al momento dell'upload (risparmio ~60% spazio vs JPEG)
- **Naming:** `{codice_articolo}_{timestamp_unix}.webp` — evita collisioni, tracciabile
- **Dimensione massima:** 5MB per immagine (configurato in Nginx e Fastify)
- **PDF:** il vecchio viene sovrascritto — si mantiene sempre l'ultimo caricato

### 26.4 Servire i file statici

```nginx
# In nginx config mirigliani.me
location /uploads/ {
    alias /opt/mirigliani/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

```typescript
// Fastify — solo per sviluppo locale (in prod usa Nginx)
app.register(staticPlugin, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/'
})
```

### 26.5 Conversione WebP

```bash
npm install sharp
```

```typescript
import sharp from 'sharp'

async function processUpload(buffer: Buffer, articleCode: string): Promise<string> {
  const timestamp = Date.now()
  const filename = `${articleCode}_${timestamp}.webp`
  const outputPath = path.join(UPLOAD_DIR, 'images', filename)

  await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outputPath)

  return `/uploads/images/${filename}`
}
```

### 26.6 Backup upload

Lo script di backup (sezione 20) deve includere anche la cartella uploads:

```bash
# Aggiungere a backup.sh
rclone sync /opt/mirigliani/uploads/ "gdrive-mirigliani:backups/mirigliani/uploads/"
```

---

## 27. Paginazione API

### 27.1 Convenzione query string

```
GET /api/articles/coffins?page=1&limit=20&sort=code&order=asc&category=cofano
```

| Parametro | Default | Note |
|---|---|---|
| `page` | `1` | Numero pagina (1-indexed) |
| `limit` | `20` | Elementi per pagina — max 100 |
| `sort` | `createdAt` | Campo su cui ordinare |
| `order` | `desc` | `asc` o `desc` |
| Filtri | — | Specifici per entità (es. `category`, `subcategory`) |

### 27.2 Schema risposta paginata

```typescript
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

### 27.3 Implementazione Prisma

```typescript
async function getPaginated<T>(
  model: any,
  { page = 1, limit = 20, where = {}, orderBy = {} }: PaginateOptions
): Promise<PaginatedResponse<T>> {
  const skip = (page - 1) * limit
  const [data, total] = await Promise.all([
    model.findMany({ where, orderBy, skip, take: limit }),
    model.count({ where })
  ])
  return {
    data,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  }
}
```

---

## 28. Internazionalizzazione (i18n)

### 28.1 Strategia

Testi UI in file JSON separati dal codice fin dall'inizio. Lingua default: **italiano**. Struttura predisposta per aggiungere altre lingue senza refactoring.

```bash
cd frontend && npm install i18next react-i18next
```

### 28.2 Struttura file traduzioni

```
frontend/src/locales/
├── it/
│   ├── common.json      ← testi globali (nav, bottoni, errori)
│   ├── home.json
│   ├── catalog.json
│   ├── auth.json
│   └── backoffice.json
└── en/                  ← predisposto, non compilato in Fase 1
    └── (vuoto)
```

### 28.3 Esempio file common.json

```json
{
  "nav": {
    "home": "Home",
    "story": "La Nostra Storia",
    "whereWeAre": "Dove Siamo",
    "funeralCompanies": "Per le Imprese Funebri",
    "marblers": "Per i Marmisti",
    "login": "Area Riservata"
  },
  "actions": {
    "save": "Salva",
    "cancel": "Annulla",
    "delete": "Elimina",
    "edit": "Modifica",
    "add": "Aggiungi",
    "search": "Cerca"
  },
  "errors": {
    "unauthorized": "Effettua il login per continuare",
    "forbidden": "Non hai i permessi per questa operazione",
    "notFound": "Elemento non trovato",
    "generic": "Si è verificato un errore. Riprova."
  }
}
```

---

## 29. Brand & Palette

### 29.1 Identità visiva

| Attributo | Definizione |
|---|---|
| **Settore** | Forniture funebri e marmi — B2B, territorio Sardegna |
| **Tono** | Serio, professionale, affidabile — mai cupo o pesante |
| **Valori visivi** | Solidità, rispetto, tradizione con tocco moderno |
| **Target** | Impresari funebri e marmisti professionisti |

### 29.2 Palette base

Da raffinare con Google Stitch — questi sono i valori di partenza da passare a UI UX Pro Max:

| Ruolo | Colore | Note |
|---|---|---|
| **Primary** | `#1A2B4A` | Blu notte — autorevolezza, fiducia |
| **Primary Light** | `#2C4A7C` | Variante per hover/accenti |
| **Accent** | `#C9A96E` | Oro/bronzo — richiama bronzi e metalli del settore |
| **Background** | `#F8F7F4` | Bianco caldo — non freddo, non clinico |
| **Surface** | `#FFFFFF` | Card, modali |
| **Text Primary** | `#1A1A1A` | Testo principale |
| **Text Secondary** | `#6B7280` | Testo secondario, label |
| **Border** | `#E5E0D8` | Bordi caldi, non grigi puri |
| **Error** | `#C0392B` | Rosso errori |
| **Success** | `#27AE60` | Verde conferme |

### 29.3 Tipografia

| Ruolo | Font | Fonte |
|---|---|---|
| **Heading** | `Playfair Display` | Google Fonts — elegante, tradizione |
| **Body** | `Inter` | Google Fonts — leggibile, moderno |
| **Monospace** | `JetBrains Mono` | Codici articolo, prezzi |

### 29.4 Stile UI

- **Forma:** bordi leggermente arrotondati (radius 6-8px) — non sharp, non pill
- **Ombre:** sottili e calde — `0 2px 8px rgba(26, 43, 74, 0.08)`
- **Spaziatura:** ritmo 8dp
- **Foto:** immagini reali prodotti su sfondo neutro caldo

> Questi valori sono una base di partenza. Il prototipo Google Stitch è il riferimento finale — in caso di conflitto, Stitch prevale.

---

## 30. Schema Prisma — Draft

Draft iniziale da raffinare in Fase 1. Rappresenta tutte le entità del sistema.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── AUTH & UTENTI ────────────────────────────────────────

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  name        String
  surname     String?
  phone       String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  roles       UserRole[]
  manager     User?    @relation("ManagerToClient", fields: [managerId], references: [id])
  managerId   String?
  clients     User[]   @relation("ManagerToClient")

  funeralPriceLists  PriceList[] @relation("FuneralUserPriceList")
  marblePriceLists   PriceList[] @relation("MarbleUserPriceList")
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique  // SUPER_ADMIN, MANAGER, COLLABORATORE, IMPRESARIO, MARMISTA
  description String?
  permissions RolePermission[]
  users       UserRole[]
}

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}

model Permission {
  id       String @id @default(cuid())
  resource String  // es. "articles", "users", "pricelists"
  action   String  // es. "read", "write", "delete"
  roles    RolePermission[]
  @@unique([resource, action])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

// ─── CATALOGO PDF ────────────────────────────────────────

model PdfCatalog {
  id        String   @id @default(cuid())
  type      String   @unique  // "funeral" | "marble"
  path      String
  uploadedAt DateTime @default(now())
}

// ─── CAMPI MULTIPLI (lookup tables) ──────────────────────

model FuneralCategory    { id String @id @default(cuid()); code String @unique; description String }
model FuneralSubcategory { id String @id @default(cuid()); code String @unique; description String; categoryId String }
model Essence            { id String @id @default(cuid()); code String @unique; description String }
model Figure             { id String @id @default(cuid()); code String @unique; description String }
model Color              { id String @id @default(cuid()); code String @unique; description String }
model Finish             { id String @id @default(cuid()); code String @unique; description String }
model MarbleCategory     { id String @id @default(cuid()); code String @unique; description String }

// ─── ARTICOLI FUNEBRI ────────────────────────────────────

model CoffinArticle {
  id            String   @id @default(cuid())
  code          String   @unique
  description   String
  notes         String?
  imagePath     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  categories    FuneralCategory[]
  subcategories FuneralSubcategory[]
  essences      Essence[]
  figures       Figure[]
  colors        Color[]
  finishes      Finish[]
  measures      InternalMeasure?
  prices        CoffinPrice[]
}

model InternalMeasure {
  id        String @id @default(cuid())
  articleId String @unique
  article   CoffinArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  head      Float?   // Testa
  feet      Float?   // Piedi
  shoulder  Float?   // Spalla
  height    Float?   // Altezza
  width     Float?   // Larghezza
  depth     Float?   // Profondità
}

model AccessoryArticle {
  id          String   @id @default(cuid())
  code        String   @unique
  description String
  notes       String?
  imagePath   String?
  pdfPage     Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  categories    FuneralCategory[]
  subcategories FuneralSubcategory[]
  prices        AccessoryPrice[]
}

// ─── ARTICOLI MARMISTI ────────────────────────────────────

model MarbleArticle {
  id            String   @id @default(cuid())
  code          String   @unique
  description   String
  notes         String?
  pdfPage       Int?
  publicPrice   Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  categories  MarbleCategory[]
  accessoryId String?
  accessory   MarbleArticle?  @relation("MarbleAccessory", fields: [accessoryId], references: [id])
  accessories MarbleArticle[] @relation("MarbleAccessory")
  prices      MarblePrice[]
}

// ─── LISTINI ────────────────────────────────────────────

model PriceList {
  id           String   @id @default(cuid())
  name         String
  type         String   // "funeral" | "marble" | "purchase"
  autoUpdate   Boolean  @default(true)
  parentId     String?
  parent       PriceList?  @relation("PriceListHierarchy", fields: [parentId], references: [id])
  children     PriceList[] @relation("PriceListHierarchy")
  rules        PriceRule[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  funeralUsers User[] @relation("FuneralUserPriceList")
  marbleUsers  User[] @relation("MarbleUserPriceList")

  coffinPrices    CoffinPrice[]
  accessoryPrices AccessoryPrice[]
  marblePrices    MarblePrice[]
}

model PriceRule {
  id           String  @id @default(cuid())
  priceListId  String
  priceList    PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  type         String  // "discount" | "markup"
  valueType    String  // "percent" | "absolute"
  value        Float
  filterType   String? // "all" | "category" | "subcategory"
  filterValue  String? // codice categoria/sottocategoria
  priority     Int     @default(0)
}

model CoffinPrice {
  id          String @id @default(cuid())
  articleId   String
  article     CoffinArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  priceListId String
  priceList   PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  price       Float
  @@unique([articleId, priceListId])
}

model AccessoryPrice {
  id          String @id @default(cuid())
  articleId   String
  article     AccessoryArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  priceListId String
  priceList   PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  price       Float
  @@unique([articleId, priceListId])
}

model MarblePrice {
  id          String @id @default(cuid())
  articleId   String
  article     MarbleArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  priceListId String
  priceList   PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  price       Float
  @@unique([articleId, priceListId])
}
```

---

## 31. Rollback Strategy

### 31.1 Prima di ogni deploy

```bash
# 1. Tag dello stato stabile attuale
git tag v$(date +%Y%m%d)-pre-deploy
git push --tags

# 2. Snapshot DB manuale
ssh bhs-vps "/opt/mirigliani/scripts/backup.sh"

# 3. Annotare versione PM2 attiva
ssh bhs-vps "pm2 show mirigliani | grep version"
```

### 31.2 Procedura rollback completo

```bash
# 1. Tornare al commit precedente
ssh bhs-vps "cd /opt/mirigliani && git checkout <tag-pre-deploy>"

# 2. Ripristinare dipendenze
ssh bhs-vps "cd /opt/mirigliani/backend && npm install"

# 3. Rollback migrations Prisma (se necessario)
ssh bhs-vps "cd /opt/mirigliani/backend && npx prisma migrate resolve --rolled-back <migration_name>"

# 4. Riavviare con PM2
ssh bhs-vps "pm2 reload mirigliani"

# 5. Se il DB è compromesso — ripristino da backup
ssh bhs-vps "gunzip -c /opt/mirigliani/backups/latest.sql.gz | psql -U mirigliani_usr mirigliani"
```

### 31.3 PM2 — reload vs restart

| Comando | Comportamento | Quando usare |
|---|---|---|
| `pm2 reload mirigliani` | Zero-downtime — avvia nuova istanza prima di fermare la vecchia | Deploy normale |
| `pm2 restart mirigliani` | Riavvio con downtime breve | Solo se reload fallisce |
| `pm2 revert mirigliani` | Torna alla versione precedente in memoria PM2 | Rollback rapido senza Git |

