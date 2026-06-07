import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer
} from 'recharts'
import {
  BookOpen, Users, AlertTriangle, CheckCircle2,
  TrendingUp, Calendar
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const MONTHS     = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const PIE_COLORS = ['#15803d','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316']

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-green-700 text-sm font-medium mt-0.5">{payload[0].value} emprunt(s)</p>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
      <p className="text-sm text-gray-600 mt-0.5">{payload[0].value} livre(s)</p>
      <p className="text-xs text-gray-400">{payload[0].payload.percent}% du catalogue</p>
    </div>
  )
}

/* ── Carte statistique inventaire ── */
function StatCard({ icon: Icon, iconColor, label, value, valueColor = 'text-green-800', alert = false }) {
  return (
    <div className={`bg-white rounded-3xl p-6 shadow-[0_20px_60px_rgba(148,163,184,0.18)] flex flex-col gap-4 ${alert && value > 0 ? 'border border-red-100' : ''}`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${alert && value > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.8} />
      </div>
      <div>
        <p className={`font-extrabold text-4xl leading-none ${valueColor}`}>{value === null ? '—' : value}</p>
        <p className="text-xs text-slate-400 font-medium mt-2">{label}</p>
      </div>
    </div>
  )
}

/* ── Carte finance premium ── */
function FinanceCard({ label, amount, subtitle, loading }) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-[0_20px_60px_rgba(148,163,184,0.18)] flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-emerald-600" strokeWidth={1.8} />
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-9 w-36 bg-slate-100 rounded-xl animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {(amount || 0).toLocaleString('fr-FR')} <span className="text-lg font-medium text-slate-400">FCFA</span>
          </p>
        )}
        <p className="text-xs text-emerald-600 font-medium mt-2">{subtitle}</p>
      </div>
    </div>
  )
}

function DashboardPage() {
  const navigate    = useNavigate()
  const now         = new Date()
  const currentYear = now.getFullYear()
  const monthStart  = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const yearStart   = `${currentYear}-01-01`

  const [admin,         setAdmin]         = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [stats,         setStats]         = useState({
    totalBooks: 0, availableBooks: 0, totalMembers: 0,
    overdueCount: 0, revenueMonth: 0, revenueYear: 0,
  })
  const [monthlyData,  setMonthlyData]  = useState([])
  const [categoryData, setCategoryData] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile }  = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setAdmin(profile)

      const [
        booksRes, membersRes, overdueRes,
        allBorrowRes, catsRes,
        monthBorrowRes, yearBorrowRes, yearSubRes,
      ] = await Promise.all([
        supabase.from('books').select('available_copies, total_copies').eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'member'),
        supabase.from('borrowings').select('id', { count: 'exact' }).eq('status', 'en_retard'),
        supabase.from('borrowings').select('borrowed_at').gte('borrowed_at', `${currentYear}-01-01`),
        supabase.from('books').select('category_id, categories(name)').eq('is_active', true),
        supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', monthStart),
        supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', yearStart),
        supabase.from('subscriptions').select('amount_paid').gte('created_at', yearStart),
      ])

      const revenueMonth = monthBorrowRes.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
      const revenueYearB = yearBorrowRes.data?.reduce((s, b)  => s + (b.amount_paid || 0), 0) || 0
      const revenueYearS = yearSubRes.data?.reduce((s, b)     => s + (b.amount_paid || 0), 0) || 0

      setStats({
        totalBooks:     booksRes.data?.reduce((s, b) => s + b.total_copies, 0)     || 0,
        availableBooks: booksRes.data?.reduce((s, b) => s + b.available_copies, 0) || 0,
        totalMembers:   membersRes.count  || 0,
        overdueCount:   overdueRes.count  || 0,
        revenueMonth,
        revenueYear:    revenueYearB + revenueYearS,
      })
      setLoading(false)

      // Graphique 1 : emprunts par mois
      const monthly = MONTHS.map(m => ({ month: m, emprunts: 0 }))
      allBorrowRes.data?.forEach(b => {
        monthly[new Date(b.borrowed_at).getMonth()].emprunts++
      })
      setMonthlyData(monthly)

      // Graphique 2 : répartition par catégorie
      const catMap = {}
      catsRes.data?.forEach(book => {
        const name = book.categories?.name || 'Sans catégorie'
        catMap[name] = (catMap[name] || 0) + 1
      })
      const total = Object.values(catMap).reduce((s, v) => s + v, 0)
      setCategoryData(
        Object.entries(catMap)
          .map(([name, value]) => ({
            name,
            value,
            percent: total > 0 ? Math.round((value / total) * 100) : 0,
          }))
          .sort((a, b) => b.value - a.value)
      )
      setChartsLoading(false)
    }
    load()
  }, [])

  const v = (n) => loading ? null : n

  return (
    <AdminLayout>

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-1 font-light">
            Bonjour, <span className="font-medium text-slate-600">{admin?.full_name || 'Administrateur'}</span>
          </p>
        </div>
        <button onClick={() => navigate('/admin/livres')}
          className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-green-800 active:scale-95 transition-all shadow-sm">
          + Ajouter un livre
        </button>
      </div>

      {/* ── Section Inventaire ── */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Inventaire & Membres</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen}      iconColor="text-green-800"  label="Total Livres"     value={v(stats.totalBooks)}     valueColor="text-green-800"  />
        <StatCard icon={CheckCircle2}  iconColor="text-slate-500"  label="Disponibles"      value={v(stats.availableBooks)} valueColor="text-slate-900"  />
        <StatCard icon={Users}         iconColor="text-green-800"  label="Membres"          value={v(stats.totalMembers)}   valueColor="text-green-800"  />
        <StatCard icon={AlertTriangle} iconColor="text-red-500"    label="Alertes Retards"  value={v(stats.overdueCount)}   valueColor="text-red-600"    alert />
      </div>

      {/* ── Section Finances ── */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Finances</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <FinanceCard
          label="Recettes du mois"
          amount={stats.revenueMonth}
          subtitle="Locations uniquement"
          loading={loading}
        />
        <FinanceCard
          label={`Recettes ${currentYear}`}
          amount={stats.revenueYear}
          subtitle="Locations + abonnements"
          loading={loading}
        />
      </div>

      {/* ── Graphiques ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">Analyses & Tendances</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
          <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
          Année {currentYear}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Histogramme */}
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(148,163,184,0.18)] p-6">
          <h3 className="text-sm font-semibold text-slate-800">Évolution des emprunts</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-6 font-light">Emprunts créés mois par mois</p>
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

        {/* Camembert */}
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(148,163,184,0.18)] p-6">
          <h3 className="text-sm font-semibold text-slate-800">Répartition par catégorie</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-6 font-light">Proportion de livres par thème</p>
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
      <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(148,163,184,0.18)] p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Accès rapides</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Gérer les livres',  path: '/admin/livres'       },
            { label: 'Gérer les membres', path: '/admin/membres'      },
            { label: 'Emprunts',          path: '/admin/emprunts'     },
            { label: 'Réservations',      path: '/admin/reservations' },
            { label: 'Finances',          path: '/admin/finances'     },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-100">
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}

export default DashboardPage
