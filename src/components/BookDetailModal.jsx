import { useEffect, useState } from 'react'
import { X, BookOpen } from 'lucide-react'

const LANG = { FR: 'Français', EN: 'Anglais' }

function BookDetailModal({ book, onClose }) {
  const [visible, setVisible] = useState(false)

  // Animation d'entrée
  useEffect(() => {
    if (book) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => setVisible(true), 10)
    }
    return () => { document.body.style.overflow = '' }
  }, [book])

  if (!book) return null

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const initials = book.title
    ?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

  const available = book.available_copies > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">

      {/* ── Fond semi-transparent ── */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm
                    transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* ── Tiroir bas (Bottom Sheet) ── */}
      <div className={`relative bg-white rounded-t-3xl max-h-[92vh]
                       overflow-y-auto shadow-2xl
                       transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}>

        {/* Indicateur de glissement */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full
                     flex items-center justify-center text-gray-500
                     hover:bg-gray-200 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Image de couverture ── */}
        <div className="mx-4 mt-2 mb-5 h-56 rounded-2xl overflow-hidden
                        bg-gradient-to-br from-green-700 to-green-900
                        flex items-center justify-center">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-white text-5xl font-bold opacity-70">{initials}</span>
              <BookOpen className="text-white opacity-30 w-8 h-8" />
            </div>
          )}
        </div>

        {/* ── Contenu ── */}
        <div className="px-5 pb-10">

          {/* Titre & Auteur */}
          <h2 className="text-xl font-bold text-gray-900 leading-snug">
            {book.title}
          </h2>
          <p className="text-gray-500 mt-1 text-sm">{book.author}</p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              available
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {available
                ? `${book.available_copies} exemplaire(s) disponible(s)`
                : 'Indisponible en ce moment'
              }
            </span>

            {book.categories?.name && (
              <span className="px-3 py-1 rounded-full text-xs font-medium
                               bg-green-50 text-green-700">
                {book.categories.name}
              </span>
            )}

            <span className="px-3 py-1 rounded-full text-xs font-medium
                             bg-blue-50 text-blue-700">
              {LANG[book.language] || 'Français'}
            </span>
          </div>

          {/* Résumé */}
          {book.summary ? (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Résumé</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{book.summary}</p>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-gray-300 text-sm italic">Aucun résumé disponible.</p>
            </div>
          )}

          {/* Note d'emprunt */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 text-sm font-semibold mb-1">
              Comment emprunter ce livre ?
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Présentez-vous au comptoir de la bibliothèque avec votre carte de membre.
              Un gestionnaire enregistrera votre emprunt directement.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default BookDetailModal
