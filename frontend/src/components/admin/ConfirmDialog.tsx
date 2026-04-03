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
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-yellow-500 text-white hover:bg-yellow-600'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="px-6 py-5">
          <h3
            className="text-[#1A2B4A] font-semibold mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {title}
          </h3>
          <p className="text-[#6B7280] text-sm">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E0D8] bg-[#F8F7F4] rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1A2B4A] transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={['px-5 py-2 text-sm rounded disabled:opacity-50 transition-colors', confirmStyle].join(' ')}
          >
            {isConfirming ? 'In corso…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
