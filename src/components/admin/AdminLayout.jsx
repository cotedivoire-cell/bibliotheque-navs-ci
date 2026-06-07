import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import OfflineBanner from '../OfflineBanner'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

const navItems = [
  { path: '/admin',              label: 'Dashboard'    },
  { path: '/admin/livres',       label: 'Livres'       },
  { path: '/admin/membres',      label: 'Membres'      },
  { path: '/admin/emprunts',     label: 'Emprunts'     },
  { path: '/admin/reservations', label: 'Réservations' },
  { path: '/admin/finances',     label: 'Finances'     },
  { path: '/admin/suggestions',  label: 'Suggestions'  },
  { path: '/admin/settings',     label: 'Paramètres'   },
]

function AdminLayout({ children }) {
  const loc      = useLocation()
  const navigate = useNavigate()
  const { isOnline, pendingCount, isSyncing } = useOnlineStatus()

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login') }

  return (
    <div className="min-h-screen bg-slate-50">
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-green-800 tracking-tight text-sm flex-shrink-0">Bibliothèque-navs CI</span>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar ml-4">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  loc.pathname === item.path ? 'bg-green-700 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                {item.label}
              </Link>
            ))}
            {!isOnline && <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-lg font-medium">Hors-ligne</span>}
            <button onClick={handleLogout} className="ml-2 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 whitespace-nowrap">Déconnexion</button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

export default AdminLayout
