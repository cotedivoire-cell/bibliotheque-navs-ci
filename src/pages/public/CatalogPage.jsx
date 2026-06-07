import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, User, SlidersHorizontal, X, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import BookCard from '../../components/BookCard'
import BookDetailModal from '../../components/BookDetailModal'

/* ── Carte compacte pour les rayons horizontaux ── */
function ShelfCard({ book, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const hasCover = book.cover_url && !imgErr

  return (
    <button
      onClick={() => onClick(book)}
      className="flex-shrink-0 w-28 text-left focus:outline-none group"
    >
      {/* Couverture — coins droits, micro-ombre */}
      <div
        className="w-28 h-40 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow"
        style={{ borderRadius: 0 }}
      >
        {hasCover ? (
          <img
            src={book.cover_url}
            alt={book.title}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ borderRadius: 0 }}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 border border-gray-200 flex items-center justify-center p-1.5">
            <p className="text-[9px] text-gray-400 font-light text-center leading-tight line-clamp-4">
              {book.title}
            </p>
          </div>
        )}
      </div>

      {/* Voyant + titre */}
      <div className="mt-2 flex items-start gap-1.5">
        <span className={`flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${book.available_copies > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
        <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{book.title}</p>
      </div>
    </button>
  )
}

function CatalogPage() {
  const navigate = useNavigate()
  const [books,            setBooks]            = useState([])
  const [categories,       setCategories]       = useState([])
  const [loading,          setLoading]          = useState(true)
  const [search,           setSearch]           = useState('')
  const [activecat,        setActiveCat]        = useState(null)
  const [authorFilter,     setAuthorFilter]     = useState('')
  const [availFilter,      setAvailFilter]      = useState('all')  // 'all' | 'available'
  const [pendingAuthor,    setPendingAuthor]     = useState('')
  const [pendingAvail,     setPendingAvail]     = useState('all')
  const [showFilterSheet,  setShowFilterSheet]  = useState(false)
  const [selectedBook,     setSelectedBook]     = useState(null)
  const [user,             setUser]             = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    loadCatalog()
  }, [])

  const loadCatalog = async () => {
    const [booksRes, catsRes] = await Promise.all([
      supabase.from('books').select('*, categories(id, name)').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ])
    setBooks(booksRes.data || [])
    setCategories(catsRes.data || [])
    setLoading(false)
  }

  // ── Filtrage ───────────────────────────────────────────────
  const isFiltered = search || activecat || authorFilter || availFilter !== 'all'

  const filtered = books.filter(b => {
    const matchSearch = !search
      || b.title?.toLowerCase().includes(search.toLowerCase())
      || b.author?.toLowerCase().includes(search.toLowerCase())
    const matchCat   = !activecat || b.category_id === activecat
    const matchAuthor = !authorFilter || b.author?.toLowerCase().includes(authorFilter.toLowerCase())
    const matchAvail = availFilter === 'all' || b.available_copies > 0
    return matchSearch && matchCat && matchAuthor && matchAvail
  })

  // ── Rayons thématiques ────────────────────────────────────
  const newBooks = [...books].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10)

  const shelves = [
    { id: 'new', label: 'Nouveautés', books: newBooks },
    ...categories.map(cat => ({
      id:    cat.id,
      label: cat.name,
      books: books.filter(b => b.category_id === cat.id),
    })).filter(s => s.books.length > 0),
  ]

  const availableCount = filtered.filter(b => b.available_copies > 0).length

  const openFilterSheet = () => {
    setPendingAuthor(authorFilter)
    setPendingAvail(availFilter)
    setShowFilterSheet(true)
  }

  const applyFilters = () => {
    setAuthorFilter(pendingAuthor)
    setAvailFilter(pendingAvail)
    setShowFilterSheet(false)
  }

  const resetFilters = () => {
    setAuthorFilter(''); setAvailFilter('all')
    setPendingAuthor(''); setPendingAvail('all')
    setSearch(''); setActiveCat(null)
  }

  const hasActiveFilters = authorFilter || availFilter !== 'all'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── En-tête ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">

        {/* Ligne 1 : Logo + Mon espace */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Bibliothèque-navs CI</p>
              <p className="text-xs text-gray-400 leading-tight font-light">Les Navigateurs — Côte d'Ivoire</p>
            </div>
          </div>
          <button
            onClick={() => navigate(user ? '/profile' : '/login')}
            className="flex items-center gap-1.5 border border-gray-100 rounded-xl px-3 py-1.5 bg-white hover:border-green-300 transition-all group"
          >
            <User className="w-3.5 h-3.5 text-gray-300 group-hover:text-green-600 transition-colors" strokeWidth={1.5} />
            <span className="text-xs font-medium text-gray-500 tracking-wide group-hover:text-green-700 transition-colors">
              {user ? 'Mon espace' : 'Connexion'}
            </span>
          </button>
        </div>

        {/* Ligne 2 : Recherche + filtre avancé */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Titre, auteur..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-3xl focus:outline-none focus:border-green-300 focus:ring-2 focus:ring-green-50 bg-gray-50 transition-all"
            />
          </div>
          {/* Bouton filtre avancé */}
          <button
            onClick={openFilterSheet}
            className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-2xl border transition-all ${
              hasActiveFilters
                ? 'bg-green-700 border-green-700 text-white'
                : 'bg-white border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Ligne 3 : Puces catégories — scroll horizontal */}
        <div className="flex overflow-x-auto whitespace-nowrap gap-2 px-4 pb-3 scrollbar-none">
          <button
            onClick={() => setActiveCat(null)}
            className={`flex-shrink-0 px-4 py-1.5 text-sm rounded-full transition-all font-medium ${
              !activecat ? 'bg-green-800 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tout
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id === activecat ? null : cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 text-sm rounded-full transition-all font-medium ${
                activecat === cat.id ? 'bg-green-800 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="pb-8">

        {/* Compteur + reset */}
        {!loading && isFiltered && (
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm">
              <span className="text-gray-400 font-light">Résultats — </span>
              <span className="text-green-700 font-medium">{availableCount} disponible{availableCount > 1 ? 's' : ''}</span>
              <span className="text-gray-300"> / {filtered.length}</span>
            </p>
            <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-rose-500 flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" strokeWidth={1.5} />Effacer
            </button>
          </div>
        )}

        {loading ? (
          /* Skeleton */
          <div className="px-4 pt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full bg-gray-200" style={{ aspectRatio: '2/3' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>

        ) : isFiltered ? (
          /* ── Vue grille filtrée ── */
          filtered.length === 0 ? (
            <div className="text-center py-24 px-4">
              <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-gray-400 text-sm font-light">Aucun ouvrage trouvé</p>
              <button onClick={resetFilters} className="mt-3 text-green-700 text-sm hover:underline">
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="px-4 pt-4 grid grid-cols-2 gap-3">
              {filtered.map(book => (
                <BookCard key={book.id} book={book} onClick={setSelectedBook} />
              ))}
            </div>
          )

        ) : (
          /* ── Vue rayons thématiques ── */
          <div className="pt-4 space-y-8">
            {shelves.map(shelf => (
              <div key={shelf.id}>
                {/* En-tête rayon */}
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-base font-bold text-gray-900">{shelf.label}</h2>
                  <button
                    onClick={() => setActiveCat(shelf.id === 'new' ? null : shelf.id)}
                    className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-green-700 transition-colors"
                  >
                    Voir tout <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Ligne horizontale de livres */}
                <div className="flex overflow-x-auto gap-4 px-4 pb-2 scrollbar-none">
                  {shelf.books.map(book => (
                    <ShelfCard key={book.id} book={book} onClick={setSelectedBook} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tiroir filtre avancé ── */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowFilterSheet(false)}
          />
          <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-8 space-y-5 shadow-2xl">

            {/* Drag indicator */}
            <div className="flex justify-center mb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Filtres avancés</h2>
              <button onClick={() => setShowFilterSheet(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Filtre auteur */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Auteur</label>
              <input
                type="text"
                value={pendingAuthor}
                onChange={e => setPendingAuthor(e.target.value)}
                placeholder="Filtrer par nom d'auteur..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-700 focus:border-green-700 transition-all"
              />
            </div>

            {/* Filtre disponibilité */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Disponibilité</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingAvail('all')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                    pendingAvail === 'all'
                      ? 'border-green-700 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                  }`}
                >
                  Tous les livres
                </button>
                <button
                  onClick={() => setPendingAvail('available')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                    pendingAvail === 'available'
                      ? 'border-green-700 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                  }`}
                >
                  Disponibles uniquement
                </button>
              </div>
            </div>

            {/* Bouton appliquer */}
            <button
              onClick={applyFilters}
              className="w-full py-3 bg-green-800 text-white rounded-xl font-semibold text-sm tracking-wide hover:bg-green-900 active:scale-[.98] transition-all shadow-sm"
            >
              Appliquer les filtres
            </button>

            {/* Reset */}
            {(pendingAuthor || pendingAvail !== 'all') && (
              <button
                onClick={() => { setPendingAuthor(''); setPendingAvail('all') }}
                className="w-full text-xs text-gray-400 hover:text-rose-500 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modal détail ── */}
      {selectedBook && (
        <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </div>
  )
}

export default CatalogPage
