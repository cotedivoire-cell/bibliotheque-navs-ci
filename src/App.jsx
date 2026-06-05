import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import CatalogPage     from './pages/public/CatalogPage'
import LoginPage       from './pages/public/LoginPage'
import DashboardPage   from './pages/admin/DashboardPage'
import BooksPage       from './pages/admin/BooksPage'
import BorrowingsPage  from './pages/admin/BorrowingsPage'

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('unauthorized'); return }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setStatus(profile?.role === 'admin' ? 'admin' : 'unauthorized')
    }
    check()
  }, [])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Vérification en cours...</p>
    </div>
  )
  if (status === 'unauthorized') return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<CatalogPage />} />
        <Route path="/login" element={<LoginPage />}   />

        <Route path="/admin" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/admin/livres" element={
          <ProtectedRoute><BooksPage /></ProtectedRoute>
        } />
        <Route path="/admin/emprunts" element={
          <ProtectedRoute><BorrowingsPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
