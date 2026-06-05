import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const EMPTY_FORM = {
  title: '', author: '', category_id: '', language: 'FR',
  summary: '', total_copies: 1, rental_price: 0,
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

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [booksRes, catsRes] = await Promise.all([
      supabase.from('books')
        .select('*, categories(id, name)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ])
    setBooks(booksRes.data || [])
    setCategories(catsRes.data || [])
    setLoading(false)
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: newCatName.trim() }])
      .select().single()
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
    const ext      = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('covers').upload(fileName, file, { cacheControl: '3600', upsert: false })
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
      let cover_url = null
      if (coverFile) cover_url = await uploadCover(coverFile)
      const { error: insertError } = await supabase.from('books').insert([{
        title:            form.title,
        author:           form.author,
        category_id:      form.category_id || null,
        language:         form.language,
        summary:          form.summary,
        total_copies:     parseInt(form.total_copies),
        available_copies: parseInt(form.total_copies),
        rental_price:     parseInt(form.rental_price) || 0,
        cover_url,
      }])
      if (insertError) throw insertError
      setSuccess('Livre ajouté avec succès.')
      setForm(EMPTY_FORM)
      setCoverFile(null)
      setCoverPreview(null)
      setShowForm(false)
      loadAll()
    } catch {
      setError("Erreur lors de l'enregistrement. Réessaie.")
    }
    setSaving(false)
  }

  const handleField = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Livres</h1>
          <p className="text-slate-400 text-sm mt-1">{books.length} livre(s) dans la bibliothèque</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(''); setSuccess('') }}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            showForm
              ? 'bg-slate-200 text-slate-700'
              : 'bg-green-700 text-white hover:bg-green-800 shadow-sm'
          }`}
        >
          {showForm ? 'Annuler' : '+ Ajouter un livre'}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm
                        px-4 py-3 rounded-xl mb-6">{success}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-6">Nouveau livre</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                            px-4 py-3 rounded-xl mb-5">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Couverture */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden
                              flex items-center justify-center flex-shrink-0 border border-slate-200">
                {coverPreview
                  ? <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  : <span className="text-slate-300 text-xs text-center px-2">Photo</span>}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Photo de couverture
                </label>
                <input type="file" accept="image/*" onChange={handleCoverChange}
                  className="w-full text-sm text-slate-500
                             file:mr-3 file:py-2 file:px-4 file:border-0
                             file:rounded-lg file:text-sm file:font-medium
                             file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                <p className="text-xs text-slate-400 mt-1">JPG ou PNG recommandé</p>
              </div>
            </div>

            {/* Titre & Auteur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                <input type="text" name="title" required value={form.title} onChange={handleField}
                  placeholder="Titre du livre"
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Auteur *</label>
                <input type="text" name="author" required value={form.author} onChange={handleField}
                  placeholder="Nom de l'auteur"
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            {/* Catégorie + Langue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Catégorie dynamique */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                <div className="flex gap-2">
                  <select name="category_id" value={form.category_id} onChange={handleField}
                    className="flex-1 border border-slate-200 px-4 py-2.5 text-sm bg-white
                               focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sélectionner</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowNewCat(v => !v)}
                    className="w-10 h-10 flex items-center justify-center
                               border border-slate-200 text-slate-500
                               hover:border-green-500 hover:text-green-600 transition-colors">
                    {showNewCat ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
                {showNewCat && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Nouvelle catégorie"
                      className="flex-1 border border-green-300 px-4 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-green-500"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())} />
                    <button type="button" onClick={handleCreateCategory}
                      disabled={savingCat || !newCatName.trim()}
                      className="px-4 py-2 bg-green-700 text-white text-sm font-medium
                                 hover:bg-green-800 disabled:opacity-50 transition-colors">
                      {savingCat ? '...' : 'Créer'}
                    </button>
                  </div>
                )}
              </div>

              {/* Langue */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Langue</label>
                <div className="flex gap-3">
                  {[
                    { value: 'FR', label: 'Français' },
                    { value: 'EN', label: 'Anglais'  },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(p => ({ ...p, language: opt.value }))}
                      className={`flex-1 py-2.5 text-sm font-medium border transition-colors ${
                        form.language === opt.value
                          ? 'border-green-700 bg-green-50 text-green-800'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
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
                className="w-full border border-slate-200 px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>

            {/* Exemplaires & Prix */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Exemplaires *
                </label>
                <input type="number" name="total_copies" required min="1"
                  value={form.total_copies} onChange={handleField}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prix location (FCFA)
                </label>
                <input type="number" name="rental_price" min="0"
                  value={form.rental_price} onChange={handleField}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-green-700 text-white py-3 text-sm font-semibold
                         hover:bg-green-800 active:scale-[.99] transition-all disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer le livre'}
            </button>
          </form>
        </div>
      )}

      {/* Liste des livres */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">Aucun livre pour l'instant</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(book => (
            <div key={book.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm
                         overflow-hidden flex gap-4 p-4 hover:shadow-md transition-shadow">
              <div className="w-14 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                {book.cover_url
                  ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-slate-300 text-xs">—</span>
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm truncate">{book.title}</h3>
                <p className="text-slate-400 text-xs mt-0.5 truncate">{book.author}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {book.categories?.name && (
                    <span className="inline-block bg-green-50 text-green-700 text-xs
                                     px-2 py-0.5 rounded-full">
                      {book.categories.name}
                    </span>
                  )}
                  <span className="inline-block bg-slate-100 text-slate-500 text-xs
                                   px-2 py-0.5 rounded-full">
                    {book.language === 'EN' ? 'Anglais' : 'Français'}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-1.5">
                  {book.available_copies}/{book.total_copies} dispo.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

export default BooksPage
