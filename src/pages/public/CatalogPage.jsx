import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import BookCard from '../../components/BookCard'
import BookDetailModal from '../../components/BookDetailModal'

function CatalogPage() {
  const navigate = useNavigate()
  const [books,        setBooks]        = useState([])
  const [categories,   setCategories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [activecat,    setActiveCat]    = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [user,         setUser]         = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    loadCatalog()
  }, [])

  const loadCatalog = async () => {
    const [booksRes, catsRes] = await Promise.all([
      supabase.from('books').select('*, categories(id, name)').eq('is_active', true).order('title'),
      supabase.from('categories').select('*').order('name'),
    ])
    setBooks(booksRes.data || [])
    setCategories(catsRes.data || [])
    setLoading(false)
  }

  const filtered = books.filter(b => {
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.author?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !activecat || b.category_id === activecat
    return matchSearch && matchCat
  })

  const availableCount = filtered.filter(b => b.available_copies > 0).length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── En-tête original — structure NON modifiée ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        {/* Ligne 1 : Logo + Titre + Mon espace */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📖</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Bibliothèque-navs CI</p>
              <p className="text-xs text-gray-400 leading-tight">Les Navigateurs — Côte d'Ivoire</p>
            </div>
          </div>
          <button
            onClick={() => navigate(user ? '/profile' : '/login')}
            className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors bg-white"
          >
            <span>👤</span>
            <span>{user ? 'Mon espace' : 'Connexion'}</span>
          </button>
        </div>

        {/* Ligne 2 : Barre de recherche */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Titre, auteur..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-green-400 bg-gray-50"
            />
          </div>
        </div>

        {/* Ligne 3 : Filtres catégories — arrondis conservés */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          <button
            onClick={() => setActiveCat(null)}
            className={`flex-shrink-0 px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
              !activecat ? 'bg-green-700 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id === activecat ? null : cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                activecat === cat.id ? 'bg-green-700 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="px-4 pt-4 pb-8">

        {/* Compteur — aligné à gauche, style élégant */}
        {!loading && (
          <p className="text-sm mb-4">
            <span className="text-gray-400 font-light">Découvrez notre sélection — </span>
            <span className="text-green-700 font-medium">
              {availableCount} ouvrage{availableCount > 1 ? 's' : ''} disponible{availableCount > 1 ? 's' : ''}
            </span>
          </p>
        )}

        {/* Grille */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full bg-gray-200" style={{ aspectRatio: '2/3' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-300 text-4xl mb-3">📚</p>
            <p className="text-gray-400 text-sm">Aucun ouvrage trouvé</p>
            {(search || activecat) && (
              <button onClick={() => { setSearch(''); setActiveCat(null) }} className="mt-3 text-green-700 text-sm hover:underline">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(book => (
              <BookCard key={book.id} book={book} onClick={setSelectedBook} />
            ))}
          </div>
        )}
      </div>

      {selectedBook && (
        <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </div>
  )
}

export default CatalogPage
