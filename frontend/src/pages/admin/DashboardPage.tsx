import { useEffect, useState } from 'react'
import api from '../../lib/api'
import type { AdminStats } from '../../../../backend/src/types/shared'

interface StatCardProps {
  label: string
  value: number | null
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
      <div className="mb-4 h-px w-8 bg-[#C9A96E]" />
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#6B7280]">{label}</p>
      <p
        className="text-3xl font-medium text-[#031634]"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {value === null ? '—' : value.toLocaleString('it')}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<AdminStats>('/admin/stats')
      .then((r) => setStats(r.data))
      .catch(() => setError('Impossibile caricare le statistiche'))
  }, [])

  return (
    <div>
      <div className="mb-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
          Panoramica operativa
        </p>
        <h2
          className="text-3xl text-[#031634] md:text-4xl"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Dashboard
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6B7280] md:text-base">
          Stato sintetico di utenti, catalogo e listini in un layout coerente con le pagine interne del sito.
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utenti attivi" value={stats?.users ?? null} />
        <StatCard label="Cofani" value={stats?.coffins ?? null} />
        <StatCard label="Accessori" value={stats?.accessories ?? null} />
        <StatCard label="Articoli Marmista" value={stats?.marmista ?? null} />
      </div>
    </div>
  )
}
