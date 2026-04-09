import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import type { AdminPermission } from '../../../../backend/src/types/shared'
import PermissionChecklist from './PermissionChecklist'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface SecondarySection {
  title: string
  content: ReactNode
}

interface PermissionEditorModalProps {
  isOpen: boolean
  title: string
  permissions: AdminPermission[]
  selectedCodes: string[]
  readOnly: boolean
  isLoading?: boolean
  isSaving?: boolean
  effectiveCodes?: string[]
  secondarySection?: SecondarySection
  saveLabel?: string
  onToggle: (permissionCode: string) => void
  onClose: () => void
  onSave?: () => void
}

export default function PermissionEditorModal({
  isOpen,
  title,
  permissions,
  selectedCodes,
  readOnly,
  isLoading = false,
  isSaving = false,
  effectiveCodes = [],
  secondarySection,
  saveLabel = 'Salva permessi',
  onToggle,
  onClose,
  onSave,
}: PermissionEditorModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = () => {
    const dialog = dialogRef.current

    if (!dialog) {
      return []
    }

    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  }

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handleTabTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return
      }

      const dialog = dialogRef.current

      if (!dialog) {
        return
      }

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (!dialog.contains(activeElement)) {
        event.preventDefault()
        firstElement.focus()
        return
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

      document.addEventListener('keydown', handleEsc)
      document.addEventListener('keydown', handleTabTrap)

      const dialog = dialogRef.current

      if (dialog) {
        const focusableElements = getFocusableElements()
        const initialFocusTarget = isLoading || readOnly
          ? dialog
          : focusableElements[0] ?? dialog

        initialFocusTarget.focus()
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.removeEventListener('keydown', handleTabTrap)

      const previousFocus = previousFocusRef.current
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const showSaveButton = !isLoading && !readOnly && typeof onSave === 'function'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26, 43, 74, 0.22)', backdropFilter: 'blur(6px)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_24px_80px_rgba(26,43,74,0.16)]"
      >
        <div className="flex items-center justify-between border-b border-[#E5E0D8] px-6 py-4">
          <h2 id={titleId} className="text-xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-xl leading-none text-[#6B7280] transition-colors hover:text-[#1A2B4A]"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A2B4A] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <PermissionChecklist
                permissions={permissions}
                selectedCodes={selectedCodes}
                readOnly={readOnly}
                onToggle={onToggle}
              />

              {effectiveCodes.length > 0 && (
                <section className="space-y-2 border-t border-[#E5E0D8] pt-4">
                  <h3 className="admin-label mb-0">Permessi effettivi</h3>
                  <div className="flex flex-wrap gap-2">
                    {effectiveCodes.map((code) => (
                      <code key={code} className="admin-code">{code}</code>
                    ))}
                  </div>
                </section>
              )}

              {secondarySection && (
                <section className="space-y-2 border-t border-[#E5E0D8] pt-4">
                  <h3 className="admin-label mb-0">{secondarySection.title}</h3>
                  <div className="text-sm leading-6 text-[#1A1A1A]">{secondarySection.content}</div>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E5E0D8] bg-[#F8F7F4] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
          >
            {showSaveButton ? 'Annulla' : 'Chiudi'}
          </button>

          {showSaveButton && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center bg-[#031634] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1A2B4A] disabled:opacity-50"
            >
              {isSaving ? 'Salvataggio…' : saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
