import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, LogOut } from 'lucide-react'
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />

      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo + Titre institutionnel */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" strokeWidth={1.8} />
            </div>
            <span className="font-bold text-green-800 tracking-tight text-sm hidden sm:block">
              Bibliothèque-navs CI
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 justify-center px-2">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  loc.pathname === item.path
                    ? 'bg-green-700 text-white'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Bouton déconnexion ghost */}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0 whitespace-nowrap">
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

export default AdminLayout
