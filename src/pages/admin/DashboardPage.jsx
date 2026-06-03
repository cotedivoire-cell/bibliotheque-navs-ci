import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

// ── Carte de statistique ──────────────────────────────────────
function StatCard({ label, value, bg, text, border }) {
  return (
    <div className={`rounded-2xl p-6 border ${bg} ${border}`}>
      <p className={`text-sm font-medium mb-3 ${text} opacity-70`}>{label}</p>
      <p className={`text-4xl font-bold ${text}`}>{value}</p>
    </div>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const [admin, setAdmin]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats]   = useState({
    totalBooks: 0,
    availableBooks: 0,
    activeBorrowings: 0,
    totalMembers: 0,
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      setAdmin(profile)

      const [booksRes, borrowingsRes, membersRes] = await Promise.all([
        supabase.from('books').select('total_copies, available_copies').eq('is_active', true),
        supabase.from('borrowings').select('id', { count: 'exact' }).eq('status', 'en_cours'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'member'),
      ])

      setStats({
        totalBooks:      booksRes.data?.reduce((s, b) => s + b.total_copies, 0)     || 0,
        availableBooks:  booksRes.data?.reduce((s, b) => s + b.available_copies, 0) || 0,
        activeBorrowings: borrowingsRes.count || 0,
        totalMembers:    membersRes.count     || 0,
      })

      setLoading(false)
    }

    load()
  }, [])

  return (
    <AdminLayout>

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-1">
            Bienvenue, {admin?.full_name || 'Administrateur'}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/livres')}
          className="inline-flex items-center gap-2 bg-green-700 text-white
                     px-6 py-3 rounded-xl text-sm font-semibold
                     hover:bg-green-800 active:scale-95 transition-all shadow-sm"
        >
          + Ajouter un livre
        </button>
      </div>

      {/* ── Statistiques ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total livres"
          value={loading ? '—' : stats.totalBooks}
          bg="bg-green-50"
          text="text-green-800"
          border="border-green-100"
        />
        <StatCard
          label="Disponibles"
          value={loading ? '—' : stats.availableBooks}
          bg="bg-blue-50"
          text="text-blue-800"
          border="border-blue-100"
        />
        <StatCard
          label="Emprunts en cours"
          value={loading ? '—' : stats.activeBorrowings}
          bg="bg-amber-50"
          text="text-amber-800"
          border="border-amber-100"
        />
        <StatCard
          label="Membres"
          value={loading ? '—' : stats.totalMembers}
          bg="bg-purple-50"
          text="text-purple-800"
          border="border-purple-100"
        />
      </div>

      {/* ── Accès rapides ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Accès rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/livres')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700
                       rounded-lg text-sm font-medium transition-colors"
          >
            Gérer les livres
          </button>
          <button
            onClick={() => navigate('/admin/livres')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700
                       rounded-lg text-sm font-medium transition-colors"
          >
            Voir les emprunts
          </button>
        </div>
      </div>

    </AdminLayout>
  )
}

export default DashboardPage
