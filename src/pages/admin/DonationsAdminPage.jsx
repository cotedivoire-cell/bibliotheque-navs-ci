import { useEffect, useState } from 'react'
import { Heart, BookOpen, Clock, CheckCircle, Package, TrendingUp, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const STATUS_CONFIG = {
  en_attente: { label: 'En attente',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  recu:       { label: 'Reçu',        bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  traite:     { label: 'Traité',      bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
}

const PM_LABEL = {
  wave: 'Wave', orange_money: 'Orange Money', mtn: 'MTN Money',
  moov: 'Moov Money', carte: 'Carte bancaire',
}

const CONDITION_LABEL = { neuf: 'Neuf ✨', tres_bon: 'Très bon 👍', usage: 'Usagé 📖' }

const ANNUAL_GOAL = 500000

function DonationsAdminPage() {
  const [donations,   setDonations]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filterType,  setFilterType]  = useState('all')  // 'all' | 'argent' | 'livre'
  const [filterStatus,setFilterStatus]= useState('all')
  const [updatingId,  setUpdatingId]  = useState(null)

  useEffect(() => { loadDonations() }, [])

  const loadDonations = async () => {
    const { data } = await supabase.from('donations')
      .select('*')
      .order('created_at', { ascending: false })
    setDonations(data || [])
    setLoading(false)
  }

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    await supabase.from('donations').update({ status: newStatus }).eq('id', id)
    setDonations(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d))
    setUpdatingId(null)
  }

  const totalArgent  = donations.filter(d => d.type === 'argent' && d.status === 'traite').reduce((s, d) => s + (d.amount || 0), 0)
  const totalPending = donations.filter(d => d.status === 'en_attente').length
  const totalLivres  = donations.filter(d => d.type === 'livre').length
  const goalPct      = Math.min(100, Math.round((totalArgent / ANNUAL_GOAL) * 100))

  const filtered = donations.filter(d => {
    const matchType   = filterType === 'all' || d.type === filterType
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchType && matchStatus
  })

  return (
    <AdminLayout>

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dons & Soutiens</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            {loading ? '...' : `${donations.length} don${donations.length > 1 ? 's' : ''} enregistré${donations.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* ── Barre de progression objectif annuel ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Objectif annuel 2026</p>
            <p className="text-sm font-semibold text-slate-700">Renouvellement du catalogue</p>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-green-700" strokeWidth={1.8} />
          </div>
        </div>
        <div className="flex items-end justify-between mb-2">
          <p className="text-2xl font-bold text-slate-900">
            {totalArgent.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-400">FCFA</span>
          </p>
          <p className="text-sm text-slate-400">
            sur {ANNUAL_GOAL.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              goalPct >= 100 ? 'bg-green-500' : goalPct > 60 ? 'bg-emerald-500' : goalPct > 30 ? 'bg-amber-400' : 'bg-green-700'
            }`}
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">{goalPct}% de l'objectif atteint</p>
      </div>

      {/* ── 4 compteurs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Heart,       bg: 'bg-green-50',  color: 'text-green-700',  label: 'Dons financiers', value: donations.filter(d => d.type === 'argent').length },
          { icon: BookOpen,    bg: 'bg-blue-50',   color: 'text-blue-700',   label: 'Dons de livres',  value: totalLivres },
          { icon: Clock,       bg: 'bg-amber-50',  color: 'text-amber-700',  label: 'En attente',      value: totalPending },
          { icon: CheckCircle, bg: 'bg-emerald-50',color: 'text-emerald-700',label: 'Traités',         value: donations.filter(d => d.status === 'traite').length },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
              <c.icon className={`w-4 h-4 ${c.color}`} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{loading ? '—' : c.value}</p>
              <p className="text-xs text-slate-400 font-medium mt-1.5">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {[['all','Tous'],['argent','Financiers'],['livre','Livres']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterType(val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filterType === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {[['all','Tous'],['en_attente','En attente'],['recu','Reçus'],['traite','Traités']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filterStatus === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste des dons ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-slate-400 text-sm font-light">Aucun don trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(don => {
            const sc = STATUS_CONFIG[don.status] || STATUS_CONFIG.en_attente
            const isArgent = don.type === 'argent'
            return (
              <div key={don.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-start gap-4">

                {/* Icône type */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isArgent ? 'bg-green-50' : 'bg-blue-50'}`}>
                  {isArgent
                    ? <Heart className="w-4 h-4 text-green-700" strokeWidth={1.5} />
                    : <BookOpen className="w-4 h-4 text-blue-700" strokeWidth={1.5} />
                  }
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{don.donor_name}</p>
                      {don.donor_phone && <p className="text-xs text-slate-400">{don.donor_phone}</p>}
                    </div>
                    <p className="text-xs text-slate-300 flex-shrink-0">
                      {new Date(don.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Détails */}
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {isArgent ? (
                      <>
                        <span className="font-bold text-green-700 text-sm">{(don.amount || 0).toLocaleString('fr-FR')} FCFA</span>
                        {don.payment_method && (
                          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                            {PM_LABEL[don.payment_method] || don.payment_method}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800 text-sm">{don.book_title}</span>
                        {don.book_author && <span className="text-xs text-slate-400">{don.book_author}</span>}
                        {don.book_condition && (
                          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                            {CONDITION_LABEL[don.book_condition]}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {don.message && (
                    <p className="mt-1.5 text-xs text-slate-400 italic">"{don.message}"</p>
                  )}

                  {/* Statut + changement */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </span>
                    {don.status === 'en_attente' && (
                      <button onClick={() => handleStatusChange(don.id, 'recu')} disabled={updatingId === don.id}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50">
                        → Marquer reçu
                      </button>
                    )}
                    {don.status === 'recu' && (
                      <button onClick={() => handleStatusChange(don.id, 'traite')} disabled={updatingId === don.id}
                        className="text-xs text-green-600 hover:text-green-800 font-medium transition-colors disabled:opacity-50">
                        → Marquer traité
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}

export default DonationsAdminPage
