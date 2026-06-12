import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BookOpen, LogOut, Menu, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import OfflineBanner from '../OfflineBanner'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

const navItems = [
  { path: '/admin',              label: 'Dashboard'    },
  { path: '/admin/livres',       label: 'Livres'       },
  { path: '/admin/membres',      label: 'Membres', badge: true },
  { path: '/admin/emprunts',     label: 'Emprunts'     },
  { path: '/admin/reservations', label: 'Réservations' },
  { path: '/admin/finances',     label: 'Finances'     },
  { path: '/admin/suggestions',  label: 'Suggestions'  },
  { path: '/admin/dons',         label: 'Dons'         },
  { path: '/admin/settings',     label: 'Paramètres'   },
]

function AdminLayout({ children }) {
  const loc      = useLocation()
  const navigate = useNavigate()
  const { isOnline, pendingCount, isSyncing } = useOnlineStatus()
  const [pendingMembers, setPendingMembers] = useState(0)
  const [menuOpen,       setMenuOpen]       = useState(false)

  useEffect(() => {
    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'member')
      .eq('profile_status', 'en_attente')
      .then(({ count }) => setPendingMembers(count || 0))
  }, [])

  // Fermer le menu au changement de route
  useEffect(() => { setMenuOpen(false) }, [loc.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const currentLabel = navItems.find(n => n.path === loc.pathname)?.label || 'Admin'

  return (
    <div className="min-h-screen bg-slate-50">
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-green-700 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" strokeWidth={1.8} />
            </div>
            <span className="font-bold text-green-800 tracking-tight text-sm hidden sm:block">
              Bibliothèque-navs CI
            </span>
          </div>

          {/* Nav desktop (md+) */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto flex-1 justify-center px-2"
               style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  loc.pathname === item.path
                    ? 'bg-green-700 text-white'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                {item.label}
                {item.badge && pendingMembers > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {pendingMembers > 9 ? '9+' : pendingMembers}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Page courante sur mobile */}
          <span className="md:hidden flex-1 text-sm font-semibold text-slate-700 truncate">
            {currentLabel}
          </span>

          {/* Boutons droite */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Hamburger mobile */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden p-2 text-slate-500 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
            >
              {menuOpen
                ? <X className="w-5 h-5" strokeWidth={1.5} />
                : <Menu className="w-5 h-5" strokeWidth={1.5} />
              }
              {!menuOpen && pendingMembers > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Déconnexion desktop */}
            <button onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all whitespace-nowrap">
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* ── Menu mobile déroulant — flottant, ne pousse pas le contenu ── */}
        {menuOpen && (
          <div className="md:hidden absolute top-full right-3 mt-1 w-56 border border-slate-100 bg-white rounded-2xl px-2 py-2 space-y-0.5 shadow-xl z-50">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  loc.pathname === item.path
                    ? 'bg-green-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <span>{item.label}</span>
                {item.badge && pendingMembers > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingMembers > 9 ? '9+' : pendingMembers}
                  </span>
                )}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
        {children}
      </main>
    </div>
  )
}

export default AdminLayout
