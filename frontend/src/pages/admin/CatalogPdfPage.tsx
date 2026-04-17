import { useState, useEffect, useRef } from 'react'
import { catalogApi } from '../../lib/api/catalog'
import type { CatalogStatus } from '../../../../backend/src/types/shared'

interface LayoutForm {
  layoutOffset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
}

const DEFAULT_LAYOUT: LayoutForm = {
  layoutOffset: 0,
  firstPageType: 'single',
  bodyPageType: 'double',
  lastPageType: 'single',
}

interface CatalogCardProps {
  type: 'accessories' | 'marmista'
  title: string
}

function LayoutFields({
  value,
  onChange,
  readonly = false,
}: {
  value: LayoutForm
  onChange?: (v: LayoutForm) => void
  readonly?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B7280] mb-1">
          Pagine senza numero (offset)
        </label>
        {readonly ? (
          <p className="text-sm text-[#1A2B4A] font-mono">{value.layoutOffset}</p>
        ) : (
          <input
            type="number"
            min={0}
            value={value.layoutOffset}
            onChange={(e) => onChange?.({ ...value, layoutOffset: parseInt(e.target.value) || 0 })}
            className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm text-[#1A2B4A] focus:border-[#C9A96E] focus:outline-none"
          />
        )}
      </div>
      {(['firstPageType', 'bodyPageType', 'lastPageType'] as const).map((field) => {
        const labels: Record<typeof field, string> = {
          firstPageType: 'Prima pagina',
          bodyPageType: 'Pagine corpo',
          lastPageType: 'Ultima pagina',
        }
        return (
          <div key={field}>
            <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B7280] mb-1">
              {labels[field]}
            </label>
            {readonly ? (
              <p className="text-sm text-[#1A2B4A] capitalize">{value[field]}</p>
            ) : (
              <select
                value={value[field]}
                onChange={(e) =>
                  onChange?.({ ...value, [field]: e.target.value as 'single' | 'double' })
                }
                className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm text-[#1A2B4A] focus:border-[#C9A96E] focus:outline-none"
              >
                <option value="single">Singola</option>
                <option value="double">Doppia (spread)</option>
              </select>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CatalogCard({ type, title }: CatalogCardProps) {
  const [status, setStatus] = useState<CatalogStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<LayoutForm>(DEFAULT_LAYOUT)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isEditingLayout, setIsEditingLayout] = useState(false)
  const [editForm, setEditForm] = useState<LayoutForm>(DEFAULT_LAYOUT)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const fetchStatus = async () => {
    try {
      const s = await catalogApi.status(type)
      setStatus(s)
      if (s.isComplete) stopPolling()
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchStatus().finally(() => setLoading(false))
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  useEffect(() => {
    if (status && !status.isComplete && !pollingRef.current) {
      pollingRef.current = setInterval(() => void fetchStatus(), 2000)
    }
    if (status?.isComplete) stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.isComplete])

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Seleziona un file PDF.')
      return
    }
    setSelectedFile(file)
    setUploadError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadPct(0)
    setUploadError(null)
    try {
      await catalogApi.upload(type, selectedFile, form, setUploadPct)
      setSelectedFile(null)
      await fetchStatus()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Errore durante il caricamento.')
    } finally {
      setIsUploading(false)
      setUploadPct(0)
    }
  }

  const handleUpdateLayout = async () => {
    try {
      await catalogApi.updateLayout(type, editForm)
      await fetchStatus()
      setIsEditingLayout(false)
    } catch {
      // noop
    }
  }

  const handleDelete = async () => {
    if (!confirm('Eliminare il catalogo e tutte le pagine splittate?')) return
    try {
      await catalogApi.remove(type)
      setStatus(null)
      stopPolling()
    } catch {
      // noop
    }
  }

  const progressPercent =
    status && status.totalPdfPages
      ? Math.round((status.splitPages / status.totalPdfPages) * 100)
      : 0

  // Anteprima mapping: prime 3 righe + ultima
  const mappingPreview = (() => {
    if (!status?.isComplete || !status.totalPdfPages) return []
    const { layout, totalPdfPages } = status
    const stride = layout.bodyPageType === 'single' ? 1 : 2
    const base = layout.offset + 1

    const getLabel = (fileIdx: number): string => {
      const rel = fileIdx - base
      if (rel < 0) return `File ${fileIdx}`
      if (rel === 0) return layout.firstPageType === 'single' ? 'p. 1' : 'pp. 1–2'
      const fp = layout.firstPageType === 'single' ? 1 : 2
      const start = fp + (rel - 1) * stride + 1
      const isLast = fileIdx === totalPdfPages
      if (isLast && layout.lastPageType === 'single') return `p. ${start}`
      if (layout.bodyPageType === 'single') return `p. ${start}`
      return `pp. ${start}–${start + 1}`
    }

    const rows: { file: number; label: string }[] = []
    for (let i = base; i <= Math.min(base + 2, totalPdfPages); i++) {
      rows.push({ file: i, label: getLabel(i) })
    }
    if (totalPdfPages > base + 2) {
      rows.push({ file: totalPdfPages, label: getLabel(totalPdfPages) })
    }
    return rows
  })()

  const layoutFormFromStatus = (s: CatalogStatus): LayoutForm => ({
    layoutOffset: s.layout.offset,
    firstPageType: s.layout.firstPageType,
    bodyPageType: s.layout.bodyPageType,
    lastPageType: s.layout.lastPageType,
  })

  return (
    <div className="bg-white border border-[#E5E0D8] shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
      {/* Header card */}
      <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-[#1A2B4A]">{title}</h3>
        {status && (
          <button
            onClick={() => void handleDelete()}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Elimina
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        {loading && (
          <p className="text-sm text-[#6B7280]">Caricamento…</p>
        )}

        {/* ── STATO VUOTO ── */}
        {!loading && !status && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded cursor-pointer flex flex-col items-center justify-center py-10 transition-colors ${
                isDragging ? 'border-[#C9A96E] bg-[#FAF9F6]' : 'border-[#E5E0D8] hover:border-[#C9A96E]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
              <svg className="w-8 h-8 text-[#C9A96E] mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {selectedFile ? (
                <p className="text-sm font-medium text-[#1A2B4A]">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-[#6B7280]">Trascina il PDF qui oppure</p>
                  <p className="text-xs text-[#C9A96E] font-medium mt-1">clicca per selezionare</p>
                </>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634] mb-3">
                Configurazione layout pagine
              </p>
              <LayoutFields value={form} onChange={setForm} />
            </div>

            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}

            <button
              disabled={!selectedFile || isUploading}
              onClick={() => void handleUpload()}
              className="w-full py-3 bg-[#031634] text-white text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#1A2B4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? `Caricamento… ${uploadPct}%` : 'Carica e avvia split'}
            </button>
            {isUploading && (
              <div className="h-1.5 bg-[#E5E0D8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A96E] transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            )}
          </>
        )}

        {/* ── SPLIT IN CORSO ── */}
        {!loading && status && !status.isComplete && (
          <>
            <div>
              <p className="text-xs font-medium text-[#1A2B4A] truncate">{status.fileName}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">
                Caricato il {new Date(status.uploadedAt).toLocaleDateString('it-IT')}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                  Split in corso…
                </p>
                <span className="font-mono text-xs text-[#1A2B4A]">
                  {status.splitPages}/{status.totalPdfPages ?? '?'} ({progressPercent}%)
                </span>
              </div>
              <div className="h-1.5 bg-[#E5E0D8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A96E] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634] mb-2">
                Layout configurato
              </p>
              <LayoutFields value={layoutFormFromStatus(status)} readonly />
            </div>
          </>
        )}

        {/* ── SPLIT COMPLETATO ── */}
        {!loading && status && status.isComplete && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#1A2B4A] truncate">{status.fileName}</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">
                  {status.totalPdfPages} pagine · {new Date(status.uploadedAt).toLocaleDateString('it-IT')}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 border border-green-200 bg-green-50 px-2 py-1">
                ✓ Pronto
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634]">
                  Layout pagine
                </p>
                {!isEditingLayout && (
                  <button
                    onClick={() => {
                      setEditForm(layoutFormFromStatus(status))
                      setIsEditingLayout(true)
                    }}
                    className="text-xs text-[#C9A96E] hover:underline"
                  >
                    Modifica
                  </button>
                )}
              </div>
              {isEditingLayout ? (
                <>
                  <LayoutFields value={editForm} onChange={setEditForm} />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => void handleUpdateLayout()}
                      className="px-4 py-2 bg-[#031634] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1A2B4A] transition-colors"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setIsEditingLayout(false)}
                      className="px-4 py-2 border border-[#E5E0D8] text-xs text-[#6B7280] hover:text-[#031634] transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <LayoutFields value={layoutFormFromStatus(status)} readonly />
              )}
            </div>

            {mappingPreview.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634] mb-2">
                  Anteprima mapping
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#6B7280] border-b border-[#E5E0D8]">
                      <th className="text-left py-1 font-medium">File PDF</th>
                      <th className="text-left py-1 font-medium">Pagine catalogo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappingPreview.map((row, i) => (
                      <tr
                        key={row.file}
                        className={`border-b border-[#F4F3F0] ${
                          i === mappingPreview.length - 1 && mappingPreview.length > 3
                            ? 'opacity-50 italic'
                            : ''
                        }`}
                      >
                        <td className="py-1 font-mono text-[#C9A96E]">{row.file}.pdf</td>
                        <td className="py-1 text-[#1A2B4A]">{row.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-[#E5E0D8] pt-4">
              <p className="text-[10px] text-[#6B7280] mb-2">Sostituisci il catalogo attuale:</p>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  id={`reload-${type}`}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                <label
                  htmlFor={`reload-${type}`}
                  className="px-4 py-2 border border-[#031634] text-xs font-semibold uppercase tracking-[0.14em] text-[#031634] hover:bg-[#031634] hover:text-white transition-colors cursor-pointer"
                >
                  Seleziona nuovo PDF
                </label>
                {selectedFile && (
                  <button
                    onClick={() => void handleUpload()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-[#031634] text-white text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#1A2B4A] transition-colors disabled:opacity-50"
                  >
                    {isUploading ? `${uploadPct}%` : 'Carica'}
                  </button>
                )}
              </div>
              {selectedFile && !isUploading && (
                <p className="text-[10px] text-[#6B7280] mt-1">{selectedFile.name}</p>
              )}
              {isUploading && (
                <div className="mt-2 h-1.5 bg-[#E5E0D8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C9A96E] transition-all duration-300"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CatalogPdfPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Gestione</p>
        <h2 className="text-2xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Catalogo PDF
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Carica i cataloghi PDF, configura il layout pagine e avvia lo split automatico.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CatalogCard type="accessories" title="Catalogo Accessori" />
        <CatalogCard type="marmista" title="Catalogo Marmista" />
      </div>
    </div>
  )
}
