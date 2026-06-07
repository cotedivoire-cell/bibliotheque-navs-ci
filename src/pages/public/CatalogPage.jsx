import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User } from 'lucide-react'
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

      {/* ── Navbar — arrondis conservés ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo arrondi */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-green-700 rounded-xl flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 hidden sm:block tracking-tight">
              Bibliothèque-navs CI
            </span>
          </div>

          {/* Barre de recherche arrondie */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Titre, auteur..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 bg-gray-50 transition-colors"
              />
            </div>
          </div>

          {/* Bouton connexion arrondi */}
          <button
            onClick={() => navigate(user ? '/profile' : '/login')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-700 transition-colors flex-shrink-0 px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:block">{user ? 'Mon espace' : 'Connexion'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ── En-tête accueillante ── */}
        {!loading && (
          <p className="text-gray-400 font-light tracking-wide text-sm mb-6">
            Découvrez notre sélection —{' '}
            <span className="text-green-700 font-medium">
              {availableCount} ouvrage{availableCount > 1 ? 's' : ''} disponible{availableCount > 1 ? 's' : ''}
            </span>
            {filtered.length !== availableCount && (
              <span className="text-gray-300"> sur {filtered.length}</span>
            )}
          </p>
        )}

        {/* ── Filtres — arrondis conservés ── */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          <button
            onClick={() => setActiveCat(null)}
            className={`flex-shrink-0 px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
              !activecat
                ? 'bg-green-700 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id === activecat ? null : cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                activecat === cat.id
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── Grille ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full bg-gray-200" style={{ paddingTop: '150%' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-300 text-5xl mb-4">📚</p>
            <p className="text-gray-400 font-light">Aucun ouvrage trouvé</p>
            {(search || activecat) && (
              <button onClick={() => { setSearch(''); setActiveCat(null) }} className="mt-4 text-green-700 text-sm hover:underline">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map(book => (
              <BookCard key={book.id} book={book} onClick={setSelectedBook} />
            ))}
          </div>
        )}
      </main>

      {selectedBook && (
        <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </div>
  )
}

export default CatalogPage
