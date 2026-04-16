import { useEffect, useMemo, useState } from 'react'
import i18n from 'i18next'
import { fetchAdminMaps, updateAdminMaps } from '../../lib/api/maps'
import type { AdminMapsResponse } from '../../../../backend/src/types/shared'

const DEFAULT_STATE: AdminMapsResponse = {
  offices: {
    villamar: { lat: 39.6189, lng: 9.0003 },
    sassari: { lat: 40.7259, lng: 8.5558 },
  },
}

function cloneState(state: AdminMapsResponse): AdminMapsResponse {
  return {
    offices: {
      villamar: { ...state.offices.villamar },
      sassari: { ...state.offices.sassari },
    },
  }
}

export default function MapsPage() {
  const [initialState, setInitialState] = useState<AdminMapsResponse | null>(null)
  const [formState, setFormState] = useState<AdminMapsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetchAdminMaps()
      .then((res) => {
        setInitialState(res.data)
        setFormState(res.data)
      })
      .catch(() => {
        setInitialState(DEFAULT_STATE)
        setFormState(DEFAULT_STATE)
        setLoadError('Impossibile caricare le mappe.')
      })
      .finally(() => setLoading(false))
  }, [])

  const isDirty = useMemo(() => {
    if (!initialState || !formState) return false
    return JSON.stringify(initialState) !== JSON.stringify(formState)
  }, [initialState, formState])

  function updateOffice(office: keyof AdminMapsResponse['offices'], field: 'lat' | 'lng', value: string) {
    setFormState((prev) => {
      if (!prev) return prev
      return {
        offices: {
          ...prev.offices,
          [office]: {
            ...prev.offices[office],
            [field]: value === '' ? 0 : Number(value),
          },
        },
      }
    })
    setSaveError(null)
    setSaveSuccess(false)
  }

  async function handleSave() {
    if (!formState) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const payload = cloneState(formState)
      await updateAdminMaps(payload)
      setInitialState(payload)
      setSaveSuccess(true)
      await i18n.reloadResources('it')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Errore sconosciuto.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError && !formState) {
    return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
  }

  if (loading || !formState) {
    return <div className="py-10 text-sm text-[#6B7280]">Caricamento mappe...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Interfaccia</p>
        <h2 className="text-3xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Mappe
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Gestisci le coordinate usate nella pagina Dove Siamo e nei collegamenti esterni.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {([
          { key: 'villamar', label: 'Villamar' },
          { key: 'sassari', label: 'Sassari' },
        ] as const).map(({ key, label }) => (
          <section key={key} className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
            <h3 className="text-xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
              {label}
            </h3>
            <p className="mt-2 text-sm text-[#6B7280]">
              Inserisci le coordinate esatte della sede.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="admin-label" htmlFor={`${key}-lat`}>Latitudine</label>
                <input
                  id={`${key}-lat`}
                  type="number"
                  step="0.000001"
                  value={formState.offices[key].lat}
                  onChange={(e) => updateOffice(key, 'lat', e.target.value)}
                  className="admin-input"
                />
              </div>
              <div>
                <label className="admin-label" htmlFor={`${key}-lng`}>Longitudine</label>
                <input
                  id={`${key}-lng`}
                  type="number"
                  step="0.000001"
                  value={formState.offices[key].lng}
                  onChange={(e) => updateOffice(key, 'lng', e.target.value)}
                  className="admin-input"
                />
              </div>
            </div>
          </section>
        ))}
      </div>

      {saveError && <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>}
      {saveSuccess && <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Mappe salvate con successo.</p>}

      <div className="flex items-center gap-4">
        <button
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
        {isDirty && !saving && <p className="text-xs text-[#6B7280]">Hai modifiche non salvate.</p>}
      </div>
    </div>
  )
}
