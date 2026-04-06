import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  to: string
  label: string
  roles: string[] | null
  icon?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', roles: null },
  { to: '/admin/users', label: 'Utenti', roles: ['manager', 'super_admin'] },
  { to: '/admin/roles', label: 'Ruoli', roles: ['super_admin'] },
  { to: '/admin/articles/coffins', label: 'Cofani', roles: ['manager', 'super_admin', 'collaboratore'] },
  { to: '/admin/articles/accessories', label: 'Accessori', roles: ['manager', 'super_admin', 'collaboratore'] },
  { to: '/admin/articles/marmista', label: 'Art. Marmisti', roles: ['manager', 'super_admin', 'collaboratore'] },
  { to: '/admin/lookups/coffin-categories', label: 'Cat. Cofani', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/coffin-subcategories', label: 'Sottocat. Cofani', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/essences', label: 'Essenze', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/figures', label: 'Figure', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/colors', label: 'Colori', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/finishes', label: 'Finiture', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/accessory-categories', label: 'Cat. Accessori', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/accessory-subcategories', label: 'Sottocat. Accessori', roles: ['manager', 'super_admin'] },
  { to: '/admin/lookups/marmista-categories', label: 'Cat. Marmisti', roles: ['manager', 'super_admin'] },
  { to: '/admin/pricelists', label: 'Listini', roles: ['manager', 'super_admin'] },
  { to: '/admin/catalog', label: 'Catalogo PDF', roles: ['manager', 'super_admin'] },
]

export default function AdminSidebar() {
  const { hasRole } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles === null || hasRole(item.roles)
  )

  return (
    <aside className="w-64 min-h-screen bg-[#1A2B4A] flex flex-col shrink-0">
      <div className="p-6 border-b border-[#2C4A7C]">
        <span
          className="text-white font-serif text-lg tracking-widest uppercase"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Mirigliani
        </span>
        <p className="text-[#8A9BB5] text-xs mt-1 uppercase tracking-wider">Area Riservata</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'block px-4 py-2.5 rounded text-sm font-medium transition-colors',
                isActive
                  ? 'text-[#C9A96E] border-l-2 border-[#C9A96E] pl-3 bg-[#0D1E35]'
                  : 'text-[#8A9BB5] hover:text-white hover:bg-[#2C4A7C]'
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
