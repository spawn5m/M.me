import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, getDefaultRoute } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'

export interface NavbarProps {
  variant: 'dark' | 'light'
}

interface NavLink {
  labelKey: string
  path: string
}

const NAV_LINKS: NavLink[] = [
  { labelKey: 'nav.home', path: '/' },
  { labelKey: 'nav.ourStory', path: '/storia' },
  { labelKey: 'nav.whereWeAre', path: '/dove-siamo' },
  { labelKey: 'nav.funeralHomes', path: '/imprese-funebri' },
  { labelKey: 'nav.marmistas', path: '/marmisti' },
  { labelKey: 'nav.altris', path: '/altri' },
]

export default function Navbar({ variant }: NavbarProps) {
  const { t } = useTranslation()
  const { user, permissions } = useAuth()
  const location = useLocation()
  const { logoUrl } = useBranding()
  const isDark = variant === 'dark'

   const reservedAreaHref = getDefaultRoute(user, permissions)

  // Outer nav styles
  const navBase = 'w-full z-50'
  const navPositioning = isDark ? 'relative' : 'fixed top-0'
  const navBg = isDark
    ? 'bg-transparent'
    : 'bg-[#FAF9F6]/80 backdrop-blur-md shadow-[var(--shadow-warm)]'

  // Wordmark styles
  const wordmarkBase = "font-['Newsreader'] text-2xl tracking-tight uppercase font-semibold"
  const wordmarkColor = isDark ? 'text-white' : 'text-[#031634]'

  // Nav link styles
  const linkBase = "font-['Newsreader'] italic text-sm transition-colors"
  const linkColor = isDark
    ? 'text-[#8A9BB5] hover:text-white'
    : 'text-[#031634]/50 hover:text-[#031634]'
  const linkActiveColor = isDark ? 'text-white' : 'text-[#C9A96E] font-semibold'

  // CTA button styles
  const ctaBase = 'px-6 py-2 font-[Inter] text-[10px] tracking-widest uppercase font-medium transition-all'
  const ctaStyle = isDark
    ? 'border border-[#C9A96E] text-[#C9A96E] bg-transparent rounded-none'
    : 'bg-[#031634] text-white rounded-[4px]'

  return (
    <nav className={`${navBase} ${navPositioning} ${navBg}`}>
      <div className="flex justify-between items-center px-12 py-6 max-w-screen-2xl mx-auto">
        {/* Wordmark */}
        <Link
          to="/"
          data-testid="navbar-wordmark"
          className={`flex items-center gap-2 ${wordmarkBase} ${wordmarkColor}`}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Mirigliani logo"
              className="h-6 w-auto object-contain"
            />
          )}
          MIRIGLIANI
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map(({ labelKey, path }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`${linkBase} ${isActive ? linkActiveColor : linkColor}`}
              >
                {t(labelKey)}
              </Link>
            )
          })}
        </div>

        {/* CTA */}
        <Link
          to={reservedAreaHref}
          data-testid="navbar-cta"
          className={`${ctaBase} ${ctaStyle}`}
        >
          {t('nav.reservedArea').toUpperCase()}
        </Link>
      </div>
    </nav>
  )
}
