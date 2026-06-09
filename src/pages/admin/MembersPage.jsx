import { useEffect, useState } from 'react'
import {
  BookOpen, Users, Clock, ShieldAlert, Calendar,
  Pencil, X, Search, Phone, CheckCircle,
  BarChart2, User, LogOut
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

/* ════════════════════════════════════════════════
   UTILITAIRES
════════════════════════════════════════════════ */
const getInitials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

/* ════════════════════════════════════════════════
   COMPOSANT : CARTE COMPTEUR CLIQUABLE
════════════════════════════════════════════════ */
function StatCard({ icon: Icon, iconColor, bgColor, label, value, filterKey, activeFilter, onFilter }) {
  const isActive = activeFilter === filterKey
  return (
    <button
      onClick={() => onFilter(isActive ? 'all' : filterKey)}
      className={`bg-white rounded-2xl p-5 flex flex-col gap-3 text-left w-full transition-all shadow-sm ${
        isActive
          ? 'border-2 border-green-800 shadow-green-100'
          : 'border-2 border-transparent hover:border-slate-200'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.8} />
      </div>
      <div>
        <p className={`text-3xl font-bold leading-none ${isActive ? 'text-green-800' : 'text-slate-900'}`}>
          {value ?? '—'}
        </p>
        <p className={`text-xs font-medium mt-1.5 ${isActive ? 'text-green-700' : 'text-slate-400'}`}>
          {label}
        </p>
      </div>
    </button>
  )
}

/* ════════════════════════════════════════════════
   COMPOSANT : BADGE STATUT
════════════════════════════════════════════════ */
function StatusBadge({ status, membershipType }) {
  if (status === 'en_attente')
    return <span className="bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full">En attente</span>
  if (status === 'actif_annuel' || membershipType === 'annual')
    return <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Abonnement annuel</span>
  if (status === 'actif_unite' || membershipType === 'unit')
    return <span className="bg-green-50 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">À l'unité</span>
  return <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2.5 py-0.5 rounded-full">{status || '—'}</span>
}

/* ════════════════════════════════════════════════
   COMPOSANT : LIGNE MEMBRE
════════════════════════════════════════════════ */
function MemberRow({ member, onOpenDrawer, onUpdate }) {
  const isGroup   = member.account_type === 'group'
  const isBlocked = member.is_blocked
  const isPending = member.profile_status === 'en_attente'

  /* Toggle groupe — INDÉPENDANT du drawer */
  const handleToggleGroup = async (e) => {
    e.stopPropagation()
    const newType = isGroup ? 'individual' : 'group'
    const newMax  = newType === 'group' ? 10 : 3
    await supabase.from('profiles')
      .update({ account_type: newType, max_borrowings: newMax })
      .eq('id', member.id)
    onUpdate(member.id, { account_type: newType, max_borrowings: newMax })
  }

  /* Toggle bloc — INDÉPENDANT du drawer */
  const handleToggleBlock = async (e) => {
    e.stopPropagation()
    await supabase.from('profiles')
      .update({ is_blocked: !isBlocked })
      .eq('id', member.id)
    onUpdate(member.id, { is_blocked: !isBlocked })
  }

  /* Activer le compte — INDÉPENDANT du drawer */
  const handleActivate = async (e) => {
    e.stopPropagation()
    const newStatus = member.membership_type === 'annual' ? 'actif_annuel' : 'actif_unite'
    await supabase.from('profiles')
      .update({ profile_status: newStatus })
      .eq('id', member.id)
    onUpdate(member.id, { profile_status: newStatus })
  }

  return (
    <div
      onClick={() => onOpenDrawer(member)}
      className={`bg-white rounded-2xl shadow-sm border cursor-pointer hover:shadow-md transition-all duration-200 ${
        isBlocked ? 'border-red-100' : 'border-slate-100/60'
      }`}
    >
      <div className="p-4 flex items-center gap-3">

        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 text-sm shadow-sm ${
          isGroup ? 'bg-violet-700' : 'bg-green-800'
        }`}>
          {isGroup
            ? <Users className="w-4 h-4" strokeWidth={1.5} />
            : getInitials(member.full_name)
          }
        </div>

        {/* Infos membre */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm leading-tight">{member.full_name}</p>
            {isBlocked && (
              <span className="bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded-full font-medium">Bloqué</span>
            )}
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

        {/* Actions rapides — stopPropagation sur tous */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>

          {/* Activer si en attente */}
          {isPending && (
            <button
              onClick={handleActivate}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-700 text-white rounded-xl text-xs font-semibold hover:bg-green-800 transition-colors shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              Activer
            </button>
          )}

          {/* Toggle groupe */}
          <button
            onClick={handleToggleGroup}
            title={isGroup ? 'Repasser en individuel' : 'Passer en groupe'}
            className={`p-1.5 rounded-xl transition-all ${
              isGroup
                ? 'text-violet-600 bg-violet-50 hover:bg-violet-100'
                : 'text-slate-300 hover:text-violet-600 hover:bg-violet-50'
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {/* Toggle bloc (interrupteur) */}
          <button
            onClick={handleToggleBlock}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
              isBlocked ? 'bg-red-400' : 'bg-green-500'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
              isBlocked ? 'left-1' : 'left-5'
            }`} />
          </button>

          {/* Crayon — ouvre le drawer */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDrawer(member) }}
            className="p-1.5 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all"
          >
            <Pencil className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   COMPOSANT : DRAWER LATÉRAL
════════════════════════════════════════════════ */
function MemberDrawer({ member, isOpen, onClose, onUpdate }) {
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', max_borrowings: 3 })
  const [saving,   setSaving]   = useState(false)
  const [mStats,   setMStats]   = useState(null)
  const [loadingSt,setLoadingSt]= useState(false)
  const [activeTab,setActiveTab]= useState('details') // 'details' | 'stats'

  /* Réinitialise le formulaire quand le membre change */
  useEffect(() => {
    if (member) {
      setEditForm({
        full_name:      member.full_name      || '',
        phone:          member.phone          || '',
        max_borrowings: member.max_borrowings || 3,
      })
      setMStats(null)
      setActiveTab('details')
    }
  }, [member?.id])

  const loadStats = async () => {
    if (!member || mStats) return
    setLoadingSt(true)
    const [activeRes, totalRes, favRes, lateRes] = await Promise.all([
      supabase.from('borrowings').select('id', { count: 'exact' }).eq('member_id', member.id).in('status', ['en_cours', 'en_retard']),
      supabase.from('borrowings').select('id', { count: 'exact' }).eq('member_id', member.id),
      supabase.from('borrowings').select('books(categories(name))').eq('member_id', member.id).eq('status', 'retourné').limit(50),
      supabase.from('borrowings').select('id', { count: 'exact' }).eq('member_id', member.id).eq('status', 'en_retard'),
    ])
    const cats = {}
    favRes.data?.forEach(b => {
      const n = b.books?.categories?.name
      if (n) cats[n] = (cats[n] || 0) + 1
    })
    const fav = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const onTime = (totalRes.count || 0) - (lateRes.count || 0)
    const punctuality = totalRes.count > 0 ? Math.round((onTime / totalRes.count) * 100) : 100
    setMStats({
      active: activeRes.count || 0,
      total:  totalRes.count  || 0,
      late:   lateRes.count   || 0,
      fav,
      punctuality,
    })
    setLoadingSt(false)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'stats') loadStats()
  }

  const handleSave = async () => {
    if (!editForm.full_name.trim()) return
    setSaving(true)
    const changes = {
      full_name:      editForm.full_name.trim(),
      phone:          editForm.phone.trim(),
      max_borrowings: parseInt(editForm.max_borrowings) || 3,
    }
    await supabase.from('profiles').update(changes).eq('id', member.id)
    onUpdate(member.id, changes)
    setSaving(false)
    onClose()
  }

  if (!member) return null

  const isGroup   = member.account_type === 'group'
  const isBlocked = member.is_blocked

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panneau latéral */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* ── En-tête drawer ── */}
        <div className="flex items-center gap-4 p-5 border-b border-slate-100">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${isGroup ? 'bg-violet-700' : 'bg-green-800'}`}>
            {isGroup ? <Users className="w-5 h-5" strokeWidth={1.5} /> : getInitials(member.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-base leading-tight truncate">{member.full_name}</p>
            <StatusBadge status={member.profile_status} membershipType={member.membership_type} />
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-1 p-3 border-b border-slate-100">
          <button
            onClick={() => handleTabChange('details')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'details' ? 'bg-green-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />Fiche membre
          </button>
          <button
            onClick={() => handleTabChange('stats')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <BarChart2 className="w-3.5 h-3.5" strokeWidth={1.5} />Statistiques
          </button>
        </div>

        {/* ── Contenu scrollable ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {activeTab === 'details' && (
            <>
              {/* Champs éditables */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Nom complet</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Téléphone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+225 XX XX XX XX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Emprunts maximum autorisés</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editForm.max_borrowings}
                    onChange={e => setEditForm(p => ({ ...p, max_borrowings: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Infos en lecture seule */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Informations du compte</p>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Formule</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {member.membership_type === 'annual' ? 'Abonnement annuel' : "À l'unité"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Type de compte</span>
                  <span className={`text-xs font-semibold ${isGroup ? 'text-violet-700' : 'text-slate-800'}`}>
                    {isGroup ? 'Groupe / Cellule' : 'Individuel'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Statut</span>
                  <StatusBadge status={member.profile_status} membershipType={member.membership_type} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Compte bloqué</span>
                  <span className={`text-xs font-semibold ${isBlocked ? 'text-red-500' : 'text-green-700'}`}>
                    {isBlocked ? 'Oui' : 'Non'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Inscrit le</span>
                  <span className="text-xs font-semibold text-slate-800">{formatDate(member.created_at)}</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'stats' && (
            loadingSt ? (
              <div className="space-y-3 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl" />)}
              </div>
            ) : mStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-800">{mStats.active}</p>
                    <p className="text-xs text-green-600 mt-1 font-medium">Emprunts en cours</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-slate-900">{mStats.total}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Total emprunts</p>
                  </div>
                  <div className={`rounded-2xl p-4 text-center ${mStats.late > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className={`text-3xl font-bold ${mStats.late > 0 ? 'text-red-600' : 'text-slate-400'}`}>{mStats.late}</p>
                    <p className={`text-xs mt-1 font-medium ${mStats.late > 0 ? 'text-red-500' : 'text-slate-400'}`}>Retards</p>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700">{mStats.punctuality}%</p>
                    <p className="text-xs text-blue-500 mt-1 font-medium">Ponctualité</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-medium mb-1">Catégorie favorite</p>
                  <p className="font-semibold text-slate-900">{mStats.fav}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">Chargement des statistiques...</p>
            )
          )}
        </div>

        {/* ── Pied de page drawer ── */}
        {activeTab === 'details' && (
          <div className="p-5 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editForm.full_name.trim()}
              className="flex-1 py-3 text-sm font-semibold text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/* ════════════════════════════════════════════════
   PAGE PRINCIPALE : MembersPage
════════════════════════════════════════════════ */
function MembersPage() {
  const [members,       setMembers]       = useState([])
  const [stats,         setStats]         = useState({ total:0, unit:0, annual:0, group:0, pending:0, blocked:0 })
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [activeFilter,  setActiveFilter]  = useState('all')
  const [selectedMember,setSelectedMember]= useState(null)
  const [isDrawerOpen,  setIsDrawerOpen]  = useState(false)

  /* ── Chargement initial ── */
  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'member')
      .order('created_at', { ascending: false })
    const m = data || []
    setMembers(m)
    computeStats(m)
    setLoading(false)
  }

  const computeStats = (m) => {
    setStats({
      total:   m.length,
      unit:    m.filter(x => (x.profile_status === 'actif_unite' || (x.profile_status === 'actif' && x.membership_type === 'unit'))).length,
      annual:  m.filter(x => x.profile_status === 'actif_annuel' || x.membership_type === 'annual').length,
      group:   m.filter(x => x.account_type === 'group').length,
      pending: m.filter(x => x.profile_status === 'en_attente').length,
      blocked: m.filter(x => x.is_blocked).length,
    })
  }

  useEffect(() => { loadMembers() }, [])

  /* ── Mise à jour locale sans rechargement ── */
  const handleUpdate = (memberId, changes) => {
    setMembers(prev => {
      const updated = prev.map(m => m.id === memberId ? { ...m, ...changes } : m)
      computeStats(updated)
      // Mettre à jour selectedMember si c'est lui
      setSelectedMember(sel => sel?.id === memberId ? { ...sel, ...changes } : sel)
      return updated
    })
  }

  /* ── Ouvrir le drawer ── */
  const handleOpenDrawer = (member) => {
    setSelectedMember(member)
    setIsDrawerOpen(true)
  }

  /* ── Filtrage combiné ── */
  const filtered = members.filter(m => {
    const matchSearch = !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search)
    const matchFilter =
      activeFilter === 'all'     ? true :
      activeFilter === 'unit'    ? (m.profile_status === 'actif_unite' || (m.profile_status === 'actif' && m.membership_type === 'unit')) :
      activeFilter === 'annual'  ? (m.profile_status === 'actif_annuel' || m.membership_type === 'annual') :
      activeFilter === 'group'   ? m.account_type === 'group' :
      activeFilter === 'pending' ? m.profile_status === 'en_attente' :
      activeFilter === 'blocked' ? m.is_blocked :
      true
    return matchSearch && matchFilter
  })

  return (
    <AdminLayout>

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Membres</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            {loading ? 'Chargement...' : `${stats.total} membre${stats.total > 1 ? 's' : ''} inscrits`}
          </p>
        </div>
      </div>

      {/* ── 5 Compteurs cliquables ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard icon={BookOpen}    iconColor="text-green-800"  bgColor="bg-green-50"  label="À l'unité"  value={stats.unit}    filterKey="unit"    activeFilter={activeFilter} onFilter={setActiveFilter} />
        <StatCard icon={Calendar}    iconColor="text-blue-700"   bgColor="bg-blue-50"   label="Abonnement" value={stats.annual}  filterKey="annual"  activeFilter={activeFilter} onFilter={setActiveFilter} />
        <StatCard icon={Users}       iconColor="text-violet-700" bgColor="bg-violet-50" label="Groupes"    value={stats.group}   filterKey="group"   activeFilter={activeFilter} onFilter={setActiveFilter} />
        <StatCard icon={Clock}       iconColor="text-amber-700"  bgColor="bg-amber-50"  label="En attente" value={stats.pending} filterKey="pending" activeFilter={activeFilter} onFilter={setActiveFilter} />
        <StatCard icon={ShieldAlert} iconColor="text-red-500"    bgColor="bg-red-50"    label="Bloqués"    value={stats.blocked} filterKey="blocked" activeFilter={activeFilter} onFilter={setActiveFilter} />
      </div>

      {/* ── Barre de recherche ── */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); if (e.target.value) setActiveFilter('all') }}
          placeholder="Rechercher par nom ou téléphone..."
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 shadow-sm transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Indication filtre actif */}
      {activeFilter !== 'all' && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">
            Affichage filtré ·{' '}
            <span className="font-semibold text-green-700">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </span>
          </span>
          <button onClick={() => setActiveFilter('all')} className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" />Tout afficher
          </button>
        </div>
      )}

      {/* ── Liste des membres ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse flex gap-3 items-center">
              <div className="w-11 h-11 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                <div className="h-3 bg-slate-100 rounded-full w-1/4" />
              </div>
              <div className="w-20 h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <User className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-slate-400 text-sm font-light">Aucun membre trouvé</p>
          {(search || activeFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setActiveFilter('all') }} className="mt-3 text-green-700 text-xs hover:underline">
              Réinitialiser la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => (
            <MemberRow
              key={member.id}
              member={member}
              onOpenDrawer={handleOpenDrawer}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {/* ── Drawer latéral ── */}
      <MemberDrawer
        member={selectedMember}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={handleUpdate}
      />
    </AdminLayout>
  )
}

export default MembersPage
