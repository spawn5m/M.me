import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/admin/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setError('Credenziali non valide. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1
            className="text-3xl text-[#1A2B4A] uppercase tracking-widest"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Mirigliani
          </h1>
          <p className="text-[#6B7280] text-sm mt-2 uppercase tracking-wider">
            Area Riservata
          </p>
        </div>

        <div className="bg-white rounded-lg border border-[#E5E0D8] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[#E5E0D8] rounded text-sm text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A2B4A] transition-colors"
                placeholder="nome@esempio.it"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[#E5E0D8] rounded text-sm text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A2B4A] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#1A2B4A] text-white text-sm font-medium rounded hover:bg-[#2C4A7C] disabled:opacity-50 transition-colors uppercase tracking-wider"
            >
              {isLoading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
