import { useEffect, useState } from 'react'
import { X, BookOpen, MapPin, Truck, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

const LANG = { FR: 'Français', EN: 'Anglais' }

const PICKUP_HOURS = "📍 Point de retrait ouvert du mardi au vendredi de 8h30 à 17h00. Assurez-vous que votre coursier se présente dans ces créneaux."

function StarDisplay({ rating }) {
  const full = Math.round(rating || 0)
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-sm ${s <= full ? 'text-amber-400' : 'text-gray-200'}`}>★</span>)}</div>
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-colors ${s <= (hover || value) ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}>★</button>
      ))}
    </div>
  )
}

const generatePickupCode = () => String(Math.floor(1000 + Math.random() * 9000))

function BookDetailModal({ book, onClose }) {
  const [visible,          setVisible]          = useState(false)
  const [reviews,          setReviews]          = useState([])
  const [avgRating,        setAvgRating]        = useState(0)
  const [recommendations,  setRecommendations]  = useState([])
  const [canReview,        setCanReview]        = useState(false)
  const [hasReviewed,      setHasReviewed]      = useState(false)
  const [userId,           setUserId]           = useState(null)
  const [userProfile,      setUserProfile]      = useState(null)
  const [showForm,         setShowForm]         = useState(false)
  const [reviewForm,       setReviewForm]       = useState({ rating: 0, comment: '' })
  const [savingReview,     setSavingReview]     = useState(false)
  const [reviewError,      setReviewError]      = useState('')
  const [showReserveForm,  setShowReserveForm]  = useState(false)
  const [pickupType,       setPickupType]       = useState('self')
  const [savingReserve,    setSavingReserve]    = useState(false)
  const [reserveResult,    setReserveResult]    = useState(null)
  const [reserveError,     setReserveError]     = useState('')
  const [hasReservation,   setHasReservation]   = useState(false)

  useEffect(() => {
    if (book) { document.body.style.overflow = 'hidden'; setTimeout(() => setVisible(true), 10); loadData() }
    return () => { document.body.style.overflow = '' }
  }, [book])

  const loadData = async () => {
    if (!book) return
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)

    const [reviewsRes, recoRes] = await Promise.all([
      supabase.from('reviews').select('*, profiles(full_name)').eq('book_id', book.id).order('created_at', { ascending: false }),
      book.category_id ? supabase.from('books').select('id, title, author, cover_url, categories(name)').eq('category_id', book.category_id).eq('is_active', true).neq('id', book.id).limit(3) : { data: [] },
    ])

    const r = reviewsRes.data || []
    setReviews(r)
    setAvgRating(r.length > 0 ? r.reduce((s, rv) => s + rv.rating, 0) / r.length : 0)
    setRecommendations(recoRes.data || [])

    if (user) {
      const [profileRes, hasReturnedRes, hasReviewedRes, hasReservationRes] = await Promise.all([
        supabase.from('profiles').select('is_blocked, account_type, profile_status').eq('id', user.id).single(),
        supabase.from('borrowings').select('id').eq('member_id', user.id).eq('book_id', book.id).eq('status', 'retourné').limit(1).maybeSingle(),
        supabase.from('reviews').select('id').eq('member_id', user.id).eq('book_id', book.id).maybeSingle(),
        supabase.from('reservations').select('id').eq('member_id', user.id).eq('book_id', book.id).eq('status', 'pending').maybeSingle(),
      ])
      setUserProfile(profileRes.data)
      setCanReview(!!hasReturnedRes.data)
      setHasReviewed(!!hasReviewedRes.data)
      setHasReservation(!!hasReservationRes.data)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (reviewForm.rating === 0) { setReviewError('Veuillez choisir une note.'); return }
    setSavingReview(true); setReviewError('')
    const { error } = await supabase.from('reviews').insert([{ book_id: book.id, member_id: userId, rating: reviewForm.rating, comment: reviewForm.comment.trim() || null }])
    if (error) setReviewError(error.code === '23505' ? 'Vous avez déjà laissé un avis.' : "Erreur lors de l'envoi.")
    else { setShowForm(false); setHasReviewed(true); setReviewForm({ rating: 0, comment: '' }); loadData() }
    setSavingReview(false)
  }

  const handleReserve = async () => {
    if (!userId) return
    setSavingReserve(true); setReserveError('')
    if (userProfile?.is_blocked) { setReserveError('Votre compte est temporairement bloqué. Contactez un gestionnaire.'); setSavingReserve(false); return }
    const code      = pickupType === 'courier' ? generatePickupCode() : null
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('reservations').insert([{ book_id: book.id, member_id: userId, pickup_type: pickupType, pickup_code: code, expires_at: expiresAt }])
    if (error) {
      setReserveError(error.code === '23505' ? 'Vous avez déjà une réservation active pour ce livre.' : 'Erreur. Réessayez.')
    } else {
      setReserveResult({ code, expiresAt })
      setHasReservation(true)
      setShowReserveForm(false)
      await supabase.from('books').update({ available_copies: (book.available_copies || 1) - 1 }).eq('id', book.id)
    }
    setSavingReserve(false)
  }

  if (!book) return null
  const handleClose = () => { setVisible(false); setTimeout(onClose, 300) }
  const available  = book.available_copies > 0
  const isPending  = userProfile?.profile_status === 'en_attente'
  const isBlocked  = userProfile?.is_blocked
  const initials   = book.title?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div onClick={handleClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      <div className={`relative bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 z-10"><X className="w-4 h-4" /></button>

        {/* Couverture */}
        <div className="mx-4 mt-2 mb-5 h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center">
          {book.cover_url ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-contain" /> : <div className="flex flex-col items-center gap-2"><span className="text-white text-5xl font-bold opacity-70">{initials}</span><BookOpen className="text-white opacity-30 w-8 h-8" /></div>}
        </div>

        <div className="px-5 pb-10 space-y-6">
          {/* Titre & infos */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{book.title}</h2>
            <p className="text-gray-500 mt-1 text-sm">{book.author}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{available ? `${book.available_copies} exemplaire(s) disponible(s)` : 'Indisponible'}</span>
              {book.categories?.name && <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">{book.categories.name}</span>}
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{LANG[book.language] || 'Français'}</span>
            </div>
            {reviews.length > 0 && <div className="flex items-center gap-2 mt-3"><StarDisplay rating={avgRating} /><span className="text-sm text-gray-500 font-medium">{avgRating.toFixed(1)}</span><span className="text-xs text-gray-400">({reviews.length} avis)</span></div>}
          </div>

          {/* Résumé */}
          {book.summary ? <div><h3 className="text-sm font-bold text-gray-900 mb-2">Résumé</h3><p className="text-gray-600 text-sm leading-relaxed">{book.summary}</p></div> : <p className="text-gray-300 text-sm italic">Aucun résumé disponible.</p>}

          {/* ── Section réservation ── */}
          {userId && (
            <div>
              {/* Confirmation réservation réussie */}
              {reserveResult ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                  <p className="text-green-800 font-semibold text-sm">Réservation confirmée !</p>
                  <p className="text-green-700 text-xs">Expire le {new Date(reserveResult.expiresAt).toLocaleDateString('fr-FR')} à {new Date(reserveResult.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  {reserveResult.code && (
                    <div className="bg-white rounded-xl p-3 text-center border border-green-200">
                      <p className="text-xs text-gray-500 mb-1">Code de retrait pour ton coursier</p>
                      <p className="text-3xl font-bold text-green-700 tracking-widest">{reserveResult.code}</p>
                    </div>
                  )}
                  {/* ── Horaires de retrait ── */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">{PICKUP_HOURS}</p>
                  </div>
                </div>
              ) : hasReservation ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-amber-800 text-sm font-medium">Vous avez déjà une réservation active.</p>
                  <p className="text-amber-600 text-xs mt-1">Consultez votre espace membre pour le code de retrait.</p>
                </div>
              ) : isPending ? (
                /* ── Compte en attente d'activation ── */
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-orange-800 text-sm font-semibold mb-1">Compte en attente d'activation</p>
                  <p className="text-orange-700 text-xs leading-relaxed">
                    Veuillez faire activer votre compte au bureau des Navigateurs pour réserver. Un gestionnaire validera votre inscription.
                  </p>
                </div>
              ) : isBlocked ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                  <p className="text-red-700 text-sm font-medium">Compte bloqué — réservation impossible.</p>
                  <p className="text-red-500 text-xs mt-1">Contactez un gestionnaire.</p>
                </div>
              ) : available ? (
                /* ── Formulaire de réservation ── */
                !showReserveForm ? (
                  <button onClick={() => setShowReserveForm(true)} className="w-full py-3 bg-green-700 text-white rounded-2xl text-sm font-semibold hover:bg-green-800 transition-colors">
                    Réserver ce livre (48h)
                  </button>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                    <p className="text-sm font-semibold text-gray-900">Comment récupérer le livre ?</p>
                    {reserveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{reserveError}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setPickupType('self')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${pickupType === 'self' ? 'border-green-700 bg-green-50' : 'border-gray-200 bg-white'}`}>
                        <MapPin className={`w-5 h-5 ${pickupType === 'self' ? 'text-green-700' : 'text-gray-400'}`} />
                        <span className={`text-xs font-semibold ${pickupType === 'self' ? 'text-green-700' : 'text-gray-500'}`}>Je viens moi-même</span>
                      </button>
                      <button type="button" onClick={() => setPickupType('courier')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${pickupType === 'courier' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                        <Truck className={`w-5 h-5 ${pickupType === 'courier' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-xs font-semibold ${pickupType === 'courier' ? 'text-blue-600' : 'text-gray-500'}`}>Coursier (Yango/Glovo)</span>
                      </button>
                    </div>
                    {pickupType === 'courier' && (
                      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                        Un code à 4 chiffres sera généré. Ton coursier le présentera au comptoir.
                      </div>
                    )}
                    {/* Horaires toujours visibles dans le formulaire */}
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 leading-relaxed">{PICKUP_HOURS}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowReserveForm(false)} className="flex-1 py-2.5 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
                      <button onClick={handleReserve} disabled={savingReserve} className="flex-1 py-2.5 text-xs text-white bg-green-700 rounded-xl hover:bg-green-800 font-semibold disabled:opacity-50">{savingReserve ? '...' : 'Confirmer la réservation'}</button>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          )}

          {/* Pas connecté */}
          {!userId && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-amber-800 text-sm font-semibold mb-1">Comment emprunter ce livre ?</p>
              <p className="text-amber-700 text-xs leading-relaxed">Connectez-vous pour réserver en ligne, ou présentez-vous au comptoir de la bibliothèque.</p>
            </div>
          )}

          {/* Avis */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Avis {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}</h3>
            {reviews.length === 0 ? <p className="text-gray-400 text-sm">Aucun avis pour l'instant.</p> : (
              <div className="space-y-3">
                {reviews.map(rv => (
                  <div key={rv.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1"><p className="text-xs font-semibold text-gray-700">{rv.profiles?.full_name}</p><StarDisplay rating={rv.rating} /></div>
                    {rv.comment && <p className="text-xs text-gray-600 leading-relaxed">{rv.comment}</p>}
                    <p className="text-xs text-gray-300 mt-1">{new Date(rv.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                ))}
              </div>
            )}
            {userId && canReview && !hasReviewed && (
              <div className="mt-4">
                {!showForm ? <button onClick={() => setShowForm(true)} className="text-sm text-green-700 font-medium hover:underline">+ Laisser un avis</button> : (
                  <form onSubmit={handleSubmitReview} className="bg-green-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">Votre avis</p>
                    {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
                    <StarInput value={reviewForm.rating} onChange={r => setReviewForm(p => ({ ...p, rating: r }))} />
                    <textarea value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} placeholder="Commentaire (optionnel)..." rows={2} className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">Annuler</button>
                      <button type="submit" disabled={savingReview} className="px-4 py-1.5 text-xs text-white bg-green-700 rounded-lg disabled:opacity-50">{savingReview ? '...' : 'Publier'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {userId && hasReviewed && <p className="text-xs text-green-600 mt-2 font-medium">Vous avez déjà laissé un avis pour ce livre.</p>}
          </div>

          {/* Recommandations */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Dans la même catégorie</h3>
              <div className="grid grid-cols-3 gap-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="text-center">
                    <div className="w-full aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden mb-1">
                      {rec.cover_url ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center"><span className="text-white text-sm font-bold opacity-70">{rec.title?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}</span></div>}
                    </div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{rec.title}</p>
                    <p className="text-xs text-gray-400 truncate">{rec.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookDetailModal
