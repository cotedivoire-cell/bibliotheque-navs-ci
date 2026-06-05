import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

function MembersPage() {
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'member')
      .order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  // Basculer le type d'adhésion
  const toggleMembership = async (member) => {
    setUpdating(member.id)
    const newType = member.membership_type === 'annual' ? 'unit' : 'annual'
    await supabase
      .from('profiles')
      .update({ membership_type: newType })
      .eq('id', member.id)
    await loadMembers()
    setUpdating(null)
  }

  const unitCount   = members.filter(m => m.membership_type === 'unit').length
  const annualCount = members.filter(m => m.membership_type === 'annual').length

  return (
    <AdminLayout>

      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
        <p className="text-slate-400 text-sm mt-1">
          {members.length} membre(s) inscrit(s)
        </p>
      </div>

      {/* Statistiques */}
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

      {/* Liste des membres */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="font-medium">Aucun membre inscrit pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(member => {
            const isAnnual  = member.membership_type === 'annual'
            const isUpdating = updating === member.id

            return (
              <div key={member.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm
                           p-4 flex items-center gap-4">

                {/* Initiales */}
                <div className="w-11 h-11 bg-green-700 rounded-xl flex items-center
                                justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">
                    {member.full_name?.split(' ').slice(0, 2)
                      .map(w => w[0]).join('').toUpperCase() || '?'}
                  </span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {member.full_name}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">{member.phone}</p>
                  <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5
                                    rounded-full ${
                    isAnnual
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isAnnual ? 'Abonnement annuel' : "À l'unité"}
                  </span>
                </div>

                {/* Toggle adhésion */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-slate-400 mb-1.5">Changer adhésion</p>
                  <button
                    onClick={() => toggleMembership(member)}
                    disabled={isUpdating}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200
                                focus:outline-none disabled:opacity-50 ${
                      isAnnual ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full
                                      shadow-sm transition-transform duration-200 ${
                      isAnnual ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}

export default MembersPage
