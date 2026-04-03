import { useEffect, useState } from 'react'
import api from '../../lib/api'
import type { AdminStats } from '../../../../backend/src/types/shared'

interface StatCardProps {
  label: string
  value: number | null
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 shadow-sm">
      <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">{label}</p>
      <p
        className="text-3xl font-medium text-[#1A2B4A]"
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
      <h2
        className="text-2xl text-[#1A2B4A] mb-6"
        style={{ fontFamily: 'Playfair Display, serif' }}
      >
        Dashboard
      </h2>

      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Utenti attivi" value={stats?.users ?? null} />
        <StatCard label="Cofani" value={stats?.coffins ?? null} />
        <StatCard label="Accessori" value={stats?.accessories ?? null} />
        <StatCard label="Articoli Marmista" value={stats?.marmista ?? null} />
      </div>
    </div>
  )
}
