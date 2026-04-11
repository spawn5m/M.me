import { useRef, useState } from 'react'
import { useBranding } from '../../context/BrandingContext'

const MAX_SIZE_BYTES = 2 * 1024 * 1024

export default function BrandingLogoPage() {
  const { logoUrl, refresh } = useBranding()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setError(null)
    setSuccess(null)

    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      setError('Formato non supportato. Usa PNG o SVG.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File troppo grande. Massimo 2 MB.')
      return
    }

    setUploading(true)
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
      setSuccess('Logo caricato con successo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setSuccess(null)
    setDeleting(true)
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
      setSuccess('Logo eliminato.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setDeleting(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) void handleUpload(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleUpload(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-8">
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
          Carica un'immagine PNG o SVG. Per PNG, dimensioni massime 512×512px. Questa immagine
          comparirà sopra il titolo nella homepage, accanto al nome nella barra di navigazione
          e come favicon del sito.
        </p>
      </div>

      {/* Anteprima corrente */}
      <div className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
          Logo attuale
        </p>
        {logoUrl ? (
          <div className="flex items-start gap-6">
            <div className="flex h-32 w-32 items-center justify-center border border-[#E5E0D8] bg-[#F8F7F4] p-3">
              <img
                src={`${logoUrl}?t=${Date.now()}`}
                alt="Logo corrente"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[#6B7280]">
                File: <span className="font-medium text-[#031634]">{logoUrl.split('/').pop()}</span>
              </p>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="inline-flex min-h-9 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
              >
                {deleting ? 'Eliminazione...' : 'Elimina logo'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">Nessun logo caricato.</p>
        )}
      </div>

      {/* Drop zone */}
      <div
        className="border border-dashed border-[#C9A96E] bg-white p-10 text-center transition-colors hover:bg-[#FAF9F6]"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <p className="mb-3 text-sm text-[#6B7280]">
          Trascina qui un file PNG o SVG, oppure
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
        >
          {uploading ? 'Caricamento...' : 'Seleziona file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="mt-3 text-xs text-[#6B7280]">PNG (max 512×512px) · SVG · max 2 MB</p>
      </div>

      {/* Feedback */}
      {error && (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </p>
      )}
    </div>
  )
}
