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
        <section className="flex min-h-screen flex-col items-center justify-center gap-10 text-center">
          <div className="flex flex-col items-center gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Mirigliani logo"
                className="object-contain"
                style={{ width: 'clamp(6rem, 14vw, 12rem)', height: 'auto' }}
              />
            )}
            {showHeadline && (
              <h1
                className="font-['Inter'] font-black uppercase tracking-tight text-center leading-none"
                style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', color: '#FFFFFF' }}
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
            <div className="flex flex-col flex-wrap items-center justify-center gap-6 sm:flex-row">
              <Link
                to={reservedAreaHref}
                className="btn-home-gold inline-flex min-h-11 items-center justify-center px-8 py-4 font-['Inter'] text-sm font-medium uppercase tracking-[0.15em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9A96E]"
              >
                {t('nav.reservedArea')}
              </Link>
              <a
                href="mailto:info@mirigliani.me"
                className="btn-home-white inline-flex min-h-11 items-center justify-center px-8 py-4 font-['Inter'] text-sm font-medium uppercase tracking-[0.15em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {t('common.contactUs')}
              </a>
            </div>
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
