import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface FormModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onSubmit: () => void
  isSubmitting?: boolean
  isSubmitDisabled?: boolean
  submitLabel?: string
  panelClassName?: string
  bodyClassName?: string
  children: ReactNode
}

export default function FormModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  isSubmitting = false,
  isSubmitDisabled = false,
  submitLabel = 'Salva',
  panelClassName,
  bodyClassName,
  children
}: FormModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLFormElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }

    if (!isOpen && wasOpenRef.current) {
      const opener = openerRef.current
      openerRef.current = null

      if (opener?.isConnected) {
        requestAnimationFrame(() => opener.focus())
      }
    }

    wasOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    const getFocusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))

    getFocusableElements()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements()
      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)

      if (!firstElement || !lastElement) {
        return
      }

      const activeElement = document.activeElement

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialog.contains(activeElement)) {
          event.preventDefault()
          lastElement.focus()
        }
        return
      }

      if (activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    dialog.addEventListener('keydown', handleKeyDown)

    return () => {
      dialog.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26, 43, 74, 0.22)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_24px_80px_rgba(26,43,74,0.16)] ${panelClassName ?? 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
          <h2
            id={titleId}
            className="text-xl text-[#031634]"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1A2B4A] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className={`overflow-y-auto px-6 py-4 ${bodyClassName ?? ''}`}>
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
            type="submit"
            disabled={isSubmitting || isSubmitDisabled}
            className="inline-flex min-h-11 items-center justify-center bg-[#031634] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1A2B4A] disabled:opacity-50"
          >
            {isSubmitting ? 'Salvataggio…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
