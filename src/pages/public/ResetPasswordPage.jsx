import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')
  const [ready,     setReady]     = useState(false)

  // Supabase injecte la session via le fragment URL (#access_token=...)
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6)      { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (password !== confirm)      { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) setError("Erreur lors de la mise à jour. Le lien a peut-être expiré.")
    else setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-green-700" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-2">Mot de passe mis à jour</h2>
        <p className="text-gray-500 text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <button onClick={() => navigate('/login')}
          className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">
          Se connecter
        </button>
      </div>
    </div>
  )

  if (!ready) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Lock className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="text-gray-500 text-sm">Vérification du lien en cours...</p>
        <p className="text-xs text-gray-400 mt-2">Si rien ne se passe, le lien a peut-être expiré.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full">
        <div className="mb-6">
          <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-gray-400 text-sm mt-1 font-light">Choisissez un nouveau mot de passe sécurisé.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Au moins 6 caractères"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirmer le mot de passe</label>
            <input type={showPw ? 'text' : 'password'} value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Répétez le mot de passe"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-700 focus:border-green-700 focus:bg-white transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors">
            {loading ? 'Mise à jour...' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
