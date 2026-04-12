# Design: Manutenzione - Preview Globale Admin

**Data:** 2026-04-12  
**Fase:** 5 - Area Clienti  
**Stato:** Approvato

---

## Obiettivo

Permettere agli admin con permesso `maintenance.manage` di attivare una preview globale temporanea delle pagine pubbliche mentre alcune pagine sono in manutenzione. Quando la preview e' attiva, l'admin deve poter navigare le pagine pubbliche reali senza vedere i blocchi manutenzione. Lo stato deve valere solo per la sessione admin corrente e non deve essere salvato nel backend.

---

## Approccio scelto

La preview viene gestita interamente lato frontend con un dropdown globale nella pagina `/admin/maintenance`.

- Un unico controllo `Preview manutenzione` appare nella parte alta della pagina Manutenzione.
- Il controllo usa un `select` con due opzioni: `Spenta` e `Attiva`.
- Il dropdown salva lo stato in `sessionStorage`, cosi' resta attivo durante la sessione e dopo refresh della pagina, ma non viene condiviso con altri admin.
- Le route pubbliche continuano a usare `PublicPageRoute` come singolo punto di controllo.
- Se la preview globale e' attiva e l'utente autenticato possiede `maintenance.manage`, `PublicPageRoute` ignora i blocchi manutenzione e rende la pagina reale.
- In tutti gli altri casi il comportamento resta invariato.

---

## Comportamento utente

### Pagina admin manutenzione

La pagina `MaintenancePage.tsx` viene estesa con una sezione introduttiva dedicata alla preview globale:

- Label: `Preview manutenzione`
- Controllo: dropdown binario con opzioni `Spenta` e `Attiva`
- Testo di supporto: chiarisce che la preview permette solo all'admin corrente di vedere le pagine reali durante la manutenzione

Il dropdown non fa parte del payload di salvataggio esistente e non influisce su `isDirty` o sul bottone `Salva modifiche`.

### Navigazione pubblica

Con preview attiva:

- `home` in manutenzione -> l'admin vede comunque `HomePage`
- qualsiasi altra pagina in manutenzione -> l'admin vede comunque il contenuto reale della pagina

Con preview disattivata:

- il sito continua a comportarsi esattamente come oggi

Per utenti anonimi o autenticati senza `maintenance.manage`:

- la preview salvata localmente viene ignorata
- i blocchi manutenzione restano attivi come da configurazione backend

---

## Stato client-side

La preview usa solo stato locale frontend.

- Storage: `sessionStorage`
- Chiave consigliata: `admin-maintenance-preview-enabled`
- Valori: stringa booleana serializzata (`true` / `false`)

Motivazioni:

- nessun cambiamento schema DB o backend
- nessun rischio di attivare la preview per altri utenti
- persistenza sufficiente per la sessione di lavoro dell'admin

---

## Modifiche frontend

### `frontend/src/pages/admin/MaintenancePage.tsx`

- aggiungere stato locale inizializzato da `sessionStorage`
- aggiungere handler per aggiornare il dropdown e sincronizzare lo storage
- usare un `select` admin light con label `Preview manutenzione` e opzioni `Spenta` / `Attiva`
- rendere il dropdown indipendente dal form dei messaggi manutenzione
- mantenere invariati il caricamento backend, il salvataggio e la UI per-card delle pagine

### `frontend/src/components/layout/PublicPageRoute.tsx`

Estendere la logica di guardia con questa priorita':

1. calcolare se la preview globale e' attiva lato client
2. verificare se l'utente corrente ha `maintenance.manage`
3. se entrambe le condizioni sono vere, renderizzare subito `children`
4. altrimenti applicare la logica manutenzione gia' esistente

Questo mantiene tutta la logica di bypass in un solo punto e evita condizioni duplicate nelle singole pagine pubbliche.

### `frontend/src/context/AuthContext.tsx`

Nessuna modifica funzionale prevista. `PublicPageRoute` riusa `useAuth()` per verificare il permesso `maintenance.manage`.

---

## Backend

Nessuna modifica prevista.

- nessun nuovo endpoint
- nessun nuovo campo nel file `maintenance.json`
- nessun nuovo permesso
- nessuna modifica ai payload esistenti

La preview globale e' esplicitamente una funzionalita' di navigazione admin locale, non uno stato di sistema.

---

## File coinvolti

| File | Modifica |
|------|----------|
| `frontend/src/pages/admin/MaintenancePage.tsx` | Dropdown globale preview e persistenza in `sessionStorage` |
| `frontend/src/components/layout/PublicPageRoute.tsx` | Bypass manutenzione per admin con preview attiva |
| `frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx` | Test dropdown globale e persistenza |
| `frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx` | Test bypass manutenzione con preview attiva |

---

## Test

### `MaintenancePage`

- mostra il controllo `Preview manutenzione` come `combobox`
- inizializza lo stato leggendo `sessionStorage`
- aggiorna `sessionStorage` quando il dropdown cambia tra `Spenta` e `Attiva`
- non segna il form come dirty solo per il cambio preview

### `PublicPageRoute`

- con preview attiva e utente con `maintenance.manage` -> renderizza la pagina reale
- con preview attiva ma senza permesso -> continua a mostrare la schermata manutenzione
- con preview disattivata -> comportamento invariato rispetto ai test esistenti

---

## Decisioni di design

- Dropdown globale invece di controlli per-card o checkbox: riduce rumore nella pagina admin e usa un pattern gia' presente nelle schermate admin
- `sessionStorage` invece di backend: evita stato condiviso indesiderato tra admin
- Bypass centralizzato in `PublicPageRoute`: modifica minima, facile da testare e coerente con l'architettura attuale
- Nessuna variazione dei dati di manutenzione esistenti: la preview non deve alterare cio' che vedono i visitatori
