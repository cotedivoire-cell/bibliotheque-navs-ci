import { useEffect, useState } from 'react'
import { ThumbsUp, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const STATUS_LABELS = {
  pending:   { label: 'En attente', style: 'bg-slate-100 text-slate-600' },
  purchased: { label: 'Acheté',     style: 'bg-green-100 text-green-700' },
  declined:  { label: 'Refusé',     style: 'bg-red-50 text-red-500'      },
}

function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('pending')
  const [updating,    setUpdating]    = useState(null)

  useEffect(() => { loadSuggestions() }, [])

  const loadSuggestions = async () => {
    const { data } = await supabase
      .from('suggestions')
      .select('*, profiles(full_name)')
      .order('votes_count', { ascending: false })
    setSuggestions(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    await supabase.from('suggestions').update({ status }).eq('id', id)
    await loadSuggestions()
    setUpdating(null)
  }

  const filtered  = suggestions.filter(s => filter === 'all' || s.status === filter)
  const pending   = suggestions.filter(s => s.status === 'pending').length
  const purchased = suggestions.filter(s => s.status === 'purchased').length

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Suggestions de la communauté</h1>
        <p className="text-slate-400 text-sm mt-1">
          {pending} en attente · {purchased} acheté(s)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-slate-800">{suggestions.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total suggestions</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-amber-700">{pending}</p>
          <p className="text-xs text-amber-600 mt-1">En attente</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-green-700">{purchased}</p>
          <p className="text-xs text-green-600 mt-1">Achetés</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'pending',   label: 'En attente' },
          { key: 'purchased', label: 'Achetés'    },
          { key: 'declined',  label: 'Refusés'    },
          { key: 'all',       label: 'Tous'       },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === f.key ? 'bg-green-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">Aucune suggestion dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sug => {
            const statusCfg = STATUS_LABELS[sug.status] || STATUS_LABELS.pending
            return (
              <div key={sug.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">

                {/* Votes */}
                <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 rounded-xl flex-shrink-0">
                  <ThumbsUp className="w-4 h-4 text-green-600 mb-0.5" />
                  <span className="text-lg font-bold text-slate-800">{sug.votes_count}</span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{sug.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.style}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  {sug.author && <p className="text-slate-400 text-xs mt-0.5">{sug.author}</p>}
                  <p className="text-slate-300 text-xs mt-0.5">
                    Proposé par {sug.profiles?.full_name} · {new Date(sug.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                {/* Actions (seulement si en attente) */}
                {sug.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateStatus(sug.id, 'purchased')}
                      disabled={updating === sug.id}
                      title="Marquer comme acheté"
                      className="p-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50">
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateStatus(sug.id, 'declined')}
                      disabled={updating === sug.id}
                      title="Refuser"
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
                      <X className="w-4 h-4" />
                    </button>
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

export default SuggestionsPage
