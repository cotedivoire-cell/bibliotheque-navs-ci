import { useEffect, useState } from 'react'
import { Plus, X, Pencil, Trash2, QrCode } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const EMPTY_FORM = {
  title: '', author: '', category_id: '', language: 'FR',
  summary: '', total_copies: 1, rental_price: 0, isbn: '',
}

function BooksPage() {
  const [books,        setBooks]        = useState([])
  const [categories,   setCategories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [coverFile,    setCoverFile]    = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [showNewCat,   setShowNewCat]   = useState(false)
  const [newCatName,   setNewCatName]   = useState('')
  const [savingCat,    setSavingCat]    = useState(false)
  const [editingBook,   setEditingBook]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(null)
  const [qrBook,        setQrBook]        = useState(null) // livre dont on affiche le QR

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [booksRes, catsRes] = await Promise.all([
      supabase.from('books').select('*, categories(id, name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ])
    setBooks(booksRes.data || [])
    setCategories(catsRes.data || [])
    setLoading(false)
  }

  const handleEdit = (book) => {
    setEditingBook(book)
    setForm({
      title:        book.title || '',
      author:       book.author || '',
      category_id:  book.category_id || '',
      language:     book.language || 'FR',
      summary:      book.summary || '',
      total_copies: book.total_copies,
      rental_price: book.rental_price || 0,
      isbn:         book.isbn || '',
    })
    setCoverPreview(book.cover_url || null)
    setCoverFile(null)
    setShowForm(true)
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingBook(null)
    setForm(EMPTY_FORM)
    setCoverFile(null)
    setCoverPreview(null)
    setError('')
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const { data, error } = await supabase.from('categories').insert([{ name: newCatName.trim() }]).select().single()
    if (!error && data) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(prev => ({ ...prev, category_id: data.id }))
      setNewCatName('')
      setShowNewCat(false)
    }
    setSavingCat(false)
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const uploadCover = async (file) => {
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName)
    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      let cover_url = editingBook?.cover_url || null
      if (coverFile) cover_url = await uploadCover(coverFile)

      if (editingBook) {
        const booksOnLoan = editingBook.total_copies - editingBook.available_copies
        const newAvailable = Math.max(0, parseInt(form.total_copies) - booksOnLoan)
        const { error: updateError } = await supabase.from('books').update({
          title: form.title, author: form.author, category_id: form.category_id || null,
          language: form.language, summary: form.summary, isbn: form.isbn || null,
          total_copies: parseInt(form.total_copies), available_copies: newAvailable,
          rental_price: parseInt(form.rental_price) || 0, cover_url,
        }).eq('id', editingBook.id)
        if (updateError) throw updateError
        setSuccess('Livre modifié avec succès.')
      } else {
        const { error: insertError } = await supabase.from('books').insert([{
          title: form.title, author: form.author, category_id: form.category_id || null,
          language: form.language, summary: form.summary, isbn: form.isbn || null,
          total_copies: parseInt(form.total_copies), available_copies: parseInt(form.total_copies),
          rental_price: parseInt(form.rental_price) || 0, cover_url,
        }])
        if (insertError) throw insertError
        setSuccess('Livre ajouté avec succès.')
      }
      resetForm()
      loadAll()
    } catch {
      setError("Erreur lors de l'enregistrement.")
    }
    setSaving(false)
  }

  const handleDelete = async (bookId) => {
    setDeleting(bookId)
    await supabase.from('books').update({ is_active: false }).eq('id', bookId)
    setConfirmDelete(null)
    setDeleting(null)
    loadAll()
  }

  const handleField = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  return (
    <AdminLayout>

      {/* ── Modal QR Code ── */}
      {qrBook && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setQrBook(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1 text-sm">{qrBook.title}</h3>
            <p className="text-slate-400 text-xs mb-4">Collez ce QR code sur le livre</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${qrBook.id}&size=200x200&margin=10`}
              alt="QR Code"
              className="mx-auto rounded-xl border border-slate-100"
            />
            {qrBook.isbn && (
              <p className="text-slate-400 text-xs mt-3">ISBN : {qrBook.isbn}</p>
            )}
            <p className="text-slate-300 text-xs mt-1 break-all">{qrBook.id}</p>
            <button onClick={() => setQrBook(null)}
              className="mt-4 w-full py-2 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200">
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Livres</h1>
          <p className="text-slate-400 text-sm mt-1">{books.length} livre(s)</p>
        </div>
        <button
          onClick={() => { showForm ? resetForm() : setShowForm(true); setError(''); setSuccess('') }}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            showForm ? 'bg-slate-200 text-slate-700' : 'bg-green-700 text-white hover:bg-green-800 shadow-sm'
          }`}
        >
          {showForm ? 'Annuler' : '+ Ajouter un livre'}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
          {success}
        </div>
      )}

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-6">
            {editingBook ? `Modifier : ${editingBook.title}` : 'Nouveau livre'}
          </h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Couverture */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200">
                {coverPreview
                  ? <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  : <span className="text-slate-300 text-xs text-center px-2">Photo</span>}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Photo de couverture</label>
                <input type="file" accept="image/*" onChange={handleCoverChange}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:rounded-lg file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
              </div>
            </div>

            {/* Titre & Auteur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                <input type="text" name="title" required value={form.title} onChange={handleField}
                  placeholder="Titre du livre"
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Auteur *</label>
                <input type="text" name="author" required value={form.author} onChange={handleField}
                  placeholder="Nom de l'auteur"
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            {/* ISBN */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ISBN <span className="text-slate-400 font-normal">(code-barres au dos du livre — pour le scan)</span>
              </label>
              <input type="text" name="isbn" value={form.isbn} onChange={handleField}
                placeholder="ex: 9782123456789"
                className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Catégorie + Langue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                <div className="flex gap-2">
                  <select name="category_id" value={form.category_id} onChange={handleField}
                    className="flex-1 border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sélectionner</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewCat(v => !v)}
                    className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 hover:border-green-500 hover:text-green-600 transition-colors">
                    {showNewCat ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
                {showNewCat && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                      placeholder="Nouvelle catégorie"
                      className="flex-1 border border-green-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())} />
                    <button type="button" onClick={handleCreateCategory} disabled={savingCat || !newCatName.trim()}
                      className="px-4 py-2 bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-50">
                      {savingCat ? '...' : 'Créer'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Langue</label>
                <div className="flex gap-3">
                  {[{ value: 'FR', label: 'Français' }, { value: 'EN', label: 'Anglais' }].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(p => ({ ...p, language: opt.value }))}
                      className={`flex-1 py-2.5 text-sm font-medium border transition-colors ${
                        form.language === opt.value ? 'border-green-700 bg-green-50 text-green-800' : 'border-slate-200 text-slate-500'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Résumé */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Résumé</label>
              <textarea name="summary" value={form.summary} onChange={handleField} rows={3}
                placeholder="Description du livre..."
                className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>

            {/* Exemplaires & Prix */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exemplaires *</label>
                <input type="number" name="total_copies" required min="1" value={form.total_copies} onChange={handleField}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prix location (FCFA)</label>
                <input type="number" name="rental_price" min="0" value={form.rental_price} onChange={handleField}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-green-700 text-white py-3 text-sm font-semibold hover:bg-green-800 active:scale-[.99] transition-all disabled:opacity-50">
              {saving ? 'Enregistrement...' : editingBook ? 'Enregistrer les modifications' : 'Ajouter le livre'}
            </button>
          </form>
        </div>
      )}

      {/* ── Liste des livres ── */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-slate-400"><p className="text-lg font-medium">Aucun livre</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(book => (
            <div key={book.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <div className="w-14 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                  {book.cover_url
                    ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><span className="text-slate-300 text-xs">—</span></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{book.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{book.author}</p>
                  {book.isbn && <p className="text-slate-300 text-xs mt-0.5">ISBN : {book.isbn}</p>}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {book.categories?.name && (
                      <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">{book.categories.name}</span>
                    )}
                    <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">
                      {book.language === 'EN' ? 'Anglais' : 'Français'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1.5">{book.available_copies}/{book.total_copies} dispo.</p>
                </div>
              </div>

              {/* Actions */}
              {confirmDelete === book.id ? (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-red-600 font-medium">Confirmer la suppression ?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(null)}
                      className="px-3 py-1 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                      Annuler
                    </button>
                    <button onClick={() => handleDelete(book.id)} disabled={deleting === book.id}
                      className="px-3 py-1 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50">
                      {deleting === book.id ? '...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                  <button onClick={() => setQrBook(book)}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    title="Afficher le QR code">
                    <QrCode className="w-3 h-3" />
                    QR
                  </button>
                  <button onClick={() => handleEdit(book)}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <Pencil className="w-3 h-3" />
                    Modifier
                  </button>
                  <button onClick={() => setConfirmDelete(book.id)}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3 h-3" />
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

export default BooksPage
