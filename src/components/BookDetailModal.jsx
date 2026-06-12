import { useEffect, useState } from 'react'
import { X, MapPin, Truck, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

const LANG = { FR: 'Français', EN: 'Anglais' }
const PICKUP_HOURS = "Point de retrait ouvert du mardi au vendredi de 8h30 à 17h00. Assurez-vous que votre coursier se présente dans ces créneaux."

const generatePickupCode = () => String(Math.floor(1000 + Math.random() * 9000))

/* ── Étoiles ── */
function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <span key={s} className={`text-sm ${s <= Math.round(rating||0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
    </div>
  )
}
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-colors ${s <= (hover||value) ? 'text-amber-400' : 'text-gray-200'}`}>★</button>
      ))}
    </div>
  )
}

/* ── Code bancaire 4 cases ── */
function BankCode({ code }) {
  if (!code) return null
  return (
    <div className="flex gap-2 justify-center my-2">
      {code.split('').map((digit, i) => (
        <div key={i} className="w-12 h-14 bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
          <span className="font-mono text-2xl font-bold text-gray-900 tracking-tight">{digit}</span>
        </div>
      ))}
    </div>
  )
}

function BookDetailModal({ book, onClose }) {
  const [visible,         setVisible]         = useState(false)
  const [reviews,         setReviews]         = useState([])
  const [avgRating,       setAvgRating]       = useState(0)
  const [recommendations, setRecommendations] = useState([])
  const [canReview,       setCanReview]       = useState(false)
  const [hasReviewed,     setHasReviewed]     = useState(false)
  const [userId,          setUserId]          = useState(null)
  const [userProfile,     setUserProfile]     = useState(null)
  const [showReviewForm,  setShowReviewForm]  = useState(false)
  const [reviewForm,      setReviewForm]      = useState({ rating: 0, comment: '' })
  const [savingReview,    setSavingReview]    = useState(false)
  const [reviewError,     setReviewError]     = useState('')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [myReview,       setMyReview]       = useState(null)
  const [deletingReview, setDeletingReview] = useState(false)
  const [showReserveForm, setShowReserveForm] = useState(false)
  const [pickupType,      setPickupType]      = useState('self')
  const [savingReserve,   setSavingReserve]   = useState(false)
  const [reserveResult,   setReserveResult]   = useState(null)
  const [reserveError,    setReserveError]    = useState('')
  const [hasReservation,  setHasReservation]  = useState(false)
  const [realStock,       setRealStock]       = useState(null)
  const [borrowLimit,     setBorrowLimit]     = useState(false)
  const [currentBook,    setCurrentBook]    = useState(book)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [imgError,        setImgError]        = useState(false)
  const [borrowFee,       setBorrowFee]       = useState(500)
  const [borrowDuration,  setBorrowDuration]  = useState(14)

  // Sync currentBook quand la prop book change (ouverture depuis le catalogue)
  useEffect(() => { if (book) setCurrentBook(book) }, [book])

  useEffect(() => {
    if (currentBook) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => setVisible(true), 10)
      setImgError(false)
      setSummaryExpanded(false)
      setShowReserveForm(false)
      setReserveResult(null)
      setReserveError('')
      loadData(currentBook)
    }
    return () => { document.body.style.overflow = '' }
  }, [currentBook?.id])

  const loadData = async (bk) => {
    const bookToLoad = bk || currentBook || book
    if (!bookToLoad) return
    const book = bookToLoad  // alias local pour ne pas réécrire tout le corps
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)

    // Charger les paramètres dynamiques depuis settings
    const { data: settingsData } = await supabase.from('settings').select('key, value')
    if (settingsData) {
      const fee      = settingsData.find(s => s.key === 'single_borrow_fee_default')
      const duration = settingsData.find(s => s.key === 'standard_borrow_duration')
      if (fee)      setBorrowFee(parseInt(fee.value) || 500)
      if (duration) setBorrowDuration(parseInt(duration.value) || 14)
    }

    const [reviewsRes, recoRes, activeRes, reserveRes] = await Promise.all([
      supabase.from('reviews').select('*, profiles(full_name)').eq('book_id', book.id).order('created_at', { ascending: false }),
      book.category_id
        ? supabase.from('books').select('id, title, author, cover_url').eq('category_id', book.category_id).eq('is_active', true).neq('id', book.id).limit(3)
        : { data: [] },
      supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('book_id', book.id).in('status', ['en_cours', 'en_retard']),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('book_id', book.id).eq('status', 'pending'),
    ])

    const r = reviewsRes.data || []
    setReviews(r)
    setAvgRating(r.length > 0 ? r.reduce((s, rv) => s + rv.rating, 0) / r.length : 0)
    setRecommendations(recoRes.data || [])
    const taken = (activeRes.count || 0) + (reserveRes.count || 0)
    setRealStock(Math.max(0, (book.total_copies || book.available_copies || 0) - taken))

    if (user) {
      const [profileRes, hasReturnedRes, hasReviewedRes, hasReservationRes, memberBorrowRes] = await Promise.all([
        supabase.from('profiles').select('is_blocked, profile_status, account_type, max_borrowings').eq('id', user.id).single(),
        supabase.from('borrowings').select('id').eq('member_id', user.id).eq('book_id', book.id).eq('status', 'retourné').limit(1).maybeSingle(),
        supabase.from('reviews').select('id, rating, comment').eq('member_id', user.id).eq('book_id', book.id).maybeSingle(),
        supabase.from('reservations').select('id').eq('member_id', user.id).eq('book_id', book.id).eq('status', 'pending').maybeSingle(),
        supabase.from('borrowings').select('id').eq('member_id', user.id).eq('book_id', book.id).in('status', ['en_cours', 'en_retard']).maybeSingle(),
      ])
      setUserProfile(profileRes.data)
      // Vérifier limite emprunts individuels
      if (profileRes.data && profileRes.data.account_type !== 'group') {
        const { count: activeBorrows } = await supabase
          .from('borrowings')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', user.id)
          .in('status', ['en_cours', 'en_retard'])
        const maxAllowed = profileRes.data.max_borrowings || 2
        setBorrowLimit((activeBorrows || 0) >= maxAllowed)
      }
      // Option B : tout membre actif peut laisser un avis
      const isActive = profileRes.data?.profile_status !== 'en_attente' && !profileRes.data?.is_blocked
      setCanReview(isActive)
      setHasReviewed(!!hasReviewedRes.data)
      if (hasReviewedRes.data) {
        setMyReview(hasReviewedRes.data)
        setReviewForm({ rating: hasReviewedRes.data.rating || 0, comment: hasReviewedRes.data.comment || '' })
      }
      setHasReservation(!!hasReservationRes.data || !!memberBorrowRes.data)
    }
  }

  const handleRecoClick = async (reco) => {
    if (reco.id === (currentBook?.id || book?.id)) return // déjà affiché
    // Reset tous les états d'affichage
    setVisible(false)
    setShowReserveForm(false)
    setReserveResult(null)
    setReserveError('')
    setShowReviewForm(false)
    setSummaryExpanded(false)
    setShowAllReviews(false)
    setImgError(false)
    setBorrowLimit(false)
    setRealStock(null)
    // Charger le livre complet depuis Supabase
    const { data: fullBook } = await supabase
      .from('books')
      .select('*')
      .eq('id', reco.id)
      .single()
    if (fullBook) {
      setCurrentBook(fullBook)
    }
  }

  const handleDeleteReview = async () => {
    if (!myReview) return
    setDeletingReview(true)
    await supabase.from('reviews').delete().eq('id', myReview.id)
    setReviews(prev => prev.filter(r => r.id !== myReview.id))
    setHasReviewed(false)
    setMyReview(null)
    setReviewForm({ rating: 0, comment: '' })
    setDeletingReview(false)
  }

  const handleReserve = async () => {
    setSavingReserve(true)
    setReserveError('')

    if (userProfile?.is_blocked) {
      setReserveError('Votre compte est temporairement bloqué. Contactez un gestionnaire.')
      setSavingReserve(false); return
    }

    const [bookRes, activeRes, reserveRes, memberBorrowRes, memberReserveRes] = await Promise.all([
      supabase.from('books').select('total_copies').eq('id', book.id).single(),
      supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('book_id', book.id).in('status', ['en_cours', 'en_retard']),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('book_id', book.id).eq('status', 'pending'),
      supabase.from('borrowings').select('id').eq('book_id', book.id).eq('member_id', userId).in('status', ['en_cours', 'en_retard']).maybeSingle(),
      supabase.from('reservations').select('id').eq('book_id', book.id).eq('member_id', userId).eq('status', 'pending').maybeSingle(),
    ])

    if (memberBorrowRes.data || memberReserveRes.data) {
      setReserveError('Vous avez déjà un emprunt ou une réservation active pour ce livre.')
      setSavingReserve(false); return
    }

    const total = bookRes.data?.total_copies || 0
    const taken = (activeRes.count || 0) + (reserveRes.count || 0)
    if (total - taken <= 0) {
      setReserveError('Stock épuisé — tous les exemplaires sont empruntés ou réservés.')
      setRealStock(0); setSavingReserve(false); return
    }

    const code      = pickupType === 'courier' ? generatePickupCode() : null
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('reservations').insert([{
      book_id: book.id, member_id: userId,
      pickup_type: pickupType, pickup_code: code, expires_at: expiresAt,
    }])

    if (error) {
      setReserveError('Erreur lors de la réservation. Réessayez.')
    } else {
      await supabase.from('books').update({ available_copies: Math.max(0, (book.available_copies || 1) - 1) }).eq('id', book.id)
      setReserveResult({ code, expiresAt })
      setHasReservation(true)
      setShowReserveForm(false)
      setRealStock(prev => Math.max(0, (prev || 1) - 1))
    }
    setSavingReserve(false)
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (reviewForm.rating === 0) { setReviewError('Veuillez choisir une note.'); return }
    setSavingReview(true); setReviewError('')
    const { error } = await supabase.from('reviews').insert([{
      book_id: book.id, member_id: userId, rating: reviewForm.rating,
      comment: reviewForm.comment.trim() || null,
    }])
    if (error) setReviewError(error.code === '23505' ? 'Vous avez déjà laissé un avis.' : "Erreur.")
    else { setShowReviewForm(false); setHasReviewed(true); setReviewForm({ rating: 0, comment: '' }); loadData() }
    setSavingReview(false)
  }


  const isAnnual  = ['annual', 'actif_annuel'].includes(userProfile?.membership_type) || userProfile?.profile_status === 'actif_annuel'
  const feeLabel  = isAnnual ? 'Inclus (Abonné)' : `${borrowFee.toLocaleString('fr-FR')} FCFA`
  const todayFmt  = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (!book) return null
  const handleClose = () => { setVisible(false); setTimeout(onClose, 300) }

  const stockOk   = realStock === null ? book.available_copies > 0 : realStock > 0
  const isPending = userProfile?.profile_status === 'en_attente'
  const isBlocked = userProfile?.is_blocked
  const hasCover  = book.cover_url && !imgError
  const longSummary = book.summary && book.summary.length > 220

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div onClick={handleClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      <div className={`relative bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>

        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Fermer */}
        <button onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 z-10">
          <X className="w-4 h-4" />
        </button>

        {/* ── Couverture — fond blanc pur, ombre relief ── */}
        <div className="bg-gray-50 flex items-center justify-center py-8 px-6 mt-2">
          {hasCover ? (
            <img
              src={book.cover_url}
              alt={book.title}
              onError={() => setImgError(true)}
              className="max-h-60 w-auto shadow-[8px_8px_24px_rgba(0,0,0,0.18)]"
              style={{ borderRadius: 0, display: 'block' }}
            />
          ) : (
            <div className="w-36 h-52 bg-gradient-to-br from-green-950 via-green-800 to-emerald-900 flex flex-col items-center justify-center gap-2 shadow-[8px_8px_24px_rgba(0,0,0,0.18)]">
              <span className="text-white/90 text-3xl font-bold">
                {book.title?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
              </span>
              <div className="w-8 h-px bg-white/20" />
              <span className="text-white/30 text-[9px] tracking-widest uppercase">Navs CI</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-10 space-y-5">

          {/* ── Titre, auteur, badges ── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 leading-snug">{book.title}</h2>
            <p className="text-gray-500 text-sm mt-1 font-light capitalize">{book.author}</p>

            {/* Badges harmonisés */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`rounded-full border text-xs px-3 py-1 ${stockOk ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-400'}`}>
                {stockOk ? `${realStock ?? book.available_copies} ex. disponible${(realStock ?? book.available_copies) > 1 ? "s" : ""}` : 'Indisponible'}
              </span>
              {book.categories?.name && (
                <span className="rounded-full border border-gray-200 text-gray-500 text-xs px-3 py-1">
                  {book.categories.name}
                </span>
              )}
              <span className="rounded-full border border-gray-200 text-gray-500 text-xs px-3 py-1">
                {LANG[book.language] || 'Français'}
              </span>
            </div>

            {/* Note moyenne */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <StarDisplay rating={avgRating} />
                <span className="text-sm text-gray-500">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-300">({reviews.length} avis)</span>
              </div>
            )}
          </div>

          {/* ── Résumé avec expand/collapse ── */}
          {book.summary && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Résumé</h3>
              <p className={`text-gray-600 text-sm leading-relaxed ${!summaryExpanded && longSummary ? 'line-clamp-4' : ''}`}>
                {book.summary}
              </p>
              {longSummary && (
                <button
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="flex items-center gap-1 mt-1.5 text-xs text-green-700 font-medium hover:underline"
                >
                  {summaryExpanded ? (
                    <><ChevronUp className="w-3 h-3" /> Réduire</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> Lire la suite</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── Section réservation ── */}
          {userId && (
            <div>
              {/* Résultat de réservation réussie */}
              {reserveResult ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                  <p className="text-green-800 font-semibold text-sm">Réservation confirmée</p>
                  <p className="text-green-800 text-xs leading-relaxed font-medium">
                    Demande enregistrée ! Durée de l'emprunt : {borrowDuration} jours. Frais d'emprunt : {feeLabel}.
                  </p>
                  <div className="bg-white border border-green-200 rounded-xl p-3 space-y-1.5 mt-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Durée de l'emprunt</span>
                      <span className="text-xs font-medium text-gray-800">{borrowDuration} jours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Frais d'emprunt</span>
                      <span className={`text-xs font-semibold ${isAnnual ? 'text-green-700' : 'text-gray-800'}`}>{feeLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Date de la demande</span>
                      <span className="text-xs font-medium text-gray-800">{todayFmt}</span>
                    </div>
                  </div>
                  <p className="text-green-500 text-xs font-light">
                    Réservation valable jusqu'au {new Date(reserveResult.expiresAt).toLocaleDateString('fr-FR')} à {new Date(reserveResult.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {reserveResult.code && (
                    <>
                      <p className="text-center text-xs text-gray-500 font-medium">Code de retrait pour votre coursier</p>
                      <BankCode code={reserveResult.code} />
                      {/* Horaires */}
                      <div className="flex items-start gap-2.5 bg-amber-50/40 border border-amber-200/50 rounded-xl p-3">
                        <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <p className="text-xs text-amber-900 leading-relaxed">{PICKUP_HOURS}</p>
                      </div>
                    </>
                  )}
                </div>

              ) : hasReservation ? (
                /* Déjà une réservation — notification épurée */
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-xs text-amber-800">Vous avez déjà un emprunt ou une réservation active pour ce livre.</p>
                </div>

              ) : borrowLimit ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                  <p className="text-xs text-rose-600 font-medium leading-relaxed">
                    Limite d'emprunt atteinte (max {userProfile?.max_borrowings || 2} livres).
                    Veuillez contacter l'administrateur pour basculer en mode groupe.
                  </p>
                </div>

              ) : isPending ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-orange-800 text-sm font-semibold mb-1">Compte en attente d'activation</p>
                  <p className="text-orange-600 text-xs leading-relaxed">
                    Rendez-vous au bureau des Navigateurs pour activer votre compte avant de réserver.
                  </p>
                </div>

              ) : isBlocked ? (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-xs text-red-700">Compte bloqué — réservation impossible. Contactez un gestionnaire.</p>
                </div>

              ) : !stockOk ? (
                <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-xs text-gray-600">Stock épuisé — tous les exemplaires sont empruntés ou réservés.</p>
                </div>

              ) : !showReserveForm ? (
                <>
                  <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 font-light">Date de la demande</span>
                      <span className="text-xs font-medium text-gray-800">{todayFmt}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 font-light">Durée de l'emprunt</span>
                      <span className="text-xs font-medium text-gray-800">{borrowDuration} jours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 font-light">Frais d'emprunt</span>
                      <span className={`text-xs font-semibold ${isAnnual ? 'text-green-700' : 'text-gray-800'}`}>{feeLabel}</span>
                    </div>
                  </div>
                  <button onClick={() => setShowReserveForm(true)}
                    className="w-full py-3.5 bg-green-700 text-white rounded-2xl text-sm font-semibold tracking-wide hover:bg-green-800 active:scale-[.98] transition-all shadow-sm">
                    Confirmer la réservation
                  </button>
                  <p className="text-xs text-gray-400 italic text-center leading-relaxed">
                    *Une fois validé, votre livre sera conservé au bureau des Navigateurs pendant 48h pour votre retrait.*
                  </p>
                </>

              ) : (
                /* Formulaire de choix de retrait */
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-900">Mode de récupération</p>

                  {/* Erreur */}
                  {reserveError && (
                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      <p className="text-xs text-amber-800">{reserveError}</p>
                    </div>
                  )}

                  {/* Cartes de choix — état actif dynamique */}
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPickupType('self')}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                        pickupType === 'self'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}>
                      <MapPin className={`w-5 h-5 ${pickupType === 'self' ? 'text-green-600' : 'text-gray-300'}`} strokeWidth={1.5} />
                      <span className={`text-xs font-medium text-center leading-tight ${pickupType === 'self' ? 'text-green-700' : 'text-gray-400'}`}>
                        Je viens moi-même
                      </span>
                    </button>

                    <button type="button" onClick={() => setPickupType('courier')}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                        pickupType === 'courier'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}>
                      <Truck className={`w-5 h-5 ${pickupType === 'courier' ? 'text-green-600' : 'text-gray-300'}`} strokeWidth={1.5} />
                      <span className={`text-xs font-medium text-center leading-tight ${pickupType === 'courier' ? 'text-green-700' : 'text-gray-400'}`}>
                        Coursier (Yango / Glovo)
                      </span>
                    </button>
                  </div>

                  {/* Info coursier */}
                  {pickupType === 'courier' && (
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      Un code à 4 chiffres sera généré. Votre coursier le présentera au comptoir.
                    </p>
                  )}

                  {/* Horaires — fond crème doux, icône vectorielle */}
                  <div className="flex items-start gap-2.5 bg-amber-50/40 border border-amber-200/50 rounded-xl p-3">
                    <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-xs text-amber-900 leading-relaxed">{PICKUP_HOURS}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => { setShowReserveForm(false); setReserveError('') }}
                      className="flex-1 py-2.5 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">
                      Annuler
                    </button>
                    <button onClick={handleReserve} disabled={savingReserve}
                      className="flex-1 py-2.5 text-xs text-white bg-green-700 rounded-xl hover:bg-green-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {savingReserve ? 'Vérification...' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pas connecté */}
          {!userId && (
            <div className="flex items-start gap-2.5 bg-amber-50/40 border border-amber-200/50 rounded-xl p-3">
              <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-xs text-amber-900 leading-relaxed">
                Connectez-vous pour réserver, ou présentez-vous directement au comptoir.
              </p>
            </div>
          )}

          {/* ── Avis ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Avis {reviews.length > 0 && <span className="text-gray-300 font-normal">({reviews.length})</span>}
            </h3>
            {reviews.length === 0 ? (
              <p className="text-gray-400 italic text-xs">Aucun avis pour l'instant.</p>
            ) : (
              <div className="space-y-3">
                {(showAllReviews ? reviews : reviews.slice(0, 3)).map(rv => (
                  <div key={rv.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-700">{rv.profiles?.full_name}</p>
                      <StarDisplay rating={rv.rating} />
                    </div>
                    {rv.comment && <p className="text-xs text-gray-600 leading-relaxed">{rv.comment}</p>}
                    <p className="text-xs text-gray-300 mt-1">{new Date(rv.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                ))}
                {reviews.length > 3 && (
                  <button onClick={() => setShowAllReviews(v => !v)}
                    className="text-xs text-green-700 font-medium hover:underline">
                    {showAllReviews ? 'Voir moins' : `Voir plus d'avis (${reviews.length - 3} de plus)`}
                  </button>
                )}
              </div>
            )}

            {userId && canReview && !hasReviewed && (
              <div className="mt-3">
                {!showReviewForm ? (
                  <button onClick={() => setShowReviewForm(true)}
                    className="text-xs text-green-700 font-medium hover:underline">
                    + Laisser un avis
                  </button>
                ) : (
                  <form onSubmit={handleSubmitReview} className="bg-green-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-green-800">Votre avis</p>
                    {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
                    <StarInput value={reviewForm.rating} onChange={r => setReviewForm(p => ({ ...p, rating: r }))} />
                    <textarea value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                      placeholder="Commentaire (optionnel)..." rows={2}
                      className="w-full border border-green-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none bg-white" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowReviewForm(false)}
                        className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">Annuler</button>
                      <button type="submit" disabled={savingReview}
                        className="px-4 py-1.5 text-xs text-white bg-green-700 rounded-lg disabled:opacity-50">
                        {savingReview ? '...' : 'Publier'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {userId && hasReviewed && (
              <div className="mt-3">
                {!showReviewForm ? (
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-green-600">Vous avez déjà noté ce livre.</p>
                    <button onClick={() => setShowReviewForm(true)}
                      className="text-xs text-blue-600 font-medium hover:underline">
                      Modifier
                    </button>
                    <button onClick={handleDeleteReview} disabled={deletingReview}
                      className="text-xs text-red-400 hover:text-red-600 font-medium hover:underline disabled:opacity-50">
                      {deletingReview ? '...' : 'Supprimer'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="bg-green-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-green-800">Modifier votre avis</p>
                    {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
                    <StarInput value={reviewForm.rating} onChange={r => setReviewForm(p => ({ ...p, rating: r }))} />
                    <textarea value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                      placeholder="Commentaire (optionnel)..." rows={2}
                      className="w-full border border-green-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none bg-white" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowReviewForm(false)}
                        className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">Annuler</button>
                      <button type="submit" disabled={savingReview}
                        className="px-4 py-1.5 text-xs text-white bg-green-700 rounded-lg disabled:opacity-50">
                        {savingReview ? '...' : 'Mettre à jour'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ── Recommandations ── */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dans la même catégorie</h3>
              <div className="grid grid-cols-3 gap-3">
                {recommendations.filter(r => r.id !== (currentBook?.id || book?.id)).map(rec => (
                  <div key={rec.id}
                    onClick={() => handleRecoClick(rec)}
                    className="text-center cursor-pointer group">
                    <div className="w-full aspect-[2/3] bg-gray-100 overflow-hidden mb-1 transition-transform duration-200 group-hover:scale-[1.03] group-hover:shadow-lg">
                      {rec.cover_url
                        ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" style={{ borderRadius: 0 }} />
                        : <div className="w-full h-full bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center">
                            <span className="text-white/70 text-sm font-bold">{rec.title?.slice(0,1)}</span>
                          </div>
                      }
                    </div>
                    <p className="text-xs text-green-700 opacity-0 group-hover:opacity-100 transition-opacity font-medium mt-0.5">Voir →</p>
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
