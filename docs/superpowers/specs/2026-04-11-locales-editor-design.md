# Locales Editor — Design Spec

**Data:** 2026-04-11  
**Fase:** 5 — Area Clienti  
**Scope:** Pagina admin per la modifica dei testi italiani del sito

---

## Obiettivo

Creare una pagina nell'area admin che permetta a Manager e Super Admin di modificare
i testi italiani del sito (`it.json`) senza toccare il codice, con effetto immediato
senza riavvio del server.

---

## Decisioni di progetto

| Decisione | Scelta |
|---|---|
| Lingue supportate | Solo italiano (per ora) |
| Persistenza | File `it.json` su disco via API backend |
| Effetto modifiche | Immediato dopo salvataggio (i18next reload) |
| UI editor | Navigazione laterale + form per sezione |
| Salvataggio | Per sezione (non tutto il file in un colpo) |

---

## Architettura

### Backend

#### Endpoint pubblico

```
GET /api/public/locales/it
```

- Legge `frontend/src/locales/it.json` dal disco
- Risponde il JSON completo
- Nessuna autenticazione richiesta
- Cache-Control: no-store (le traduzioni devono sempre essere fresche)

#### Endpoint protetto

```
PUT /api/admin/locales
```

- Body: JSON completo aggiornato
- Validazione: body deve essere un oggetto, le chiavi di primo livello esistenti non possono essere rimosse
- Scrittura atomica: scrive in file temporaneo, poi rinomina (evita corruzione parziale)
- Permesso richiesto: `locales.manage`
- Risposta: `{ ok: true }` o `{ error, message, statusCode }`

#### Permesso nuovo

`locales.manage` — aggiunto ai ruoli `super_admin` e `manager` nel seed/migration.

### Frontend — cambio i18n loading

**Prima (bundle statico):**

```ts
// main.tsx
import it from './locales/it.json'
i18n.init({ resources: { it: { translation: it } } })
```

**Dopo (HTTP backend con fallback statico):**

```ts
// main.tsx
import HttpBackend from 'i18next-http-backend'
import it from './locales/it.json'  // fallback

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'it',
    fallbackLng: 'it',
    backend: { loadPath: '/api/public/locales/{{lng}}' },
    resources: { it: { translation: it } },  // usato se fetch fallisce
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
  })
```

Il bundle statico serve come fallback: se l'API non risponde, l'app funziona comunque
con le traduzioni embedded.

---

## Pagina admin — LocalesPage

### Route e sidebar

- **Route:** `/admin/locales`
- **Permesso:** `locales.manage`
- **Sidebar:** voce "Testi" aggiunta al gruppo "Interfaccia" (accanto a "Logo")
- **Protezione route:** `<ProtectedRoute requiredPermissions={['locales.manage']}>`

### Sezioni dell'editor

| Sezione UI | Chiavi JSON incluse |
|---|---|
| **Dati Aziendali** | `whereWeAre.villamarAddress`, `villamarPhone`, `villamarHours`, `villamarSaturday`, `villamarSunday`, `sassariAddress`, `sassariPhone`, `sassariHours`, `sassariSaturday`, `sassariSunday`, `contactMyMail` |
| **Home** | tutto `home.*` |
| **La Nostra Storia** | tutto `ourStory.*` |
| **Dove Siamo** | `whereWeAre.*` eccetto i campi in Dati Aziendali |
| **Catalogo** | tutto `catalog.*` |
| **Comuni** | `nav.*`, `footer.*`, `auth.*`, `errors.*` |

### Layout

```
┌─────────────────┬──────────────────────────────────────────┐
│  Sezioni        │  [Titolo sezione selezionata]            │
│                 │  ─────────────────────────────────────   │
│ ● Dati Aziend.  │                                          │
│   Home          │  ┌─ Sottogruppo ───────────────────┐    │
│   Nostra Storia │  │  label chiave                   │    │
│   Dove Siamo    │  │  [input / textarea]             │    │
│   Catalogo      │  └─────────────────────────────────┘    │
│   Comuni        │                                          │
│                 │  [Salva sezione]                         │
└─────────────────┴──────────────────────────────────────────┘
```

### Comportamento campi

- `<input>` per testi brevi (label, bottoni, titoli corti — meno di ~60 caratteri attesi)
- `<textarea rows={2}>` per testi lunghi (paragrafi, descrizioni)
- Label di ogni campo: nome chiave JSON in stile `text-xs uppercase tracking-[0.14em] text-[#6B7280]`
- Bordo oro (`border-[#C9A96E]`) se il campo è stato modificato ma non ancora salvato
- Avviso "Modifiche non salvate" se l'utente cambia sezione senza salvare

### Flusso salvataggio

```
Utente clicca "Salva"
  → Frontend merge: prende il JSON completo (in memoria) e aggiorna
    solo le chiavi della sezione corrente con i valori dal form
  → PUT /api/admin/locales con il JSON completo fuso
  → Backend scrive it.json su disco (scrittura atomica)
  → Frontend: banner verde + dirty state reset
  → i18next.reloadResources('it') → UI aggiornata senza reload pagina
```

### Gestione "Dati Aziendali"

I campi sono un sottoinsieme fisico di `whereWeAre` nel JSON. Il salvataggio
fonde solo quelle chiavi nel JSON completo — non sovrascrive le chiavi Dove Siamo.
Stessa logica simmetrica per "Dove Siamo".

### Feedback utente

| Evento | Feedback |
|---|---|
| Salvataggio ok | Banner verde "Salvato" (auto-dismiss 3s) |
| Errore backend | Banner rosso con `message` dall'API |
| Campo modificato non salvato | Bordo oro sul campo |
| Cambio sezione con dirty | Messaggio di avviso (non blocca, solo avvisa) |

---

## File da creare / modificare

| File | Azione |
|---|---|
| `backend/src/routes/locales.ts` | Creare — `GET` pubblico + `PUT` protetto |
| `backend/src/app.ts` | Registrare il plugin `locales` |
| `backend/prisma/schema.prisma` | Nessuna modifica — niente DB |
| `frontend/src/pages/admin/LocalesPage.tsx` | Creare |
| `frontend/src/App.tsx` | Aggiungere route `/admin/locales` |
| `frontend/src/components/admin/AdminSidebar.tsx` | Aggiungere voce "Testi" al gruppo Interfaccia |
| `frontend/src/main.tsx` | Cambiare init i18n → HTTP backend + fallback |
| `frontend/package.json` | Aggiungere dipendenza `i18next-http-backend` |
| Seed/migration permessi | Aggiungere permesso `locales.manage` |

---

## Note implementative

- La scrittura su `it.json` avviene **nel repo frontend** — path relativo dal backend:
  `path.resolve(__dirname, '../../frontend/src/locales/it.json')`
- In produzione il path potrebbe differire — usare variabile d'ambiente `LOCALES_PATH` come override
- Nessun lock file necessario: le scritture admin sono rare e mono-utente in questo contesto B2B
- Il file `it.json` non va committato automaticamente — rimane una modifica locale
  che verrà inclusa al prossimo deploy se desiderato

---

## Out of scope

- Aggiunta di nuove chiavi JSON dall'interfaccia (solo modifica valori esistenti)
- Supporto multi-lingua
- Versioning/history delle traduzioni
- Import/export JSON dall'UI
