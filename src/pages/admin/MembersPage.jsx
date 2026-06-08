import { useEffect, useState } from 'react'
import {
  User, Users, Clock, ShieldAlert, Calendar,
  Pencil, BarChart2, CheckCircle, X, Search,
  Phone, BookOpen, ChevronDown, ChevronUp
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

const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

function StatusBadge({ status, membershipType }) {
  if (status === 'en_attente')
    return <span className="bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full">En attente</span>
  if (status === 'actif_annuel' || membershipType === 'annual')
    return <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Abonnement annuel</span>
  return <span className="bg-green-50 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">À l'unité</span>
}

/* ── Panneau action actif : 'edit' | 'stats' | null ── */
function MemberCard({ member, onRefresh }) {
  const [panel,      setPanel]      = useState(null) // null | 'edit' | 'stats'
  const [editForm,   setEditForm]   = useState({ full_name: member.full_name || '', phone: member.phone || '' })
  const [saving,     setSaving]     = useState(false)
  const [mStats,     setMStats]     = useState(null)
  const [loadingSt,  setLoadingSt]  = useState(false)

  const isGroup   = member.account_type === 'group'
  const isBlocked = member.is_blocked
  const isPending = member.profile_status === 'en_attente'

  const openPanel = async (name) => {
    if (panel === name) { setPanel(null); return }
    setPanel(name)
    if (name === 'stats' && !mStats) {
      setLoadingSt(true)
      const [activeRes, totalRes, favRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact' }).eq('member_id', member.id).in('status', ['en_cours', 'en_retard']),
        supabase.from('borrowings').select('id', { count: 'exact' }).eq('member_id', member.id),
        supabase.from('borrowings').select('books(categories(name))').eq('member_id', member.id).eq('status', 'retourné').limit(50),
      ])
      const cats = {}
      favRes.data?.forEach(b => { const n = b.books?.categories?.name; if (n) cats[n] = (cats[n] || 0) + 1 })
      const fav = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
      setMStats({ active: activeRes.count || 0, total: totalRes.count || 0, fav })
      setLoadingSt(false)
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() }).eq('id', member.id)
    setSaving(false)
    setPanel(null)
    onRefresh()
  }

  const handleActivate = async () => {
    const newStatus = member.membership_type === 'annual' ? 'actif_annuel' : 'actif_unite'
    await supabase.from('profiles').update({ profile_status: newStatus }).eq('id', member.id)
    onRefresh()
  }

  const handleToggleBlock = async () => {
    await supabase.from('profiles').update({ is_blocked: !isBlocked }).eq('id', member.id)
    onRefresh()
  }

  const handleToggleGroup = async () => {
    const newType = isGroup ? 'individual' : 'group'
    await supabase.from('profiles').update({ account_type: newType, max_borrowings: newType === 'group' ? 10 : 3 }).eq('id', member.id)
    onRefresh()
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all ${isBlocked ? 'border-red-100' : 'border-slate-100/50'}`}>

      {/* ── Ligne principale ── */}
      <div className="p-4 flex items-center gap-3">

        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 text-sm shadow-sm ${isGroup ? 'bg-violet-700' : 'bg-green-800'}`}>
          {isGroup ? <Users className="w-4 h-4" strokeWidth={1.5} /> : initials(member.full_name)}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm leading-tight">{member.full_name}</p>
            {isBlocked && <span className="bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded-full font-medium">Bloqué</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {member.phone && (
              <span className="text-xs text-slate-400 flex items-center gap-1 font-light">
                <Phone className="w-3 h-3" strokeWidth={1.5} />{member.phone}
              </span>
            )}
            <StatusBadge status={member.profile_status} membershipType={member.membership_type} />
          </div>
        </div>

        {/* Chevron expand/collapse */}
        <button onClick={() => openPanel(panel === 'edit' || panel === 'stats' ? null : 'stats')}
          className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors flex-shrink-0">
          {panel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Barre d'actions — toujours visible sous la ligne ── */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap border-t border-slate-50 pt-2.5">

        {/* Activer */}
        {isPending && (
          <button onClick={handleActivate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-xl text-xs font-semibold hover:bg-green-800 transition-colors shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />Activer
          </button>
        )}

        {/* Modifier */}
        <button onClick={() => openPanel('edit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${panel === 'edit' ? 'bg-green-100 text-green-800' : 'text-slate-500 hover:text-green-700 hover:bg-green-50'}`}>
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />Modifier
        </button>

        {/* Statistiques */}
        <button onClick={() => openPanel('stats')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${panel === 'stats' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}>
          <BarChart2 className="w-3.5 h-3.5" strokeWidth={1.5} />Statistiques
        </button>

        {/* Toggle groupe */}
        <button onClick={handleToggleGroup}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isGroup ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'text-slate-400 hover:text-violet-700 hover:bg-violet-50'}`}>
          <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
          {isGroup ? 'Groupe actif' : 'Passer en groupe'}
        </button>

        {/* Bloquer / Débloquer */}
        <button onClick={handleToggleBlock}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ml-auto ${isBlocked ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}>
          <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.5} />
          {isBlocked ? 'Débloquer' : 'Bloquer'}
        </button>
      </div>

      {/* ── Panneau Modifier ── */}
      {panel === 'edit' && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nom complet</label>
              <input type="text" value={editForm.full_name}
                onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Téléphone</label>
              <input type="text" value={editForm.phone}
                onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 focus:bg-white transition-all" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setPanel(null)}
              className="px-4 py-2 text-xs text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleSaveEdit} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors font-semibold">
              <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Panneau Statistiques ── */}
      {panel === 'stats' && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
          {loadingSt ? (
            <div className="grid grid-cols-3 gap-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
            </div>
          ) : mStats ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{mStats.active}</p>
                <p className="text-xs text-slate-400 mt-0.5">En cours</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{mStats.total}</p>
                <p className="text-xs text-slate-400 mt-0.5">Total emprunts</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-slate-700 line-clamp-2 leading-tight">{mStats.fav}</p>
                <p className="text-xs text-slate-400 mt-1">Catégorie fav.</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/* ── Page principale ── */
function MembersPage() {
  const [members, setMembers] = useState([])
  const [stats,   setStats]   = useState({ total:0, unit:0, annual:0, group:0, pending:0, blocked:0 })
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const loadMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role','member').order('created_at', { ascending:false })
    const m = data || []
    setMembers(m)
    setStats({
      total:   m.length,
      unit:    m.filter(x => (x.profile_status === 'actif_unite' || x.profile_status === 'actif') && x.membership_type === 'unit').length,
      annual:  m.filter(x => x.profile_status === 'actif_annuel' || x.membership_type === 'annual').length,
      group:   m.filter(x => x.account_type === 'group').length,
      pending: m.filter(x => x.profile_status === 'en_attente').length,
      blocked: m.filter(x => x.is_blocked).length,
    })
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.phone?.includes(search)
  )

  return (
    <AdminLayout>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Membres</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            {loading ? '...' : `${stats.total} membre${stats.total > 1 ? 's' : ''} inscrits`}
          </p>
        </div>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard icon={BookOpen}    iconColor="text-green-800"  bgColor="bg-green-50"  label="À l'unité"   value={stats.unit}    />
        <StatCard icon={Calendar}    iconColor="text-blue-700"   bgColor="bg-blue-50"   label="Abonnement"  value={stats.annual}  />
        <StatCard icon={Users}       iconColor="text-violet-700" bgColor="bg-violet-50" label="Groupes"     value={stats.group}   />
        <StatCard icon={Clock}       iconColor="text-amber-700"  bgColor="bg-amber-50"  label="En attente"  value={stats.pending} />
        <StatCard icon={ShieldAlert} iconColor="text-red-500"    bgColor="bg-red-50"    label="Bloqués"     value={stats.blocked} />
      </div>

      {/* Recherche */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" strokeWidth={1.5} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un membre..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 shadow-sm transition-all" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse flex gap-3 items-center">
              <div className="w-11 h-11 rounded-full bg-slate-100 flex-shrink-0" />
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
          {filtered.map(member => (
            <MemberCard key={member.id} member={member} onRefresh={loadMembers} />
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

export default MembersPage
