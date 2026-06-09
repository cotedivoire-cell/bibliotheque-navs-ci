import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Heart, BookOpen, CheckCircle,
  ChevronRight, Sparkles, ThumbsUp, CreditCard, Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

/* ══════════════════════════════════════════
   LOGOS PAIEMENT — SVG inline authentiques
══════════════════════════════════════════ */
const WaveLogo = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
    <rect width="48" height="48" rx="10" fill="#1B4D8E"/>
    <path d="M10 30 Q16 20 24 25 Q32 30 38 18" stroke="#6EC6F5" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M10 34 Q16 24 24 29 Q32 34 38 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
    <text x="24" y="43" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="1">WAVE</text>
  </svg>
)

const OrangeMoneyLogo = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
    <rect width="48" height="48" rx="10" fill="#FF6600"/>
    <circle cx="24" cy="20" r="9" fill="white" opacity="0.15"/>
    <circle cx="24" cy="20" r="6" fill="white" opacity="0.9"/>
    <circle cx="24" cy="20" r="3" fill="#FF6600"/>
    <text x="24" y="35" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif">Orange</text>
    <text x="24" y="43" textAnchor="middle" fill="white" fontSize="6" fontWeight="600" fontFamily="Arial, sans-serif">Money</text>
  </svg>
)

const MTNLogo = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
    <rect width="48" height="48" rx="10" fill="#FFCB00"/>
    <text x="24" y="26" textAnchor="middle" fill="#1A1A1A" fontSize="13" fontWeight="900" fontFamily="Arial Black, sans-serif" letterSpacing="0.5">MTN</text>
    <text x="24" y="37" textAnchor="middle" fill="#1A1A1A" fontSize="5.5" fontWeight="600" fontFamily="Arial, sans-serif" letterSpacing="0.5">MOBILE MONEY</text>
  </svg>
)

const MoovLogo = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
    <rect width="48" height="48" rx="10" fill="#0071BC"/>
    <path d="M10 28 Q14 18 18 24 Q22 30 24 22 Q26 14 30 22 Q34 30 38 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <text x="24" y="41" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="1">MOOV</text>
  </svg>
)

const CarteLogo = () => (
  <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
    <CreditCard className="w-4 h-4 text-white" strokeWidth={1.8} />
  </div>
)

/* ══════════════════════════════════════════ */

const QUICK_AMOUNTS = [2000, 5000, 10000, 25000]

const PAYMENT_METHODS = [
  { id: 'wave',         label: 'Wave',          Logo: WaveLogo,       activeBg: 'bg-blue-50',   activeBorder: 'border-blue-300'   },
  { id: 'orange_money', label: 'Orange Money',  Logo: OrangeMoneyLogo,activeBg: 'bg-orange-50', activeBorder: 'border-orange-300' },
  { id: 'mtn',          label: 'MTN Money',     Logo: MTNLogo,        activeBg: 'bg-yellow-50', activeBorder: 'border-yellow-300' },
  { id: 'moov',         label: 'Moov Money',    Logo: MoovLogo,       activeBg: 'bg-blue-50',   activeBorder: 'border-sky-300'    },
  { id: 'carte',        label: 'Carte bancaire', Logo: CarteLogo,      activeBg: 'bg-slate-50',  activeBorder: 'border-slate-300'  },
]

const CONDITIONS = [
  { id: 'neuf',     label: 'Neuf',          desc: 'Jamais utilisé',        Icon: Sparkles,  color: 'text-amber-500' },
  { id: 'tres_bon', label: 'Très bon état', desc: 'Peu utilisé',           Icon: ThumbsUp,  color: 'text-green-600' },
  { id: 'usage',    label: 'Usagé',         desc: 'Utilisé, mais lisible', Icon: BookOpen,  color: 'text-slate-500' },
]

export default function DonationPage() {
  const navigate = useNavigate()
  const [tab,          setTab]          = useState('argent')
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
  const [isAnonymous,  setIsAnonymous]  = useState(false)

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
    if (!isAnonymous && !donorName.trim()) { setError('Veuillez entrer votre nom ou choisir le don anonyme.'); return }
    if (finalAmount < 500)  { setError('Montant minimum : 500 FCFA.'); return }
    if (!payMethod)         { setError('Veuillez choisir un mode de paiement.'); return }
    setSubmitting(true); setError('')
    const { error: err } = await supabase.from('donations').insert([{
      member_id:      isAnonymous ? null : (user?.id || null),
      donor_name:     isAnonymous ? 'Anonyme' : donorName.trim(),
      donor_phone:    isAnonymous ? null : (donorPhone.trim() || null),
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
    if (!isAnonymous && !donorName.trim()) { setError('Veuillez entrer votre nom ou choisir le don anonyme.'); return }
    if (!bookTitle.trim())  { setError('Veuillez entrer le titre du livre.'); return }
    if (!condition)         { setError("Veuillez indiquer l'état du livre."); return }
    setSubmitting(true); setError('')
    const { error: err } = await supabase.from('donations').insert([{
      member_id:      isAnonymous ? null : (user?.id || null),
      donor_name:     isAnonymous ? 'Anonyme' : donorName.trim(),
      donor_phone:    isAnonymous ? null : (donorPhone.trim() || null),
      type:           'livre',
      book_title:     bookTitle.trim(),
      book_author:    bookAuthor.trim() || null,
      book_condition: condition,
      message:        message.trim() || null,
    }])
    if (err) setError("Erreur lors de l'envoi. Réessayez.")
    else setDone(true)
    setSubmitting(false)
  }

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all"
  const cardClass  = "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"

  /* ── Confirmation ── */
  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-green-700" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Merci pour votre générosité !</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-3">
          {tab === 'argent'
            ? `Votre don de ${finalAmount.toLocaleString('fr-FR')} FCFA a bien été enregistré. Un gestionnaire vous contactera pour finaliser la transaction.`
            : `Votre don du livre "${bookTitle}" a bien été enregistré. Déposez-le au bureau du mardi au vendredi de 8h30 à 17h00.`
          }
        </p>
        <p className="text-xs text-gray-300 italic mb-6">"Celui qui donne aux pauvres ne manquera de rien." — Prov. 28.27</p>
        <button onClick={() => navigate('/profile')}
          className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">
          Retour à mon espace
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-green-700 transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <span className="font-semibold text-gray-900 text-sm">Soutenir la bibliothèque</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Bannière inspirante ── */}
        <div className="bg-green-700 rounded-3xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-base font-bold mb-1.5">Chaque don enrichit notre communauté</h1>
              <p className="text-green-100 text-xs leading-relaxed">
                Vos dons permettent d'acquérir de nouveaux ouvrages, de former des disciples
                et d'équiper chaque membre pour une vie transformée par la Parole.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex gap-6">
            <div><p className="text-xl font-bold">+50</p><p className="text-green-200 text-xs">ouvrages</p></div>
            <div><p className="text-xl font-bold">100%</p><p className="text-green-200 text-xs">au service des membres</p></div>
          </div>
        </div>

        {/* ── Segmented control ── */}
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
          <button onClick={() => { setTab('argent'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${tab === 'argent' ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Heart className="w-4 h-4" strokeWidth={1.5} />Don financier
          </button>
          <button onClick={() => { setTab('livre'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${tab === 'livre' ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <BookOpen className="w-4 h-4" strokeWidth={1.5} />Don de livre
          </button>
        </div>

        {/* ── Coordonnées (communes) ── */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vos coordonnées</p>
            {/* Toggle don anonyme */}
            <button
              type="button"
              onClick={() => { setIsAnonymous(v => !v); setError('') }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isAnonymous
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isAnonymous ? 'border-white bg-white' : 'border-gray-400'}`}>
                {isAnonymous && <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />}
              </div>
              Don anonyme
            </button>
          </div>

          {isAnonymous ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-500 text-xs font-bold">?</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Don anonyme</p>
                <p className="text-xs text-gray-400 font-light">Votre identité ne sera pas enregistrée</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom complet *</label>
                <input type="text" value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Prénom et Nom" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone</label>
                <input type="tel" value={donorPhone} onChange={e => setDonorPhone(e.target.value)} placeholder="+225 XX XX XX XX" className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {/* ══════════════ DON FINANCIER ══════════════ */}
        {tab === 'argent' && (
          <div className="space-y-5">
            {/* Montants */}
            <div className={cardClass}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Choisissez un montant</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount('') }}
                    className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${amount === a ? 'border-green-700 bg-green-50 text-green-800' : 'border-gray-200 text-gray-700 hover:border-green-300'}`}>
                    {a.toLocaleString('fr-FR')} F
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Montant libre (FCFA)</label>
                <input type="number" value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setAmount(null) }}
                  placeholder="Montant personnalisé..." className={inputClass} />
              </div>
            </div>

            {/* Modes de paiement — vrais logos SVG */}
            <div className={cardClass}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mode de paiement</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)}
                    className={`flex flex-col items-center gap-2.5 py-4 px-3 rounded-xl border-2 transition-all ${
                      payMethod === pm.id
                        ? `${pm.activeBorder} ${pm.activeBg} scale-[1.02]`
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}>
                    <pm.Logo />
                    <span className={`text-xs font-semibold text-center leading-tight ${payMethod === pm.id ? 'text-gray-900' : 'text-gray-500'}`}>
                      {pm.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className={cardClass}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Message (optionnel)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                placeholder="Un mot d'encouragement pour ce don..."
                className={`${inputClass} resize-none`} />
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

            <button onClick={handleSubmitArgent} disabled={submitting}
              className="w-full py-4 bg-green-700 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-green-800 active:scale-[.99] disabled:opacity-50 transition-all shadow-sm">
              {submitting ? 'Enregistrement...' : 'Confirmer mon don'}
            </button>
          </div>
        )}

        {/* ══════════════ DON EN NATURE ══════════════ */}
        {tab === 'livre' && (
          <div className="space-y-5">
            <div className={cardClass}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informations du livre</p>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Titre du livre *</label>
                <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)}
                  placeholder="Titre complet du livre" className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Auteur</label>
                <input type="text" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)}
                  placeholder="Nom de l'auteur (optionnel)" className={inputClass} />
              </div>

              {/* État — icônes Lucide, zéro emoji */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">État du livre *</label>
                <div className="grid grid-cols-3 gap-3">
                  {CONDITIONS.map(cond => (
                    <button key={cond.id} onClick={() => setCondition(cond.id)}
                      className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-all ${
                        condition === cond.id ? 'border-green-700 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}>
                      <cond.Icon className={`w-5 h-5 ${condition === cond.id ? 'text-green-700' : cond.color}`} strokeWidth={1.5} />
                      <span className={`text-xs font-semibold text-center leading-tight ${condition === cond.id ? 'text-green-800' : 'text-gray-600'}`}>
                        {cond.label}
                      </span>
                      <span className="text-xs text-gray-400 text-center leading-tight">{cond.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Message (optionnel)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                  placeholder="Une dédicace ou un contexte..."
                  className={`${inputClass} resize-none`} />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-xs text-amber-800 leading-relaxed">
                Déposez votre livre au bureau des Navigateurs du <span className="font-semibold">mardi au vendredi de 8h30 à 17h00</span>.
              </p>
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

            <button onClick={handleSubmitLivre} disabled={submitting}
              className="w-full py-4 bg-green-700 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-green-800 active:scale-[.99] disabled:opacity-50 transition-all shadow-sm">
              {submitting ? 'Enregistrement...' : 'Soumettre mon don de livre'}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 italic pb-4">
          "Que votre abondance supplée à leur besoin." — 2 Corinthiens 8.14
        </p>
      </div>
    </div>
  )
}
