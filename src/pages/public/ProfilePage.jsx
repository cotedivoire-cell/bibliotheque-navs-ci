import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Pencil, X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function DueDateBadge({ borrowing }) {
  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const due      = new Date(borrowing.due_date)
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  const formatted = due.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (borrowing.status === 'en_retard') {
    const late = Math.abs(diffDays)
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        En retard de {late} jour{late > 1 ? 's' : ''}
      </span>
    )
  }
  if (diffDays <= 2) return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
      Urgent — avant le {formatted}
    </span>
  )
  if (diffDays <= 7) return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      À rendre avant le {formatted}
    </span>
  )
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
      À rendre le {formatted}
    </span>
  )
}

function ProfilePage() {
  const navigate = useNavigate()

  const [profile,     setProfile]     = useState(null)
  const [active,      setActive]      = useState([])
  const [history,     setHistory]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  // ── États édition profil ──
  const [isEditing,  setIsEditing]  = useState(false)
  const [editForm,   setEditForm]   = useState({ full_name: '', phone: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError,  setEditError]  = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const [profileRes, borrowingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('borrowings')
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

  // ── Ouvrir édition ──
  const handleEditOpen = () => {
    setEditForm({ full_name: profile?.full_name || '', phone: profile?.phone || '' })
    setIsEditing(true)
    setEditError('')
  }

  // ── Sauvegarder le profil ──
  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim()) {
      setEditError('Le nom ne peut pas être vide.')
      return
    }
    setSavingEdit(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() })
      .eq('id', user.id)

    if (error) {
      setEditError("Erreur lors de la sauvegarde.")
    } else {
      setProfile(prev => ({ ...prev, full_name: editForm.full_name.trim(), phone: editForm.phone.trim() }))
      setIsEditing(false)
    }
    setSavingEdit(false)
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

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Catalogue</span>
          </button>
          <span className="text-sm font-semibold text-gray-900">Mon espace</span>
          <button onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Carte profil ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {isEditing ? (
            /* Mode édition */
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Modifier mon profil</h2>
              {editError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nom complet</label>
                <input type="text" value={editForm.full_name}
                  onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
                <input type="text" value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+225 ..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                  <X className="w-3.5 h-3.5" /> Annuler
                </button>
                <button onClick={handleSaveProfile} disabled={savingEdit}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50">
                  <Check className="w-3.5 h-3.5" />
                  {savingEdit ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            /* Mode affichage */
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">{profile?.full_name}</h1>
                {profile?.phone && <p className="text-gray-400 text-xs mt-0.5">{profile.phone}</p>}
                <span className="inline-block mt-2 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Adhésion : {MEMBERSHIP[profile?.membership_type] || "À l'unité"}
                </span>
              </div>
              <button onClick={handleEditOpen}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Emprunts en cours */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-bold text-gray-900">Emprunts en cours</h2>
            {active.length > 0 && (
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {active.length}
              </span>
            )}
          </div>
          {active.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun emprunt en cours</p>
              <p className="text-gray-300 text-xs mt-1">Parle à un gestionnaire pour emprunter un livre</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(b => (
                <div key={b.id}
                  className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-4 ${
                    b.status === 'en_retard' ? 'border-red-200' : 'border-gray-100'
                  }`}>
                  <div className="w-14 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {b.books?.cover_url
                      ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white opacity-40" />
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{b.books?.title}</h3>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{b.books?.author}</p>
                    <p className="text-gray-300 text-xs mt-0.5">
                      Emprunté le {new Date(b.borrowed_at).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="mt-2"><DueDateBadge borrowing={b} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique */}
        <div>
          <button onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between py-2 mb-3 text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">Historique de lecture</h2>
              {history.length > 0 && (
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showHistory && (
            history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <p className="text-gray-400 text-sm">Aucun livre retourné pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(b => (
                  <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                    <div className="w-10 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {b.books?.cover_url
                        ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-200" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{b.books?.title}</h3>
                      <p className="text-gray-400 text-xs truncate">{b.books?.author}</p>
                    </div>
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
