import { useEffect, useState } from 'react'
import { Check, X, Clock, MapPin, Truck, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const TODAY = new Date().toISOString().split('T')[0]

const STATUS_CFG = {
  pending:   { label: 'En attente', style: 'bg-blue-50 text-blue-700'   },
  confirmed: { label: 'Confirmée',  style: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Annulée',    style: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Expirée',    style: 'bg-red-50 text-red-500'     },
}

function AdminReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('pending')
  const [codeInput,    setCodeInput]    = useState('')
  const [codeError,    setCdError]      = useState('')
  const [codeSuccess,  setCodeSuccess]  = useState('')
  const [processing,   setProcessing]   = useState(false)
  const [updating,     setUpdating]     = useState(null)

  useEffect(() => { loadReservations() }, [])

  const loadReservations = async () => {
    // Auto-expire les réservations périmées
    await supabase.from('reservations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    const { data } = await supabase
      .from('reservations')
      .select('*, books(id, title, cover_url, available_copies), profiles(full_name, phone)')
      .order('created_at', { ascending: false })
    setReservations(data || [])
    setLoading(false)
  }

  // ── Valider par code 4 chiffres ──────────────────────────
  const handleValidateCode = async () => {
    if (codeInput.length !== 4) { setCdError('Le code doit contenir 4 chiffres.'); return }
    setProcessing(true)
    setCdError('')
    setCodeSuccess('')

    const { data: reservation } = await supabase
      .from('reservations')
      .select('*, books(id, title, available_copies), profiles(id, full_name, membership_type)')
      .eq('pickup_code', codeInput)
      .eq('status', 'pending')
      .maybeSingle()

    if (!reservation) {
      setCdError(`Aucune réservation active trouvée pour le code "${codeInput}".`)
      setProcessing(false)
      return
    }

    // Créer l'emprunt
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14) // 14 jours par défaut
    const dueDateStr = dueDate.toISOString().split('T')[0]

    await supabase.from('borrowings').insert([{
      book_id:     reservation.book_id,
      member_id:   reservation.member_id,
      loan_type:   reservation.profiles?.membership_type === 'annual' ? 'abonnement' : 'location',
      amount_paid: 0,
      borrowed_at: TODAY,
      due_date:    dueDateStr,
      status:      'en_cours',
    }])

    // Confirmer la réservation
    await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', reservation.id)

    setCodeSuccess(`Emprunt validé ! "${reservation.books?.title}" pour ${reservation.profiles?.full_name}. Date de retour : ${new Date(dueDateStr).toLocaleDateString('fr-FR')}.`)
    setCodeInput('')
    loadReservations()
    setProcessing(false)
  }

  // ── Confirmer manuellement ──────────────────────────────
  const handleConfirm = async (reservation) => {
    setUpdating(reservation.id)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    await supabase.from('borrowings').insert([{
      book_id: reservation.book_id, member_id: reservation.member_id,
      loan_type: 'location', amount_paid: 0, borrowed_at: TODAY, due_date: dueDateStr, status: 'en_cours',
    }])
    await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', reservation.id)
    setUpdating(null)
    loadReservations()
  }

  // ── Annuler ──────────────────────────────────────────────
  const handleCancel = async (reservation) => {
    setUpdating(reservation.id)
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', reservation.id)
    // Restituer l'exemplaire
    const { data: book } = await supabase.from('books').select('available_copies').eq('id', reservation.book_id).single()
    if (book) await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', reservation.book_id)
    setUpdating(null)
    loadReservations()
  }

  const filtered  = reservations.filter(r => filter === 'all' || r.status === filter)
  const pending   = reservations.filter(r => r.status === 'pending').length

  const timeLeft = (expiresAt) => {
    const ms   = new Date(expiresAt) - new Date()
    if (ms <= 0) return 'Expirée'
    const h = Math.floor(ms / (1000 * 60 * 60))
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${h}h ${m}min restantes`
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Réservations</h1>
        <p className="text-slate-400 text-sm mt-1">{pending} en attente</p>
      </div>

      {/* Validation par code */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-blue-700" />
          <h2 className="text-sm font-bold text-blue-800">Valider par code coursier</h2>
        </div>
        {codeError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{codeError}</p>}
        {codeSuccess && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-3">{codeSuccess}</p>}
        <div className="flex gap-3">
          <input
            type="text" maxLength={4} value={codeInput}
            onChange={e => { setCodeInput(e.target.value.replace(/\D/g, '')); setCdError(''); setCodeSuccess('') }}
            placeholder="0000"
            className="w-28 text-center text-2xl font-bold tracking-widest border-2 border-blue-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-white"
          />
          <button onClick={handleValidateCode} disabled={processing || codeInput.length !== 4}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Check className="w-4 h-4" />
            {processing ? 'Validation...' : 'Valider l\'emprunt'}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'pending', label: 'En attente' }, { key: 'confirmed', label: 'Confirmées' }, { key: 'cancelled', label: 'Annulées' }, { key: 'expired', label: 'Expirées' }, { key: 'all', label: 'Toutes' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filter === f.key ? 'bg-green-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? <p className="text-slate-400 text-sm">Chargement...</p> : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><p className="font-medium">Aucune réservation</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const cfg      = STATUS_CFG[r.status] || STATUS_CFG.pending
            const isCourier = r.pickup_type === 'courier'
            const isPending = r.status === 'pending'
            return (
              <div key={r.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isPending ? 'border-blue-200' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {r.books?.cover_url ? <img src={r.books.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{r.books?.title}</p>
                    <p className="text-slate-400 text-xs">{r.profiles?.full_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>{cfg.label}</span>
                      <span className={`flex items-center gap-1 text-xs ${isCourier ? 'text-blue-600' : 'text-slate-400'}`}>
                        {isCourier ? <Truck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {isCourier ? `Coursier — code : ${r.pickup_code}` : 'Retrait en personne'}
                      </span>
                      {isPending && <span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" />{timeLeft(r.expires_at)}</span>}
                    </div>
                  </div>
                  {isPending && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleConfirm(r)} disabled={updating === r.id}
                        title="Confirmer et créer l'emprunt"
                        className="p-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleCancel(r)} disabled={updating === r.id}
                        title="Annuler la réservation"
                        className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminReservationsPage
