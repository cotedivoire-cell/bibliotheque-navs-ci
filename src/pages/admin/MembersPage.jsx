import { useEffect, useState } from 'react'
import { Pencil, X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

function MembersPage() {
  const [members,       setMembers]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [updating,      setUpdating]      = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [editForm,      setEditForm]      = useState({ full_name: '', phone: '' })
  const [savingEdit,    setSavingEdit]    = useState(false)

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles').select('*').eq('role', 'member').order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  // ── Basculer adhésion ──
  const toggleMembership = async (member) => {
    setUpdating(member.id)
    const newType = member.membership_type === 'annual' ? 'unit' : 'annual'
    await supabase.from('profiles').update({ membership_type: newType }).eq('id', member.id)
    await loadMembers()
    setUpdating(null)
  }

  // ── Ouvrir formulaire d'édition ──
  const handleEdit = (member) => {
    setEditingMember(member.id)
    setEditForm({ full_name: member.full_name, phone: member.phone || '' })
  }

  // ── Sauvegarder les modifications ──
  const handleSaveEdit = async (memberId) => {
    if (!editForm.full_name.trim()) return
    setSavingEdit(true)
    await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() })
      .eq('id', memberId)
    await loadMembers()
    setEditingMember(null)
    setSavingEdit(false)
  }

  const unitCount   = members.filter(m => m.membership_type === 'unit').length
  const annualCount = members.filter(m => m.membership_type === 'annual').length

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
        <p className="text-slate-400 text-sm mt-1">{members.length} membre(s) inscrit(s)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-400 mb-1">À l'unité</p>
          <p className="text-3xl font-bold text-slate-800">{unitCount}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-5">
          <p className="text-sm text-amber-600 mb-1">Abonnement annuel</p>
          <p className="text-3xl font-bold text-amber-700">{annualCount}</p>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="font-medium">Aucun membre inscrit pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(member => {
            const isAnnual   = member.membership_type === 'annual'
            const isUpdating = updating === member.id
            const isEditing  = editingMember === member.id

            return (
              <div key={member.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">

                {isEditing ? (
                  /* ── Mode édition ── */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nom complet</label>
                      <input type="text" value={editForm.full_name}
                        onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                        className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
                      <input type="text" value={editForm.phone}
                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+225 ..."
                        className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingMember(null)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <X className="w-3 h-3" /> Annuler
                      </button>
                      <button onClick={() => handleSaveEdit(member.id)} disabled={savingEdit}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50">
                        <Check className="w-3 h-3" />
                        {savingEdit ? '...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Mode affichage ── */
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {member.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{member.full_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{member.phone || '—'}</p>
                      <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isAnnual ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isAnnual ? 'Abonnement annuel' : "À l'unité"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => handleEdit(member)}
                        className="text-slate-400 hover:text-green-700 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleMembership(member)}
                        disabled={isUpdating}
                        title={isAnnual ? "Passer à l'unité" : "Passer en abonnement"}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                          isAnnual ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          isAnnual ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
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
