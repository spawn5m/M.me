import { useState } from 'react'
import { clientApi } from '../../lib/api/client'

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (newPassword !== confirmPassword) {
      setErrorMsg('Le nuove password non coincidono.')
      return
    }

    if (newPassword.length < 8) {
      setErrorMsg('La nuova password deve essere di almeno 8 caratteri.')
      return
    }

    setStatus('loading')
    try {
      await clientApi.changePassword(oldPassword, newPassword)
      setStatus('success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setStatus('error')
      setErrorMsg('Password attuale errata o errore del server.')
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#1A2B4A]">
        Cambia Password
      </h1>

      {status === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-[6px] text-green-800 text-sm">
          Password aggiornata con successo.
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-[6px] text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E5E0D8] rounded-[8px] p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)] space-y-4"
      >
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">
            Password attuale
          </label>
          <input
            type="password"
            required
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#1A2B4A]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">
            Nuova password
          </label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#1A2B4A]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">
            Conferma nuova password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#1A2B4A]"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-[#1A2B4A] text-white text-sm font-medium rounded-[6px] px-4 py-2.5 hover:bg-[#2C4A7C] disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Aggiornamento...' : 'Aggiorna password'}
        </button>
      </form>
    </div>
  )
}
