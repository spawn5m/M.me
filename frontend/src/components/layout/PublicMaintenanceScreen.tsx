import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, getDefaultRoute } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'

interface PublicMaintenanceScreenProps {
  variant: 'light' | 'dark'
  message: string
  showHeadline?: boolean
  showReservedAreaButton?: boolean
}

export default function PublicMaintenanceScreen({
  variant,
  message,
  showHeadline = false,
  showReservedAreaButton = false,
}: PublicMaintenanceScreenProps) {
  const { t } = useTranslation()
  const { user, permissions } = useAuth()
  const { logoUrl } = useBranding()
  const reservedAreaHref = getDefaultRoute(user, permissions)

  if (variant === 'dark') {
    return (
      <main className="min-h-screen bg-[#071325] px-6">
        <section className="flex min-h-screen flex-col items-center justify-center gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Mirigliani logo" className="h-20 w-auto object-contain" />
            )}
            {showHeadline && (
              <h1
                className="font-['Inter'] font-black uppercase tracking-tight leading-none text-white"
                style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}
              >
                {t('home.headline')}
              </h1>
            )}
          </div>

          <p
            className="max-w-3xl font-['Inter'] text-base font-light leading-relaxed text-[#8A9BB5] md:text-lg"
          >
            {message}
          </p>

          {showReservedAreaButton && (
            <Link
              to={reservedAreaHref}
              className="inline-flex min-h-11 items-center justify-center border border-[#C9A96E] px-8 py-3 font-['Inter'] text-sm font-medium uppercase tracking-[0.15em] text-[#C9A96E] transition-colors hover:bg-[#C9A96E]/10"
            >
              {t('nav.reservedArea')}
            </Link>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-6 pb-20 pt-28 md:px-12 lg:px-20">
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-4xl border border-[#E5E0D8] bg-white p-8 text-center shadow-[0_2px_8px_rgba(26,43,74,0.08)] md:p-12">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
            Manutenzione
          </p>
          <p className="text-lg leading-relaxed text-[#6B7280] md:text-xl">
            {message}
          </p>
        </div>
      </section>
    </main>
  )
}
