import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { Calendar, BookOpen } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function RegisterPage() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ full_name: '', phone: '+225', email: '', password: '' })
  const [choice,  setChoice]  = useState('annual') // 'annual' | 'unit'
  const [fees,    setFees]    = useState({ annual: 5000, unit: 500, duration: 14 })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  useEffect(() => {
    supabase.from('settings').select('key, value').then(({ data }) => {
      if (data) {
        const s = {}
        data.forEach(r => { s[r.key] = Number(r.value) || r.value })
        setFees({
          annual:   s.subscription_fee_default  || 5000,
          unit:     s.single_borrow_fee_default  || 500,
          duration: s.standard_borrow_duration   || 14,
        })
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signUpError } = await supabase.auth.signUp({
      email:    form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name:        form.full_name.trim(),
          phone:            form.phone.trim(),
          membership_choice: choice,  // 'annual' | 'unit' → stocké via trigger
        }
      }
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered'))
        setError('Un compte existe déjà avec cet email.')
      else if (signUpError.message.includes('Password'))
        setError('Le mot de passe doit contenir au moins 6 caractères.')
      else
        setError(signUpError.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    const waMessage = choice === 'annual'
      ? encodeURIComponent(`Bonjour, je viens de créer mon compte sur la Bibliothèque-navs CI. Je souhaite activer mon abonnement annuel (${fees.annual.toLocaleString('fr-FR')} FCFA). Mon nom : ${form.full_name.trim()}.`)
      : encodeURIComponent(`Bonjour, je viens de créer mon compte sur la Bibliothèque-navs CI (formule à l'unité). Mon nom : ${form.full_name.trim()}.`)
    const waLink = `https://wa.me/2250778484879?text=${waMessage}`

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-700" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Inscription reçue !</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            {choice === 'annual'
              ? `Votre demande a bien été enregistrée. Pour activer votre abonnement annuel, contactez le bureau des Navigateurs avec ${fees.annual.toLocaleString('fr-FR')} FCFA.`
              : `Votre demande a bien été enregistrée. Contactez le bureau pour activer votre compte. Vous paierez ${fees.unit.toLocaleString('fr-FR')} FCFA par livre emprunté.`
            }
          </p>
          {/* Bouton WhatsApp */}
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1ebe5a] transition-colors mb-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contacter le bureau sur WhatsApp
          </a>
          <Link to="/login" className="block w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Rejoindre la bibliothèque</h1>
          <p className="text-gray-400 text-sm mt-1">Navigateurs CI — Abidjan</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Infos personnelles */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom complet *</label>
            <input type="text" required value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Prénom et Nom"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone *</label>
            <input type="tel" required value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+225 07 XX XX XX XX"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input type="email" required value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="votre@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe *</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Au moins 6 caractères"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          {/* ── Choix de la formule ── */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Choisissez votre formule *</label>
            <div className="grid grid-cols-2 gap-3">

              {/* Abonnement annuel */}
              <button type="button" onClick={() => setChoice('annual')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  choice === 'annual'
                    ? 'border-green-700 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <Calendar className={`w-5 h-5 ${choice === 'annual' ? 'text-green-700' : 'text-gray-400'}`} strokeWidth={1.5} />
                <span className={`text-xs font-bold ${choice === 'annual' ? 'text-green-700' : 'text-gray-600'}`}>
                  Abonnement annuel
                </span>
                <span className={`text-lg font-bold ${choice === 'annual' ? 'text-green-700' : 'text-gray-800'}`}>
                  {fees.annual.toLocaleString('fr-FR')} F
                </span>
                <span className="text-xs text-gray-400 text-center leading-tight">
                  Prêts illimités pendant 1 an
                </span>
              </button>

              {/* À l'unité */}
              <button type="button" onClick={() => setChoice('unit')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  choice === 'unit'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <BookOpen className={`w-5 h-5 ${choice === 'unit' ? 'text-green-700' : 'text-gray-400'}`} strokeWidth={1.5} />
                <span className={`text-xs font-bold ${choice === 'unit' ? 'text-amber-700' : 'text-gray-600'}`}>
                  À l'unité
                </span>
                <span className={`text-lg font-bold ${choice === 'unit' ? 'text-amber-700' : 'text-gray-800'}`}>
                  {fees.unit.toLocaleString('fr-FR')} F
                </span>
                <span className="text-xs text-gray-400 text-center leading-tight">
                  Par livre emprunté
                </span>
              </button>
            </div>

            {/* Note activation */}
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 leading-relaxed">
                {choice === 'annual'
                  ? 'Pour activer vos accès illimités, contactez simplement le bureau des Navigateurs afin de finaliser votre adhésion (sur place, Wave, Orange Money...).'
                  : 'Vous pouvez payer par Wave ou Mobile Money dès maintenant, ou directement au bureau des Navigateurs lors du retrait de votre livre.'
                }
              </p>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors">
            {loading ? 'Inscription en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          Déjà membre ?{' '}
          <Link to="/login" className="text-green-700 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
