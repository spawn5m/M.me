import { useRef, useState } from 'react'
import { useBranding } from '../../context/BrandingContext'

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const MAX_IMG_SIZE = 5 * 1024 * 1024

const SLOTS = [
  { id: 'home-funebri', label: 'Imprese Funebri (Home)' },
  { id: 'home-marmisti', label: 'Marmisti (Home)' },
  { id: 'home-altri', label: 'Cimiteri / Altri (Home)' },
  { id: 'storia-narrativa', label: 'La Nostra Storia' },
] as const

type SlotId = typeof SLOTS[number]['id']

interface SlotState {
  uploading: boolean
  deleting: boolean
  error: string | null
  success: string | null
}

const initialSlotState: SlotState = { uploading: false, deleting: false, error: null, success: null }

export default function BrandingLogoPage() {
  const { logoUrl, images, refresh } = useBranding()

  // ── Logo state ──────────────────────────────────────────────────────────
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoDeleting, setLogoDeleting] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null)

  // ── Slot state ──────────────────────────────────────────────────────────
  const slotInputRefs = useRef<Record<SlotId, HTMLInputElement | null>>({
    'home-funebri': null,
    'home-marmisti': null,
    'home-altri': null,
    'storia-narrativa': null,
  })
  const [slotStates, setSlotStates] = useState<Record<SlotId, SlotState>>(
    Object.fromEntries(SLOTS.map((s) => [s.id, { ...initialSlotState }])) as Record<SlotId, SlotState>
  )

  function setSlot(id: SlotId, patch: Partial<SlotState>) {
    setSlotStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  // ── Logo handlers ───────────────────────────────────────────────────────
  async function handleLogoUpload(file: File) {
    setLogoError(null)
    setLogoSuccess(null)
    if (!['image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setLogoError('Formato non supportato. Usa PNG, WebP o SVG.')
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('File troppo grande. Massimo 2 MB.')
      return
    }
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/branding/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Errore durante il caricamento.')
      }
      refresh()
      setLogoSuccess('Logo caricato con successo.')
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoDelete() {
    setLogoError(null)
    setLogoSuccess(null)
    setLogoDeleting(true)
    try {
      const res = await fetch('/api/admin/branding/logo', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Errore durante la cancellazione.')
      }
      refresh()
      setLogoSuccess('Logo eliminato.')
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setLogoDeleting(false)
    }
  }

  // ── Slot handlers ───────────────────────────────────────────────────────
  async function handleSlotUpload(id: SlotId, file: File) {
    setSlot(id, { error: null, success: null })
    if (!['image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setSlot(id, { error: 'Formato non supportato. Usa PNG, WebP o SVG.' })
      return
    }
    if (file.size > MAX_IMG_SIZE) {
      setSlot(id, { error: 'File troppo grande. Massimo 5 MB.' })
      return
    }
    setSlot(id, { uploading: true })
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/admin/branding/images/${id}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Errore durante il caricamento.')
      }
      refresh()
      setSlot(id, { success: 'Immagine caricata.' })
    } catch (err) {
      setSlot(id, { error: err instanceof Error ? err.message : 'Errore sconosciuto.' })
    } finally {
      setSlot(id, { uploading: false })
    }
  }

  async function handleSlotDelete(id: SlotId) {
    setSlot(id, { error: null, success: null, deleting: true })
    try {
      const res = await fetch(`/api/admin/branding/images/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Errore durante la cancellazione.')
      }
      refresh()
      setSlot(id, { success: 'Immagine eliminata.' })
    } catch (err) {
      setSlot(id, { error: err instanceof Error ? err.message : 'Errore sconosciuto.' })
    } finally {
      setSlot(id, { deleting: false })
    }
  }

  return (
    <div className="space-y-12">

      {/* ── Sezione Logo ───────────────────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
            Interfaccia
          </p>
          <h2
            className="text-3xl text-[#031634]"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Logo aziendale
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            PNG, WebP o SVG. Per PNG, dimensioni massime 512×512px. Questa immagine
            comparirà sopra il titolo nella homepage e accanto al nome nella barra di navigazione.
          </p>
        </div>

        <div className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
            Logo attuale
          </p>
          {logoUrl ? (
            <div className="flex items-start gap-6">
              <div className="flex h-32 w-32 items-center justify-center border border-[#E5E0D8] bg-[#F8F7F4] p-3">
                <img src={logoUrl} alt="Logo corrente" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[#6B7280]">
                  File: <span className="font-medium text-[#031634]">{logoUrl.split('/').pop()?.split('?')[0]}</span>
                </p>
                <button
                  onClick={() => void handleLogoDelete()}
                  disabled={logoDeleting}
                  className="inline-flex min-h-9 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                >
                  {logoDeleting ? 'Eliminazione...' : 'Elimina logo'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">Nessun logo caricato.</p>
          )}
        </div>

        <div
          className="border border-dashed border-[#C9A96E] bg-white p-10 text-center transition-colors hover:bg-[#FAF9F6]"
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleLogoUpload(f) }}
          onDragOver={(e) => e.preventDefault()}
        >
          <p className="mb-3 text-sm text-[#6B7280]">Trascina qui un file, oppure</p>
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
          >
            {logoUploading ? 'Caricamento...' : 'Seleziona file'}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f); e.target.value = '' }}
          />
          <p className="mt-3 text-xs text-[#6B7280]">PNG · WebP · SVG · max 2 MB</p>
        </div>

        {logoError && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{logoError}</p>
        )}
        {logoSuccess && (
          <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{logoSuccess}</p>
        )}
      </section>

      {/* ── Sezione Immagini di pagina ─────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2
            className="text-3xl text-[#031634]"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Immagini di pagina
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Carica un&apos;immagine per ogni sezione. PNG, WebP o SVG, max 5 MB.
            Se non caricata, la sezione mostra lo sfondo scuro predefinito.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SLOTS.map((slot) => {
            const state = slotStates[slot.id]
            const currentUrl = images[slot.id] ?? null

            return (
              <div
                key={slot.id}
                className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)] space-y-4"
              >
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
                  {slot.label}
                </p>

                {/* Anteprima */}
                <div className="flex h-40 w-full items-center justify-center border border-[#E5E0D8] bg-[#F8F7F4] overflow-hidden">
                  {currentUrl ? (
                    <img
                      src={currentUrl}
                      alt={slot.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-[#6B7280] uppercase tracking-widest">Nessuna immagine</span>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  className="border border-dashed border-[#C9A96E] p-4 text-center transition-colors hover:bg-[#FAF9F6] cursor-pointer"
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files[0]
                    if (f) void handleSlotUpload(slot.id, f)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <button
                    onClick={() => slotInputRefs.current[slot.id]?.click()}
                    disabled={state.uploading}
                    className="inline-flex min-h-8 items-center justify-center border border-[#C9A96E] px-4 py-1.5 text-xs font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
                  >
                    {state.uploading ? 'Caricamento...' : 'Seleziona file'}
                  </button>
                  <input
                    ref={(el) => { slotInputRefs.current[slot.id] = el }}
                    type="file"
                    accept="image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleSlotUpload(slot.id, f)
                      e.target.value = ''
                    }}
                  />
                  <p className="mt-2 text-xs text-[#6B7280]">PNG · WebP · SVG · max 5 MB</p>
                </div>

                {currentUrl && (
                  <button
                    onClick={() => void handleSlotDelete(slot.id)}
                    disabled={state.deleting}
                    className="inline-flex min-h-8 w-full items-center justify-center border border-[#E5E0D8] px-4 py-1.5 text-xs font-medium text-[#031634] transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {state.deleting ? 'Eliminazione...' : 'Elimina immagine'}
                  </button>
                )}

                {state.error && (
                  <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
                )}
                {state.success && (
                  <p className="border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{state.success}</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
