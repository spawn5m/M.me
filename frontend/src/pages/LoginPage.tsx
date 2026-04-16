import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, getDefaultRoute } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, permissions, isLoading: isAuthLoading, login } = useAuth()
  const { logoUrl } = useBranding()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const auth = await login(email, password)
      const dest = from ?? getDefaultRoute(auth.user, auth.permissions)
      navigate(dest, { replace: true })
    } catch {
      setError('Credenziali non valide. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F7F4]">
        <div className="w-8 h-8 border-2 border-[#1A2B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={from || getDefaultRoute(user, permissions)} replace />
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-6 py-12 md:px-12 lg:px-20">
      <div className="mx-auto flex max-w-md flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-4 text-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Mirigliani logo"
              className="w-1/3 max-w-32 object-contain"
            />
          )}
          <h1
            className="text-4xl leading-none text-[#031634] md:text-5xl"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {t('home.headline')}
          </h1>
        </div>

        <div className="w-full border border-[#E5E0D8] bg-white p-8 shadow-[0_12px_32px_rgba(26,43,74,0.08)] md:p-10">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
              Area professionale
            </p>
            <h2
              className="text-3xl text-[#031634]"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Area riservata
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
              Inserisci le tue credenziali per accedere ai contenuti dedicati.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#E5E0D8] bg-white px-4 py-3 text-sm text-[#1A1A1A] transition-colors focus:border-[#031634] focus:outline-none"
                placeholder="nome@esempio.it"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#E5E0D8] bg-white px-4 py-3 text-sm text-[#1A1A1A] transition-colors focus:border-[#031634] focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 w-full items-center justify-center bg-[#031634] px-5 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1A2B4A] disabled:opacity-50"
            >
              {isLoading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>
        </div>

        <Link
          to="/"
          className="inline-flex min-h-11 items-center justify-center border border-[#E5E0D8] px-5 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
        >
          {t('nav.home')}
        </Link>
      </div>
    </div>
  )
}
