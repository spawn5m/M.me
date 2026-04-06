interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
  confirmLabel?: string
  isConfirming?: boolean
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  variant = 'danger',
  confirmLabel = 'Conferma',
  isConfirming = false
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmStyle =
    variant === 'danger'
      ? 'bg-[#B42318] text-white hover:bg-[#912018]'
      : 'bg-[#C9A96E] text-[#031634] hover:bg-[#D9BC89]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26, 43, 74, 0.22)', backdropFilter: 'blur(6px)' }}
    >
      <div className="w-full max-w-sm border border-[#E5E0D8] bg-white shadow-[0_24px_80px_rgba(26,43,74,0.16)]">
        <div className="px-6 py-5">
          <h3
            className="mb-2 text-xl text-[#031634]"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {title}
          </h3>
          <p className="text-[#6B7280] text-sm">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#E5E0D8] bg-[#F8F7F4] px-6 py-4">
          <button
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={['inline-flex min-h-11 items-center justify-center px-5 py-2 text-sm font-medium disabled:opacity-50 transition-colors', confirmStyle].join(' ')}
          >
            {isConfirming ? 'In corso…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
