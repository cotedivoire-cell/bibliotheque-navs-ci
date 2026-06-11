import { useEffect, useState, useRef } from 'react'
import {
  AlertTriangle, CheckCircle, Clock, Pencil,
  Trash2, X, Check, ScanLine, RotateCcw, Loader, WifiOff, Users, MessageCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  cacheBooks, getCachedBooks, cacheMembers, getCachedMembers,
  cacheBorrowings, getCachedBorrowings, putCachedBorrowing,
  updateCachedBorrowing, updateCachedBook, enqueue,
} from '../../lib/offlineQueue'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { getWhatsAppMessage } from '../../lib/whatsappTemplates'
import AdminLayout from '../../components/admin/AdminLayout'
import BookScanner from '../../components/BookScanner'

const TODAY = new Date().toISOString().split('T')[0]

const STATUS = {
  en_cours:  { label: 'En cours',       style: 'bg-blue-50 text-blue-700',   Icon: Clock         },
  en_retard: { label: 'En retard',      style: 'bg-red-50 text-red-700',     Icon: AlertTriangle },
  retourné:  { label: 'Retourné',       style: 'bg-green-50 text-green-700', Icon: CheckCircle   },
  offline:   { label: 'En attente sync',style: 'bg-amber-50 text-amber-700', Icon: WifiOff       },
}

const EMPTY_FORM = {
  member_id: '', book_id: '', loan_type: 'location',
  amount_paid: 0, borrowed_at: TODAY, due_date: '', borrowee_name: '',
}

function BorrowingsPage() {
  const { isOnline, refreshPending } = useOnlineStatus()

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
  const [groupActiveCount, setGroupActiveCount] = useState(0)
  const [page, setPage] = useState(1)

  const scanModeRef = useRef(null)

  useEffect(() => { loadAll() }, [isOnline])

  const loadAll = async () => {
    setLoading(true)
    try {
      if (isOnline) {
        await supabase.from('borrowings').update({ status: 'en_retard' }).eq('status', 'en_cours').lt('due_date', TODAY)
        const [bRes, mRes, bookRes] = await Promise.all([
          supabase.from('borrowings')
            .select('*, books(id, title, cover_url, available_copies), profiles(id, full_name, phone, membership_type, account_type, max_borrowings)')
            .order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, phone, membership_type, account_type, max_borrowings').order('full_name'),
          supabase.from('books').select('id, title, available_copies, isbn, cover_url').eq('is_active', true).order('title'),
        ])
        const bData = bRes.data || []
        setBorrowings(bData)
        setMembers(mRes.data || [])
        setBooks((bookRes.data || []).filter(b => b.available_copies > 0))
        await Promise.all([
          cacheBorrowings(bData.map(b => ({ ...b, _book_title: b.books?.title, _book_cover: b.books?.cover_url, _member_name: b.profiles?.full_name, _member_type: b.profiles?.membership_type }))),
          cacheMembers(mRes.data || []),
          cacheBooks(bookRes.data || []),
        ])
      } else {
        const [cachedB, cachedM, cachedBooks] = await Promise.all([getCachedBorrowings(), getCachedMembers(), getCachedBooks()])
        setBorrowings(cachedB.map(b => ({ ...b, books: { title: b._book_title, cover_url: b._book_cover }, profiles: { full_name: b._member_name, membership_type: b._member_type } })))
        setMembers(cachedM)
        setBooks(cachedBooks.filter(b => b.available_copies > 0 && b.is_active))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  // ── WhatsApp relance retard ────────────────────────────────
  const handleWhatsApp = (b) => {
    const phone = b.profiles?.phone
    const today = new Date(); today.setHours(0,0,0,0)
    const due   = new Date(b.due_date)
    const daysLate = Math.ceil((today - due) / (1000 * 60 * 60 * 24))
    const type  = daysLate >= 3 ? 'overdue3' : 'overdue1'

    const { url, message } = getWhatsAppMessage(type, {
      name:     b.profiles?.full_name || 'Cher(e) membre',
      title:    b.books?.title || 'ce livre',
      daysLate: Math.max(1, daysLate),
      phone,
    })

    if (url) {
      window.open(url, '_blank')
    } else {
      alert(`Numéro non renseigné pour ${b.profiles?.full_name}.\n\nMessage à envoyer :\n\n${message}`)
    }
  }

  const selectedMember  = members.find(m => m.id === form.member_id)
  const memberIsAnnual  = selectedMember?.membership_type === 'annual'
  const memberIsGroup   = selectedMember?.account_type === 'group'
  const memberMaxBorrow = selectedMember?.max_borrowings || 1

  useEffect(() => {
    if (!form.member_id) { setGroupActiveCount(0); return }
    const active = borrowings.filter(b => b.member_id === form.member_id && ['en_cours', 'en_retard'].includes(b.status)).length
    setGroupActiveCount(active)
  }, [form.member_id, borrowings])

  const startScan = (mode) => { scanModeRef.current = mode; setScanMode(mode); setScanMsg(''); setScanSuccess(false) }

  const findBook = async (code) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const field = uuidRegex.test(code) ? 'id' : 'isbn'
    if (isOnline) {
      const { data } = await supabase.from('books').select('*').eq(field, code).eq('is_active', true).maybeSingle()
      return data
    } else {
      const cached = await getCachedBooks()
      return cached.find(b => b[field] === code && b.is_active) || null
    }
  }

  const handleScanResult = async (code) => {
    const mode = scanModeRef.current
    setScanMode(null); scanModeRef.current = null
    setScanLoading(true); setScanMsg(''); setScanSuccess(false)
    try {
      const book = await findBook(code)
      if (!book) { setScanMsg("Aucun livre trouvé. Vérifiez que l'ISBN est renseigné."); setScanLoading(false); return }
      if (mode === 'borrow') {
        if (book.available_copies <= 0) { setScanMsg(`"${book.title}" n'est pas disponible.`); setScanLoading(false); return }
        setForm(p => ({ ...p, book_id: book.id })); setShowForm(true); setScanSuccess(true)
        setScanMsg(`Livre détecté : "${book.title}" — complétez le formulaire.`)
      } else if (mode === 'return') {
        let activeBorrow = null
        if (isOnline) {
          const { data } = await supabase.from('borrowings').select('*, profiles(full_name)').eq('book_id', book.id).in('status', ['en_cours', 'en_retard']).order('borrowed_at', { ascending: true }).limit(1).maybeSingle()
          activeBorrow = data
        } else {
          const cached = await getCachedBorrowings()
          activeBorrow = cached.find(b => b.book_id === book.id && ['en_cours', 'en_retard', 'offline'].includes(b.status))
        }
        if (!activeBorrow) { setScanMsg(`"${book.title}" n'a aucun emprunt actif.`); setScanLoading(false); return }
        await processReturn(activeBorrow, book)
        setScanSuccess(true)
        setScanMsg(`Retour validé — "${book.title}" par ${activeBorrow.profiles?.full_name || activeBorrow._member_name}.`)
      }
    } catch { setScanMsg('Erreur. Réessayez.') }
    setScanLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    const borrowingData = { member_id: form.member_id, book_id: form.book_id, loan_type: form.loan_type, amount_paid: form.loan_type === 'abonnement' ? 0 : parseInt(form.amount_paid) || 0, borrowed_at: form.borrowed_at, due_date: form.due_date, status: 'en_cours', created_at: new Date().toISOString(), borrowee_name: form.borrowee_name.trim() || null }
    const selectedBook = books.find(b => b.id === form.book_id)
    const newAvail = (selectedBook?.available_copies || 1) - 1
    try {
      if (isOnline) {
        const { error: insertError } = await supabase.from('borrowings').insert([borrowingData])
        if (insertError) throw insertError
        await supabase.from('books').update({ available_copies: newAvail }).eq('id', form.book_id)
      } else {
        const localId = `offline_${Date.now()}`
        const member = members.find(m => m.id === form.member_id)
        await enqueue({ type: 'CREATE_BORROWING', data: { borrowingData: { ...borrowingData, id: localId }, bookId: form.book_id, newAvailableCopies: newAvail } })
        await putCachedBorrowing({ ...borrowingData, id: localId, status: 'offline', _book_title: selectedBook?.title, _book_cover: selectedBook?.cover_url, _member_name: member?.full_name, _member_type: member?.membership_type })
        await updateCachedBook(form.book_id, { available_copies: newAvail })
        await refreshPending()
      }
      if (memberIsGroup) setForm(p => ({ ...p, book_id: '', borrowee_name: '' }))
      else { setForm(EMPTY_FORM); setShowForm(false) }
      setScanMsg(''); loadAll()
    } catch { setError("Erreur lors de la création. Réessayez.") }
    setSaving(false)
  }

  const processReturn = async (borrowing, bookOverride) => {
    const bookId = borrowing.book_id
    const book   = bookOverride || books.find(b => b.id === bookId)
    const newAvail = ((book?.available_copies) || 0) + 1
    if (isOnline) {
      await supabase.from('borrowings').update({ status: 'retourné', returned_at: TODAY }).eq('id', borrowing.id)
      await supabase.from('books').update({ available_copies: newAvail }).eq('id', bookId)
      // Notification au membre
      const bookTitle = book?.title || 'votre livre'
      await supabase.from('notifications').insert([{
        user_id: borrowing.member_id,
        message: `Le retour de "${bookTitle}" a bien été enregistré. Merci !`,
      }])
    } else {
      await enqueue({ type: 'RETURN_BOOK', data: { borrowingId: borrowing.id, bookId, returnedAt: TODAY, newAvailableCopies: newAvail } })
      await updateCachedBorrowing(borrowing.id, { status: 'retourné', returned_at: TODAY })
      await updateCachedBook(bookId, { available_copies: newAvail })
      await refreshPending()
    }
    loadAll()
  }

  const handleReturn   = (b) => processReturn(b)
  const handleSaveDate = async (id) => {
    if (!newDueDate) return
    await supabase.from('borrowings').update({ due_date: newDueDate, status: newDueDate >= TODAY ? 'en_cours' : 'en_retard' }).eq('id', id)
    setEditingDate(null); setNewDueDate(''); loadAll()
  }
  const handleDelete = async (borrowing) => {
    setDeleting(borrowing.id)
    if (borrowing.status !== 'retourné') {
      const { data: book } = await supabase.from('books').select('available_copies').eq('id', borrowing.book_id).single()
      if (book) await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', borrowing.book_id)
    }
    await supabase.from('borrowings').delete().eq('id', borrowing.id)
    setConfirmDelete(null); setDeleting(null); loadAll()
  }

  const activeCount    = borrowings.filter(b => ['en_cours', 'en_retard', 'offline'].includes(b.status)).length
  const overdueCount   = borrowings.filter(b => b.status === 'en_retard').length

  const PAGE_SIZE  = 12
  const dataList   = borrowings
  const totalPages = Math.ceil(dataList.length / PAGE_SIZE)
  const paginated  = dataList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AdminLayout>
      {scanMode && <BookScanner title={scanMode === 'borrow' ? 'Scanner pour emprunt' : 'Scanner pour retour rapide'} onResult={handleScanResult} onClose={() => { setScanMode(null); scanModeRef.current = null }} />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emprunts</h1>
          <p className="text-slate-400 text-sm mt-1">
            {activeCount} en cours
            {overdueCount > 0 && <span className="ml-2 text-red-500 font-medium">{overdueCount} en retard</span>}
            {!isOnline && <span className="ml-2 text-amber-600 font-medium">(hors-ligne)</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => startScan('return')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"><RotateCcw className="w-4 h-4" />Retour rapide</button>
          <button onClick={() => startScan('borrow')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><ScanLine className="w-4 h-4" />Scanner un livre</button>
          <button onClick={() => { setShowForm(v => !v); setError(''); setScanMsg('') }} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-slate-200 text-slate-700' : 'bg-green-700 text-white hover:bg-green-800 shadow-sm'}`}>{showForm ? 'Annuler' : '+ Créer manuellement'}</button>
        </div>
      </div>

      {scanLoading && <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl mb-5 text-blue-700 text-sm"><Loader className="w-4 h-4 animate-spin flex-shrink-0" />Recherche du livre...</div>}
      {scanMsg && !scanLoading && <div className={`px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-3 ${scanSuccess ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}><span className="flex-1">{scanMsg}</span><button onClick={() => setScanMsg('')} className="flex-shrink-0 opacity-60"><X className="w-4 h-4" /></button></div>}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-6">
            {memberIsGroup ? `Emprunt de groupe — ${groupActiveCount}/${memberMaxBorrow} actifs` : form.book_id ? "Finaliser l'emprunt" : 'Nouvel emprunt'}
            {!isOnline && <span className="ml-2 text-xs text-amber-600">(sync différée)</span>}
          </h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Membre *</label>
              <select required value={form.member_id} onChange={e => setForm(p => ({ ...p, member_id: e.target.value, borrowee_name: '' }))} className="w-full border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sélectionner un membre</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.account_type === 'group' ? '👥 ' : ''}{m.full_name}</option>)}
              </select>
              {selectedMember && (
                <>
                  <div className={`mt-2 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${memberIsAnnual ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${memberIsAnnual ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    {memberIsAnnual ? 'Abonnement annuel — pas de frais' : "À l'unité — location payante"}
                  </div>
                  {memberIsGroup && (
                    <div className="mt-2 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800">
                      <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />Compte Groupe — Quota Élargi</div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${groupActiveCount >= memberMaxBorrow ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{groupActiveCount}/{memberMaxBorrow} livres actifs</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Livre *</label>
              <select required value={form.book_id} onChange={e => setForm(p => ({ ...p, book_id: e.target.value }))} className={`w-full border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 ${form.book_id ? 'border-green-400' : 'border-slate-200'}`}>
                <option value="">Sélectionner un livre disponible</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} — {b.available_copies} dispo.</option>)}
              </select>
            </div>
            {memberIsGroup && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destinataire <span className="text-slate-400 font-normal">(optionnel)</span></label>
                <input type="text" value={form.borrowee_name} onChange={e => setForm(p => ({ ...p, borrowee_name: e.target.value }))} placeholder="Nom du membre du groupe" className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type d'emprunt *</label>
              <div className="flex gap-3">
                {[{ value: 'location', label: "Location à l'unité" }, { value: 'abonnement', label: 'Abonnement annuel' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, loan_type: opt.value }))} className={`flex-1 py-2.5 text-sm font-medium border transition-colors ${form.loan_type === opt.value ? 'border-green-700 bg-green-50 text-green-800' : 'border-slate-200 text-slate-500'}`}>{opt.label}</button>
                ))}
              </div>
            </div>
            {form.loan_type === 'location' && <div><label className="block text-sm font-medium text-slate-700 mb-1">Montant payé (FCFA)</label><input type="number" min="0" value={form.amount_paid} onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>}
            <div className="grid grid-cols-2 gap-5">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date d'emprunt *</label><input type="date" required value={form.borrowed_at} onChange={e => setForm(p => ({ ...p, borrowed_at: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date limite *</label><input type="date" required value={form.due_date} min={form.borrowed_at} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-green-700 text-white py-3 text-sm font-semibold hover:bg-green-800 transition-all disabled:opacity-50">
              {saving ? 'Enregistrement...' : memberIsGroup ? `Enregistrer ce livre du groupe (${groupActiveCount + 1}/${memberMaxBorrow})` : "Créer l'emprunt"}
            </button>
            {memberIsGroup && <p className="text-xs text-blue-600 text-center">Le formulaire reste ouvert pour ajouter un autre livre au groupe.</p>}
          </form>
        </div>
      )}

      {loading ? <p className="text-slate-400 text-sm">Chargement...</p> : borrowings.length === 0 ? <div className="text-center py-20 text-slate-400"><p className="font-medium">Aucun emprunt</p></div> : (
        <div className="space-y-3">
          {paginated.map(b => {
            const cfg = STATUS[b.status] || STATUS.en_cours
            const StatusIcon = cfg.Icon
            const isActive  = ['en_cours', 'en_retard', 'offline'].includes(b.status)
            const isOffline = b.status === 'offline'
            const isLate    = b.status === 'en_retard'
            const isGroup   = b.profiles?.account_type === 'group'

            return (
              <div key={b.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isLate ? 'border-red-200' : isOffline ? 'border-amber-200' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {(b.books?.cover_url || b._book_cover) ? <img src={b.books?.cover_url || b._book_cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{b.books?.title || b._book_title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-slate-400 text-xs">{b.profiles?.full_name || b._member_name}</p>
                      {isGroup && <Users className="w-3 h-3 text-blue-500" />}
                      {b.borrowee_name && <span className="text-xs text-blue-600 font-medium">→ {b.borrowee_name}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.style}`}><StatusIcon className="w-3 h-3" />{cfg.label}</span>
                      {!isOffline && <span className="text-xs text-slate-400">{new Date(b.due_date).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>
                  {!isOffline && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {isActive && <button onClick={() => handleReturn(b)} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100">Retour</button>}
                      <div className="flex gap-1">
                        {/* Bouton WhatsApp (emprunts en retard uniquement) */}
                        {isLate && (
                          <button onClick={() => handleWhatsApp(b)} title="Relancer via WhatsApp"
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isActive && <button onClick={() => { setEditingDate(b.id); setNewDueDate(b.due_date) }} className="p-1.5 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>}
                        <button onClick={() => setConfirmDelete(b.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
                {editingDate === b.id && <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3"><div className="flex-1"><label className="block text-xs text-slate-500 mb-1">Nouvelle date limite</label><input type="date" value={newDueDate} min={b.borrowed_at} onChange={e => setNewDueDate(e.target.value)} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div><div className="flex gap-2 mt-4"><button onClick={() => setEditingDate(null)} className="p-2 text-slate-400 border border-slate-200 rounded-lg"><X className="w-3.5 h-3.5" /></button><button onClick={() => handleSaveDate(b.id)} className="p-2 text-white bg-green-700 rounded-lg"><Check className="w-3.5 h-3.5" /></button></div></div>}
                {confirmDelete === b.id && <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between"><p className="text-xs text-red-600 font-medium">Supprimer ?{b.status !== 'retourné' && ' Stock restauré.'}</p><div className="flex gap-2"><button onClick={() => setConfirmDelete(null)} className="px-3 py-1 text-xs text-slate-500 border border-slate-200 rounded-lg">Annuler</button><button onClick={() => handleDelete(b)} disabled={deleting === b.id} className="px-3 py-1 text-xs text-white bg-red-500 rounded-lg disabled:opacity-50">{deleting === b.id ? '...' : 'Confirmer'}</button></div></div>}
              </div>
            )
          })}
        </div>
      )}
    
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, dataList.length)} sur {dataList.length} emprunts
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors">←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 text-xs rounded-lg transition-colors ${n === page ? 'bg-green-700 text-white font-semibold' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors">→</button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default BorrowingsPage
