import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface NavLeaf {
  to: string
  label: string
  roles: string[] | null
}

interface NavGroup {
  label: string
  roles: string[] | null
  children: NavLeaf[]
}

type NavItem = ({ kind: 'leaf' } & NavLeaf) | ({ kind: 'group' } & NavGroup)

const NAV_ITEMS: NavItem[] = [
  { kind: 'leaf', to: '/admin/dashboard', label: 'Dashboard', roles: null },
  { kind: 'leaf', to: '/admin/users', label: 'Utenti', roles: ['manager', 'super_admin'] },
  { kind: 'leaf', to: '/admin/roles', label: 'Ruoli', roles: ['super_admin'] },
  {
    kind: 'group',
    label: 'Cofani',
    roles: ['manager', 'super_admin', 'collaboratore'],
    children: [
      { to: '/admin/articles/coffins', label: 'Articoli', roles: ['manager', 'super_admin', 'collaboratore'] },
      { to: '/admin/measures', label: 'Misure', roles: ['manager', 'super_admin'] },
      { to: '/admin/lookups/coffin-categories', label: 'Categorie', roles: ['manager', 'super_admin'] },
      { to: '/admin/lookups/coffin-subcategories', label: 'Sottocategorie', roles: ['manager', 'super_admin'] },
      { to: '/admin/lookups/essences', label: 'Essenze', roles: ['manager', 'super_admin'] },
      { to: '/admin/lookups/colors', label: 'Colori', roles: ['manager', 'super_admin'] },
      { to: '/admin/lookups/finishes', label: 'Finiture', roles: ['manager', 'super_admin'] },
      { to: '/admin/lookups/figures', label: 'Figure', roles: ['manager', 'super_admin'] },
    ],
  },
  {
    kind: 'group',
    label: 'Accessori',
    roles: ['manager', 'super_admin', 'collaboratore'],
    children: [
      { to: '/admin/articles/accessories', label: 'Articoli', roles: ['manager', 'super_admin', 'collaboratore'] },
      { to: '/admin/lookups/accessory-categories', label: 'Categorie', roles: ['manager', 'super_admin'] },
      { to: '/admin/lookups/accessory-subcategories', label: 'Sottocategorie', roles: ['manager', 'super_admin'] },
    ],
  },
  {
    kind: 'group',
    label: 'Art. Marmisti',
    roles: ['manager', 'super_admin', 'collaboratore'],
    children: [
      { to: '/admin/articles/marmista', label: 'Articoli', roles: ['manager', 'super_admin', 'collaboratore'] },
      { to: '/admin/lookups/marmista-categories', label: 'Categorie', roles: ['manager', 'super_admin'] },
    ],
  },
  { kind: 'leaf', to: '/admin/pricelists', label: 'Listini', roles: ['manager', 'super_admin'] },
  { kind: 'leaf', to: '/admin/catalog', label: 'Catalogo PDF', roles: ['manager', 'super_admin'] },
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

export default function AdminSidebar() {
  const { hasRole } = useAuth()
  const location = useLocation()

  // Determina quali gruppi hanno una route figlia attiva
  function groupIsActive(children: NavLeaf[]) {
    return children.some((c) => location.pathname.startsWith(c.to))
  }

  // Stato open per ogni gruppo — inizializzato aperto se la route corrente è dentro
  const initialOpen = NAV_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
    if (item.kind === 'group') {
      acc[item.label] = groupIsActive(item.children)
    }
    return acc
  }, {})

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen)

  function toggle(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  function canSee(roles: string[] | null) {
    return roles === null || hasRole(roles)
  }

  return (
    <aside className="w-full shrink-0 border-b border-[#E5E0D8] bg-[#F4F1EA] lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="border-b border-[#E5E0D8] px-6 py-7">
        <NavLink
          to="/"
          className="text-lg tracking-[0.16em] uppercase text-[#031634] transition-colors hover:text-[#C9A96E]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Mirigliani
        </NavLink>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Area riservata</p>
      </div>

      <nav className="flex-1 space-y-2 p-4 md:p-6">
        {NAV_ITEMS.map((item) => {
          if (!canSee(item.roles)) return null

          if (item.kind === 'leaf') {
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
          const visibleChildren = item.children.filter((c) => canSee(c.roles))
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
    </aside>
  )
}
