import { useEffect, useState } from 'react'
import {
  User, Users, Clock, ShieldAlert, Calendar,
  Pencil, BarChart2, CheckCircle, X, Search,
  ChevronDown, ChevronUp, Phone, BookOpen
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

/* ── Carte compteur ── */
function StatCard({ icon: Icon, iconColor, bgColor, label, value }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 leading-none">{value ?? '—'}</p>
        <p className="text-xs text-slate-400 font-medium mt-1.5">{label}</p>
      </div>
    </div>
  )
}

/* ── Initiales avatar ── */
const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

/* ── Badge statut ── */
function StatusBadge({ status, membershipType }) {
  if (status === 'en_attente')
    return <span className="bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">En attente</span>
  if (status === 'actif_annuel' || membershipType === 'annual')
    return <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">Abonnement annuel</span>
  return <span className="bg-green-50 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">À l'unité</span>
}

function MembersPage() {
  const [members,     setMembers]     = useState([])
  const [stats,       setStats]       = useState({ total:0, unit:0, annual:0, group:0, pending:0, blocked:0 })
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [editingId,   setEditingId]   = useState(null)
  const [editForm,    setEditForm]    = useState({ full_name:'', phone:'', max_borrowings:3 })
  const [savingEdit,  setSavingEdit]  = useState(false)
  const [expandedId,  setExpandedId]  = useState(null)
  const [memberStats, setMemberStats] = useState({})

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'member')
      .order('created_at', { ascending: false })
    const m = data || []
    setMembers(m)
    setStats({
      total:   m.length,
      unit:    m.filter(x => ['actif_unite','actif'].includes(x.profile_status) && x.membership_type === 'unit').length,
      annual:  m.filter(x => x.profile_status === 'actif_annuel' || x.membership_type === 'annual').length,
      group:   m.filter(x => x.account_type === 'group').length,
      pending: m.filter(x => x.profile_status === 'en_attente').length,
      blocked: m.filter(x => x.is_blocked).length,
    })
    setLoading(false)
  }

  const loadMemberStats = async (memberId) => {
    if (memberStats[memberId]) return
    const [activeBorrows, totalBorrows, favCat] = await Promise.all([
      supabase.from('borrowings').select('id', { count:'exact' }).eq('member_id', memberId).in('status', ['en_cours','en_retard']),
      supabase.from('borrowings').select('id', { count:'exact' }).eq('member_id', memberId),
      supabase.from('borrowings').select('books(categories(name))').eq('member_id', memberId).eq('status', 'retourné').limit(50),
    ])
    const cats = {}
    favCat.data?.forEach(b => { const n = b.books?.categories?.name; if (n) cats[n] = (cats[n]||0)+1 })
    const fav = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—'
    setMemberStats(prev => ({ ...prev, [memberId]: {
      active: activeBorrows.count || 0,
      total:  totalBorrows.count  || 0,
      fav,
    }}))
  }

  const handleToggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    loadMemberStats(id)
  }

  const handleToggleBlock = async (member) => {
    await supabase.from('profiles').update({ is_blocked: !member.is_blocked }).eq('id', member.id)
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_blocked: !m.is_blocked } : m))
    setStats(prev => ({ ...prev, blocked: prev.blocked + (member.is_blocked ? -1 : 1) }))
  }

  const handleActivate = async (member) => {
    const newStatus = member.membership_type === 'annual' ? 'actif_annuel' : 'actif_unite'
    await supabase.from('profiles').update({ profile_status: newStatus }).eq('id', member.id)
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, profile_status: newStatus } : m))
    setStats(prev => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      unit:    newStatus === 'actif_unite'   ? prev.unit   + 1 : prev.unit,
      annual:  newStatus === 'actif_annuel'  ? prev.annual + 1 : prev.annual,
    }))
  }

  const handleEditOpen = (member) => {
    setEditingId(member.id)
    setEditForm({ full_name: member.full_name || '', phone: member.phone || '', max_borrowings: member.max_borrowings || 3 })
  }

  const handleEditSave = async (memberId) => {
    setSavingEdit(true)
    await supabase.from('profiles').update({
      full_name:     editForm.full_name.trim(),
      phone:         editForm.phone.trim(),
      max_borrowings: parseInt(editForm.max_borrowings) || 3,
    }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...editForm } : m))
    setEditingId(null)
    setSavingEdit(false)
  }

  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.phone?.includes(search)
  )

  return (
    <AdminLayout>

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Membres</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            {loading ? '...' : `${stats.total} membre${stats.total > 1 ? 's' : ''} inscrits`}
          </p>
        </div>
      </div>

      {/* ── 5 cartes compteurs ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard icon={BookOpen}    iconColor="text-green-800" bgColor="bg-green-50"  label="À l'unité"      value={stats.unit}    />
        <StatCard icon={Calendar}    iconColor="text-blue-700"  bgColor="bg-blue-50"   label="Abonnement"     value={stats.annual}  />
        <StatCard icon={Users}       iconColor="text-violet-700" bgColor="bg-violet-50" label="Groupes"       value={stats.group}   />
        <StatCard icon={Clock}       iconColor="text-amber-700" bgColor="bg-amber-50"  label="En attente"     value={stats.pending} />
        <StatCard icon={ShieldAlert} iconColor="text-red-500"   bgColor="bg-red-50"    label="Bloqués"        value={stats.blocked} />
      </div>

      {/* ── Recherche ── */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un membre..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 shadow-sm transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Liste membres ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({length:4}).map((_,i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                <div className="h-3 bg-slate-100 rounded-full w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <User className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-slate-400 text-sm font-light">Aucun membre trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(member => {
            const isEditing  = editingId === member.id
            const isExpanded = expandedId === member.id
            const mStats     = memberStats[member.id]
            const isPending  = member.profile_status === 'en_attente'
            const isBlocked  = member.is_blocked
            const isGroup    = member.account_type === 'group'

            return (
              <div key={member.id}
                className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 ${isBlocked ? 'border-red-100' : 'border-slate-100/50'}`}>

                {/* ── Ligne principale ── */}
                <div className="p-4 flex items-center gap-4">

                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 text-sm ${isGroup ? 'bg-violet-700' : 'bg-green-800'}`}>
                    {isGroup ? <Users className="w-5 h-5" strokeWidth={1.5} /> : initials(member.full_name)}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{member.full_name}</p>
                      {isBlocked && (
                        <span className="bg-red-50 text-red-500 text-xs font-medium px-2 py-0.5 rounded-full">Bloqué</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {member.phone && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-light">
                          <Phone className="w-3 h-3" strokeWidth={1.5} />{member.phone}
                        </span>
                      )}
                      <StatusBadge status={member.profile_status} membershipType={member.membership_type} />
                    </div>
                  </div>

                  {/* Actions droite */}
                  <div className="flex items-center gap-1 flex-shrink-0">

                    {/* Activer si en attente */}
                    {isPending && (
                      <button onClick={() => handleActivate(member)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-xl text-xs font-semibold hover:bg-green-800 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Activer
                      </button>
                    )}

                    {/* Stats */}
                    <button onClick={() => handleToggleExpand(member.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <BarChart2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>

                    {/* Modifier */}
                    <button onClick={() => isEditing ? setEditingId(null) : handleEditOpen(member)}
                      className="p-2 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all">
                      <Pencil className="w-4 h-4" strokeWidth={1.5} />
                    </button>

                    {/* Toggle bloc — interrupteur */}
                    <button onClick={() => handleToggleBlock(member)}
                      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isBlocked ? 'bg-red-400' : 'bg-green-500'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${isBlocked ? 'left-1' : 'left-5'}`} />
                    </button>

                    {/* Expand chevron */}
                    <button onClick={() => handleToggleExpand(member.id)}
                      className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ── Formulaire d'édition ── */}
                {isEditing && (
                  <div className="px-4 pb-4 border-t border-slate-50 pt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Nom complet</label>
                        <input type="text" value={editForm.full_name}
                          onChange={e => setEditForm(p => ({...p, full_name: e.target.value}))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
                        <input type="text" value={editForm.phone}
                          onChange={e => setEditForm(p => ({...p, phone: e.target.value}))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-xs text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        Annuler
                      </button>
                      <button onClick={() => handleEditSave(member.id)} disabled={savingEdit}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {savingEdit ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Statistiques membres ── */}
                {isExpanded && !isEditing && (
                  <div className="px-4 pb-4 border-t border-slate-50 pt-4">
                    {!mStats ? (
                      <p className="text-xs text-slate-400 font-light">Chargement des statistiques...</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-slate-900">{mStats.active}</p>
                          <p className="text-xs text-slate-400 mt-0.5">En cours</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-slate-900">{mStats.total}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Total emprunts</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-xs font-semibold text-slate-700 line-clamp-2 leading-tight">{mStats.fav}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Catégorie fav.</p>
                        </div>
                      </div>
                    )}
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
