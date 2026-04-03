import { ReactNode, useEffect } from 'react'

interface FormModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onSubmit: () => void
  isSubmitting?: boolean
  submitLabel?: string
  children: ReactNode
}

export default function FormModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Salva',
  children
}: FormModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
          <h2
            className="text-[#1A2B4A] font-semibold"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1A2B4A] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E0D8] bg-[#F8F7F4] rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1A2B4A] transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm bg-[#1A2B4A] text-white rounded hover:bg-[#2C4A7C] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Salvataggio…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
