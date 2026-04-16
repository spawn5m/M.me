# Locales Page Common Texts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `common.contactUs` and `maintenance.home` inside `Interfaccia > Testi > Comuni` so both texts are editable from the admin locales page.

**Architecture:** Keep the change inside the existing `LocalesPage` section config and add a dedicated admin page test that loads a full sample locale payload through mocked `fetch`. The behavior change is configuration-only in production code, with one new multiline field for the global maintenance message.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, user-event, i18next

---

## File Structure

- Modify: `frontend/src/pages/admin/LocalesPage.tsx`
  Purpose: extend the `Comuni` section config with `common.contactUs` and `maintenance.home`.
- Create: `frontend/src/pages/admin/__tests__/LocalesPage.test.tsx`
  Purpose: verify the admin UI exposes the new fields in the correct section and keeps the maintenance message as a textarea.

---

### Task 1: Add a failing admin test for the new common texts

**Files:**
- Create: `frontend/src/pages/admin/__tests__/LocalesPage.test.tsx`
- Modify: `frontend/src/pages/admin/LocalesPage.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocalesPage from '../LocalesPage'

vi.mock('i18next', () => ({
  default: { reloadResources: vi.fn() },
}))

const SAMPLE_LOCALE = {
  nav: {
    home: 'Home',
    ourStory: 'La Nostra Storia',
    whereWeAre: 'Dove Siamo',
    funeralHomes: 'Per le Imprese Funebri',
    marmistas: 'Per i Marmisti',
    altris: 'Altri Servizi',
    reservedArea: 'Area Riservata',
  },
  auth: {
    login: 'Accedi',
    logout: 'Esci',
    email: 'Email',
    password: 'Password',
    loginButton: 'Accedi',
  },
  errors: {
    unauthorized: 'Accesso non autorizzato',
    forbidden: 'Non hai i permessi per questa operazione',
    notFound: 'Pagina non trovata',
    serverError: 'Errore interno del server',
  },
  home: {
    headline: 'MIRIGLIANI',
    sectionFunebri: 'PER LE IMPRESE FUNEBRI',
    sectionFunebriInt: 'Al servizio del cliente',
    sectionFunebriDesc: 'Desc',
    sectionFunebriCta: 'CTA',
    sectionMarmistiInt: 'Int',
    sectionMarmisti: 'Titolo',
    sectionMarmistiDesc: 'Desc',
    sectionMarmistiCta: 'CTA',
    sectionAltriInt: 'Int',
    sectionAltri: 'Titolo',
    sectionAltriDesc: 'Desc',
    sectionAltriCta: 'CTA',
    locationTitle: 'LE NOSTRE SEDI',
    locationVillamar: 'Villamar',
    locationVillamarRegion: 'Medio Campidano, Sardegna',
    locationSassari: 'Sassari',
    locationSassariRegion: 'Sassari, Sardegna',
  },
  catalog: {
    coffins: 'Cofani',
    accessories: 'Accessori',
    marmista: 'Per i Marmisti',
    ceabis: 'Catalogo CEABIS',
    noResults: 'Nessun prodotto trovato',
    loading: 'Caricamento...',
    filterAll: 'Tutti',
    filterSearch: 'Cerca prodotto...',
    clearFilters: 'Pulisci filtri',
    viewDetails: 'Vedi dettagli',
    allCategories: 'Tutte le categorie',
    allSubcategories: 'Tutte le sottocategorie',
    searchPlaceholder: 'Cerca prodotto...',
    itemsFound: 'Articoli trovati',
    characteristics: 'Caratteristiche',
    internalMeasures: 'Misure Interne',
    measureUnit: 'Valori in cm',
    fieldEssence: 'Essenza',
    fieldFigure: 'Figura',
    fieldColor: 'Colorazione',
    fieldFinish: 'Finitura',
    fieldHead: 'Testa',
    fieldFeet: 'Piedi',
    fieldShoulder: 'Spalla',
    fieldHeight: 'Altezza',
    fieldWidth: 'Larghezza',
    fieldDepth: 'Profondità',
    pdfPage: 'Pagina catalogo PDF',
    prevProduct: 'Prodotto precedente',
    nextProduct: 'Prodotto successivo',
    funeralHomesTitle: 'Per le Imprese Funebri',
    funeralHomesSubtitle: 'Sottotitolo',
    partnerBrands: 'Marchi partner',
    ceabisSubtitle: 'Sottotitolo',
    searchFilters: 'Filtri di ricerca',
    searchByDescription: 'Cerca descrizione o codice...',
    description: 'Descrizione',
    price: 'Prezzo',
    priceListPrice: 'Prezzo listino',
    activePriceList: 'Listino attivo',
    priceListTypeSale: 'Vendita',
    priceListTypePurchase: 'Acquisto',
    availablePriceLists: 'Listini disponibili',
    selectPriceList: 'Seleziona listino',
    priceUnavailable: 'Non disponibile',
    category: 'Categoria',
    selectItemToView: 'Seleziona un articolo per visualizzare il catalogo PDF',
    accessoryCatalog: 'Catalogo accessori',
    offerOfMonth: 'Offerta del Mese',
    publicPrice: 'Prezzo pubblico',
    contactAgent: "Contatta L'Agente",
    imageNotAvailable: 'Immagine non disponibile',
  },
  ourStory: {
    title: 'Mirigliani',
    subtitle: 'Dal 1988 in Sardegna',
    heroTagline: 'Tagline',
    narrative: 'Narrativa',
    narrativeParagraph1: 'Paragrafo 1',
    narrativeParagraph2: 'Paragrafo 2',
    valuesTitle: 'I nostri valori',
    value1Title: 'Valore 1',
    value1Desc: 'Desc',
    value2Title: 'Valore 2',
    value2Desc: 'Desc',
    value3Title: 'Valore 3',
    value3Desc: 'Desc',
    locationTitle: 'LE NOSTRE SEDI',
  },
  whereWeAre: {
    title: 'Dove Siamo',
    subtitle: 'Subtitle',
    labelAddress: 'Indirizzo',
    labelPhone: 'Telefono',
    labelHours: 'Orari',
    labelWeekdays: 'Lun – Ven',
    labelSaturday: 'Sabato',
    labelSunday: 'Domenica',
    popupVillamar: 'Popup Villamar',
    popupSassari: 'Popup Sassari',
    mapApple: 'Apple Maps',
    mapGoogle: 'Google Maps',
    mapOpenStreetMap: 'OpenStreetMap',
    villamar: 'Sede di Villamar',
    villamarAddress: 'Via Villamar',
    villamarPhone: '',
    villamarHours: 'Orari',
    sassari: 'Sede di Sassari',
    sassariAddress: 'Via Sassari',
    sassariPhone: '',
    sassariHours: 'Su Appuntamento',
    pickupTitle: 'Orari di Ritiro',
    pickupVillamar: 'Sede di Villamar',
    pickupVillamarWeekdays: '8:00-12:30',
    pickupVillamarSaturday: 'Chiuso',
    pickupVillamarSunday: 'Chiuso',
    pickupSassari: 'Sede di Sassari',
    pickupSassariWeekdays: 'Su Appuntamento',
    pickupSassariSaturday: 'Su Appuntamento',
    pickupSassariSunday: 'Su Appuntamento',
    contactTitle: 'Contattaci',
    contactName: 'Nome',
    contactEmail: 'Email',
    contactMessage: 'Messaggio',
    validationName: 'Il nome deve avere almeno 2 caratteri',
    validationEmail: 'Email non valida',
    validationMessage: 'Il messaggio deve avere almeno 10 caratteri',
    contactSend: 'INVIA MESSAGGIO',
    contactMyMail: 'info@mirigliani.me',
    contactSending: 'Invio in corso...',
    contactSent: 'Messaggio inviato con successo!',
    contactError: 'Errore nell\'invio. Riprova.',
  },
  footer: {
    textClaim: 'Claim footer',
    rightsReserved: 'Tutti i diritti riservati',
    navigation: 'Navigatore',
    contacts: 'Contatti',
  },
  common: {
    contactUs: 'Contattaci',
  },
  maintenance: {
    home: 'Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novità.',
    ourStory: 'Questa pagina è temporaneamente in manutenzione.',
    whereWeAre: 'Questa pagina è temporaneamente in manutenzione.',
    funeralHomes: 'Questa pagina è temporaneamente in manutenzione.',
    marmistas: 'Questa pagina è temporaneamente in manutenzione.',
  },
}

const mockFetch = vi.fn()

describe('LocalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_LOCALE,
    })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mostra common.contactUs e maintenance.home nella sezione Comuni', async () => {
    const user = userEvent.setup()

    render(<LocalesPage />)

    await screen.findByText('Testi del sito')
    await user.click(screen.getByRole('button', { name: 'Comuni' }))

    expect(screen.getByText('Azioni comuni')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Pulsante Contattaci/i })).toHaveValue('Contattaci')

    expect(screen.getByText('Manutenzione')).toBeInTheDocument()
    const maintenanceMessage = screen.getByRole('textbox', { name: /Messaggio manutenzione globale/i })
    expect(maintenanceMessage).toHaveValue('Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novità.')
    expect(maintenanceMessage.tagName).toBe('TEXTAREA')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- LocalesPage`
Expected: FAIL because `Azioni comuni`, `Pulsante Contattaci`, and `Messaggio manutenzione globale` are not yet present in the `Comuni` section config.

- [ ] **Step 3: Write minimal implementation**

```tsx
  {
    id: 'comuni',
    label: 'Comuni',
    subgroups: [
      {
        label: 'Navigazione',
        fields: [
          { key: 'nav.home', label: 'Link home' },
          { key: 'nav.ourStory', label: 'Link nostra storia' },
          { key: 'nav.whereWeAre', label: 'Link dove siamo' },
          { key: 'nav.funeralHomes', label: 'Link imprese funebri' },
          { key: 'nav.marmistas', label: 'Link marmisti' },
          { key: 'nav.altris', label: 'Link altri servizi' },
          { key: 'nav.reservedArea', label: 'Link area riservata' },
        ],
      },
      {
        label: 'Azioni comuni',
        fields: [
          { key: 'common.contactUs', label: 'Pulsante Contattaci' },
        ],
      },
      {
        label: 'Footer',
        fields: [
          { key: 'footer.textClaim', label: 'Claim footer', multiline: true },
          { key: 'footer.rightsReserved', label: 'Tutti i diritti riservati' },
          { key: 'footer.navigation', label: 'Titolo colonna navigazione' },
          { key: 'footer.contacts', label: 'Titolo colonna contatti' },
        ],
      },
      {
        label: 'Autenticazione',
        fields: [
          { key: 'auth.login', label: 'Titolo pagina login' },
          { key: 'auth.logout', label: 'Link logout' },
          { key: 'auth.email', label: 'Label email' },
          { key: 'auth.password', label: 'Label password' },
          { key: 'auth.loginButton', label: 'Bottone accedi' },
        ],
      },
      {
        label: 'Messaggi di errore',
        fields: [
          { key: 'errors.unauthorized', label: 'Errore 401' },
          { key: 'errors.forbidden', label: 'Errore 403' },
          { key: 'errors.notFound', label: 'Errore 404' },
          { key: 'errors.serverError', label: 'Errore 500' },
        ],
      },
      {
        label: 'Manutenzione',
        fields: [
          { key: 'maintenance.home', label: 'Messaggio manutenzione globale', multiline: true },
        ],
      },
    ],
  },
```

This is the only production change needed because `LocalesPage` already initializes and saves all configured dot-notation keys.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- LocalesPage`
Expected: PASS with the new admin test green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/LocalesPage.tsx frontend/src/pages/admin/__tests__/LocalesPage.test.tsx
git commit -m "feat: expose common admin locale fields"
```

---

### Task 2: Run final admin verification

**Files:**
- Modify: none
- Test: `frontend/src/pages/admin/__tests__/LocalesPage.test.tsx`

- [ ] **Step 1: Run focused admin tests**

```bash
npm run test -- LocalesPage MaintenancePage
```

Expected: PASS. `LocalesPage` confirms the new `Comuni` fields are present and `MaintenancePage` confirms the maintenance admin page still behaves as before.

- [ ] **Step 2: Run the full frontend test suite**

```bash
npm run test
```

Expected: PASS with zero failing tests.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: PASS with a successful Vite build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/LocalesPage.tsx frontend/src/pages/admin/__tests__/LocalesPage.test.tsx
git commit -m "test: cover common locale admin fields"
```
