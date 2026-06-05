import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, BookOpen, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import BookCard from '../../components/BookCard'

const ALL = 'Tous'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-[2/3] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded-full w-4/5" />
        <div className="h-2 bg-gray-100 rounded-full w-3/5" />
        <div className="h-4 bg-gray-100 rounded-full w-2/5 mt-1" />
      </div>
    </div>
  )
}

function CatalogPage() {
  const navigate  = useNavigate()
  const [books,    setBooks]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState(ALL)
  const [session,  setSession]  = useState(null)

  useEffect(() => {
    const load = async () => {
      const [{ data: books }, { data: { session } }] = await Promise.all([
        supabase
          .from('books')
          .select('*, categories(id, name)')
          .eq('is_active', true)
          .order('title'),
        supabase.auth.getSession(),
      ])
      setBooks(books || [])
      setSession(session)
      setLoading(false)
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(
      books.map(b => b.categories?.name).filter(Boolean)
    )].sort()
    return [ALL, ...cats]
  }, [books])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return books.filter(book => {
      const matchSearch = !q ||
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q)
      const matchCat = category === ALL || book.categories?.name === category
      return matchSearch && matchCat
    })
  }, [books, search, category])

  const available = filtered.filter(b => b.available_copies > 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Bibliothèque-navs CI
              </h1>
              <p className="text-xs text-gray-400 leading-tight">
                Les Navigateurs — Côte d'Ivoire
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border
                       border-gray-200 text-xs font-medium text-gray-600
                       hover:bg-gray-50 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            {session ? 'Mon espace' : 'Connexion'}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4">
        <div className="pt-5 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Titre, auteur..."
              className="w-full bg-white border border-gray-200 rounded-2xl
                         pl-11 pr-10 py-3.5 text-sm placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         focus:border-transparent shadow-sm" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold
                          transition-all duration-150 ${
                category === cat
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-xs text-gray-400 mb-4">
            {filtered.length} livre(s) —{' '}
            <span className="text-green-600 font-medium">{available} disponible(s)</span>
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-10">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">Aucun livre trouvé</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Essayez une autre recherche' : "La bibliothèque est vide pour l'instant"}
            </p>
            {search && (
              <button onClick={() => setSearch('')}
                className="mt-4 text-green-700 text-sm font-medium">
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-10">
            {filtered.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CatalogPage
