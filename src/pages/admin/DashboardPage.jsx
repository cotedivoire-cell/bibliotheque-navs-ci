import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer
} from 'recharts'
import {
  BookOpen, Users, AlertTriangle, CheckCircle2,
  TrendingUp, Calendar, ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const MONTHS     = ['J','F','M','A','M','J','J','A','S','O','N','D']
const PIE_COLORS = ['#15803d','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16']

/* ── Mini carte inventaire ── */
function StatCard({ icon: Icon, iconColor, bgColor, label, value, valueColor, alert }) {
  const loading = value === null
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 ${alert && !loading && value > 0 ? 'border border-red-100' : 'border border-slate-100'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.8} />
      </div>
      <div>
        {loading
          ? <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse" />
          : <p className={`font-extrabold text-2xl leading-none ${valueColor}`}>{value}</p>
        }
        <p className="text-[11px] text-slate-400 font-medium mt-1">{label}</p>
      </div>
    </div>
  )
}

/* ── Carte finance compacte ── */
function FinanceCard({ label, amount, subtitle, loading }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.8} />
        </div>
      </div>
      {loading
        ? <div className="h-7 w-28 bg-slate-100 rounded-lg animate-pulse" />
        : <p className="text-xl font-bold text-slate-900">
            {(amount || 0).toLocaleString('fr-FR')}
            <span className="text-xs font-normal text-slate-400 ml-1">FCFA</span>
          </p>
      }
      <p className="text-[10px] text-emerald-600 font-medium">{subtitle}</p>
    </div>
  )
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="text-green-700">{payload[0].value} emprunt(s)</p>
    </div>
  )
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">{payload[0].name}</p>
      <p className="text-gray-500">{payload[0].value} livre(s) · {payload[0].payload.percent}%</p>
    </div>
  )
}

function DashboardPage() {
  const navigate    = useNavigate()
  const now         = new Date()
  const currentYear = now.getFullYear()
  const monthStart  = `${currentYear}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const yearStart   = `${currentYear}-01-01`

  const [admin,         setAdmin]         = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [stats,         setStats]         = useState({
    totalBooks:0, availableBooks:0, totalMembers:0,
    overdueCount:0, revenueMonth:0, revenueYear:0,
  })
  const [monthlyData,  setMonthlyData]  = useState([])
  const [categoryData, setCategoryData] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile }  = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setAdmin(profile)

      const [booksRes, membersRes, overdueRes, allBorrowRes, catsRes, mBorrowRes, yBorrowRes, ySubRes] = await Promise.all([
        supabase.from('books').select('available_copies, total_copies').eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'member'),
        supabase.from('borrowings').select('id', { count: 'exact' }).eq('status', 'en_retard'),
        supabase.from('borrowings').select('borrowed_at').gte('borrowed_at', `${currentYear}-01-01`),
        supabase.from('books').select('category_id, categories(name)').eq('is_active', true),
        supabase.from('borrowings').select('amount_paid').eq('loan_type','location').gte('created_at', monthStart),
        supabase.from('borrowings').select('amount_paid').eq('loan_type','location').gte('created_at', yearStart),
        supabase.from('subscriptions').select('amount_paid').gte('created_at', yearStart),
      ])

      setStats({
        totalBooks:     booksRes.data?.reduce((s,b)=>s+b.total_copies,0)||0,
        availableBooks: booksRes.data?.reduce((s,b)=>s+b.available_copies,0)||0,
        totalMembers:   membersRes.count||0,
        overdueCount:   overdueRes.count||0,
        revenueMonth:   mBorrowRes.data?.reduce((s,b)=>s+(b.amount_paid||0),0)||0,
        revenueYear:   (yBorrowRes.data?.reduce((s,b)=>s+(b.amount_paid||0),0)||0)
                      +(ySubRes.data?.reduce((s,b)=>s+(b.amount_paid||0),0)||0),
      })
      setLoading(false)

      const monthly = MONTHS.map(m => ({ month:m, emprunts:0 }))
      allBorrowRes.data?.forEach(b => { monthly[new Date(b.borrowed_at).getMonth()].emprunts++ })
      setMonthlyData(monthly)

      const catMap = {}
      catsRes.data?.forEach(b => { const n=b.categories?.name||'Autre'; catMap[n]=(catMap[n]||0)+1 })
      const total = Object.values(catMap).reduce((s,v)=>s+v,0)
      setCategoryData(Object.entries(catMap)
        .map(([name,value])=>({ name, value, percent:total>0?Math.round(value/total*100):0 }))
        .sort((a,b)=>b.value-a.value))
      setChartsLoading(false)
    }
    load()
  }, [])

  const v = n => loading ? null : n

  return (
    <AdminLayout>
      {/* ── En-tête compact ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            {admin?.full_name || 'Administrateur'} · {now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
        </div>
        <button onClick={() => navigate('/admin/livres')}
          className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 active:scale-95 transition-all shadow-sm">
          + Ajouter
        </button>
      </div>

      {/* ── Grille principale 2 colonnes ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-4">

        {/* ── Colonne gauche (2/3) ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Inventaire — 4 cartes compactes */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Inventaire & Membres</p>
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={BookOpen}      iconColor="text-green-800" bgColor="bg-green-50"  label="Total Livres"   value={v(stats.totalBooks)}     valueColor="text-green-800" />
              <StatCard icon={CheckCircle2}  iconColor="text-slate-600" bgColor="bg-slate-50"  label="Disponibles"   value={v(stats.availableBooks)} valueColor="text-slate-900" />
              <StatCard icon={Users}         iconColor="text-green-800" bgColor="bg-green-50"  label="Membres"       value={v(stats.totalMembers)}   valueColor="text-green-800" />
              <StatCard icon={AlertTriangle} iconColor="text-red-500"   bgColor="bg-red-50"    label="En retard"     value={v(stats.overdueCount)}   valueColor="text-red-600"   alert />
            </div>
          </div>

          {/* Finances — 2 cartes côte à côte */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Finances</p>
            <div className="grid grid-cols-2 gap-3">
              <FinanceCard label="Recettes du mois"       amount={stats.revenueMonth} subtitle="Locations uniquement"     loading={loading} />
              <FinanceCard label={`Recettes ${currentYear}`} amount={stats.revenueYear}  subtitle="Locations + abonnements" loading={loading} />
            </div>
          </div>

          {/* Graphique barres — compact */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Évolution des emprunts</p>
                <p className="text-[10px] text-slate-400">Mois par mois · {currentYear}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                <Calendar className="w-3 h-3" strokeWidth={1.5} />{currentYear}
              </div>
            </div>
            {chartsLoading ? (
              <div className="h-36 flex items-end gap-1.5 animate-pulse">
                {[40,65,30,80,55,70,45,90,60,75,35,50].map((h,i)=>(
                  <div key={i} className="flex-1 bg-slate-100 rounded-t" style={{height:`${h}%`}} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={148}>
                <BarChart data={monthlyData} margin={{top:0,right:0,left:-28,bottom:0}}>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTip />} cursor={{fill:'#f0fdf4'}} />
                  <Bar dataKey="emprunts" fill="#15803d" radius={[4,4,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Colonne droite (1/3) ── */}
        <div className="xl:col-span-1 space-y-4">

          {/* Graphique camembert */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-full flex flex-col">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-800">Répartition</p>
              <p className="text-[10px] text-slate-400">Livres par catégorie</p>
            </div>
            {chartsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-8 border-slate-100 animate-pulse" />
              </div>
            ) : categoryData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 text-xs">Aucune donnée</div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="40%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                      {categoryData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                    <Legend iconType="circle" iconSize={7}
                      formatter={v=><span style={{fontSize:'10px',color:'#64748b'}}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Stats par catégorie */}
            <div className="mt-2 space-y-1.5 border-t border-slate-50 pt-3">
              {categoryData.slice(0,4).map((cat,i)=>(
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}} />
                    <span className="text-[11px] text-slate-500 truncate max-w-[100px]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${cat.percent}%`,background:PIE_COLORS[i%PIE_COLORS.length]}} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-6 text-right">{cat.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Accès rapides — barre fine ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mr-1">Accès rapides</span>
        {[
          { label:'Livres',        path:'/admin/livres'       },
          { label:'Membres',       path:'/admin/membres'      },
          { label:'Emprunts',      path:'/admin/emprunts'     },
          { label:'Réservations',  path:'/admin/reservations' },
          { label:'Finances',      path:'/admin/finances'     },
          { label:'Suggestions',   path:'/admin/suggestions'  },
        ].map(item=>(
          <button key={item.path} onClick={()=>navigate(item.path)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors border border-slate-100 shadow-sm">
            {item.label}<ChevronRight className="w-3 h-3 text-slate-300" strokeWidth={2} />
          </button>
        ))}
      </div>
    </AdminLayout>
  )
}

export default DashboardPage
