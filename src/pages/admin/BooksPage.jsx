import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const CATEGORIES = [
  'Théologie',
  'Croissance spirituelle',
  'Biographies',
  'Romans chrétiens',
  'Évangélisation',
  'Leadership',
  'Famille et Mariage',
  'Deuil et Souffrance',
  'Autre',
]

const EMPTY_FORM = {
  title: '',
  author: '',
  category: '',
  summary: '',
  total_copies: 1,
  rental_price: 0,
}

function BooksPage() {
  const [books,       setBooks]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [coverFile,   setCoverFile]   = useState(null)
  const [coverPreview,setCoverPreview]= useState(null)

  useEffect(() => { loadBooks() }, [])

  // ── Chargement des livres ──────────────────────────────────
  const loadBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    setBooks(data || [])
    setLoading(false)
  }

  // ── Gestion de la couverture ───────────────────────────────
  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  // ── Upload vers Supabase Storage ───────────────────────────
  const uploadCover = async (file) => {
    const ext      = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('covers')
      .getPublicUrl(fileName)

    return publicUrl
  }

  // ── Soumission du formulaire ───────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      let cover_url = null

      if (coverFile) {
        cover_url = await uploadCover(coverFile)
      }

      const { error: insertError } = await supabase.from('books').insert([{
        title:            form.title,
        author:           form.author,
        category:         form.category,
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
      loadBooks()

    } catch (err) {
      setError(
        err.message?.includes('covers')
          ? "Le bucket 'covers' n'existe pas encore dans Supabase Storage. Crée-le et réessaie."
          : "Erreur lors de l'enregistrement. Réessaie."
      )
    }

    setSaving(false)
  }

  const handleField = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <AdminLayout>

      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Livres</h1>
          <p className="text-slate-400 text-sm mt-1">
            {books.length} livre(s) dans la bibliothèque
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(''); setSuccess('') }}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            showForm
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-green-700 text-white hover:bg-green-800 shadow-sm'
          }`}
        >
          {showForm ? 'Annuler' : '+ Ajouter un livre'}
        </button>
      </div>

      {/* Message de succès */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm
                        px-4 py-3 rounded-xl mb-6">
          {success}
        </div>
      )}

      {/* ── Formulaire d'ajout ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-6">
            Nouveau livre
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                            px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Couverture */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden
                              flex items-center justify-center flex-shrink-0 border border-slate-200">
                {coverPreview
                  ? <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  : <span className="text-slate-300 text-xs text-center px-2">Photo</span>
                }
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Photo de couverture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="w-full text-sm text-slate-500
                             file:mr-3 file:py-2 file:px-4 file:border-0
                             file:rounded-lg file:text-sm file:font-medium
                             file:bg-green-50 file:text-green-700
                             hover:file:bg-green-100 transition-colors"
                />
                <p className="text-xs text-slate-400 mt-1">JPG ou PNG recommandé</p>
              </div>
            </div>

            {/* Titre & Auteur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={form.title}
                  onChange={handleField}
                  placeholder="Titre du livre"
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Auteur *
                </label>
                <input
                  type="text"
                  name="author"
                  required
                  value={form.author}
                  onChange={handleField}
                  placeholder="Nom de l'auteur"
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Catégorie
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleField}
                className="w-full border border-slate-200 px-4 py-2.5 text-sm
                           bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Sélectionner une catégorie</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Résumé */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Résumé
              </label>
              <textarea
                name="summary"
                value={form.summary}
                onChange={handleField}
                rows={3}
                placeholder="Description du livre..."
                className="w-full border border-slate-200 px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Exemplaires & Prix */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre d'exemplaires *
                </label>
                <input
                  type="number"
                  name="total_copies"
                  required
                  min="1"
                  value={form.total_copies}
                  onChange={handleField}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prix location (FCFA)
                </label>
                <input
                  type="number"
                  name="rental_price"
                  min="0"
                  value={form.rental_price}
                  onChange={handleField}
                  className="w-full border border-slate-200 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-700 text-white py-3 text-sm font-semibold
                         hover:bg-green-800 active:scale-[.99] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le livre'}
            </button>

          </form>
        </div>
      )}

      {/* ── Liste des livres ── */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">Aucun livre pour l'instant</p>
          <p className="text-sm mt-1">Ajoutez votre premier livre avec le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(book => (
            <div
              key={book.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm
                         overflow-hidden flex gap-4 p-4 hover:shadow-md transition-shadow"
            >
              {/* Couverture */}
              <div className="w-14 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                {book.cover_url
                  ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-slate-300 text-xs text-center px-1">—</span>
                    </div>
                }
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm truncate">
                  {book.title}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5 truncate">{book.author}</p>
                {book.category && (
                  <span className="inline-block bg-green-50 text-green-700 text-xs
                                   px-2 py-0.5 rounded-full mt-1.5">
                    {book.category}
                  </span>
                )}
                <p className="text-slate-500 text-xs mt-2">
                  {book.available_copies}/{book.total_copies} dispo.
                </p>
                {book.rental_price > 0 && (
                  <p className="text-slate-400 text-xs">
                    {book.rental_price.toLocaleString('fr-FR')} FCFA / emprunt
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </AdminLayout>
  )
}

export default BooksPage
