import { useEffect, useState, useRef } from 'react'
import { AlertTriangle, CheckCircle, Clock, Pencil, Trash2, X, Check, ScanLine, RotateCcw, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'
import BookScanner from '../../components/BookScanner'

const TODAY = new Date().toISOString().split('T')[0]

const STATUS = {
  en_cours:  { label: 'En cours',  style: 'bg-blue-50 text-blue-700',   Icon: Clock         },
  en_retard: { label: 'En retard', style: 'bg-red-50 text-red-700',     Icon: AlertTriangle },
  retourné:  { label: 'Retourné',  style: 'bg-green-50 text-green-700', Icon: CheckCircle   },
}

const EMPTY_FORM = {
  member_id: '', book_id: '', loan_type: 'location',
  amount_paid: 0, borrowed_at: TODAY, due_date: '',
}

function BorrowingsPage() {
  const [borrowings,    setBorrowings]    = useState([])
  const [members,       setMembers]       = useState([])
  const [books,         setBooks]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [editingDate,   setEditingDate]   = useState(null)
  const [newDueDate,    setNewDueDate]    = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(null)
  const [scanMode,      setScanMode]      = useState(null)
  const [scanMsg,       setScanMsg]       = useState('')
  const [scanSuccess,   setScanSuccess]   = useState(false)
  const [scanLoading,   setScanLoading]   = useState(false)

  // ── Ref pour éviter le problème de closure stale ──────────
  const scanModeRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    await supabase.from('borrowings').update({ status: 'en_retard' })
      .eq('status', 'en_cours').lt('due_date', TODAY)

    const [bRes, mRes, bookRes] = await Promise.all([
      supabase.from('borrowings')
        .select('*, books(id, title, cover_url, available_copies), profiles(full_name, membership_type)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, membership_type').order('full_name'),
      supabase.from('books')
        .select('id, title, available_copies, isbn')
        .eq('is_active', true).gt('available_copies', 0).order('title'),
    ])

    setBorrowings(bRes.data || [])
    setMembers(mRes.data || [])
    setBooks(bookRes.data || [])
    setLoading(false)
  }

  // ── Démarrer le scan ──────────────────────────────────────
  const startScan = (mode) => {
    scanModeRef.current = mode   // stocker dans le ref (pas de problème de closure)
    setScanMode(mode)
    setScanMsg('')
    setScanSuccess(false)
  }

  // ── Recherche livre par UUID (QR) ou ISBN (code-barres) ───
  const findBook = async (code) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const { data } = await supabase
      .from('books')
      .select('*, categories(name)')
      .eq(uuidRegex.test(code) ? 'id' : 'isbn', code)
      .eq('is_active', true)
      .maybeSingle()
    return data
  }

  // ── Traitement du résultat scan ───────────────────────────
  const handleScanResult = async (code) => {
    const mode = scanModeRef.current  // lire depuis le ref (valeur stable)
    setScanMode(null)
    scanModeRef.current = null
    setScanLoading(true)
    setScanMsg('')
    setScanSuccess(false)

    try {
      const book = await findBook(code)

      if (!book) {
        setScanMsg(`Aucun livre trouvé pour ce code. Assurez-vous que l'ISBN est renseigné dans la fiche du livre.`)
        setScanLoading(false)
        return
      }

      if (mode === 'borrow') {
        // ── Pré-remplir le formulaire ──
        if (book.available_copies <= 0) {
          setScanMsg(`"${book.title}" n'est pas disponible en ce moment.`)
          setScanLoading(false)
          return
        }
        setForm(p => ({ ...p, book_id: book.id }))
        setShowForm(true)
        setScanSuccess(true)
        setScanMsg(`Livre détecté : "${book.title}" — complétez le formulaire ci-dessous.`)

      } else if (mode === 'return') {
        // ── Retour rapide ──
        const { data: activeBorrow } = await supabase
          .from('borrowings')
          .select('*, profiles(full_name)')
          .eq('book_id', book.id)
          .in('status', ['en_cours', 'en_retard'])
          .order('borrowed_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (!activeBorrow) {
          setScanMsg(`"${book.title}" n'a aucun emprunt actif à valider.`)
          setScanLoading(false)
          return
        }

        await supabase.from('borrowings')
          .update({ status: 'retourné', returned_at: TODAY })
          .eq('id', activeBorrow.id)

        const { data: bookData } = await supabase
          .from('books').select('available_copies').eq('id', book.id).single()
        await supabase.from('books')
          .update({ available_copies: bookData.available_copies + 1 })
          .eq('id', book.id)

        setScanSuccess(true)
        setScanMsg(`Retour validé — "${book.title}" rendu par ${activeBorrow.profiles?.full_name}.`)
        loadAll()
      }
    } catch {
      setScanMsg('Erreur lors de la recherche. Réessayez.')
    }

    setScanLoading(false)
  }

  const selectedMember = members.find(m => m.id === form.member_id)
  const memberIsAnnual = selectedMember?.membership_type === 'annual'

  // ── Créer un emprunt ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('borrowings').insert([{
        member_id:   form.member_id,
        book_id:     form.book_id,
        loan_type:   form.loan_type,
        amount_paid: form.loan_type === 'abonnement' ? 0 : parseInt(form.amount_paid) || 0,
        borrowed_at: form.borrowed_at,
        due_date:    form.due_date,
        status:      'en_cours',
      }])
      if (insertError) throw insertError
      const { data: book } = await supabase.from('books').select('available_copies').eq('id', form.book_id).single()
      await supabase.from('books').update({ available_copies: book.available_copies - 1 }).eq('id', form.book_id)
      setForm(EMPTY_FORM)
      setShowForm(false)
      setScanMsg('')
      loadAll()
    } catch {
      setError("Erreur lors de la création de l'emprunt.")
    }
    setSaving(false)
  }

  const handleReturn = async (borrowing) => {
    await supabase.from('borrowings').update({ status: 'retourné', returned_at: TODAY }).eq('id', borrowing.id)
    const { data: book } = await supabase.from('books').select('available_copies').eq('id', borrowing.book_id).single()
    await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', borrowing.book_id)
    loadAll()
  }

  const handleSaveDate = async (id) => {
    if (!newDueDate) return
    await supabase.from('borrowings')
      .update({ due_date: newDueDate, status: newDueDate >= TODAY ? 'en_cours' : 'en_retard' })
      .eq('id', id)
    setEditingDate(null)
    setNewDueDate('')
    loadAll()
  }

  const handleDelete = async (borrowing) => {
    setDeleting(borrowing.id)
    if (borrowing.status !== 'retourné') {
      const { data: book } = await supabase.from('books').select('available_copies').eq('id', borrowing.book_id).single()
      if (book) await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', borrowing.book_id)
    }
    await supabase.from('borrowings').delete().eq('id', borrowing.id)
    setConfirmDelete(null)
    setDeleting(null)
    loadAll()
  }

  const activeCount = borrowings.filter(b => b.status === 'en_cours' || b.status === 'en_retard').length

  return (
    <AdminLayout>

      {/* ── Scanner overlay ── */}
      {scanMode && (
        <BookScanner
          title={scanMode === 'borrow' ? 'Scanner pour emprunt' : 'Scanner pour retour rapide'}
          onResult={handleScanResult}
          onClose={() => { setScanMode(null); scanModeRef.current = null }}
        />
      )}

      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emprunts</h1>
          <p className="text-slate-400 text-sm mt-1">{activeCount} en cours</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => startScan('return')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
            <RotateCcw className="w-4 h-4" />
            Retour rapide
          </button>
          <button onClick={() => startScan('borrow')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
            <ScanLine className="w-4 h-4" />
            Scanner un livre
          </button>
          <button onClick={() => { setShowForm(v => !v); setError(''); setScanMsg('') }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              showForm ? 'bg-slate-200 text-slate-700' : 'bg-green-700 text-white hover:bg-green-800 shadow-sm'
            }`}>
            {showForm ? 'Annuler' : '+ Créer manuellement'}
          </button>
        </div>
      </div>

      {/* ── Indicateur de chargement post-scan ── */}
      {scanLoading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl mb-5 text-blue-700 text-sm">
          <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
          Recherche du livre en cours...
        </div>
      )}

      {/* ── Message résultat scan ── */}
      {scanMsg && !scanLoading && (
        <div className={`px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-3 ${
          scanSuccess
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <span className="flex-1">{scanMsg}</span>
          <button onClick={() => setScanMsg('')} className="flex-shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Formulaire emprunt ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-6">
            {form.book_id ? "Finaliser l'emprunt (livre pré-sélectionné)" : 'Nouvel emprunt'}
          </h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Membre *</label>
              <select required value={form.member_id}
                onChange={e => setForm(p => ({ ...p, member_id: e.target.value }))}
                className="w-full border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sélectionner un membre</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              {selectedMember && (
                <div className={`mt-2 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  memberIsAnnual ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${memberIsAnnual ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  {memberIsAnnual ? 'Abonnement annuel — pas de frais' : "À l'unité — location payante"}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Livre *</label>
              <select required value={form.book_id}
                onChange={e => setForm(p => ({ ...p, book_id: e.target.value }))}
                className={`w-full border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  form.book_id ? 'border-green-400' : 'border-slate-200'
                }`}>
                <option value="">Sélectionner un livre disponible</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} — {b.available_copies} dispo.</option>)}
              </select>
              {form.book_id && (
                <p className="text-xs text-green-600 mt-1 font-medium">Livre pré-sélectionné par le scan</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type d'emprunt *</label>
              <div className="flex gap-3">
                {[{ value: 'location', label: "Location à l'unité" }, { value: 'abonnement', label: 'Abonnement annuel' }].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(p => ({ ...p, loan_type: opt.value }))}
                    className={`flex-1 py-2.5 text-sm font-medium border transition-colors ${
                      form.loan_type === opt.value ? 'border-green-700 bg-green-50 text-green-800' : 'border-slate-200 text-slate-500'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {form.loan_type === 'location' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant payé (FCFA)</label>
                <input type="number" min="0" value={form.amount_paid}
                  onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date d'emprunt *</label>
                <input type="date" required value={form.borrowed_at}
                  onChange={e => setForm(p => ({ ...p, borrowed_at: e.target.value }))}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date limite *</label>
                <input type="date" required value={form.due_date} min={form.borrowed_at}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-green-700 text-white py-3 text-sm font-semibold hover:bg-green-800 transition-all disabled:opacity-50">
              {saving ? 'Enregistrement...' : "Créer l'emprunt"}
            </button>
          </form>
        </div>
      )}

      {/* ── Liste des emprunts ── */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : borrowings.length === 0 ? (
        <div className="text-center py-20 text-slate-400"><p className="font-medium">Aucun emprunt</p></div>
      ) : (
        <div className="space-y-3">
          {borrowings.map(b => {
            const cfg        = STATUS[b.status] || STATUS.en_cours
            const StatusIcon = cfg.Icon
            const isActive   = b.status === 'en_cours' || b.status === 'en_retard'

            return (
              <div key={b.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${
                b.status === 'en_retard' ? 'border-red-200' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {b.books?.cover_url
                      ? <img src={b.books.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{b.books?.title}</p>
                    <p className="text-slate-400 text-xs">{b.profiles?.full_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(b.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {isActive && (
                      <button onClick={() => handleReturn(b)}
                        className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors">
                        Retour
                      </button>
                    )}
                    <div className="flex gap-1">
                      {isActive && (
                        <button onClick={() => { setEditingDate(b.id); setNewDueDate(b.due_date) }}
                          className="p-1.5 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setConfirmDelete(b.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {editingDate === b.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Nouvelle date limite</label>
                      <input type="date" value={newDueDate} min={b.borrowed_at}
                        onChange={e => setNewDueDate(e.target.value)}
                        className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditingDate(null)}
                        className="p-2 text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSaveDate(b.id)}
                        className="p-2 text-white bg-green-700 rounded-lg hover:bg-green-800">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {confirmDelete === b.id && (
                  <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between">
                    <p className="text-xs text-red-600 font-medium">
                      Supprimer ?{b.status !== 'retourné' && ' Le stock sera restauré.'}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                        Annuler
                      </button>
                      <button onClick={() => handleDelete(b)} disabled={deleting === b.id}
                        className="px-3 py-1 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50">
                        {deleting === b.id ? '...' : 'Confirmer'}
                      </button>
                    </div>
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

export default BorrowingsPage
