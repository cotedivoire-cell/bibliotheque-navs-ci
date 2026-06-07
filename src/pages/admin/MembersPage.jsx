import { useEffect, useState } from 'react'
import { Pencil, X, Check, Users, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

function MembersPage() {
  const [members,       setMembers]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [updating,      setUpdating]      = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [editForm,      setEditForm]      = useState({ full_name: '', phone: '' })
  const [savingEdit,    setSavingEdit]    = useState(false)
  const [subForm,       setSubForm]       = useState(null)
  const [subData,       setSubData]       = useState({ amount_paid: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().split('T')[0] })
  const [savingSub,     setSavingSub]     = useState(false)
  const [subError,      setSubError]      = useState('')
  // ── États groupe ──
  const [editingGroup,  setEditingGroup]  = useState(null)
  const [groupQuota,    setGroupQuota]    = useState(5)
  const [savingGroup,   setSavingGroup]   = useState(false)

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles').select('*, subscriptions(id, start_date, end_date, status, amount_paid)')
      .eq('role', 'member').order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  const handleEdit = (member) => {
    setEditingMember(member.id)
    setEditForm({ full_name: member.full_name, phone: member.phone || '' })
  }

  const handleSaveEdit = async (memberId) => {
    if (!editForm.full_name.trim()) return
    setSavingEdit(true)
    await supabase.from('profiles').update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() }).eq('id', memberId)
    await loadMembers()
    setEditingMember(null)
    setSavingEdit(false)
  }

  // ── Toggle adhésion ──
  const handleToggleMembership = (member) => {
    if (member.membership_type === 'unit') {
      setSubForm(member.id)
      setSubData({ amount_paid: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().split('T')[0] })
      setSubError('')
    } else {
      if (window.confirm(`Repasser ${member.full_name} en "À l'unité" ?`)) {
        supabase.from('profiles').update({ membership_type: 'unit' }).eq('id', member.id).then(() => loadMembers())
      }
    }
  }

  const handleCreateSub = async (member) => {
    if (!subData.amount_paid || parseInt(subData.amount_paid) < 0) { setSubError('Montant requis.'); return }
    setSavingSub(true)
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('member_id', member.id).eq('status', 'active')
    await supabase.from('subscriptions').insert([{ member_id: member.id, start_date: subData.start_date, end_date: subData.end_date, amount_paid: parseInt(subData.amount_paid), status: 'active' }])
    await supabase.from('profiles').update({ membership_type: 'annual' }).eq('id', member.id)
    setSubForm(null)
    setSavingSub(false)
    loadMembers()
  }

  // ── Toggle compte groupe ──
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

  const handleSaveGroup = async (memberId) => {
    setSavingGroup(true)
    await supabase.from('profiles').update({ account_type: 'group', max_borrowings: parseInt(groupQuota) || 5 }).eq('id', memberId)
    setEditingGroup(null)
    setSavingGroup(false)
    loadMembers()
  }

  const unitCount   = members.filter(m => m.membership_type === 'unit').length
  const annualCount = members.filter(m => m.membership_type === 'annual').length
  const groupCount  = members.filter(m => m.account_type === 'group').length

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
        <p className="text-slate-400 text-sm mt-1">{members.length} membre(s) inscrit(s)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-400 mb-1">À l'unité</p>
          <p className="text-3xl font-bold text-slate-800">{unitCount}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-5">
          <p className="text-sm text-amber-600 mb-1">Abonnement annuel</p>
          <p className="text-3xl font-bold text-amber-700">{annualCount}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-5">
          <p className="text-sm text-blue-600 mb-1">Comptes groupe</p>
          <p className="text-3xl font-bold text-blue-700">{groupCount}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-slate-400"><p className="font-medium">Aucun membre inscrit</p></div>
      ) : (
        <div className="space-y-3">
          {members.map(member => {
            const isAnnual    = member.membership_type === 'annual'
            const isGroup     = member.account_type === 'group'
            const isEditing   = editingMember === member.id
            const isSubForm   = subForm === member.id
            const isGroupEdit = editingGroup === member.id
            const activeSub   = member.subscriptions?.find(s => s.status === 'active')

            return (
              <div key={member.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">

                {isEditing ? (
                  <div className="space-y-3">
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Nom complet</label><input type="text" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label><input type="text" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingMember(null)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"><X className="w-3 h-3" /> Annuler</button>
                      <button onClick={() => handleSaveEdit(member.id)} disabled={savingEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"><Check className="w-3 h-3" />{savingEdit ? '...' : 'Enregistrer'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isGroup ? 'bg-blue-600' : 'bg-green-700'}`}>
                      {isGroup
                        ? <Users className="w-5 h-5 text-white" />
                        : <span className="text-white text-sm font-bold">{member.full_name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}</span>
                      }
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{member.full_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{member.phone || '—'}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isAnnual ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {isAnnual ? 'Abonnement' : "À l'unité"}
                        </span>
                        {isGroup && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Groupe — {member.max_borrowings} livres max
                          </span>
                        )}
                        {activeSub && <span className="text-xs text-slate-400">→ {new Date(activeSub.end_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleEdit(member)} className="text-slate-400 hover:text-green-700 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Toggle groupe */}
                      <button onClick={() => handleToggleGroup(member)}
                        title={isGroup ? "Repasser en individuel" : "Activer le compte groupe"}
                        className={`p-1.5 rounded-lg transition-colors ${isGroup ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                        <Users className="w-4 h-4" />
                      </button>
                      {/* Toggle adhésion */}
                      <button onClick={() => handleToggleMembership(member)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isAnnual ? 'bg-amber-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isAnnual ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulaire quota groupe */}
                {isGroupEdit && (
                  <div className="mt-4 pt-4 border-t border-blue-100 space-y-3">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Users className="w-3.5 h-3.5" />Activer le compte groupe</p>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Quota maximum de livres simultanés</label>
                      <div className="flex gap-2">
                        {[3, 5, 10].map(q => (
                          <button key={q} type="button" onClick={() => setGroupQuota(q)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${groupQuota === q ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                            {q} livres
                          </button>
                        ))}
                        <input type="number" min="2" max="20" value={groupQuota}
                          onChange={e => setGroupQuota(parseInt(e.target.value) || 5)}
                          className="w-20 border border-slate-200 px-3 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingGroup(null)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                      <button onClick={() => handleSaveGroup(member.id)} disabled={savingGroup}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold">
                        <Users className="w-3 h-3" />{savingGroup ? '...' : 'Activer le compte groupe'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulaire abonnement */}
                {isSubForm && (
                  <div className="mt-4 pt-4 border-t border-amber-100 space-y-3">
                    <p className="text-xs font-semibold text-amber-700">Nouvel abonnement annuel</p>
                    {subError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{subError}</p>}
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="block text-xs text-slate-500 mb-1">Montant (FCFA) *</label><input type="number" min="0" value={subData.amount_paid} onChange={e => setSubData(p => ({ ...p, amount_paid: e.target.value }))} placeholder="ex: 5000" className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                      <div><label className="block text-xs text-slate-500 mb-1">Début</label><input type="date" value={subData.start_date} onChange={e => setSubData(p => ({ ...p, start_date: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                      <div><label className="block text-xs text-slate-500 mb-1">Fin</label><input type="date" value={subData.end_date} min={subData.start_date} onChange={e => setSubData(p => ({ ...p, end_date: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setSubForm(null)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
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
