import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
  })
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleField = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation côté client
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
          phone:     form.phone.trim(),
        }
      }
    })

    if (authError) {
      setError(
        authError.message.includes('already registered')
          ? 'Un compte existe déjà avec cet email.'
          : "Erreur lors de l'inscription. Réessaie."
      )
      setLoading(false)
      return
    }

    // Si la session est active → redirection directe
    // Si confirmation email requise → afficher message de succès
    if (data.session) {
      navigate('/')
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  // ── Écran de succès (email de confirmation envoyé) ──────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-7 h-7 text-green-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Compte créé</h2>
          <p className="text-gray-500 text-sm mb-6">
            Un email de confirmation a été envoyé à{' '}
            <span className="font-medium text-gray-700">{form.email}</span>.
            Clique sur le lien pour activer ton compte.
          </p>
          <Link to="/login"
            className="inline-block w-full bg-green-700 text-white py-3 rounded-xl
                       text-sm font-semibold hover:bg-green-800 transition-colors text-center">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  // ── Formulaire d'inscription ────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              Bibliothèque-navs CI
            </h1>
            <p className="text-xs text-gray-400">Les Navigateurs — Côte d'Ivoire</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Créer un compte</h2>
          <p className="text-gray-400 text-sm mb-7">Rejoins la bibliothèque des Navigateurs</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                            px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={form.fullName}
                onChange={handleField}
                placeholder="Prénom et Nom"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-500
                           focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email *
              </label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleField}
                placeholder="votre@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-500
                           focus:border-transparent"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone *
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-gray-50 border border-gray-200
                                rounded-xl text-sm text-gray-500 font-medium flex-shrink-0">
                  +225
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={form.phone}
                  onChange={handleField}
                  placeholder="07 00 00 00 00"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500
                             focus:border-transparent"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  required
                  value={form.password}
                  onChange={handleField}
                  placeholder="Minimum 6 caractères"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500
                             focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmer le mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={form.confirmPassword}
                  onChange={handleField}
                  placeholder="Répète ton mot de passe"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500
                             focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-3 rounded-xl text-sm font-semibold
                         hover:bg-green-800 active:scale-[.99] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>

          {/* Lien vers connexion */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-green-700 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
