import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Indicateur visuel de date limite ──────────────────────────
function DueDateBadge({ borrowing }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due      = new Date(borrowing.due_date)
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  const formatted = due.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  if (borrowing.status === 'en_retard') {
    const late = Math.abs(diffDays)
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                       bg-red-100 text-red-700">
        En retard de {late} jour{late > 1 ? 's' : ''}
      </span>
    )
  }
  if (diffDays <= 2) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                       bg-orange-100 text-orange-700">
        Urgent — avant le {formatted}
      </span>
    )
  }
  if (diffDays <= 7) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                       bg-amber-100 text-amber-700">
        À rendre avant le {formatted}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                     bg-green-50 text-green-700">
      À rendre le {formatted}
    </span>
  )
}

// ── Page principale ────────────────────────────────────────────
function ProfilePage() {
  const navigate = useNavigate()

  const [profile,     setProfile]     = useState(null)
  const [active,      setActive]      = useState([])
  const [history,     setHistory]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const [profileRes, borrowingsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('borrowings')
          .select('*, books(id, title, author, cover_url, categories(name))')
          .eq('member_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setProfile(profileRes.data)
      const all = borrowingsRes.data || []
      setActive(all.filter(b => b.status === 'en_cours' || b.status === 'en_retard'))
      setHistory(all.filter(b => b.status === 'retourné'))
      setLoading(false)
    }
    load()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const MEMBERSHIP = { unit: "À l'unité", annual: 'Abonnement annuel' }

  const initials = profile?.full_name
    ?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── En-tête ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Catalogue</span>
          </button>
          <span className="text-sm font-semibold text-gray-900">Mon espace</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Carte profil ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {profile?.full_name}
            </h1>
            {profile?.phone && (
              <p className="text-gray-400 text-xs mt-0.5">{profile.phone}</p>
            )}
            <span className="inline-block mt-2 bg-green-50 text-green-700 text-xs
                             font-medium px-2.5 py-0.5 rounded-full">
              Adhésion : {MEMBERSHIP[profile?.membership_type] || "À l'unité"}
            </span>
          </div>
        </div>

        {/* ── Emprunts en cours ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-bold text-gray-900">Emprunts en cours</h2>
            {active.length > 0 && (
              <span className="text-xs font-semibold bg-green-100 text-green-700
                               px-2 py-0.5 rounded-full">
                {active.length}
              </span>
            )}
          </div>

          {active.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun emprunt en cours</p>
              <p className="text-gray-300 text-xs mt-1">
                Parle à un gestionnaire pour emprunter un livre
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(b => (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-4 ${
                    b.status === 'en_retard' ? 'border-red-200' : 'border-gray-100'
                  }`}
                >
                  {/* Couverture */}
                  <div className="w-14 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {b.books?.cover_url
                      ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-green-700 to-green-900
                                        flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white opacity-40" />
                        </div>
                    }
                  </div>

                  {/* Informations */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                      {b.books?.title}
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{b.books?.author}</p>
                    <p className="text-gray-300 text-xs mt-0.5">
                      Emprunté le {new Date(b.borrowed_at).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="mt-2">
                      <DueDateBadge borrowing={b} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Historique de lecture (repliable) ── */}
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between py-2 mb-3 text-left"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">Historique de lecture</h2>
              {history.length > 0 && (
                <span className="text-xs font-medium bg-gray-100 text-gray-500
                                 px-2 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
            </div>
            {showHistory
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>

          {showHistory && (
            history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <p className="text-gray-400 text-sm">Aucun livre retourné pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(b => (
                  <div
                    key={b.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm
                               p-3 flex items-center gap-3"
                  >
                    {/* Miniature */}
                    <div className="w-10 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {b.books?.cover_url
                        ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-200" />
                      }
                    </div>

                    {/* Titre */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {b.books?.title}
                      </h3>
                      <p className="text-gray-400 text-xs truncate">{b.books?.author}</p>
                    </div>

                    {/* Date retour */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Rendu le</p>
                      <p className="text-xs font-semibold text-gray-600">
                        {new Date(b.returned_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>
    </div>
  )
}

export default ProfilePage
