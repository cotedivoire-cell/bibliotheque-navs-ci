import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Pencil, X, Check, ThumbsUp, Lightbulb, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function DueDateBadge({ borrowing }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(borrowing.due_date)
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  const formatted = due.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (borrowing.status === 'en_retard') { const late = Math.abs(diffDays); return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">En retard de {late} jour{late > 1 ? 's' : ''}</span> }
  if (diffDays <= 2) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Urgent — avant le {formatted}</span>
  if (diffDays <= 7) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">À rendre avant le {formatted}</span>
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">À rendre le {formatted}</span>
}

function ProfilePage() {
  const navigate = useNavigate()
  const [activeTab,  setActiveTab]  = useState('Emprunts')
  const [profile,    setProfile]    = useState(null)
  const [active,     setActive]     = useState([])
  const [history,    setHistory]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [isEditing,  setIsEditing]  = useState(false)
  const [editForm,   setEditForm]   = useState({ full_name: '', phone: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError,  setEditError]  = useState('')
  const [userId,     setUserId]     = useState(null)
  const [suggestions,    setSuggestions]    = useState([])
  const [myVotes,        setMyVotes]        = useState(new Set())
  const [sugForm,        setSugForm]        = useState({ title: '', author: '' })
  const [savingSug,      setSavingSug]      = useState(false)
  const [sugError,       setSugError]       = useState('')
  const [sugSuccess,     setSugSuccess]     = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUserId(user.id)
      const [profileRes, borrowingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('borrowings').select('*, books(id, title, author, cover_url, categories(name))').eq('member_id', user.id).order('created_at', { ascending: false }),
      ])
      setProfile(profileRes.data)
      const all = borrowingsRes.data || []
      setActive(all.filter(b => b.status === 'en_cours' || b.status === 'en_retard'))
      setHistory(all.filter(b => b.status === 'retourné'))
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

  const handleEditOpen = () => { setEditForm({ full_name: profile?.full_name || '', phone: profile?.phone || '' }); setIsEditing(true); setEditError('') }

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim()) { setEditError('Le nom ne peut pas être vide.'); return }
    setSavingEdit(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() }).eq('id', user.id)
    if (error) setEditError("Erreur lors de la sauvegarde.")
    else { setProfile(prev => ({ ...prev, full_name: editForm.full_name.trim(), phone: editForm.phone.trim() })); setIsEditing(false) }
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
    const { error } = await supabase.from('suggestions').insert([{ title: sugForm.title.trim(), author: sugForm.author.trim() || null, member_id: userId }])
    if (error) setSugError("Erreur lors de l'envoi. Réessayez.")
    else { setSugSuccess('Suggestion envoyée !'); setSugForm({ title: '', author: '' }); loadSuggestions(userId) }
    setSavingSug(false)
  }

  const MEMBERSHIP = { unit: "À l'unité", annual: 'Abonnement annuel' }
  const isGroup     = profile?.account_type === 'group'
  const initials    = profile?.full_name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'

  // Onglets dynamiques (groupe = onglet Emprunts de groupe)
  const TABS = isGroup
    ? ['Emprunts de groupe', 'Historique', 'Suggestions']
    : ['Emprunts', 'Historique', 'Suggestions']

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Chargement...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-sm">Catalogue</span></button>
          <span className="text-sm font-semibold text-gray-900">Mon espace</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 transition-colors">Déconnexion</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Carte profil */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {isEditing ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Modifier mon profil</h2>
              {editError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Nom complet</label><input type="text" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label><input type="text" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"><X className="w-3.5 h-3.5" /> Annuler</button>
                <button onClick={handleSaveProfile} disabled={savingEdit} className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50"><Check className="w-3.5 h-3.5" />{savingEdit ? 'Sauvegarde...' : 'Enregistrer'}</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isGroup ? 'bg-blue-600' : 'bg-green-700'}`}>
                {isGroup ? <Users className="w-7 h-7 text-white" /> : <span className="text-white text-xl font-bold">{initials}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">{profile?.full_name}</h1>
                {profile?.phone && <p className="text-gray-400 text-xs mt-0.5">{profile.phone}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-block bg-green-50 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Adhésion : {MEMBERSHIP[profile?.membership_type] || "À l'unité"}
                  </span>
                  {isGroup && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      <Users className="w-3 h-3" />
                      Compte Groupe — {profile?.max_borrowings} livres max
                    </span>
                  )}
                </div>
              </div>
              <button onClick={handleEditOpen} className="flex-shrink-0 p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${activeTab === tab ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'Suggestions' ? <span className="flex items-center justify-center gap-1"><Lightbulb className="w-3 h-3" />{tab}</span> :
               tab.includes('groupe') ? <span className="flex items-center justify-center gap-1"><Users className="w-3 h-3" />{tab}</span> : tab}
            </button>
          ))}
        </div>

        {/* ── Onglet Emprunts (individuel ou groupe) ── */}
        {(activeTab === 'Emprunts' || activeTab === 'Emprunts de groupe') && (
          active.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun emprunt en cours</p>
              {isGroup && <p className="text-gray-300 text-xs mt-1">Les livres empruntés pour votre groupe apparaîtront ici</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {isGroup && <p className="text-xs text-blue-600 font-medium px-1">{active.length} livre(s) actuellement sortis pour votre groupe</p>}
              {active.map(b => (
                <div key={b.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-4 ${b.status === 'en_retard' ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="w-14 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {b.books?.cover_url ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center"><BookOpen className="w-5 h-5 text-white opacity-40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{b.books?.title}</h3>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{b.books?.author}</p>
                    {/* Destinataire (compte groupe) */}
                    {b.borrowee_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-700 font-medium">Pour : {b.borrowee_name}</span>
                      </div>
                    )}
                    <p className="text-gray-300 text-xs mt-0.5">Emprunté le {new Date(b.borrowed_at).toLocaleDateString('fr-FR')}</p>
                    <div className="mt-2"><DueDateBadge borrowing={b} /></div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Onglet Historique ── */}
        {activeTab === 'Historique' && (
          history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center"><p className="text-gray-400 text-sm">Aucun livre retourné pour l'instant</p></div>
          ) : (
            <div className="space-y-2">
              {history.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                  <div className="w-10 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">{b.books?.cover_url ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{b.books?.title}</h3>
                    <p className="text-gray-400 text-xs truncate">{b.books?.author}</p>
                    {b.borrowee_name && <p className="text-xs text-blue-600">Pour : {b.borrowee_name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0"><p className="text-xs text-gray-400">Rendu le</p><p className="text-xs font-semibold text-gray-600">{new Date(b.returned_at).toLocaleDateString('fr-FR')}</p></div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Onglet Suggestions ── */}
        {activeTab === 'Suggestions' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Proposer un livre au catalogue</h2>
              {sugError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{sugError}</p>}
              {sugSuccess && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-3">{sugSuccess}</p>}
              <form onSubmit={handleSugSubmit} className="space-y-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label><input type="text" value={sugForm.title} onChange={e => setSugForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre du livre" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Auteur</label><input type="text" value={sugForm.author} onChange={e => setSugForm(p => ({ ...p, author: e.target.value }))} placeholder="Optionnel" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
                <button type="submit" disabled={savingSug} className="w-full bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50">{savingSug ? 'Envoi...' : 'Soumettre ma suggestion'}</button>
              </form>
            </div>
            <h2 className="text-sm font-bold text-gray-900">Suggestions de la communauté</h2>
            {suggestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400"><p className="text-sm">Aucune suggestion pour l'instant.</p></div>
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
                        <p className="text-gray-300 text-xs mt-0.5">Proposé par {isOwn ? 'vous' : sug.profiles?.full_name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sug.status !== 'pending' && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sug.status === 'purchased' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>{sug.status === 'purchased' ? 'Acheté ✓' : 'Refusé'}</span>}
                        <button onClick={() => handleVote(sug)} disabled={isOwn} className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${hasVoted ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} disabled:opacity-40 disabled:cursor-default`}><ThumbsUp className="w-3 h-3" />{sug.votes_count}</button>
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
