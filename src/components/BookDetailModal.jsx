import { useEffect, useState } from 'react'
import { X, BookOpen, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

const LANG = { FR: 'Français', EN: 'Anglais' }

// ── Affichage étoiles ─────────────────────────────────────────
function StarDisplay({ rating, size = 'sm' }) {
  const full = Math.round(rating || 0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <span key={s} className={`${size === 'sm' ? 'text-sm' : 'text-xl'} ${s <= full ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
    </div>
  )
}

// ── Sélecteur d'étoiles ───────────────────────────────────────
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-colors ${s <= (hover || value) ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

function BookDetailModal({ book, onClose }) {
  const [visible,       setVisible]       = useState(false)
  const [reviews,       setReviews]       = useState([])
  const [avgRating,     setAvgRating]     = useState(0)
  const [recommendations, setRecommendations] = useState([])
  const [canReview,     setCanReview]     = useState(false)
  const [hasReviewed,   setHasReviewed]   = useState(false)
  const [userId,        setUserId]        = useState(null)
  const [showForm,      setShowForm]      = useState(false)
  const [reviewForm,    setReviewForm]    = useState({ rating: 0, comment: '' })
  const [savingReview,  setSavingReview]  = useState(false)
  const [reviewError,   setReviewError]   = useState('')

  useEffect(() => {
    if (book) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => setVisible(true), 10)
      loadData()
    }
    return () => { document.body.style.overflow = '' }
  }, [book])

  const loadData = async () => {
    if (!book) return

    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)

    const [reviewsRes, recoRes] = await Promise.all([
      supabase.from('reviews')
        .select('*, profiles(full_name)')
        .eq('book_id', book.id)
        .order('created_at', { ascending: false }),
      book.category_id
        ? supabase.from('books')
            .select('id, title, author, cover_url, categories(name)')
            .eq('category_id', book.category_id)
            .eq('is_active', true)
            .neq('id', book.id)
            .limit(3)
        : { data: [] },
    ])

    const r = reviewsRes.data || []
    setReviews(r)
    setAvgRating(r.length > 0 ? r.reduce((s, rv) => s + rv.rating, 0) / r.length : 0)
    setRecommendations(recoRes.data || [])

    if (user) {
      const [hasReturnedRes, hasReviewedRes] = await Promise.all([
        supabase.from('borrowings').select('id')
          .eq('member_id', user.id).eq('book_id', book.id).eq('status', 'retourné').limit(1).maybeSingle(),
        supabase.from('reviews').select('id')
          .eq('member_id', user.id).eq('book_id', book.id).maybeSingle(),
      ])
      setCanReview(!!hasReturnedRes.data)
      setHasReviewed(!!hasReviewedRes.data)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (reviewForm.rating === 0) { setReviewError('Veuillez choisir une note.'); return }
    setSavingReview(true)
    setReviewError('')

    const { error } = await supabase.from('reviews').insert([{
      book_id:   book.id,
      member_id: userId,
      rating:    reviewForm.rating,
      comment:   reviewForm.comment.trim() || null,
    }])

    if (error) {
      setReviewError(error.code === '23505' ? 'Vous avez déjà laissé un avis pour ce livre.' : "Erreur lors de l'envoi.")
    } else {
      setShowForm(false)
      setHasReviewed(true)
      setReviewForm({ rating: 0, comment: '' })
      loadData()
    }
    setSavingReview(false)
  }

  if (!book) return null

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const available = book.available_copies > 0
  const initials  = book.title?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">

      {/* Overlay */}
      <div onClick={handleClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      {/* Tiroir */}
      <div className={`relative bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>

        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Fermer */}
        <button onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        {/* ── Couverture ── */}
        <div className="mx-4 mt-2 mb-5 h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center">
          {book.cover_url
            ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-contain" />
            : <div className="flex flex-col items-center gap-2">
                <span className="text-white text-5xl font-bold opacity-70">{initials}</span>
                <BookOpen className="text-white opacity-30 w-8 h-8" />
              </div>
          }
        </div>

        <div className="px-5 pb-10 space-y-6">

          {/* ── Titre & infos ── */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{book.title}</h2>
            <p className="text-gray-500 mt-1 text-sm">{book.author}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {available ? `${book.available_copies} exemplaire(s) disponible(s)` : 'Indisponible'}
              </span>
              {book.categories?.name && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">{book.categories.name}</span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                {LANG[book.language] || 'Français'}
              </span>
            </div>

            {/* Note moyenne */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <StarDisplay rating={avgRating} />
                <span className="text-sm text-gray-500 font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({reviews.length} avis)</span>
              </div>
            )}
          </div>

          {/* ── Résumé ── */}
          {book.summary ? (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Résumé</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{book.summary}</p>
            </div>
          ) : (
            <p className="text-gray-300 text-sm italic">Aucun résumé disponible.</p>
          )}

          {/* ── Avis des membres ── */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Avis {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}
            </h3>

            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun avis pour l'instant.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map(rv => (
                  <div key={rv.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-700">{rv.profiles?.full_name}</p>
                      <StarDisplay rating={rv.rating} />
                    </div>
                    {rv.comment && <p className="text-xs text-gray-600 leading-relaxed">{rv.comment}</p>}
                    <p className="text-xs text-gray-300 mt-1">
                      {new Date(rv.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire d'avis */}
            {userId && canReview && !hasReviewed && (
              <div className="mt-4">
                {!showForm ? (
                  <button onClick={() => setShowForm(true)}
                    className="text-sm text-green-700 font-medium hover:underline">
                    + Laisser un avis
                  </button>
                ) : (
                  <form onSubmit={handleSubmitReview} className="bg-green-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">Votre avis</p>
                    {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
                    <StarInput value={reviewForm.rating} onChange={r => setReviewForm(p => ({ ...p, rating: r }))} />
                    <textarea
                      value={reviewForm.comment}
                      onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                      placeholder="Commentaire (optionnel)..."
                      rows={2}
                      className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowForm(false)}
                        className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Annuler
                      </button>
                      <button type="submit" disabled={savingReview}
                        className="px-4 py-1.5 text-xs text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50">
                        {savingReview ? '...' : 'Publier'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {userId && hasReviewed && (
              <p className="text-xs text-green-600 mt-2 font-medium">Vous avez déjà laissé un avis pour ce livre.</p>
            )}
            {!userId && canReview === false && (
              <p className="text-xs text-gray-400 mt-2">Connectez-vous et empruntez ce livre pour laisser un avis.</p>
            )}
          </div>

          {/* ── Recommandations ── */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Dans la même catégorie</h3>
              <div className="grid grid-cols-3 gap-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="text-center">
                    <div className="w-full aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden mb-1">
                      {rec.cover_url
                        ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center">
                            <span className="text-white text-sm font-bold opacity-70">
                              {rec.title?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
                            </span>
                          </div>
                      }
                    </div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{rec.title}</p>
                    <p className="text-xs text-gray-400 truncate">{rec.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Note d'emprunt ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 text-sm font-semibold mb-1">Comment emprunter ce livre ?</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Présentez-vous au comptoir de la bibliothèque avec votre carte de membre. Un gestionnaire enregistrera votre emprunt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDetailModal
