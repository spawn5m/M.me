import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'

interface NavLeaf {
  to: string
  label: string
  permissions: string[] | null
  match?: 'any' | 'all'
}

interface NavGroup {
  label: string
  children: NavLeaf[]
}

type NavItem = ({ kind: 'leaf' } & NavLeaf) | ({ kind: 'group' } & NavGroup)

const CLIENT_NAV: NavItem[] = [
  { kind: 'leaf', to: '/client/dashboard', label: 'Dashboard', permissions: ['dashboard.client.read'] },
  { kind: 'leaf', to: '/client/catalog/funeral', label: 'Catalogo Funebre', permissions: ['client.catalog.funeral.read'] },
  { kind: 'leaf', to: '/client/catalog/marmista', label: 'Catalogo Marmisti', permissions: ['client.catalog.marmista.read'] },
]

const NAV_ITEMS: NavItem[] = [
  { kind: 'leaf', to: '/admin/dashboard', label: 'Dashboard', permissions: ['dashboard.admin.read'] },
  { kind: 'leaf', to: '/admin/users', label: 'Utenti', permissions: ['users.read.team', 'users.read.all'] },
  { kind: 'leaf', to: '/admin/roles', label: 'Ruoli', permissions: ['roles.read'] },
  {
    kind: 'group',
    label: 'Cofani',
    children: [
      { to: '/admin/articles/coffins', label: 'Articoli', permissions: ['articles.coffins.read'] },
      { to: '/admin/measures', label: 'Misure', permissions: ['measures.read'] },
      { to: '/admin/lookups/coffin-categories', label: 'Categorie', permissions: ['lookups.read'] },
      { to: '/admin/lookups/coffin-subcategories', label: 'Sottocategorie', permissions: ['lookups.read'] },
      { to: '/admin/lookups/essences', label: 'Essenze', permissions: ['lookups.read'] },
      { to: '/admin/lookups/colors', label: 'Colori', permissions: ['lookups.read'] },
      { to: '/admin/lookups/finishes', label: 'Finiture', permissions: ['lookups.read'] },
      { to: '/admin/lookups/figures', label: 'Figure', permissions: ['lookups.read'] },
    ],
  },
  {
    kind: 'group',
    label: 'Accessori',
    children: [
      { to: '/admin/articles/accessories', label: 'Articoli', permissions: ['articles.accessories.read'] },
      { to: '/admin/lookups/accessory-categories', label: 'Categorie', permissions: ['lookups.read'] },
      { to: '/admin/lookups/accessory-subcategories', label: 'Sottocategorie', permissions: ['lookups.read'] },
    ],
  },
  {
    kind: 'group',
    label: 'Art. Marmisti',
    children: [
      { to: '/admin/articles/marmista', label: 'Articoli', permissions: ['articles.marmista.read'] },
      { to: '/admin/lookups/marmista-categories', label: 'Categorie', permissions: ['lookups.read'] },
    ],
  },
  { kind: 'leaf', to: '/admin/pricelists', label: 'Listini', permissions: ['pricelists.sale.read', 'pricelists.purchase.read'] },
  { kind: 'leaf', to: '/admin/catalog', label: 'Catalogo PDF', permissions: ['catalog.pdf.read'] },
  {
    kind: 'group',
    label: 'Interfaccia',
    children: [
      { to: '/admin/branding/logo', label: 'Immagini', permissions: ['branding.logo.manage'] },
      { to: '/admin/locales', label: 'Testi', permissions: ['locales.manage'] },
      { to: '/admin/maps', label: 'Mappe', permissions: ['maps.manage'] },
      { to: '/admin/maintenance', label: 'Manutenzione', permissions: ['maintenance.manage'] },
    ],
  },
]

const LEAF_STYLE = 'block border px-4 py-3 text-sm font-medium transition-colors'
const LEAF_ACTIVE = 'border-[#C9A96E] bg-white text-[#031634] shadow-[0_2px_8px_rgba(26,43,74,0.08)]'
const LEAF_IDLE = 'border-transparent text-[#6B7280] hover:border-[#E5E0D8] hover:bg-white hover:text-[#031634]'

const CHILD_STYLE = 'block border px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors'
const CHILD_ACTIVE = 'border-[#C9A96E] bg-white text-[#C9A96E]'
const CHILD_IDLE = 'border-transparent text-[#6B7280] hover:border-[#E5E0D8] hover:bg-white hover:text-[#031634]'

// Icona chevron inline per evitare dipendenze
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export default function AdminSidebar({ variant = 'admin', onLogout }: { variant?: 'admin' | 'client'; onLogout: () => void }) {
  const { user, hasPermission, hasAnyPermission } = useAuth()
  const location = useLocation()
  const { logoUrl } = useBranding()

  const items = variant === 'client' ? CLIENT_NAV : NAV_ITEMS

  // Determina quali gruppi hanno una route figlia attiva
  function groupIsActive(children: NavLeaf[]) {
    return children.some((c) => location.pathname.startsWith(c.to))
  }

  // Stato open per ogni gruppo — inizializzato aperto se la route corrente è dentro
  const initialOpen = items.reduce<Record<string, boolean>>((acc, item) => {
    if (item.kind === 'group') {
      acc[item.label] = groupIsActive(item.children)
    }
    return acc
  }, {})

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen)

  function toggle(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  function canSee(permissions: string[] | null, match: 'any' | 'all' = 'any') {
    if (permissions === null) return true
    if (match === 'all') return permissions.every((permission) => hasPermission(permission))
    return hasAnyPermission(permissions)
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[#E5E0D8] bg-[#F4F1EA] lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="border-b border-[#E5E0D8] px-6 py-7">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-lg tracking-[0.16em] uppercase text-[#031634] transition-colors hover:text-[#C9A96E]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Mirigliani logo"
              className="h-5 w-auto object-contain"
            />
          )}
          Mirigliani
        </NavLink>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Area riservata</p>
      </div>

      <nav className="flex-1 space-y-2 p-4 md:p-6">
        {items.map((item) => {
          if (item.kind === 'leaf') {
            if (!canSee(item.permissions, item.match)) return null

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [LEAF_STYLE, isActive ? LEAF_ACTIVE : LEAF_IDLE].join(' ')
                }
              >
                {item.label}
              </NavLink>
            )
          }

          // kind === 'group'
          const visibleChildren = item.children.filter((child) => canSee(child.permissions, child.match))
          if (visibleChildren.length === 0) return null

          const isOpen = openGroups[item.label] ?? false
          const isChildActive = groupIsActive(item.children)

          return (
            <div key={item.label}>
              <button
                onClick={() => toggle(item.label)}
                className={[
                  'flex w-full items-center justify-between border px-4 py-3 text-sm font-medium transition-colors',
                  isChildActive
                    ? 'border-[#C9A96E] bg-white text-[#031634] shadow-[0_2px_8px_rgba(26,43,74,0.08)]'
                    : 'border-transparent text-[#6B7280] hover:border-[#E5E0D8] hover:bg-white hover:text-[#031634]',
                ].join(' ')}
              >
                <span>{item.label}</span>
                <ChevronIcon open={isOpen} />
              </button>

              {isOpen && (
                <div className="ml-3 mt-2 space-y-1 border-l border-[#E5E0D8] pl-4">
                  {visibleChildren.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        [CHILD_STYLE, isActive ? CHILD_ACTIVE : CHILD_IDLE].join(' ')
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <UserMenu user={user} onLogout={onLogout} variant={variant} />
    </aside>
  )
}

function UserMenu({ user, onLogout, variant }: { user: { firstName: string; lastName: string } | null; onLogout: () => void; variant: 'admin' | 'client' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const profilePath = variant === 'admin' ? '/admin/profile' : '/client/profile'

  return (
    <div ref={ref} className="mt-auto border-t border-[#E5E0D8] px-4 py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-left transition-colors hover:text-[#C9A96E]"
      >
        <div>
          <p className="text-sm font-medium text-[#031634]">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Sessione attiva</p>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="mt-2 border border-[#E5E0D8] bg-white shadow-sm">
          <button
            onClick={() => { setOpen(false); navigate(profilePath) }}
            className="block w-full px-4 py-2.5 text-left text-sm text-[#031634] transition-colors hover:bg-[#F8F7F4] hover:text-[#C9A96E]"
          >
            Vedi profilo
          </button>
          <button
            onClick={onLogout}
            className="block w-full border-t border-[#E5E0D8] px-4 py-2.5 text-left text-sm text-[#031634] transition-colors hover:bg-[#F8F7F4] hover:text-[#C9A96E]"
          >
            Esci
          </button>
        </div>
      )}
    </div>
  )
}

