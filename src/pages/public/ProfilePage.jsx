import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, X, Check, ThumbsUp, Users,
  BookOpen, Clock, AlertCircle, BookMarked, History, Lightbulb
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PICKUP_HOURS = "Point de retrait ouvert du mardi au vendredi de 8h30 à 17h00."

/* ── Barre de progression du prêt ── */
function LoanProgress({ borrowing }) {
  const start   = new Date(borrowing.borrowed_at)
  const end     = new Date(borrowing.due_date)
  const now     = new Date()
  const total   = Math.max(1, end - start)
  const elapsed = now - start
  const pct     = Math.min(100, Math.max(0, (elapsed / total) * 100))
  const isLate  = borrowing.status === 'en_retard'
  const isUrgent = !isLate && pct > 80

  const barColor = isLate ? 'bg-rose-400' : isUrgent ? 'bg-amber-400' : 'bg-green-600'
  const dueFmt   = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div className="mt-2.5 space-y-1">
      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        {isLate ? (
          <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" strokeWidth={1.5} />
            À rendre dès que possible
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-light">
            À rendre le {dueFmt}
          </span>
        )}
        <span className={`text-xs font-medium ${isLate ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-gray-300'}`}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  )
}

/* ── Carte d'emprunt horizontale ── */
function LoanCard({ borrowing }) {
  const isLate = borrowing.status === 'en_retard'

  return (
    <div className={`bg-white border rounded-2xl p-3.5 flex gap-3.5 transition-all ${
      isLate ? 'border-rose-100 bg-rose-50/30' : 'border-gray-100 shadow-sm'
    }`}>
      {/* Miniature — coins droits stricts */}
      <div className="flex-shrink-0 w-14 h-20 bg-gray-100 overflow-hidden shadow-[3px_3px_10px_rgba(0,0,0,0.10)]"
        style={{ borderRadius: 0 }}>
        {borrowing.books?.cover_url ? (
          <img src={borrowing.books.cover_url} alt="" className="w-full h-full object-cover" style={{ borderRadius: 0 }} />
        ) : (
          <div className="w-full h-full bg-gray-100 border border-gray-200 flex items-center justify-center p-1">
            <p className="text-[10px] text-gray-400 font-light text-center leading-tight line-clamp-3">
              {borrowing.books?.title}
            </p>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {borrowing.books?.title}
        </h3>
        <p className="text-gray-500 text-xs mt-0.5 truncate capitalize">
          {borrowing.books?.author}
        </p>
        {borrowing.borrowee_name && (
          <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3" strokeWidth={1.5} />
            Pour : {borrowing.borrowee_name}
          </p>
        )}
        {/* Alerte retard — palette rose premium */}
        {isLate && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 bg-rose-50/50 border border-rose-100 rounded-lg px-2 py-1">
            <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" strokeWidth={1.5} />
            <span className="text-rose-900 text-xs font-light">Retour attendu</span>
          </div>
        )}
        <LoanProgress borrowing={borrowing} />
      </div>
    </div>
  )
}

function ProfilePage() {
  const navigate = useNavigate()
  const [activeTab,    setActiveTab]    = useState('Emprunts')
  const [profile,      setProfile]      = useState(null)
  const [active,       setActive]       = useState([])
  const [history,      setHistory]      = useState([])
  const [reservations, setReservations] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [isEditing,    setIsEditing]    = useState(false)
  const [editForm,     setEditForm]     = useState({ full_name: '', phone: '' })
  const [savingEdit,   setSavingEdit]   = useState(false)
  const [editError,    setEditError]    = useState('')
  const [userId,       setUserId]       = useState(null)
  const [suggestions,  setSuggestions]  = useState([])
  const [myVotes,      setMyVotes]      = useState(new Set())
  const [sugForm,      setSugForm]      = useState({ title: '', author: '' })
  const [savingSug,    setSavingSug]    = useState(false)
  const [sugError,     setSugError]     = useState('')
  const [sugSuccess,   setSugSuccess]   = useState('')
  const [notifs,       setNotifs]       = useState([])
  const [showNotifs,   setShowNotifs]   = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUserId(user.id)

      const [profileRes, borrowingsRes, reservationsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('borrowings')
          .select('*, books(id, title, author, cover_url, categories(name))')
          .eq('member_id', user.id).order('created_at', { ascending: false }),
        supabase.from('reservations')
          .select('*, books(id, title, cover_url)')
          .eq('member_id', user.id).eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ])

      setProfile(profileRes.data)
      const all = borrowingsRes.data || []
      setActive(all.filter(b => ['en_cours', 'en_retard'].includes(b.status)))
      setHistory(all.filter(b => b.status === 'retourné'))
      setReservations(reservationsRes.data || [])
      setLoading(false)
      loadSuggestions(user.id)
    }
    load()
  }, [navigate])

  const loadSuggestions = async (uid) => {
    const [sugRes, votesRes] = await Promise.all([
      supabase.from('suggestions').select('*, profiles(full_name)').order('votes_count', { ascending: false }),
      supabase.from('suggestion_votes').select('suggestion_id').eq('member_id', uid),
    ])
    setSuggestions(sugRes.data || [])
    setMyVotes(new Set((votesRes.data || []).map(v => v.suggestion_id)))
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  const handleEditOpen = () => {
    setEditForm({ full_name: profile?.full_name || '', phone: profile?.phone || '' })
    setIsEditing(true); setEditError('')
  }

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim()) { setEditError('Le nom ne peut pas être vide.'); return }
    setSavingEdit(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles')
      .update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() })
      .eq('id', user.id)
    if (error) setEditError('Erreur lors de la sauvegarde.')
    else { setProfile(p => ({ ...p, full_name: editForm.full_name.trim(), phone: editForm.phone.trim() })); setIsEditing(false) }
    setSavingEdit(false)
  }

  const handleVote = async (suggestion) => {
    if (!userId) { navigate('/login'); return }
    const hasVoted = myVotes.has(suggestion.id)
    if (hasVoted) {
      await supabase.from('suggestion_votes').delete().eq('suggestion_id', suggestion.id).eq('member_id', userId)
      setMyVotes(prev => { const s = new Set(prev); s.delete(suggestion.id); return s })
      setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, votes_count: s.votes_count - 1 } : s))
    } else {
      await supabase.from('suggestion_votes').insert([{ suggestion_id: suggestion.id, member_id: userId }])
      setMyVotes(prev => new Set([...prev, suggestion.id]))
      setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, votes_count: s.votes_count + 1 } : s))
    }
  }

  const handleSugSubmit = async (e) => {
    e.preventDefault()
    if (!sugForm.title.trim()) { setSugError('Le titre est requis.'); return }
    setSavingSug(true); setSugError(''); setSugSuccess('')
    const { error } = await supabase.from('suggestions').insert([{
      title: sugForm.title.trim(), author: sugForm.author.trim() || null, member_id: userId
    }])
    if (error) setSugError("Erreur lors de l'envoi.")
    else { setSugSuccess('Suggestion envoyée avec succès.'); setSugForm({ title: '', author: '' }); loadSuggestions(userId) }
    setSavingSug(false)
  }

  const isGroup  = profile?.account_type === 'group'
  const initials = profile?.full_name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
  const TABS     = isGroup
    ? ['Emprunts de groupe', 'Historique', 'Suggestions']
    : ['Emprunts', 'Historique', 'Suggestions']

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm font-light">Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── En-tête ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-green-700 transition-colors">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-light">Catalogue</span>
          </button>
          <span className="text-sm font-semibold text-gray-900">Mon espace</span>

          {/* ── Cloche notifications ── */}
          <div className="relative mr-auto ml-2">
            <button
              onClick={() => {
                setShowNotifs(v => !v)
                // Marquer comme lus
                const unread = notifs.filter(n => !n.is_read).map(n => n.id)
                if (unread.length > 0) {
                  supabase.from('notifications').update({ is_read: true }).in('id', unread)
                    .then(() => setNotifs(prev => prev.map(n => ({ ...n, is_read: true }))))
                }
              }}
              className="relative p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
            >
              <Bell className="w-4 h-4" strokeWidth={1.5} />
              {notifs.some(n => !n.is_read) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            {showNotifs && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-700">Notifications</p>
                  <button onClick={() => setShowNotifs(false)} className="text-gray-300 hover:text-gray-500">
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-6 h-6 text-gray-200 mx-auto mb-2" strokeWidth={1} />
                      <p className="text-xs text-gray-400 font-light">Aucune notification</p>
                    </div>
                  ) : notifs.map(n => (
                    <div key={n.id} className={"px-4 py-3 border-b border-gray-50 last:border-0 " + (n.is_read ? '' : 'bg-green-50/50')}>
                      <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-gray-300 mt-1 font-light">
                        {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
          </div>

          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-rose-500 transition-colors font-light">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Carte profil ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {isEditing ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-900">Modifier mon profil</p>
              {editError && (
                <div className="flex items-center gap-2 bg-rose-50/50 border border-rose-100 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-rose-900">{editError}</p>
                </div>
              )}
              {/* Input — design premium */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom complet</label>
                <input type="text" value={editForm.full_name}
                  onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-700 focus:border-green-700 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone</label>
                <input type="text" value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-700 focus:border-green-700 transition-all" />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <X className="w-3 h-3" />Annuler
                </button>
                <button onClick={handleSaveProfile} disabled={savingEdit}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors">
                  <Check className="w-3 h-3" />{savingEdit ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isGroup ? 'bg-blue-600' : 'bg-green-700'}`}>
                {isGroup ? <Users className="w-7 h-7 text-white" strokeWidth={1.5} /> : <span className="text-white text-xl font-bold">{initials}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold text-gray-900 truncate">{profile?.full_name}</h1>
                {profile?.phone && <p className="text-gray-400 text-xs mt-0.5 font-light">{profile.phone}</p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs border border-gray-200 text-gray-500 px-2.5 py-0.5 rounded-full font-light">
                    {profile?.membership_type === 'annual' ? 'Abonnement annuel' : "À l'unité"}
                  </span>
                  {isGroup && (
                    <span className="text-xs border border-blue-200 text-blue-600 px-2.5 py-0.5 rounded-full font-light flex items-center gap-1">
                      <Users className="w-3 h-3" strokeWidth={1.5} />Groupe
                    </span>
                  )}
                  {profile?.profile_status === 'en_attente' && (
                    <span className="text-xs border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full font-light">
                      En attente d'activation
                    </span>
                  )}
                </div>
              </div>
              <button onClick={handleEditOpen}
                className="flex-shrink-0 p-2 text-gray-300 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors">
                <Pencil className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === tab ? 'bg-green-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {tab.includes('groupe') && <Users className="w-3 h-3" strokeWidth={1.5} />}
              {tab === 'Emprunts' && <BookMarked className="w-3 h-3" strokeWidth={1.5} />}
              {tab === 'Historique' && <History className="w-3 h-3" strokeWidth={1.5} />}
              {tab === 'Suggestions' && <Lightbulb className="w-3 h-3" strokeWidth={1.5} />}
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {/* ── Onglet Emprunts / Emprunts de groupe ── */}
        {(activeTab === 'Emprunts' || activeTab === 'Emprunts de groupe') && (
          <div className="space-y-4">

            {/* Réservations en cours */}
            {reservations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Réservations en attente</p>
                {reservations.map(r => (
                  <div key={r.id} className="bg-white border border-blue-100 rounded-2xl p-3.5 flex gap-3">
                    <div className="w-10 h-14 bg-gray-100 flex-shrink-0 overflow-hidden shadow-[2px_2px_6px_rgba(0,0,0,0.08)]" style={{ borderRadius: 0 }}>
                      {r.books?.cover_url
                        ? <img src={r.books.cover_url} alt="" className="w-full h-full object-cover" style={{ borderRadius: 0 }} />
                        : <div className="w-full h-full bg-gray-100 border border-gray-200 flex items-center justify-center p-1">
                      <p className="text-[10px] text-gray-400 font-light text-center leading-tight line-clamp-3">{r.books?.title}</p>
                    </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{r.books?.title}</p>
                      <p className="text-xs text-gray-400 font-light mt-0.5">
                        Expire le {new Date(r.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                      {r.pickup_code && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500">Code coursier</p>
                          <div className="flex gap-1.5">
                            {r.pickup_code.split('').map((d, i) => (
                              <div key={i} className="w-8 h-9 bg-white border-2 border-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                                <span className="font-mono text-sm font-bold text-gray-900">{d}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 font-light">{PICKUP_HOURS}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Emprunts actifs */}
            {active.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" strokeWidth={1} />
                <p className="text-gray-400 text-sm font-light">Aucun emprunt en cours</p>
                {isGroup && <p className="text-gray-300 text-xs mt-1">Les livres du groupe apparaîtront ici</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {isGroup && (
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {active.length} livre{active.length > 1 ? 's' : ''} en circulation
                  </p>
                )}
                {active.map(b => <LoanCard key={b.id} borrowing={b} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Historique ── */}
        {activeTab === 'Historique' && (
          history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <History className="w-8 h-8 text-gray-200 mx-auto mb-2" strokeWidth={1} />
              <p className="text-gray-400 text-sm font-light">Aucun livre retourné pour l'instant</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                  <div className="w-10 h-14 bg-gray-100 flex-shrink-0 overflow-hidden shadow-[2px_2px_6px_rgba(0,0,0,0.06)]" style={{ borderRadius: 0 }}>
                    {b.books?.cover_url
                      ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" style={{ borderRadius: 0 }} />
                      : <div className="w-full h-full bg-gray-100 border border-gray-200 flex items-center justify-center p-1">
                      <p className="text-[10px] text-gray-400 font-light text-center leading-tight line-clamp-3">{b.books?.title}</p>
                    </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{b.books?.title}</p>
                    <p className="text-gray-400 text-xs truncate capitalize">{b.books?.author}</p>
                    {b.borrowee_name && <p className="text-xs text-blue-500">Pour : {b.borrowee_name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-300 font-light">Rendu le</p>
                    <p className="text-xs font-medium text-gray-500">
                      {new Date(b.returned_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Onglet Suggestions ── */}
        {activeTab === 'Suggestions' && (
          <div className="space-y-5">

            {/* Formulaire — inputs premium */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Proposer un livre au catalogue</p>
              {sugError && (
                <div className="flex items-center gap-2 bg-rose-50/50 border border-rose-100 rounded-xl px-3 py-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-rose-900">{sugError}</p>
                </div>
              )}
              {sugSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
                  <p className="text-xs text-green-700">{sugSuccess}</p>
                </div>
              )}
              <form onSubmit={handleSugSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Titre du livre *</label>
                  <input type="text" value={sugForm.title}
                    onChange={e => setSugForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Titre du livre à suggérer"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-700 focus:border-green-700 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Auteur</label>
                  <input type="text" value={sugForm.author}
                    onChange={e => setSugForm(p => ({ ...p, author: e.target.value }))}
                    placeholder="Optionnel"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-700 focus:border-green-700 transition-all" />
                </div>
                <button type="submit" disabled={savingSug}
                  className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-green-800 active:scale-[.98] disabled:opacity-50 transition-all shadow-sm">
                  {savingSug ? 'Envoi...' : 'Soumettre ma suggestion'}
                </button>
              </form>
            </div>

            {/* Liste suggestions */}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Suggestions de la communauté</p>
            {suggestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <Lightbulb className="w-7 h-7 text-gray-200 mx-auto mb-2" strokeWidth={1} />
                <p className="text-gray-400 italic text-xs">Aucune suggestion pour l'instant.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map(sug => {
                  const hasVoted = myVotes.has(sug.id)
                  const isOwn   = sug.member_id === userId
                  return (
                    <div key={sug.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{sug.title}</p>
                        {sug.author && <p className="text-gray-400 text-xs">{sug.author}</p>}
                        <p className="text-gray-300 text-xs mt-0.5 font-light">
                          Proposé par {isOwn ? 'vous' : sug.profiles?.full_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sug.status !== 'pending' && (
                          <span className={`text-xs border px-2 py-0.5 rounded-full ${
                            sug.status === 'purchased' ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-400'
                          }`}>
                            {sug.status === 'purchased' ? 'Acheté' : 'Non retenu'}
                          </span>
                        )}
                        <button onClick={() => handleVote(sug)} disabled={isOwn}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            hasVoted ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          } disabled:opacity-30 disabled:cursor-default`}>
                          <ThumbsUp className="w-3 h-3" strokeWidth={1.5} />
                          {sug.votes_count}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
