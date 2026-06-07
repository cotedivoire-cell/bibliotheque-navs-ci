import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, defs, linearGradient, stop
} from 'recharts'
import { BookOpen, Users, AlertTriangle, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const MONTHS_SHORT = ['J','F','M','A','M','J','J','A','S','O','N','D']
const MONTHS_FULL  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const PIE_COLORS   = ['#15803d','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16']

/* ── Tooltips ── */
const BarTip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
    <p className="font-semibold text-gray-900">{label}</p>
    <p className="text-green-700 mt-0.5">{payload[0].value} emprunt(s)</p>
  </div>
) : null

const PieTip = ({ active, payload }) => active && payload?.length ? (
  <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
    <p className="font-semibold text-gray-900">{payload[0].name}</p>
    <p className="text-gray-500">{payload[0].value} livre(s) · {payload[0].payload.percent}%</p>
  </div>
) : null

/* ── Mini Area Chart dans les cartes finance ── */
function MiniArea({ data }) {
  return (
    <ResponsiveContainer width="100%" height={52}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="greenWave" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#15803d" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#15803d" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke="#15803d" strokeWidth={2}
          fill="url(#greenWave)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Carte stat inventaire ── */
function StatCard({ icon: Icon, iconBg, iconColor, label, value, valueColor = 'text-green-800', alert }) {
  const loading = value === null
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-lg shadow-slate-100 border ${alert && !loading && value > 0 ? 'border-red-100' : 'border-transparent'} flex flex-col gap-3`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} strokeWidth={1.8} />
      </div>
      {loading
        ? <div className="h-8 w-14 bg-slate-100 rounded-xl animate-pulse" />
        : <div>
            <p className={`font-extrabold text-3xl leading-none ${valueColor}`}>{value}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1.5">{label}</p>
          </div>
      }
    </div>
  )
}

/* ── Carte finance avec mini area ── */
function FinanceCard({ label, amount, subtitle, trendData, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-transparent overflow-hidden">
      <div className="px-5 pt-5 pb-1 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          {loading
            ? <div className="h-7 w-32 bg-slate-100 rounded-xl animate-pulse mt-2" />
            : <p className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
                {(amount || 0).toLocaleString('fr-FR')}
                <span className="text-sm font-normal text-slate-400 ml-1">FCFA</span>
              </p>
          }
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">{subtitle}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-emerald-600" strokeWidth={1.8} />
        </div>
      </div>
      <MiniArea data={trendData} />
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
  const [stats,         setStats]         = useState({ totalBooks:0, availableBooks:0, totalMembers:0, overdueCount:0, revenueMonth:0, revenueYear:0 })
  const [monthlyData,   setMonthlyData]   = useState([])
  const [categoryData,  setCategoryData]  = useState([])
  const [trendMonth,    setTrendMonth]    = useState([])
  const [trendYear,     setTrendYear]     = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile }  = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setAdmin(profile)

      const [booksRes, membersRes, overdueRes, allBorrowRes, catsRes, mBorrowRes, yBorrowRes, ySubRes] = await Promise.all([
        supabase.from('books').select('available_copies, total_copies').eq('is_active', true),
        supabase.from('profiles').select('id', { count:'exact' }).eq('role','member'),
        supabase.from('borrowings').select('id', { count:'exact' }).eq('status','en_retard'),
        supabase.from('borrowings').select('borrowed_at, amount_paid').gte('borrowed_at',`${currentYear}-01-01`),
        supabase.from('books').select('category_id, categories(name)').eq('is_active',true),
        supabase.from('borrowings').select('amount_paid').eq('loan_type','location').gte('created_at',monthStart),
        supabase.from('borrowings').select('amount_paid').eq('loan_type','location').gte('created_at',yearStart),
        supabase.from('subscriptions').select('amount_paid').gte('created_at',yearStart),
      ])

      const rMonth = mBorrowRes.data?.reduce((s,b)=>s+(b.amount_paid||0),0)||0
      const rYear  = (yBorrowRes.data?.reduce((s,b)=>s+(b.amount_paid||0),0)||0)
                   + (ySubRes.data?.reduce((s,b)=>s+(b.amount_paid||0),0)||0)

      setStats({ totalBooks:booksRes.data?.reduce((s,b)=>s+b.total_copies,0)||0, availableBooks:booksRes.data?.reduce((s,b)=>s+b.available_copies,0)||0, totalMembers:membersRes.count||0, overdueCount:overdueRes.count||0, revenueMonth:rMonth, revenueYear:rYear })
      setLoading(false)

      // Emprunts par mois
      const monthly = MONTHS_FULL.map(m=>({month:m,emprunts:0}))
      allBorrowRes.data?.forEach(b=>{ monthly[new Date(b.borrowed_at).getMonth()].emprunts++ })
      setMonthlyData(monthly)

      // Mini trend — 6 derniers mois
      const m6 = monthly.slice(Math.max(0,now.getMonth()-5), now.getMonth()+1)
      setTrendMonth(m6.map(d=>({v:d.emprunts})))
      setTrendYear(monthly.map(d=>({v:d.emprunts})))

      // Catégories (renommage Le Virement → Vie Chrétienne côté code)
      const catMap = {}
      catsRes.data?.forEach(b=>{
        let name = b.categories?.name || 'Autre'
        if (name === 'Le Virement') name = 'Vie Chrétienne'
        catMap[name]=(catMap[name]||0)+1
      })
      const total = Object.values(catMap).reduce((s,v)=>s+v,0)
      setCategoryData(Object.entries(catMap).map(([name,value])=>({name,value,percent:total>0?Math.round(value/total*100):0})).sort((a,b)=>b.value-a.value))
      setChartsLoading(false)
    }
    load()
  }, [])

  const v = n => loading ? null : n

  return (
    <AdminLayout>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            {admin?.full_name || 'Administrateur'} · {now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
        </div>
        <button onClick={()=>navigate('/admin/livres')}
          className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 active:scale-95 transition-all shadow-sm whitespace-nowrap">
          + Ajouter un livre
        </button>
      </div>

      {/* ── Grille 2 colonnes ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start mb-5">

        {/* ── Colonne gauche 2/3 ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Inventaire */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Inventaire & Membres</p>
            <div className="grid grid-cols-4 gap-4">
              <StatCard icon={BookOpen}      iconBg="bg-green-50" iconColor="text-green-800" label="Total Livres"  value={v(stats.totalBooks)}     valueColor="text-green-800" />
              <StatCard icon={CheckCircle2}  iconBg="bg-slate-50" iconColor="text-slate-600" label="Disponibles"  value={v(stats.availableBooks)} valueColor="text-slate-900" />
              <StatCard icon={Users}         iconBg="bg-green-50" iconColor="text-green-800" label="Membres"      value={v(stats.totalMembers)}   valueColor="text-green-800" />
              <StatCard icon={AlertTriangle} iconBg="bg-red-50"   iconColor="text-red-500"   label="En retard"    value={v(stats.overdueCount)}   valueColor="text-red-600"   alert />
            </div>
          </div>

          {/* Finances */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Finances</p>
            <div className="grid grid-cols-2 gap-4">
              <FinanceCard label="Recettes du mois"        amount={stats.revenueMonth} subtitle="Locations uniquement"     trendData={trendMonth} loading={loading} />
              <FinanceCard label={`Recettes ${currentYear}`} amount={stats.revenueYear}  subtitle="Locations + abonnements" trendData={trendYear}  loading={loading} />
            </div>
          </div>

          {/* Histogramme */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Évolution des emprunts</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Mois par mois · {currentYear}</p>
              </div>
            </div>
            {chartsLoading ? (
              <div className="h-32 flex items-end gap-1.5 animate-pulse">
                {[40,65,30,80,55,70,45,90,60,75,35,50].map((h,i)=>(
                  <div key={i} className="flex-1 bg-slate-100 rounded-t" style={{height:`${h}%`}} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={128}>
                <BarChart data={monthlyData} margin={{top:0,right:0,left:-28,bottom:0}}>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTip />} cursor={{fill:'#f0fdf4'}} />
                  <Bar dataKey="emprunts" fill="#15803d" radius={[4,4,0,0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Colonne droite 1/3 ── */}
        <div className="xl:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Répartition</p>
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-100 p-5">
            <p className="text-sm font-semibold text-slate-800">Par catégorie</p>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Livres actifs dans le catalogue</p>

            {chartsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-24 h-24 rounded-full border-8 border-slate-100 animate-pulse" />
              </div>
            ) : categoryData.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-300 text-xs">Aucune donnée</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="48%" innerRadius={48} outerRadius={76} paddingAngle={3} dataKey="value">
                      {categoryData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                    <Legend iconType="circle" iconSize={7}
                      formatter={v=><span style={{fontSize:'10px',color:'#64748b'}}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Barres de répartition */}
                <div className="mt-3 space-y-2 border-t border-slate-50 pt-3">
                  {categoryData.slice(0,5).map((cat,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}} />
                      <span className="text-[11px] text-slate-500 truncate flex-1">{cat.name}</span>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${cat.percent}%`,background:PIE_COLORS[i%PIE_COLORS.length]}} />
                      </div>
                      <span className="text-[10px] text-slate-400 w-7 text-right">{cat.percent}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Accès rapides — barre fine ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accès rapides</span>
        {[
          {label:'Livres',       path:'/admin/livres'},
          {label:'Membres',      path:'/admin/membres'},
          {label:'Emprunts',     path:'/admin/emprunts'},
          {label:'Réservations', path:'/admin/reservations'},
          {label:'Finances',     path:'/admin/finances'},
          {label:'Suggestions',  path:'/admin/suggestions'},
        ].map(item=>(
          <button key={item.path} onClick={()=>navigate(item.path)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors border border-slate-100 shadow-sm">
            {item.label}<ChevronRight className="w-3 h-3 text-slate-300" />
          </button>
        ))}
      </div>
    </AdminLayout>
  )
}

export default DashboardPage
