import { useState, useEffect } from 'react'
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Inscription reçue !</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Votre demande d'adhésion a été enregistrée.
            <br /><br />
            {choice === 'annual'
              ? `Rendez-vous au bureau des Navigateurs avec ${fees.annual.toLocaleString('fr-FR')} FCFA pour activer votre abonnement annuel.`
              : `Rendez-vous au bureau des Navigateurs. Vous paierez ${fees.unit.toLocaleString('fr-FR')} FCFA par livre à chaque emprunt.`
            }
            <br /><br />
            Un gestionnaire activera votre compte dès réception du paiement.
          </p>
          <Link to="/login" className="block w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">
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
                <span className="text-2xl">📅</span>
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
                <span className="text-2xl">📖</span>
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
                  ? `Votre compte sera activé après réception de ${fees.annual.toLocaleString('fr-FR')} FCFA au bureau des Navigateurs.`
                  : `Votre compte sera activé après votre première visite au bureau. Vous paierez ${fees.unit.toLocaleString('fr-FR')} FCFA par livre emprunté.`
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
