import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import CatalogPage           from './pages/public/CatalogPage'
import LoginPage             from './pages/public/LoginPage'
import RegisterPage          from './pages/public/RegisterPage'
import ProfilePage           from './pages/public/ProfilePage'
import DashboardPage         from './pages/admin/DashboardPage'
import BooksPage             from './pages/admin/BooksPage'
import MembersPage           from './pages/admin/MembersPage'
import BorrowingsPage        from './pages/admin/BorrowingsPage'
import AdminReservationsPage from './pages/admin/AdminReservationsPage'
import FinancePage           from './pages/admin/FinancePage'
import SuggestionsPage       from './pages/admin/SuggestionsPage'
import SettingsPage          from './pages/admin/SettingsPage'
import DonationsAdminPage    from './pages/admin/DonationsAdminPage'
import DonationPage           from './pages/public/DonationPage'
import ForgotPasswordPage     from './pages/public/ForgotPasswordPage'
import ResetPasswordPage      from './pages/public/ResetPasswordPage'

function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('unauthorized'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setStatus(profile?.role === 'admin' ? 'admin' : 'unauthorized')
    }
    check()
  }, [])
  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400 text-sm">Vérification...</p></div>
  if (status === 'unauthorized') return <Navigate to="/login" replace />
  return children
}

function MemberRoute({ children }) {
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setStatus(user ? 'ok' : 'unauthorized')
    }
    check()
  }, [])
  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Chargement...</p></div>
  if (status === 'unauthorized') return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<CatalogPage />}  />
        <Route path="/login"    element={<LoginPage />}    />
        <Route path="/register"         element={<RegisterPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />
        <Route path="/profile"  element={<MemberRoute><ProfilePage /></MemberRoute>} />
        <Route path="/admin"               element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/admin/livres"        element={<AdminRoute><BooksPage /></AdminRoute>} />
        <Route path="/admin/membres"       element={<AdminRoute><MembersPage /></AdminRoute>} />
        <Route path="/admin/emprunts"      element={<AdminRoute><BorrowingsPage /></AdminRoute>} />
        <Route path="/admin/reservations"  element={<AdminRoute><AdminReservationsPage /></AdminRoute>} />
        <Route path="/admin/finances"      element={<AdminRoute><FinancePage /></AdminRoute>} />
        <Route path="/admin/suggestions"   element={<AdminRoute><SuggestionsPage /></AdminRoute>} />
        <Route path="/admin/settings"      element={<AdminRoute><SettingsPage /></AdminRoute>} />
        <Route path="/admin/dons"           element={<AdminRoute><DonationsAdminPage /></AdminRoute>} />
        <Route path="/don"                  element={<DonationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
