import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, BookOpen, CheckCircle, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const QUICK_AMOUNTS = [2000, 5000, 10000, 25000]

const PAYMENT_METHODS = [
  { id: 'wave',         label: 'Wave',          bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   color: '#2563eb' },
  { id: 'orange_money', label: 'Orange Money',  bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', color: '#ea580c' },
  { id: 'mtn',          label: 'MTN Money',     bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', color: '#ca8a04' },
  { id: 'moov',         label: 'Moov Money',    bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   color: '#0d9488' },
  { id: 'carte',        label: 'Carte bancaire', bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200',  color: '#475569' },
]

const CONDITIONS = [
  { id: 'neuf',     label: 'Neuf',            desc: 'Jamais utilisé' },
  { id: 'tres_bon', label: 'Très bon état',   desc: 'Peu utilisé, sans marque' },
  { id: 'usage',    label: 'Usagé',           desc: 'Utilisé, mais lisible' },
]

export default function DonationPage() {
  const navigate = useNavigate()
  const [tab,          setTab]          = useState('argent') // 'argent' | 'livre'
  const [user,         setUser]         = useState(null)
  const [done,         setDone]         = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  // Don financier
  const [amount,       setAmount]       = useState(null)
  const [customAmount, setCustomAmount] = useState('')
  const [payMethod,    setPayMethod]    = useState('')
  const [donorName,    setDonorName]    = useState('')
  const [donorPhone,   setDonorPhone]   = useState('')
  const [message,      setMessage]      = useState('')

  // Don en nature
  const [bookTitle,    setBookTitle]    = useState('')
  const [bookAuthor,   setBookAuthor]   = useState('')
  const [condition,    setCondition]    = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
          .then(({ data }) => {
            if (data) { setDonorName(data.full_name || ''); setDonorPhone(data.phone || '') }
          })
      }
    })
  }, [])

  const finalAmount = amount || parseInt(customAmount) || 0

  const handleSubmitArgent = async () => {
    if (!donorName.trim()) { setError('Veuillez entrer votre nom.'); return }
    if (finalAmount < 500)  { setError('Montant minimum : 500 FCFA.'); return }
    if (!payMethod)         { setError('Veuillez choisir un mode de paiement.'); return }
    setSubmitting(true); setError('')
    const { error: err } = await supabase.from('donations').insert([{
      member_id:      user?.id || null,
      donor_name:     donorName.trim(),
      donor_phone:    donorPhone.trim() || null,
      type:           'argent',
      amount:         finalAmount,
      payment_method: payMethod,
      message:        message.trim() || null,
    }])
    if (err) setError("Erreur lors de l'envoi. Réessayez.")
    else setDone(true)
    setSubmitting(false)
  }

  const handleSubmitLivre = async () => {
    if (!donorName.trim())  { setError('Veuillez entrer votre nom.'); return }
    if (!bookTitle.trim())  { setError('Veuillez entrer le titre du livre.'); return }
    if (!condition)         { setError("Veuillez indiquer l'état du livre."); return }
    setSubmitting(true); setError('')
    const { error: err } = await supabase.from('donations').insert([{
      member_id:     user?.id || null,
      donor_name:    donorName.trim(),
      donor_phone:   donorPhone.trim() || null,
      type:          'livre',
      book_title:    bookTitle.trim(),
      book_author:   bookAuthor.trim() || null,
      book_condition: condition,
      message:       message.trim() || null,
    }])
    if (err) setError("Erreur lors de l'envoi. Réessayez.")
    else setDone(true)
    setSubmitting(false)
  }

  /* ── Écran de confirmation ── */
  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-green-700" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Merci pour votre générosité !</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {tab === 'argent'
            ? `Votre don de ${finalAmount.toLocaleString('fr-FR')} FCFA a bien été enregistré. Un gestionnaire vous contactera pour finaliser la transaction.`
            : `Votre don du livre "${bookTitle}" a bien été enregistré. Vous pouvez le déposer au bureau des Navigateurs du mardi au vendredi de 8h30 à 17h00.`
          }
        </p>
        <p className="text-xs text-gray-400 italic mb-6">
          "Celui qui donne aux pauvres ne manquera de rien." — Proverbes 28.27
        </p>
        <button onClick={() => navigate('/')}
          className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">
          Retour au catalogue
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── En-tête ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-green-700 transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <span className="font-semibold text-gray-900 text-sm">Soutenir la bibliothèque</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── Message inspirant ── */}
        <div className="bg-green-700 rounded-3xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold mb-2">Chaque don enrichit notre communauté</h1>
              <p className="text-green-100 text-sm leading-relaxed">
                La Bibliothèque des Navigateurs CI est un espace de croissance spirituelle et intellectuelle.
                Vos dons permettent d'acquérir de nouveaux ouvrages, de former des disciples, et d'équiper
                chaque membre pour une vie transformée par la Parole.
              </p>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-white/20 flex gap-6">
            <div>
              <p className="text-2xl font-bold">+50</p>
              <p className="text-green-200 text-xs">ouvrages disponibles</p>
            </div>
            <div>
              <p className="text-2xl font-bold">100%</p>
              <p className="text-green-200 text-xs">au service des membres</p>
            </div>
            <div>
              <p className="text-2xl font-bold">Gratuit</p>
              <p className="text-green-200 text-xs">accès abonnés illimité</p>
            </div>
          </div>
        </div>

        {/* ── Sélecteur type de don ── */}
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
          <button onClick={() => { setTab('argent'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
              tab === 'argent' ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Heart className="w-4 h-4" strokeWidth={1.5} />Don financier
          </button>
          <button onClick={() => { setTab('livre'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
              tab === 'livre' ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <BookOpen className="w-4 h-4" strokeWidth={1.5} />Don de livre
          </button>
        </div>

        {/* ── Champs communs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vos coordonnées</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom complet *</label>
              <input type="text" value={donorName} onChange={e => setDonorName(e.target.value)}
                placeholder="Prénom et Nom"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone</label>
              <input type="tel" value={donorPhone} onChange={e => setDonorPhone(e.target.value)}
                placeholder="+225 XX XX XX XX"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
            </div>
          </div>
        </div>

        {/* ── Don financier ── */}
        {tab === 'argent' && (
          <div className="space-y-5">
            {/* Montants rapides */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Choisissez un montant</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount('') }}
                    className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${
                      amount === a
                        ? 'border-green-700 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-700 hover:border-green-300'
                    }`}>
                    {a.toLocaleString('fr-FR')} F
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Montant libre (FCFA)</label>
                <input type="number" value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setAmount(null) }}
                  placeholder="Entrer un montant personnalisé..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
              </div>
            </div>

            {/* Modes de paiement */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Mode de paiement</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)}
                    className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${
                      payMethod === pm.id
                        ? `${pm.border} ${pm.bg} scale-[1.02]`
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl ${pm.bg} ${pm.border} border flex items-center justify-center font-bold text-xs ${pm.text}`}>
                      {pm.id === 'wave' ? 'W' : pm.id === 'orange_money' ? 'OM' : pm.id === 'mtn' ? 'MTN' : pm.id === 'moov' ? 'MV' : '💳'}
                    </div>
                    <span className={`text-xs font-semibold text-center leading-tight ${payMethod === pm.id ? pm.text : 'text-gray-600'}`}>
                      {pm.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Message (optionnel)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={2} placeholder="Un mot d'encouragement ou d'intention pour ce don..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}

            {/* Récap + bouton */}
            {(finalAmount > 0 || payMethod) && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {finalAmount > 0 ? `${finalAmount.toLocaleString('fr-FR')} FCFA` : '—'}
                  </p>
                  <p className="text-xs text-green-600">
                    {payMethod ? PAYMENT_METHODS.find(p => p.id === payMethod)?.label : '—'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-green-600" />
              </div>
            )}

            <button onClick={handleSubmitArgent} disabled={submitting}
              className="w-full py-4 bg-green-700 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-green-800 active:scale-[.99] disabled:opacity-50 transition-all shadow-sm">
              {submitting ? 'Enregistrement...' : 'Confirmer mon don'}
            </button>
          </div>
        )}

        {/* ── Don en nature ── */}
        {tab === 'livre' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informations du livre</p>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Titre du livre *</label>
                <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)}
                  placeholder="Titre complet du livre"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Auteur</label>
                <input type="text" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)}
                  placeholder="Nom de l'auteur (optionnel)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">État du livre *</label>
                <div className="grid grid-cols-3 gap-3">
                  {CONDITIONS.map(c => (
                    <button key={c.id} onClick={() => setCondition(c.id)}
                      className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 transition-all ${
                        condition === c.id
                          ? 'border-green-700 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }`}>
                      <span className="text-xl">{c.id === 'neuf' ? '✨' : c.id === 'tres_bon' ? '👍' : '📖'}</span>
                      <span className={`text-xs font-semibold text-center leading-tight ${condition === c.id ? 'text-green-800' : 'text-gray-600'}`}>
                        {c.label}
                      </span>
                      <span className="text-xs text-gray-400 text-center leading-tight">{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Message (optionnel)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  rows={2} placeholder="Une dédicace ou un contexte pour ce don..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                Déposez votre livre au bureau des Navigateurs du <span className="font-semibold">mardi au vendredi de 8h30 à 17h00</span>.
                Notre équipe l'examinera et l'intégrera au catalogue si l'état le permet.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}

            <button onClick={handleSubmitLivre} disabled={submitting}
              className="w-full py-4 bg-green-700 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-green-800 active:scale-[.99] disabled:opacity-50 transition-all shadow-sm">
              {submitting ? 'Enregistrement...' : 'Soumettre mon don de livre'}
            </button>
          </div>
        )}

        {/* Quote du bas */}
        <p className="text-center text-xs text-gray-300 italic pb-4">
          "Que votre abondance supplée à leur besoin." — 2 Corinthiens 8.14
        </p>
      </div>
    </div>
  )
}
