import { useEffect, useState } from 'react'
import { Pencil, X, Check, Users, ShieldOff, ShieldCheck, UserCheck, BarChart2, BookOpen, Star, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const TODAY       = new Date().toISOString().split('T')[0]
const IN_ONE_YEAR = new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().split('T')[0]
const DEFAULT_SUB_AMOUNT = 5000

function MembersPage() {
  const [members,       setMembers]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [editingMember, setEditingMember] = useState(null)
  const [editForm,      setEditForm]      = useState({ full_name: '', phone: '' })
  const [savingEdit,    setSavingEdit]    = useState(false)
  const [subForm,       setSubForm]       = useState(null)
  const [subData,       setSubData]       = useState({ amount_paid: DEFAULT_SUB_AMOUNT, start_date: TODAY, end_date: IN_ONE_YEAR })
  const [savingSub,     setSavingSub]     = useState(false)
  const [subError,      setSubError]      = useState('')
  const [editingGroup,  setEditingGroup]  = useState(null)
  const [groupQuota,    setGroupQuota]    = useState(5)
  const [savingGroup,   setSavingGroup]   = useState(false)
  const [togglingBlock, setTogglingBlock] = useState(null)
  const [activating,    setActivating]    = useState(null)
  // ── Stats ──
  const [statsOpen,    setStatsOpen]    = useState(null)  // member_id
  const [statsData,    setStatsData]    = useState({})    // { [memberId]: { total, favCat, punctuality } }
  const [loadingStats, setLoadingStats] = useState(null)

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles').select('*, subscriptions(id, start_date, end_date, status, amount_paid)')
      .eq('role', 'member').order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  // ── Statistiques d'un membre ───────────────────────────────
  const handleToggleStats = async (member) => {
    if (statsOpen === member.id) { setStatsOpen(null); return }
    setStatsOpen(member.id)
    if (statsData[member.id]) return  // déjà chargé

    setLoadingStats(member.id)
    const { data: borrowings } = await supabase
      .from('borrowings')
      .select('*, books(categories(name))')
      .eq('member_id', member.id)

    const all      = borrowings || []
    const total    = all.length
    const returned = all.filter(b => b.status === 'retourné')

    // Catégorie favorite
    const catCount = {}
    all.forEach(b => {
      const cat = b.books?.categories?.name || 'Sans catégorie'
      catCount[cat] = (catCount[cat] || 0) + 1
    })
    const favCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    // Taux de ponctualité
    const onTime = returned.filter(b => {
      if (!b.returned_at || !b.due_date) return true
      return b.returned_at <= b.due_date
    })
    const punctuality = returned.length > 0 ? Math.round((onTime.length / returned.length) * 100) : null

    setStatsData(prev => ({
      ...prev,
      [member.id]: { total, favCat, punctuality, returned: returned.length }
    }))
    setLoadingStats(null)
  }

  const handleEdit = (m) => { setEditingMember(m.id); setEditForm({ full_name: m.full_name, phone: m.phone || '' }) }

  const handleSaveEdit = async (id) => {
    if (!editForm.full_name.trim()) return
    setSavingEdit(true)
    await supabase.from('profiles').update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() }).eq('id', id)
    await loadMembers(); setEditingMember(null); setSavingEdit(false)
  }

  const handleActivate = async (member) => {
    setActivating(member.id)
    await supabase.from('profiles').update({ profile_status: 'actif' }).eq('id', member.id)
    await loadMembers(); setActivating(null)
  }

  const handleToggleBlock = async (member) => {
    setTogglingBlock(member.id)
    await supabase.from('profiles').update({ is_blocked: !member.is_blocked }).eq('id', member.id)
    await loadMembers(); setTogglingBlock(null)
  }

  const handleToggleMembership = (member) => {
    if (member.membership_type === 'unit') {
      setSubForm(member.id)
      setSubData({ amount_paid: DEFAULT_SUB_AMOUNT, start_date: TODAY, end_date: IN_ONE_YEAR })
      setSubError('')
    } else {
      if (window.confirm(`Repasser ${member.full_name} en "À l'unité" ?`)) {
        supabase.from('profiles').update({ membership_type: 'unit' }).eq('id', member.id).then(() => loadMembers())
      }
    }
  }

  const handleCreateSub = async (member) => {
    const amount = parseInt(subData.amount_paid)
    if (isNaN(amount) || amount < 0) { setSubError('Montant invalide.'); return }
    setSavingSub(true)
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('member_id', member.id).eq('status', 'active')
    await supabase.from('subscriptions').insert([{ member_id: member.id, start_date: subData.start_date, end_date: subData.end_date, amount_paid: amount, status: 'active' }])
    await supabase.from('profiles').update({ membership_type: 'annual' }).eq('id', member.id)
    setSubForm(null); setSavingSub(false); loadMembers()
  }

  const handleToggleGroup = (member) => {
    if (member.account_type === 'individual') {
      setEditingGroup(member.id)
      setGroupQuota(member.max_borrowings > 1 ? member.max_borrowings : 5)
    } else {
      if (window.confirm(`Repasser ${member.full_name} en compte individuel ?`)) {
        supabase.from('profiles').update({ account_type: 'individual', max_borrowings: 1 }).eq('id', member.id).then(() => loadMembers())
      }
    }
  }

  const handleSaveGroup = async (id) => {
    setSavingGroup(true)
    await supabase.from('profiles').update({ account_type: 'group', max_borrowings: parseInt(groupQuota) || 5 }).eq('id', id)
    setEditingGroup(null); setSavingGroup(false); loadMembers()
  }

  const unitCount    = members.filter(m => m.membership_type === 'unit').length
  const annualCount  = members.filter(m => m.membership_type === 'annual').length
  const groupCount   = members.filter(m => m.account_type === 'group').length
  const blockedCount = members.filter(m => m.is_blocked).length
  const pendingCount = members.filter(m => m.profile_status === 'en_attente').length

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
        <p className="text-slate-400 text-sm mt-1">{members.length} membre(s)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p className="text-xs text-slate-400 mb-1">À l'unité</p><p className="text-2xl font-bold text-slate-800">{unitCount}</p></div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-4"><p className="text-xs text-amber-600 mb-1">Abonnement</p><p className="text-2xl font-bold text-amber-700">{annualCount}</p></div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-4"><p className="text-xs text-blue-600 mb-1">Groupes</p><p className="text-2xl font-bold text-blue-700">{groupCount}</p></div>
        <div className={`rounded-2xl border shadow-sm p-4 ${pendingCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
          <p className={`text-xs mb-1 ${pendingCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>En attente</p>
          <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-orange-700' : 'text-slate-700'}`}>{pendingCount}</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-4"><p className="text-xs text-red-500 mb-1">Bloqués</p><p className="text-2xl font-bold text-red-600">{blockedCount}</p></div>
      </div>

      {loading ? <p className="text-slate-400 text-sm">Chargement...</p> : members.length === 0 ? <div className="text-center py-20 text-slate-400"><p>Aucun membre</p></div> : (
        <div className="space-y-3">
          {members.map(member => {
            const isAnnual    = member.membership_type === 'annual'
            const isGroup     = member.account_type === 'group'
            const isBlocked   = member.is_blocked
            const isPending   = member.profile_status === 'en_attente'
            const isEditing   = editingMember === member.id
            const isSubForm   = subForm === member.id
            const isGroupEdit = editingGroup === member.id
            const showStats   = statsOpen === member.id
            const mStats      = statsData[member.id]
            const activeSub   = member.subscriptions?.find(s => s.status === 'active')

            return (
              <div key={member.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isBlocked ? 'border-red-200' : isPending ? 'border-orange-200' : 'border-slate-100'}`}>
                {isEditing ? (
                  <div className="space-y-3">
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Nom</label><input type="text" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label><input type="text" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingMember(null)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg"><X className="w-3 h-3" />Annuler</button>
                      <button onClick={() => handleSaveEdit(member.id)} disabled={savingEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-green-700 rounded-lg disabled:opacity-50"><Check className="w-3 h-3" />{savingEdit ? '...' : 'Enregistrer'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isBlocked ? 'bg-red-500' : isPending ? 'bg-orange-400' : isGroup ? 'bg-blue-600' : 'bg-green-700'}`}>
                      {isGroup ? <Users className="w-5 h-5 text-white" /> : <span className="text-white text-sm font-bold">{member.full_name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm truncate">{member.full_name}</p>
                        {isPending && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">En attente</span>}
                        {isBlocked && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Bloqué</span>}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{member.phone || '—'}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isAnnual ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{isAnnual ? 'Abonnement' : "À l'unité"}</span>
                        {isGroup && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Users className="w-3 h-3" />Groupe — {member.max_borrowings} livres</span>}
                        {activeSub && <span className="text-xs text-slate-400">→ {new Date(activeSub.end_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      <button onClick={() => handleEdit(member)} className="text-slate-400 hover:text-green-700 transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                      {/* Stats */}
                      <button onClick={() => handleToggleStats(member)} title="Statistiques du membre"
                        className={`p-1.5 rounded-lg transition-colors ${showStats ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}>
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      {isPending && (
                        <button onClick={() => handleActivate(member)} disabled={activating === member.id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-xs font-semibold disabled:opacity-50">
                          <UserCheck className="w-3.5 h-3.5" />{activating === member.id ? '...' : 'Activer'}
                        </button>
                      )}
                      <button onClick={() => handleToggleBlock(member)} disabled={togglingBlock === member.id}
                        className={`p-1.5 rounded-lg transition-colors ${isBlocked ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                        {isBlocked ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleToggleGroup(member)}
                        className={`p-1.5 rounded-lg transition-colors ${isGroup ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                        <Users className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleMembership(member)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isAnnual ? 'bg-amber-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isAnnual ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Section statistiques ── */}
                {showStats && (
                  <div className="mt-4 pt-4 border-t border-purple-100">
                    <p className="text-xs font-semibold text-purple-700 flex items-center gap-1 mb-3"><BarChart2 className="w-3.5 h-3.5" />Statistiques du membre</p>
                    {loadingStats === member.id ? (
                      <p className="text-xs text-slate-400">Chargement des statistiques...</p>
                    ) : mStats ? (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-purple-50 rounded-xl p-3 text-center">
                          <BookOpen className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-purple-700">{mStats.total}</p>
                          <p className="text-xs text-purple-500 mt-0.5">Livres empruntés</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 text-center">
                          <Star className="w-4 h-4 text-green-600 mx-auto mb-1" />
                          <p className="text-sm font-bold text-green-700 leading-tight">{mStats.favCat}</p>
                          <p className="text-xs text-green-500 mt-0.5">Catégorie favorite</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${mStats.punctuality === null ? 'bg-slate-50' : mStats.punctuality >= 80 ? 'bg-teal-50' : 'bg-amber-50'}`}>
                          <Clock className={`w-4 h-4 mx-auto mb-1 ${mStats.punctuality === null ? 'text-slate-400' : mStats.punctuality >= 80 ? 'text-teal-600' : 'text-amber-600'}`} />
                          <p className={`text-2xl font-bold ${mStats.punctuality === null ? 'text-slate-500' : mStats.punctuality >= 80 ? 'text-teal-700' : 'text-amber-700'}`}>
                            {mStats.punctuality !== null ? `${mStats.punctuality}%` : '—'}
                          </p>
                          <p className={`text-xs mt-0.5 ${mStats.punctuality === null ? 'text-slate-400' : mStats.punctuality >= 80 ? 'text-teal-500' : 'text-amber-500'}`}>Ponctualité</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Formulaire groupe */}
                {isGroupEdit && (
                  <div className="mt-4 pt-4 border-t border-blue-100 space-y-3">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Users className="w-3.5 h-3.5" />Activer le compte groupe</p>
                    <div className="flex gap-2">
                      {[3, 5, 10].map(q => <button key={q} type="button" onClick={() => setGroupQuota(q)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${groupQuota === q ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>{q} livres</button>)}
                      <input type="number" min="2" max="20" value={groupQuota} onChange={e => setGroupQuota(parseInt(e.target.value)||5)} className="w-20 border border-slate-200 px-3 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingGroup(null)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg">Annuler</button>
                      <button onClick={() => handleSaveGroup(member.id)} disabled={savingGroup} className="flex items-center gap-1 px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"><Users className="w-3 h-3" />{savingGroup ? '...' : 'Activer'}</button>
                    </div>
                  </div>
                )}

                {/* Formulaire abonnement */}
                {isSubForm && (
                  <div className="mt-4 pt-4 border-t border-amber-100 space-y-3">
                    <p className="text-xs font-semibold text-amber-700">Nouvel abonnement annuel</p>
                    {subError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{subError}</p>}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Montant (FCFA)</label>
                        <input type="number" min="0" value={subData.amount_paid} onChange={e => setSubData(p => ({ ...p, amount_paid: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <p className="text-xs text-slate-400 mt-0.5">Modifiable (tarif réduit, gratuité...)</p>
                      </div>
                      <div><label className="block text-xs text-slate-500 mb-1">Début</label><input type="date" value={subData.start_date} onChange={e => setSubData(p => ({ ...p, start_date: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                      <div><label className="block text-xs text-slate-500 mb-1">Fin</label><input type="date" value={subData.end_date} min={subData.start_date} onChange={e => setSubData(p => ({ ...p, end_date: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setSubForm(null)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg">Annuler</button>
                      <button onClick={() => handleCreateSub(member)} disabled={savingSub} className="px-4 py-1.5 text-xs text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 font-semibold">{savingSub ? '...' : "Créer l'abonnement"}</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}

export default MembersPage
