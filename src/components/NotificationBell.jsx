import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function NotificationBell({ userId }) {
  const [notifs,    setNotifs]    = useState([])
  const [showPanel, setShowPanel] = useState(false)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetch = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!error && data) setNotifs(data)
      setLoading(false)
    }
    fetch()
  }, [userId])

  const unread = notifs.filter(n => !n.is_read).length

  const handleOpen = async () => {
    const opening = !showPanel
    setShowPanel(opening)
    if (opening && unread > 0) {
      const ids = notifs.filter(n => !n.is_read).map(n => n.id)
      await supabase.from('notifications').update({ is_read: true }).in('id', ids)
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  return (
    <>
      {/* ── Bouton cloche — visible, vert, avec badge ── */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white block" />
        )}
      </button>

      {/* ── Panel — position FIXED pour sortir du header sticky ── */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="fixed top-16 right-4 w-80 z-50 bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>

            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Notifications
              </p>
              {unread === 0 && notifs.length > 0 && (
                <span className="text-xs text-gray-400 font-light">tout lu</span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-gray-400">Chargement...</p>
                </div>
              ) : notifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-6 h-6 text-gray-200 mx-auto mb-2" strokeWidth={1} />
                  <p className="text-xs text-gray-400 font-light">Aucune notification</p>
                </div>
              ) : (
                notifs.map((n, i) => (
                  <div key={n.id}
                    className={"px-4 py-3 " + (i < notifs.length - 1 ? "border-b border-gray-50 " : "") + (n.is_read ? "bg-white" : "bg-green-50")}>
                    <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-gray-300 mt-1">
                      {new Date(n.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
