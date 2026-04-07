import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, isLoading: isAuthLoading, login } = useAuth()
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
      const loggedUser = await login(email, password)
      const isClient = loggedUser.roles.includes('impresario_funebre') || loggedUser.roles.includes('marmista')
      const defaultDest = isClient ? '/client/dashboard' : '/admin/dashboard'
      const dest = from === '/admin/dashboard' ? defaultDest : from
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
    return <Navigate to={from} replace />
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-6 py-12 md:px-12 lg:px-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
        <section>
          <div className="mb-6 h-12 w-px bg-[#C9A96E]" />
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
            Accesso professionale
          </p>
          <h1
            className="max-w-xl text-4xl leading-tight text-[#031634] md:text-6xl"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            L&apos;area riservata adotta lo stesso linguaggio visivo delle pagine interne.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#6B7280]">
            Un ambiente sobrio, chiaro e coerente con il resto del sito per gestire catalogo, utenti e listini senza stacchi estetici.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#C9A96E]">Catalogo</p>
              <p className="text-sm leading-relaxed text-[#6B7280]">
                Gestione coerente di cofani, accessori e articoli per marmisti.
              </p>
            </div>

            <div className="border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#C9A96E]">Listini</p>
              <p className="text-sm leading-relaxed text-[#6B7280]">
                Prezzi, assegnazioni e aggiornamenti in continuita con l&apos;esperienza pubblica.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="mt-8 inline-flex min-h-11 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
          >
            Torna al sito
          </Link>
        </section>

        <div className="w-full border border-[#E5E0D8] bg-white p-8 shadow-[0_12px_32px_rgba(26,43,74,0.08)] md:p-10">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
              Mirigliani
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
      </div>
    </div>
  )
}
