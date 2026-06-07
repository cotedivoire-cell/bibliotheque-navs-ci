import { useState } from 'react'

function BookCard({ book, onClick }) {
  const [imgError, setImgError] = useState(false)
  const available = book.available_copies > 0
  const hasCover  = book.cover_url && !imgError
  const initials  = book.title?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

  return (
    <button onClick={() => onClick(book)} className="group text-left w-full focus:outline-none">
      <div className={`bg-white border border-gray-100 overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg ${!available ? 'opacity-60' : ''}`}>

        {/* ── Couverture — aspectRatio + image absolue, débordement impossible ── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '2 / 3' }}>

          {hasCover ? (
            <img
              src={book.cover_url}
              alt={book.title}
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full shadow-[4px_4px_10px_rgba(0,0,0,0.12)] border border-gray-100/50"
              style={{
                objectFit:      'cover',
                objectPosition: 'center top',
                display:        'block',
                borderRadius:   0,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-green-950 via-green-800 to-emerald-900 flex flex-col items-center justify-center gap-2">
              <span className="text-white/90 text-3xl font-bold tracking-tight">{initials}</span>
              <div className="w-8 h-px bg-white/20" />
              <span className="text-white/30 text-[9px] tracking-widest uppercase">Navigateurs CI</span>
            </div>
          )}

          {/* ── Badge disponibilité translucide — directive 4 ── */}
          {available ? (
            <div className="absolute top-2 right-2 bg-green-50/70 backdrop-blur-sm px-2 py-0.5 rounded-md">
              <span className="text-green-700 text-[10px] font-bold tracking-wider uppercase">
                Disponible
              </span>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-white/35" />
              <div className="absolute top-2 right-2 bg-gray-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md">
                <span className="text-gray-500 text-[10px] font-bold tracking-wider uppercase">
                  Indisponible
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Zone texte fixe ── */}
        <div className="p-3 min-h-[115px] flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {book.title}
          </h3>
          <p className="text-xs text-gray-400 truncate mt-1">{book.author}</p>
          {book.categories?.name && (
            <div className="mt-2">
              <span className="inline-block bg-green-50 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {book.categories.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

export default BookCard
