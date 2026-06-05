import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer
} from 'recharts'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const PIE_COLORS = ['#15803d','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316']

function StatCard({ label, value, sub, bg, text, border }) {
  return (
    <div className={`rounded-2xl p-5 border ${bg} ${border}`}>
      <p className={`text-xs font-medium mb-2 ${text} opacity-70`}>{label}</p>
      <p className={`text-3xl font-bold ${text}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${text} opacity-50`}>{sub}</p>}
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-green-700 text-sm font-medium mt-0.5">{payload[0].value} emprunt(s)</p>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
      <p className="text-sm text-gray-600 mt-0.5">{payload[0].value} livre(s)</p>
      <p className="text-xs text-gray-400">{payload[0].payload.percent}% du catalogue</p>
    </div>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const now = new Date()
  const currentYear = now.getFullYear()
  const monthStart = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const yearStart  = `${currentYear}-01-01`

  const [admin,         setAdmin]         = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [stats,         setStats]         = useState({
    totalBooks: 0, availableBooks: 0, activeBorrowings: 0, totalMembers: 0,
    revenueMonth: 0, revenueYear: 0,
  })
  const [monthlyData,   setMonthlyData]   = useState([])
  const [categoryData,  setCategoryData]  = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      setAdmin(profile)

      const [
        booksRes, borrowingsRes, membersRes,
        allBorrowRes, catsRes,
        monthBorrowRes, yearBorrowRes, yearSubRes,
      ] = await Promise.all([
        supabase.from('books').select('available_copies, total_copies').eq('is_active', true),
        supabase.from('borrowings').select('id', { count: 'exact' }).eq('status', 'en_cours'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'member'),
        supabase.from('borrowings').select('borrowed_at').gte('borrowed_at', `${currentYear}-01-01`).lte('borrowed_at', `${currentYear}-12-31`),
        supabase.from('books').select('category_id, categories(name)').eq('is_active', true),
        // Revenus du mois (locations)
        supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', monthStart),
        // Revenus de l'année (locations)
        supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', yearStart),
        // Revenus de l'année (abonnements)
        supabase.from('subscriptions').select('amount_paid').gte('created_at', yearStart),
      ])

      const revenueMonth = monthBorrowRes.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
      const revenueYearBorrow = yearBorrowRes.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
      const revenueYearSub    = yearSubRes.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0

      setStats({
        totalBooks:       booksRes.data?.reduce((s, b) => s + b.total_copies, 0)     || 0,
        availableBooks:   booksRes.data?.reduce((s, b) => s + b.available_copies, 0) || 0,
        activeBorrowings: borrowingsRes.count || 0,
        totalMembers:     membersRes.count    || 0,
        revenueMonth,
        revenueYear: revenueYearBorrow + revenueYearSub,
      })
      setLoading(false)

      // Graphique 1 : emprunts par mois
      const monthly = MONTHS.map(month => ({ month, emprunts: 0 }))
      allBorrowRes.data?.forEach(b => {
        monthly[new Date(b.borrowed_at).getMonth()].emprunts++
      })
      setMonthlyData(monthly)

      // Graphique 2 : livres par catégorie
      const catMap = {}
      catsRes.data?.forEach(book => {
        const name = book.categories?.name || 'Sans catégorie'
        catMap[name] = (catMap[name] || 0) + 1
      })
      const total = Object.values(catMap).reduce((s, v) => s + v, 0)
      setCategoryData(
        Object.entries(catMap)
          .map(([name, value]) => ({ name, value, percent: total > 0 ? Math.round((value / total) * 100) : 0 }))
          .sort((a, b) => b.value - a.value)
      )
      setChartsLoading(false)
    }
    load()
  }, [])

  const fmt = (n) => n.toLocaleString('fr-FR') + ' FCFA'

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-1">Bienvenue, {admin?.full_name || 'Administrateur'}</p>
        </div>
        <button onClick={() => navigate('/admin/livres')}
          className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-green-800 active:scale-95 transition-all shadow-sm">
          + Ajouter un livre
        </button>
      </div>

      {/* ── Cartes bibliothèque ── */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bibliothèque</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total livres"      value={loading ? '—' : stats.totalBooks}
          bg="bg-green-50"  text="text-green-800"  border="border-green-100" />
        <StatCard label="Disponibles"       value={loading ? '—' : stats.availableBooks}
          bg="bg-blue-50"   text="text-blue-800"   border="border-blue-100" />
        <StatCard label="Emprunts en cours" value={loading ? '—' : stats.activeBorrowings}
          bg="bg-amber-50"  text="text-amber-800"  border="border-amber-100" />
        <StatCard label="Membres"           value={loading ? '—' : stats.totalMembers}
          bg="bg-purple-50" text="text-purple-800" border="border-purple-100" />
      </div>

      {/* ── Cartes financières ── */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Finances</p>
      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCard
          label="Revenus du mois"
          value={loading ? '—' : fmt(stats.revenueMonth)}
          sub="Locations uniquement"
          bg="bg-teal-50" text="text-teal-800" border="border-teal-100"
        />
        <StatCard
          label={`Revenus ${new Date().getFullYear()}`}
          value={loading ? '—' : fmt(stats.revenueYear)}
          sub="Locations + abonnements"
          bg="bg-teal-50" text="text-teal-800" border="border-teal-100"
        />
      </div>

      {/* ── Graphiques ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">Analyses et Tendances</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Année {new Date().getFullYear()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-800">Évolution des emprunts</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-6">Emprunts créés mois par mois</p>
          {chartsLoading ? (
            <div className="h-52 flex items-end gap-2 px-2 animate-pulse">
              {[40,65,30,80,55,70,45,90,60,75,35,50].map((h,i) => (
                <div key={i} className="flex-1 bg-slate-100 rounded-t-lg" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: '#f0fdf4' }} />
                <Bar dataKey="emprunts" fill="#15803d" radius={[6,6,0,0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-800">Répartition par catégorie</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-6">Proportion de livres par thème</p>
          {chartsLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-8 border-slate-100 animate-pulse" />
            </div>
          ) : categoryData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-300 text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="45%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize: '11px', color: '#64748b' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Accès rapides ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Accès rapides</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Gérer les livres',  path: '/admin/livres'   },
            { label: 'Gérer les membres', path: '/admin/membres'  },
            { label: 'Voir les emprunts', path: '/admin/emprunts' },
            { label: 'Finances',          path: '/admin/finances' },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}

export default DashboardPage
