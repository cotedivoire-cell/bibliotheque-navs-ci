import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

function FinancePage() {
  const now         = new Date()
  const currentYear = now.getFullYear()
  const monthStart  = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const yearStart   = `${currentYear}-01-01`
  const in30Days    = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const todayStr    = now.toISOString().split('T')[0]

  const [loading,        setLoading]        = useState(true)
  const [stats,          setStats]          = useState({ revenueMonth: 0, revenueYear: 0, activeSubs: 0, expiringSoon: 0 })
  const [activeSubs,     setActiveSubs]     = useState([])
  const [recentPayments, setRecentPayments] = useState([])

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [
      monthBorrow, yearBorrow, yearSub,
      activeSubsRes, expiringRes, recentBorrow,
    ] = await Promise.all([
      supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', monthStart),
      supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', yearStart),
      supabase.from('subscriptions').select('amount_paid').eq('status', 'active').gte('created_at', yearStart),
      supabase.from('subscriptions').select('*, profiles(full_name, phone)').eq('status', 'active').order('end_date'),
      supabase.from('subscriptions').select('id', { count: 'exact' }).eq('status', 'active').lte('end_date', in30Days).gte('end_date', todayStr),
      supabase.from('borrowings').select('*, profiles(full_name), books(title)').eq('loan_type', 'location').gt('amount_paid', 0).order('created_at', { ascending: false }).limit(10),
    ])

    const revenueMonth = monthBorrow.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
    const revenueYearB = yearBorrow.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
    const revenueYearS = yearSub.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0

    setStats({
      revenueMonth,
      revenueYear:  revenueYearB + revenueYearS,
      activeSubs:   activeSubsRes.data?.length || 0,
      expiringSoon: expiringRes.count || 0,
    })
    setActiveSubs(activeSubsRes.data || [])
    setRecentPayments(recentBorrow.data || [])
    setLoading(false)
  }

  const fmt   = (n) => n.toLocaleString('fr-FR') + ' FCFA'
  const fdate = (d) => new Date(d).toLocaleDateString('fr-FR')

  const daysLeft = (endDate) => {
    const diff = Math.ceil((new Date(endDate) - now) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Finances</h1>
        <p className="text-slate-400 text-sm mt-1">Revenus et abonnements — {currentYear}</p>
      </div>

      {/* ── Cartes financières ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <p className="text-xs font-medium text-teal-700 opacity-70 mb-2">Revenus du mois</p>
          <p className="text-2xl font-bold text-teal-800">{loading ? '—' : fmt(stats.revenueMonth)}</p>
          <p className="text-xs text-teal-600 opacity-50 mt-1">Locations uniquement</p>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <p className="text-xs font-medium text-teal-700 opacity-70 mb-2">Revenus {currentYear}</p>
          <p className="text-2xl font-bold text-teal-800">{loading ? '—' : fmt(stats.revenueYear)}</p>
          <p className="text-xs text-teal-600 opacity-50 mt-1">Locations + abonnements</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="text-xs font-medium text-amber-700 opacity-70 mb-2">Abonnements actifs</p>
          <p className="text-2xl font-bold text-amber-800">{loading ? '—' : stats.activeSubs}</p>
        </div>
        <div className={`border rounded-2xl p-5 ${stats.expiringSoon > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
          <p className={`text-xs font-medium mb-2 ${stats.expiringSoon > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            Expirent dans 30 jours
          </p>
          <p className={`text-2xl font-bold ${stats.expiringSoon > 0 ? 'text-red-700' : 'text-slate-700'}`}>
            {loading ? '—' : stats.expiringSoon}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Abonnements actifs ── */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4">Abonnements actifs</h2>
          {activeSubs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
              <p className="text-sm">Aucun abonnement actif</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSubs.map(sub => {
                const days    = daysLeft(sub.end_date)
                const urgent  = days <= 30
                const expired = days < 0
                return (
                  <div key={sub.id}
                    className={`bg-white rounded-xl border shadow-sm p-4 ${
                      expired ? 'border-red-200' : urgent ? 'border-amber-200' : 'border-slate-100'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">
                          {sub.profiles?.full_name}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">{sub.profiles?.phone}</p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {fdate(sub.start_date)} → {fdate(sub.end_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-700">
                          {(sub.amount_paid || 0).toLocaleString('fr-FR')} F
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          expired  ? 'bg-red-100 text-red-600' :
                          urgent   ? 'bg-amber-100 text-amber-700' :
                                     'bg-green-50 text-green-700'
                        }`}>
                          {expired ? 'Expiré' : urgent ? `${days}j restants` : 'Actif'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Derniers paiements de location ── */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4">Derniers paiements</h2>
          {recentPayments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
              <p className="text-sm">Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPayments.map(b => (
                <div key={b.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{b.books?.title}</p>
                    <p className="text-slate-400 text-xs">{b.profiles?.full_name}</p>
                    <p className="text-slate-300 text-xs">{fdate(b.borrowed_at)}</p>
                  </div>
                  <p className="text-sm font-bold text-teal-700 flex-shrink-0 ml-3">
                    {(b.amount_paid || 0).toLocaleString('fr-FR')} F
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default FinancePage
