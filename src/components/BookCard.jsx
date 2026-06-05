import { BookOpen } from 'lucide-react'

const CATEGORY_COLORS = {
  'Théologie':             'bg-indigo-50 text-indigo-600',
  'Croissance spirituelle':'bg-teal-50 text-teal-600',
  'Biographies':           'bg-amber-50 text-amber-600',
  'Romans chrétiens':      'bg-rose-50 text-rose-600',
  'Évangélisation':        'bg-orange-50 text-orange-600',
  'Leadership':            'bg-blue-50 text-blue-600',
  'Famille et Mariage':    'bg-pink-50 text-pink-600',
  'Deuil et Souffrance':   'bg-slate-100 text-slate-600',
}

function Placeholder({ title }) {
  const initials = title?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  return (
    <div className="w-full h-full flex flex-col items-center justify-center
                    bg-gradient-to-br from-green-700 to-green-900 select-none">
      <span className="text-white text-3xl font-bold opacity-80">{initials}</span>
      <BookOpen className="text-white opacity-20 w-8 h-8 mt-2" />
    </div>
  )
}

function BookCard({ book, onClick }) {
  const available    = book.available_copies > 0
  // Supporte l'ancienne structure (book.category) et la nouvelle (book.categories.name)
  const categoryName = book.categories?.name || book.category || null
  const catStyle     = CATEGORY_COLORS[categoryName] || 'bg-gray-100 text-gray-500'

  return (
    <div
      onClick={() => onClick?.(book)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100
                 cursor-pointer transition-all duration-200
                 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-gray-100">
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} loading="lazy"
                 className="w-full h-full object-cover" />
          : <Placeholder title={book.title} />
        }
        <div className={`absolute top-2 right-2 flex items-center gap-1
                         px-2 py-0.5 rounded-full text-xs font-semibold
                         backdrop-blur-sm shadow-sm
                         ${available ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          {available ? 'Disponible' : 'Indisponible'}
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {book.title}
        </h3>
        <p className="text-gray-400 text-xs mt-1 truncate">{book.author}</p>
        {categoryName && (
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${catStyle}`}>
            {categoryName}
          </span>
        )}
      </div>
    </div>
  )
}

export default BookCard
