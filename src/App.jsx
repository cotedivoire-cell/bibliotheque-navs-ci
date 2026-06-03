import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import CatalogPage    from './pages/public/CatalogPage'
import LoginPage      from './pages/public/LoginPage'
import DashboardPage  from './pages/admin/DashboardPage'

// ─── Protection des routes admin ───────────────────────────────
// Vérifie que l'utilisateur connecté est bien un admin.
// Sinon, redirige vers /login.
function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading') // loading | admin | unauthorized

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setStatus('unauthorized')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setStatus(profile?.role === 'admin' ? 'admin' : 'unauthorized')
    }

    checkAdmin()
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Vérification en cours...</p>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace />
  }

  return children
}

// ─── Routeur principal ──────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Pages publiques — accessibles à tous */}
        <Route path="/"       element={<CatalogPage />} />
        <Route path="/login"  element={<LoginPage />} />

        {/* Pages admin — protégées par ProtectedRoute */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Toute autre URL → page d'accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
