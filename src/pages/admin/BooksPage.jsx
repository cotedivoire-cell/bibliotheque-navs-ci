import { useEffect, useState } from 'react'
import { Plus, X, Pencil, Trash2, QrCode, AlertCircle, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const EMPTY_FORM = {
  title: '', author: '', category_id: '', language: 'FR',
  summary: '', total_copies: 1, rental_price: 0, isbn: '',
}

/* Renommage catégories factices côté affichage */
const displayCat = (name) => name === 'Le Virement' ? 'Vie Chrétienne' : name

function BooksPage() {
  const [books,         setBooks]         = useState([])
  const [categories,    setCategories]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [coverFile,     setCoverFile]     = useState(null)
  const [coverPreview,  setCoverPreview]  = useState(null)
  const [showNewCat,    setShowNewCat]    = useState(false)
  const [newCatName,    setNewCatName]    = useState('')
  const [savingCat,     setSavingCat]     = useState(false)
  const [editingBook,   setEditingBook]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(null)
  const [deleteError,   setDeleteError]   = useState('')
  const [qrBook,        setQrBook]        = useState(null)
  const [page,          setPage]          = useState(1)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [booksRes, catsRes] = await Promise.all([
      supabase.from('books').select('*, categories(id, name)').eq('is_active', true).order('title'),
      supabase.from('categories').select('*').order('name'),
    ])
    setPage(1)
    setBooks(booksRes.data || [])
    setCategories(catsRes.data || [])
    setLoading(false)
  }

  const handleEdit = (book) => {
    setEditingBook(book)
    setForm({ title:book.title||'', author:book.author||'', category_id:book.category_id||'', language:book.language||'FR', summary:book.summary||'', total_copies:book.total_copies, rental_price:book.rental_price||0, isbn:book.isbn||'' })
    setCoverPreview(book.cover_url||null)
    setCoverFile(null)
    setShowForm(true)
    setError(''); setSuccess('')
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  const resetForm = () => { setShowForm(false); setEditingBook(null); setForm(EMPTY_FORM); setCoverFile(null); setCoverPreview(null); setError('') }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const { data, error } = await supabase.from('categories').insert([{ name:newCatName.trim() }]).select().single()
    if (!error && data) { setCategories(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name))); setForm(prev=>({...prev,category_id:data.id})); setNewCatName(''); setShowNewCat(false) }
    setSavingCat(false)
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]; if (!file) return
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file))
  }

  const uploadCover = async (file) => {
    const ext      = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(fileName, file, { cacheControl:'3600', upsert:false })
    if (error) throw error
    const { data:{ publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName)
    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      let cover_url = editingBook?.cover_url || null
      if (coverFile) cover_url = await uploadCover(coverFile)
      if (editingBook) {
        const booksOnLoan  = editingBook.total_copies - editingBook.available_copies
        const newAvailable = Math.max(0, parseInt(form.total_copies) - booksOnLoan)
        const { error:updateError } = await supabase.from('books').update({ title:form.title, author:form.author, category_id:form.category_id||null, language:form.language, summary:form.summary, isbn:form.isbn||null, total_copies:parseInt(form.total_copies), available_copies:newAvailable, rental_price:parseInt(form.rental_price)||0, cover_url }).eq('id', editingBook.id)
        if (updateError) throw updateError
        setSuccess('Livre modifié avec succès.')
      } else {
        const { error:insertError } = await supabase.from('books').insert([{ title:form.title, author:form.author, category_id:form.category_id||null, language:form.language, summary:form.summary, isbn:form.isbn||null, total_copies:parseInt(form.total_copies), available_copies:parseInt(form.total_copies), rental_price:parseInt(form.rental_price)||0, cover_url }])
        if (insertError) throw insertError
        setSuccess('Livre ajouté avec succès.')
      }
      resetForm(); loadAll()
    } catch { setError("Erreur lors de l'enregistrement.") }
    setSaving(false)
  }

  const handleDelete = async (book) => {
    setDeleting(book.id); setDeleteError('')
    const { error } = await supabase.from('books').update({ is_active:false }).eq('id', book.id)
    if (error) { setDeleteError(`Impossible de supprimer "${book.title}".`); setDeleting(null); setConfirmDelete(null); return }
    setConfirmDelete(null); setDeleting(null); loadAll()
  }

  const handleField = (e) => setForm(prev=>({...prev,[e.target.name]:e.target.value}))

  return (
    <AdminLayout>

      {/* ── Modal QR Code ── */}
      {qrBook && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setQrBook(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">{qrBook.title}</h3>
            <p className="text-slate-400 text-xs mb-4">Collez ce QR code sur l'exemplaire</p>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${qrBook.id}&size=200x200&margin=10`} alt="QR" className="mx-auto rounded-2xl border border-slate-100" />
            {qrBook.isbn && <p className="text-slate-400 text-xs mt-3">ISBN : {qrBook.isbn}</p>}
            <button onClick={()=>setQrBook(null)} className="mt-5 w-full py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200 font-medium">Fermer</button>
          </div>
        </div>
      )}

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Livres</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            {loading ? '...' : `${books.length} ouvrage${books.length > 1 ? 's' : ''} dans le catalogue`}
          </p>
        </div>
        <button
          onClick={() => { showForm ? resetForm() : setShowForm(true); setError(''); setSuccess('') }}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-green-700 text-white hover:bg-green-800 shadow-sm'}`}>
          {showForm ? 'Annuler' : '+ Ajouter un livre'}
        </button>
      </div>

      {/* ── Alertes globales ── */}
      {deleteError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{deleteError}</span>
          <button onClick={()=>setDeleteError('')} className="ml-auto opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-2xl mb-5">{success}</div>
      )}

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-6">
            {editingBook ? `Modifier : ${editingBook.title}` : 'Nouveau livre'}
          </h2>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Couverture */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-28 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-100">
                {coverPreview
                  ? <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  : <BookOpen className="w-6 h-6 text-slate-300" strokeWidth={1} />}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Photo de couverture</label>
                <input type="file" accept="image/*" onChange={handleCoverChange}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:rounded-xl file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Titre *</label>
                <input type="text" name="title" required value={form.title} onChange={handleField} placeholder="Titre du livre"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Auteur *</label>
                <input type="text" name="author" required value={form.author} onChange={handleField} placeholder="Nom de l'auteur"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ISBN <span className="text-slate-400 font-normal">(pour le scan)</span></label>
              <input type="text" name="isbn" value={form.isbn} onChange={handleField} placeholder="ex: 9782123456789"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Catégorie</label>
                <div className="flex gap-2">
                  <select name="category_id" value={form.category_id} onChange={handleField}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600 focus:border-green-600">
                    <option value="">Sélectionner</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{displayCat(c.name)}</option>)}
                  </select>
                  <button type="button" onClick={()=>setShowNewCat(v=>!v)}
                    className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:border-green-500 hover:text-green-600 transition-colors">
                    {showNewCat ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
                {showNewCat && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Nouvelle catégorie"
                      className="flex-1 bg-slate-50 border border-green-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
                      onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),handleCreateCategory())} />
                    <button type="button" onClick={handleCreateCategory} disabled={savingCat||!newCatName.trim()}
                      className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-50">
                      {savingCat ? '...' : 'Créer'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Langue</label>
                <div className="flex gap-2">
                  {[{value:'FR',label:'Français'},{value:'EN',label:'Anglais'}].map(opt=>(
                    <button key={opt.value} type="button" onClick={()=>setForm(p=>({...p,language:opt.value}))}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-colors ${form.language===opt.value ? 'border-green-700 bg-green-50 text-green-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Résumé</label>
              <textarea name="summary" value={form.summary} onChange={handleField} rows={3} placeholder="Description du livre..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600 focus:border-green-600 resize-none transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Exemplaires *</label>
                <input type="number" name="total_copies" required min="1" value={form.total_copies} onChange={handleField}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Frais d'emprunt (FCFA)</label>
                <input type="number" name="rental_price" min="0" value={form.rental_price} onChange={handleField}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-green-700 text-white py-3 rounded-xl text-sm font-semibold tracking-wide hover:bg-green-800 active:scale-[.99] transition-all disabled:opacity-50 shadow-sm">
              {saving ? 'Enregistrement...' : editingBook ? 'Enregistrer les modifications' : 'Ajouter le livre'}
            </button>
          </form>
        </div>
      )}

      {/* ── Grille livres ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-20 bg-slate-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24">
          <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-slate-400 text-sm font-light">Aucun livre dans le catalogue</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(book=>(
            <div key={book.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4">
              <div className="flex gap-4">
                {/* Couverture */}
                <div className="w-14 h-20 bg-slate-50 overflow-hidden flex-shrink-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]" style={{borderRadius:0}}>
                  {book.cover_url
                    ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" style={{borderRadius:0}} />
                    : <div className="w-full h-full bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center">
                        <span className="text-white/70 text-lg font-bold">{book.title?.charAt(0)}</span>
                      </div>
                  }
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{book.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5 truncate capitalize">{book.author}</p>
                  {book.isbn && <p className="text-slate-300 text-xs mt-0.5">ISBN {book.isbn}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {book.categories?.name && (
                      <span className="bg-green-50 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                        {displayCat(book.categories.name)}
                      </span>
                    )}
                    <span className="bg-slate-50 text-slate-500 text-xs px-2.5 py-0.5 rounded-full">
                      {book.language==='EN' ? 'Anglais' : 'Français'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1.5">
                    <span className={book.available_copies > 0 ? 'text-green-600 font-medium' : 'text-red-400'}>
                      {book.available_copies}
                    </span>
                    <span className="text-slate-300">/{book.total_copies} dispo.</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              {confirmDelete === book.id ? (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <p className="text-xs text-red-500 font-medium">Confirmer la suppression ?</p>
                  <div className="flex gap-1.5">
                    <button onClick={()=>setConfirmDelete(null)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                      Annuler
                    </button>
                    <button onClick={()=>handleDelete(book)} disabled={deleting===book.id}
                      className="px-3 py-1.5 text-xs text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">
                      {deleting===book.id ? '...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                  {/* QR Code — icône seule */}
                  <button onClick={()=>setQrBook(book)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                    <QrCode className="w-4 h-4" strokeWidth={1.5} />
                  </button>

                  <div className="flex gap-1">
                    {/* Modifier */}
                    <button onClick={()=>handleEdit(book)}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-green-700 hover:bg-green-50 rounded-xl px-3 py-1.5 transition-all text-xs font-medium">
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Modifier
                    </button>
                    {/* Supprimer */}
                    <button onClick={()=>setConfirmDelete(book.id)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl px-3 py-1.5 transition-all text-xs font-medium">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, books.length)} sur {books.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors">
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                  n === page ? 'bg-green-700 text-white font-semibold' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors">
              →
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default BooksPage
