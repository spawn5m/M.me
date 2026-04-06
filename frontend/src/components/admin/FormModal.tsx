import { useEffect } from 'react'
import type { ReactNode } from 'react'

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
      style={{ backgroundColor: 'rgba(26, 43, 74, 0.22)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg border border-[#E5E0D8] bg-white shadow-[0_24px_80px_rgba(26,43,74,0.16)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
          <h2
            className="text-xl text-[#031634]"
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

        <div className="px-6 py-4">
          {children}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E5E0D8] bg-[#F8F7F4] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center bg-[#031634] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1A2B4A] disabled:opacity-50"
          >
            {isSubmitting ? 'Salvataggio…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
