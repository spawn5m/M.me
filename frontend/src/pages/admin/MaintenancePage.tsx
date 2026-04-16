import { useEffect, useMemo, useState } from 'react'
import i18n from 'i18next'
import { fetchAdminMaintenance, updateAdminMaintenance } from '../../lib/api/maintenance'
import { readMaintenancePreviewEnabled, writeMaintenancePreviewEnabled } from '../../lib/maintenance-preview'
import type { AdminMaintenancePageConfig, AdminMaintenanceResponse, MaintenancePageKey } from '../../../../backend/src/types/shared'

const PAGE_LABELS: Record<MaintenancePageKey, string> = {
  home: 'Home',
  ourStory: 'La Nostra Storia',
  whereWeAre: 'Dove Siamo',
  funeralHomes: 'Per le Imprese Funebri',
  marmistas: 'Per i Marmisti',
}

const PAGE_ORDER: MaintenancePageKey[] = ['home', 'ourStory', 'whereWeAre', 'funeralHomes', 'marmistas']

export default function MaintenancePage() {
  const [previewEnabled, setPreviewEnabled] = useState(() => readMaintenancePreviewEnabled())
  const [initialState, setInitialState] = useState<AdminMaintenanceResponse | null>(null)
  const [formState, setFormState] = useState<AdminMaintenanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetchAdminMaintenance()
      .then((res) => {
        setInitialState(res.data)
        setFormState(res.data)
      })
      .catch(() => setLoadError('Impossibile caricare lo stato di manutenzione.'))
      .finally(() => setLoading(false))
  }, [])

  const isDirty = useMemo(() => {
    if (!initialState || !formState) return false
    return JSON.stringify(initialState) !== JSON.stringify(formState)
  }, [initialState, formState])

  function updatePage(key: MaintenancePageKey, patch: Partial<AdminMaintenancePageConfig>) {
    setFormState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [key]: {
            ...prev.pages[key],
            ...patch,
          },
        },
      }
    })
    setSaveError(null)
    setSaveSuccess(false)
  }

  function updatePreviewEnabled(enabled: boolean) {
    setPreviewEnabled(enabled)
    writeMaintenancePreviewEnabled(enabled)
  }

  async function handleSave() {
    if (!formState) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      await updateAdminMaintenance(formState)
      setInitialState(formState)
      setSaveSuccess(true)
      await i18n.reloadResources('it')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Errore sconosciuto.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
  }

  if (loading || !formState) {
    return <div className="py-10 text-sm text-[#6B7280]">Caricamento manutenzione...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Interfaccia</p>
        <h2 className="text-3xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Manutenzione
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Attiva o disattiva la manutenzione delle pagine pubbliche e definisci il testo mostrato ai visitatori.
        </p>
      </div>

      <div className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">Preview manutenzione</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Attiva la preview solo per questa sessione admin per vedere le pagine pubbliche reali durante la manutenzione.
            </p>
          </div>

          <div className="w-full self-start lg:max-w-xs">
            <label htmlFor="maintenance-preview" className="admin-label">
              Preview manutenzione
            </label>
            <select
              id="maintenance-preview"
              value={String(previewEnabled)}
              onChange={(e) => updatePreviewEnabled(e.target.value === 'true')}
              className="admin-select"
            >
              <option value="false">Spenta</option>
              <option value="true">Attiva</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {PAGE_ORDER.map((key) => {
          const page = formState.pages[key]
          return (
            <div key={key} className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {PAGE_LABELS[key]}
                    </h3>
                    {key === 'home' && (
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#C9A96E]">
                        Attiva tutto il sito
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    {key === 'home'
                      ? 'Se attivi Home, tutte le pagine pubbliche andranno in manutenzione.'
                      : 'La manutenzione di questa pagina non influenza le altre pagine pubbliche.'}
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-3 self-start text-sm font-medium text-[#031634]">
                  <input
                    type="checkbox"
                    checked={page.enabled}
                    onChange={(e) => updatePage(key, { enabled: e.target.checked })}
                    className="h-5 w-5 accent-[#C9A96E]"
                  />
                  In manutenzione
                </label>
              </div>

              <div className="mt-5">
                {key === 'home' ? (
                  <div className="space-y-4">
                    <p className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                      Frasi da mostrare
                    </p>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                        Frase H2
                      </label>
                      <textarea
                        rows={2}
                        value={page.homeH2 ?? ''}
                        onChange={(e) => updatePage(key, { homeH2: e.target.value })}
                        className="w-full border border-[#E5E0D8] px-3 py-2 text-sm text-[#031634] transition-colors focus:border-[#031634] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                        Messaggio principale
                      </label>
                      <textarea
                        rows={3}
                        value={page.message}
                        onChange={(e) => updatePage(key, { message: e.target.value })}
                        className="w-full border border-[#E5E0D8] px-3 py-2 text-sm text-[#031634] transition-colors focus:border-[#031634] focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                      Frase da mostrare
                    </label>
                    <textarea
                      rows={3}
                      value={page.message}
                      onChange={(e) => updatePage(key, { message: e.target.value })}
                      className="w-full border border-[#E5E0D8] px-3 py-2 text-sm text-[#031634] transition-colors focus:border-[#031634] focus:outline-none"
                    />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {saveError && <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>}
      {saveSuccess && <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Manutenzione salvata con successo.</p>}

      <div className="flex items-center gap-4">
        <button
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
        {isDirty && !saving && (
          <p className="text-xs text-[#6B7280]">Hai modifiche non salvate.</p>
        )}
      </div>
    </div>
  )
}
