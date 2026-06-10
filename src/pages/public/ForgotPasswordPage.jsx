import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const [email,       setEmail]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Veuillez entrer votre adresse email.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) setError("Aucun compte trouvé avec cet email.")
    else setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-green-700" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-2">Email envoyé</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Un lien de réinitialisation a été envoyé à <span className="font-medium text-gray-700">{email}</span>.
          Vérifiez votre boîte mail et cliquez sur le lien.
        </p>
        <p className="text-xs text-gray-400 mb-6">Le lien expire dans 24h. Vérifiez aussi vos spams.</p>
        <Link to="/login" className="block w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors text-center">
          Retour à la connexion
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full">
        <Link to="/login" className="flex items-center gap-1.5 text-gray-400 hover:text-green-700 transition-colors text-sm mb-6">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />Retour
        </Link>

        <div className="mb-6">
          <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center mb-4">
            <Mail className="w-5 h-5 text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Mot de passe oublié ?</h1>
          <p className="text-gray-400 text-sm mt-1 font-light">
            Entrez votre email et nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Adresse email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors">
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>
        </form>
      </div>
    </div>
  )
}
