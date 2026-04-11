import { useState, useEffect, useCallback } from 'react'
import i18n from 'i18next'

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string         // dot-notation es. "home.headline"
  label: string       // etichetta human-readable
  multiline?: boolean // usa textarea invece di input
}

interface SubgroupDef {
  label: string
  fields: FieldDef[]
}

interface SectionDef {
  id: string
  label: string
  subgroups: SubgroupDef[]
}

// ─── Config sezioni ───────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  {
    id: 'dati-aziendali',
    label: 'Dati Aziendali',
    subgroups: [
      {
        label: 'Sede Villamar',
        fields: [
          { key: 'whereWeAre.villamar', label: 'Nome sede' },
          { key: 'whereWeAre.villamarAddress', label: 'Indirizzo' },
          { key: 'whereWeAre.villamarPhone', label: 'Telefono' },
          { key: 'whereWeAre.villamarHours', label: 'Orari (stringa breve)' },
          { key: 'whereWeAre.pickupVillamarWeekdays', label: 'Orari ritiro lun-ven' },
          { key: 'whereWeAre.pickupVillamarSaturday', label: 'Orari ritiro sabato' },
          { key: 'whereWeAre.pickupVillamarSunday', label: 'Orari ritiro domenica' },
        ],
      },
      {
        label: 'Sede Sassari',
        fields: [
          { key: 'whereWeAre.sassari', label: 'Nome sede' },
          { key: 'whereWeAre.sassariAddress', label: 'Indirizzo' },
          { key: 'whereWeAre.sassariPhone', label: 'Telefono' },
          { key: 'whereWeAre.sassariHours', label: 'Orari (stringa breve)' },
          { key: 'whereWeAre.pickupSassariWeekdays', label: 'Orari ritiro lun-ven' },
          { key: 'whereWeAre.pickupSassariSaturday', label: 'Orari ritiro sabato' },
          { key: 'whereWeAre.pickupSassariSunday', label: 'Orari ritiro domenica' },
        ],
      },
      {
        label: 'Contatto email',
        fields: [
          { key: 'whereWeAre.contactMyMail', label: 'Email di contatto' },
        ],
      },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    subgroups: [
      {
        label: 'Hero',
        fields: [
          { key: 'home.badge', label: 'Badge (es. "Dal 1988 in Sardegna")' },
          { key: 'home.headline', label: 'Titolo principale', multiline: true },
          { key: 'home.subheadline', label: 'Sottotitolo', multiline: true },
          { key: 'home.ctaPrimary', label: 'Bottone primario' },
          { key: 'home.ctaSecondary', label: 'Bottone secondario' },
        ],
      },
      {
        label: 'Sezione Imprese Funebri',
        fields: [
          { key: 'home.sectionFunebri', label: 'Titolo sezione' },
          { key: 'home.sectionFunebriInt', label: 'Intestazione interna' },
          { key: 'home.sectionFunebriDesc', label: 'Descrizione', multiline: true },
          { key: 'home.sectionFunebriCta', label: 'Bottone CTA' },
        ],
      },
      {
        label: 'Sezione Marmisti',
        fields: [
          { key: 'home.sectionMarmisti', label: 'Titolo sezione' },
          { key: 'home.sectionMarmistiInt', label: 'Intestazione interna' },
          { key: 'home.sectionMarmistiDesc', label: 'Descrizione', multiline: true },
          { key: 'home.sectionMarmistiCta', label: 'Bottone CTA' },
        ],
      },
      {
        label: 'Sezione Altri Servizi',
        fields: [
          { key: 'home.sectionAltri', label: 'Titolo sezione' },
          { key: 'home.sectionAltriInt', label: 'Intestazione interna' },
          { key: 'home.sectionAltriDesc', label: 'Descrizione', multiline: true },
          { key: 'home.sectionAltriCta', label: 'Bottone CTA' },
        ],
      },
      {
        label: 'Sedi',
        fields: [
          { key: 'home.locationTitle', label: 'Titolo sedi' },
          { key: 'home.locationVillamar', label: 'Nome Villamar' },
          { key: 'home.locationVillamarRegion', label: 'Regione Villamar' },
          { key: 'home.locationSassari', label: 'Nome Sassari' },
          { key: 'home.locationSassariRegion', label: 'Regione Sassari' },
        ],
      },
    ],
  },
  {
    id: 'nostra-storia',
    label: 'La Nostra Storia',
    subgroups: [
      {
        label: 'Hero',
        fields: [
          { key: 'ourStory.title', label: 'Titolo' },
          { key: 'ourStory.subtitle', label: 'Sottotitolo' },
          { key: 'ourStory.heroTagline', label: 'Tagline hero', multiline: true },
        ],
      },
      {
        label: 'Narrativa',
        fields: [
          { key: 'ourStory.narrative', label: 'Narrativa introduttiva', multiline: true },
          { key: 'ourStory.narrativeParagraph1', label: 'Paragrafo 1', multiline: true },
          { key: 'ourStory.narrativeParagraph2', label: 'Paragrafo 2', multiline: true },
        ],
      },
      {
        label: 'Valori',
        fields: [
          { key: 'ourStory.valuesTitle', label: 'Titolo sezione valori' },
          { key: 'ourStory.value1Title', label: 'Valore 1 — titolo' },
          { key: 'ourStory.value1Desc', label: 'Valore 1 — descrizione', multiline: true },
          { key: 'ourStory.value2Title', label: 'Valore 2 — titolo' },
          { key: 'ourStory.value2Desc', label: 'Valore 2 — descrizione', multiline: true },
          { key: 'ourStory.value3Title', label: 'Valore 3 — titolo' },
          { key: 'ourStory.value3Desc', label: 'Valore 3 — descrizione', multiline: true },
          { key: 'ourStory.locationTitle', label: 'Titolo sedi' },
        ],
      },
    ],
  },
  {
    id: 'dove-siamo',
    label: 'Dove Siamo',
    subgroups: [
      {
        label: 'Intestazioni',
        fields: [
          { key: 'whereWeAre.title', label: 'Titolo pagina' },
          { key: 'whereWeAre.subtitle', label: 'Sottotitolo', multiline: true },
          { key: 'whereWeAre.popupVillamar', label: 'Popup mappa — Villamar' },
          { key: 'whereWeAre.popupSassari', label: 'Popup mappa — Sassari' },
        ],
      },
      {
        label: 'Etichette generiche',
        fields: [
          { key: 'whereWeAre.labelAddress', label: 'Label indirizzo' },
          { key: 'whereWeAre.labelPhone', label: 'Label telefono' },
          { key: 'whereWeAre.labelHours', label: 'Label orari' },
          { key: 'whereWeAre.labelWeekdays', label: 'Label lun-ven' },
          { key: 'whereWeAre.labelSaturday', label: 'Label sabato' },
          { key: 'whereWeAre.labelSunday', label: 'Label domenica' },
          { key: 'whereWeAre.pickupTitle', label: 'Titolo sezione orari ritiro' },
          { key: 'whereWeAre.pickupVillamar', label: 'Label ritiro Villamar' },
          { key: 'whereWeAre.pickupSassari', label: 'Label ritiro Sassari' },
        ],
      },
      {
        label: 'Modulo di contatto',
        fields: [
          { key: 'whereWeAre.contactTitle', label: 'Titolo modulo' },
          { key: 'whereWeAre.contactName', label: 'Label nome' },
          { key: 'whereWeAre.contactEmail', label: 'Label email' },
          { key: 'whereWeAre.contactMessage', label: 'Label messaggio' },
          { key: 'whereWeAre.validationName', label: 'Errore validazione nome' },
          { key: 'whereWeAre.validationEmail', label: 'Errore validazione email' },
          { key: 'whereWeAre.validationMessage', label: 'Errore validazione messaggio' },
          { key: 'whereWeAre.contactSend', label: 'Testo bottone invia' },
          { key: 'whereWeAre.contactSending', label: 'Testo durante invio' },
          { key: 'whereWeAre.contactSent', label: 'Messaggio successo' },
          { key: 'whereWeAre.contactError', label: 'Messaggio errore' },
        ],
      },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catalogo',
    subgroups: [
      {
        label: 'Generali',
        fields: [
          { key: 'catalog.coffins', label: 'Tab cofani' },
          { key: 'catalog.accessories', label: 'Tab accessori' },
          { key: 'catalog.marmista', label: 'Tab marmisti' },
          { key: 'catalog.ceabis', label: 'Tab Ceabis' },
          { key: 'catalog.noResults', label: 'Nessun risultato' },
          { key: 'catalog.loading', label: 'Caricamento' },
          { key: 'catalog.filterAll', label: 'Filtro tutti' },
          { key: 'catalog.filterSearch', label: 'Placeholder filtro' },
          { key: 'catalog.clearFilters', label: 'Pulisci filtri' },
          { key: 'catalog.viewDetails', label: 'Vedi dettagli' },
          { key: 'catalog.allCategories', label: 'Tutte le categorie' },
          { key: 'catalog.allSubcategories', label: 'Tutte le sottocategorie' },
          { key: 'catalog.searchPlaceholder', label: 'Placeholder ricerca' },
          { key: 'catalog.itemsFound', label: 'Articoli trovati (label)' },
          { key: 'catalog.searchFilters', label: 'Titolo filtri' },
          { key: 'catalog.searchByDescription', label: 'Placeholder ricerca descrizione' },
        ],
      },
      {
        label: 'Scheda prodotto',
        fields: [
          { key: 'catalog.characteristics', label: 'Titolo caratteristiche' },
          { key: 'catalog.internalMeasures', label: 'Titolo misure interne' },
          { key: 'catalog.measureUnit', label: 'Unità di misura' },
          { key: 'catalog.fieldEssence', label: 'Campo essenza' },
          { key: 'catalog.fieldFigure', label: 'Campo figura' },
          { key: 'catalog.fieldColor', label: 'Campo colorazione' },
          { key: 'catalog.fieldFinish', label: 'Campo finitura' },
          { key: 'catalog.fieldHead', label: 'Campo testa' },
          { key: 'catalog.fieldFeet', label: 'Campo piedi' },
          { key: 'catalog.fieldShoulder', label: 'Campo spalla' },
          { key: 'catalog.fieldHeight', label: 'Campo altezza' },
          { key: 'catalog.fieldWidth', label: 'Campo larghezza' },
          { key: 'catalog.fieldDepth', label: 'Campo profondità' },
          { key: 'catalog.description', label: 'Label descrizione' },
          { key: 'catalog.category', label: 'Label categoria' },
          { key: 'catalog.pdfPage', label: 'Pagina catalogo PDF' },
          { key: 'catalog.prevProduct', label: 'Prodotto precedente' },
          { key: 'catalog.nextProduct', label: 'Prodotto successivo' },
          { key: 'catalog.imageNotAvailable', label: 'Immagine non disponibile' },
        ],
      },
      {
        label: 'Prezzi e listini',
        fields: [
          { key: 'catalog.price', label: 'Label prezzo' },
          { key: 'catalog.priceListPrice', label: 'Prezzo listino' },
          { key: 'catalog.activePriceList', label: 'Listino attivo' },
          { key: 'catalog.priceListTypeSale', label: 'Tipo vendita' },
          { key: 'catalog.priceListTypePurchase', label: 'Tipo acquisto' },
          { key: 'catalog.availablePriceLists', label: 'Listini disponibili' },
          { key: 'catalog.selectPriceList', label: 'Seleziona listino' },
          { key: 'catalog.priceUnavailable', label: 'Prezzo non disponibile' },
          { key: 'catalog.publicPrice', label: 'Prezzo pubblico' },
          { key: 'catalog.contactAgent', label: "Contatta l'agente" },
        ],
      },
      {
        label: 'Pagine catalogo specifiche',
        fields: [
          { key: 'catalog.funeralHomesTitle', label: 'Titolo pagina imprese' },
          { key: 'catalog.funeralHomesSubtitle', label: 'Sottotitolo pagina imprese', multiline: true },
          { key: 'catalog.partnerBrands', label: 'Marchi partner' },
          { key: 'catalog.ceabisSubtitle', label: 'Sottotitolo Ceabis', multiline: true },
          { key: 'catalog.selectItemToView', label: 'Seleziona articolo (PDF)' },
          { key: 'catalog.accessoryCatalog', label: 'Titolo catalogo accessori' },
          { key: 'catalog.offerOfMonth', label: 'Offerta del mese' },
        ],
      },
    ],
  },
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
    ],
  },
]

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Legge un valore annidato da un oggetto usando dot-notation. */
function getNestedValue(obj: Record<string, unknown>, dotKey: string): string {
  const parts = dotKey.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return ''
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : ''
}

/** Scrive un valore annidato in un oggetto usando dot-notation (immutabile). */
function setNestedValue(
  obj: Record<string, unknown>,
  dotKey: string,
  value: string,
): Record<string, unknown> {
  const parts = dotKey.split('.')
  if (parts.length === 0) return obj
  const result = { ...obj }
  const [first, ...rest] = parts
  if (rest.length === 0) {
    result[first] = value
  } else {
    const nested = typeof result[first] === 'object' && result[first] !== null
      ? (result[first] as Record<string, unknown>)
      : {}
    result[first] = setNestedValue(nested, rest.join('.'), value)
  }
  return result
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function LocalesPage() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id)
  const [fullLocale, setFullLocale] = useState<Record<string, unknown> | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [warnUnsaved, setWarnUnsaved] = useState(false)
  const [pendingSection, setPendingSection] = useState<string | null>(null)

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]

  // Carica il JSON completo dall'API
  useEffect(() => {
    fetch('/api/public/locales/it', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Record<string, unknown>>
      })
      .then((data) => {
        setFullLocale(data)
        // Inizializza i valori del form con tutti i campi di tutte le sezioni
        const initial: Record<string, string> = {}
        for (const section of SECTIONS) {
          for (const subgroup of section.subgroups) {
            for (const field of subgroup.fields) {
              initial[field.key] = getNestedValue(data, field.key)
            }
          }
        }
        setFormValues(initial)
      })
      .catch(() => setLoadError('Impossibile caricare i testi dal server.'))
  }, [])

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    setDirtyKeys((prev) => new Set(prev).add(key))
    setSaveSuccess(false)
    setSaveError(null)
  }, [])

  function doSwitchSection(id: string) {
    setActiveSection(id)
    setWarnUnsaved(false)
    setPendingSection(null)
    setSaveSuccess(false)
    setSaveError(null)
  }

  function handleSectionClick(id: string) {
    if (dirtyKeys.size > 0 && id !== activeSection) {
      setPendingSection(id)
      setWarnUnsaved(true)
    } else {
      doSwitchSection(id)
    }
  }

  async function handleSave() {
    if (!fullLocale) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    // Applica tutti i valori del form al JSON completo
    let updated = { ...fullLocale }
    for (const [key, value] of Object.entries(formValues)) {
      updated = setNestedValue(updated, key, value) as Record<string, unknown>
    }

    try {
      const res = await fetch('/api/admin/locales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated),
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Errore durante il salvataggio.')
      }
      setFullLocale(updated)
      setDirtyKeys(new Set())
      setSaveSuccess(true)
      // Aggiorna i18n senza ricaricare la pagina
      await i18n.reloadResources('it')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    )
  }

  if (!fullLocale) {
    return (
      <div className="flex items-center gap-3 py-10 text-sm text-[#6B7280]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#031634] border-t-transparent" />
        Caricamento testi...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
          Interfaccia
        </p>
        <h2
          className="text-3xl text-[#031634]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Testi del sito
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Modifica i testi dell'interfaccia italiana. Le modifiche sono attive immediatamente dopo il salvataggio.
        </p>
      </div>

      {/* Layout due colonne */}
      <div className="flex gap-8">
        {/* Sidebar sezioni */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={[
                  'block w-full border px-4 py-3 text-left text-sm font-medium transition-colors',
                  activeSection === section.id
                    ? 'border-[#C9A96E] bg-white text-[#031634] shadow-[0_2px_8px_rgba(26,43,74,0.08)]'
                    : 'border-transparent text-[#6B7280] hover:border-[#E5E0D8] hover:bg-white hover:text-[#031634]',
                ].join(' ')}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Pannello campi */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Avviso modifiche non salvate */}
          {warnUnsaved && pendingSection && (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Hai modifiche non salvate in questa sezione.{' '}
              <button
                className="font-medium underline"
                onClick={() => doSwitchSection(pendingSection)}
              >
                Cambia sezione senza salvare
              </button>
              {' '}oppure{' '}
              <button
                className="font-medium underline"
                onClick={() => { setPendingSection(null); setWarnUnsaved(false) }}
              >
                rimani qui
              </button>
              .
            </div>
          )}

          {/* Campi della sezione attiva */}
          {currentSection.subgroups.map((subgroup) => (
            <div
              key={subgroup.label}
              className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]"
            >
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
                {subgroup.label}
              </p>
              <div className="space-y-4">
                {subgroup.fields.map((field) => {
                  const isDirty = dirtyKeys.has(field.key)
                  const baseClass = 'w-full border px-3 py-2 text-sm text-[#031634] transition-colors focus:outline-none focus:border-[#031634]'
                  const borderClass = isDirty ? 'border-[#C9A96E]' : 'border-[#E5E0D8]'
                  return (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                        {field.label}
                        <span className="ml-2 font-mono text-[10px] normal-case tracking-normal text-[#9CA3AF]">
                          {field.key}
                        </span>
                      </label>
                      {field.multiline ? (
                        <textarea
                          rows={2}
                          value={formValues[field.key] ?? ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className={`${baseClass} ${borderClass} resize-y`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={formValues[field.key] ?? ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className={`${baseClass} ${borderClass}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Feedback e bottone salva */}
          {saveError && (
            <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Testi salvati con successo.
            </p>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={() => void handleSave()}
              disabled={saving || dirtyKeys.size === 0}
              className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : `Salva ${currentSection.label}`}
            </button>
            {dirtyKeys.size > 0 && !saving && (
              <p className="text-xs text-[#6B7280]">
                {dirtyKeys.size} campo{dirtyKeys.size !== 1 ? 'i' : ''} modificato{dirtyKeys.size !== 1 ? 'i' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
